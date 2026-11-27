import { prisma } from "@/lib/db";
import { DEMO_MODE } from "@/lib/demo";
import { embedTexts, EMBEDDING_DIM } from "@/lib/ai/gemini";
import { isAiSearchPublic } from "@/lib/ai-search/limits";
import { consumeAiQuota } from "@/lib/ai-search/usage";
import { buildEmbeddingText, hashText, needsEmbedding, toVectorLiteral } from "./embedding-text";

/** 게시물 글을 벡터로 바꾸는 함수. 시험에서는 가짜로 바꿔 끼운다 */
export type EmbedFn = (texts: string[]) => Promise<number[][]>;
const defaultEmbed: EmbedFn = (texts) => embedTexts(texts, "RETRIEVAL_DOCUMENT");

/** 한 번 실행에서 Gemini에 보내는 묶음 크기와 시간 한도(Vercel Hobby 함수 최대 300초보다 짧게) */
const BATCH = 100;
const DEFAULT_DEADLINE_MS = 200_000;

export type UpsertResult = { updated: number; skipped: number; stopped?: "revoked" | "quota" | "deadline" };

type ReelForEmbedding = {
  id: string;
  userId: string;
  caption: string | null;
  memo: string | null;
  review: string | null;
  categories: { category: { name: string } }[];
  tags: { tag: { name: string } }[];
};

function textOf(r: ReelForEmbedding, includePrivateNotes: boolean): string {
  return buildEmbeddingText(
    {
      caption: r.caption,
      memo: r.memo,
      review: r.review,
      categories: r.categories.map((c) => c.category.name),
      tags: r.tags.map((t) => t.tag.name),
    },
    { includePrivateNotes },
  );
}

/**
 * 릴스들의 뜻 검색용 벡터를 만들거나 갱신한다. 글의 해시가 저장된 값과 같으면 건너뛴다.
 * - 관리자 게시물: 동의 확인 없이, 메모와 후기를 포함해 만든다(운영자 본인).
 * - 일반 가입자 게시물: 공개 스위치가 켜져 있고 주인이 동의한 경우만, 메모와 후기를 빼고 만든다.
 *   Gemini에 보내기 전마다 동의와 작업 버전을 다시 보고, 저장은 동의 상태 줄을 읽기 잠금한 조건부 INSERT 한 문장으로 한다.
 *   그래서 철회와 겹쳐도 철회가 끝난 뒤에는 벡터가 남지 않는다. 하루 사용량에서 허락된 개수만 보낸다.
 */
export async function upsertReelEmbeddings(
  reelIds: string[],
  options: { embed?: EmbedFn; deadlineMs?: number } = {},
): Promise<UpsertResult> {
  const requested = [...new Set(reelIds)];
  if (DEMO_MODE || requested.length === 0) return { updated: 0, skipped: requested.length };
  const embed = options.embed ?? defaultEmbed;
  const deadline = Date.now() + (options.deadlineMs ?? DEFAULT_DEADLINE_MS);

  const reels: ReelForEmbedding[] = await prisma.reel.findMany({
    where: { id: { in: requested } },
    select: {
      id: true,
      userId: true,
      caption: true,
      memo: true,
      review: true,
      categories: { select: { category: { select: { name: true } } } },
      tags: { select: { tag: { select: { name: true } } } },
    },
  });
  const ownerIds = [...new Set(reels.map((r) => r.userId))];
  const [admins, consents] = await Promise.all([
    prisma.adminRole.findMany({ where: { userId: { in: ownerIds } }, select: { userId: true } }),
    isAiSearchPublic()
      ? prisma.aiSearchConsent.findMany({ where: { userId: { in: ownerIds }, enabled: true }, select: { userId: true, generation: true } })
      : Promise.resolve([]),
  ]);
  const adminIds = new Set(admins.map((a) => a.userId));
  const generationByOwner = new Map(consents.map((c) => [c.userId, c.generation]));

  const existing = await prisma.$queryRaw<{ reelId: string; textHash: string }[]>`
    SELECT "reelId", "textHash" FROM "ReelEmbedding" WHERE "reelId" = ANY(${reels.map((r) => r.id)})`;
  const hashById = new Map(existing.map((e) => [e.reelId, e.textHash]));

  let updated = 0;
  let stopped: UpsertResult["stopped"];

  // 관리자 게시물(지금까지와 같은 흐름)
  const adminTodo = reels
    .filter((r) => adminIds.has(r.userId))
    .map((r) => ({ id: r.id, text: textOf(r, true) }))
    .filter((r) => needsEmbedding(r.text, hashById.get(r.id)));
  for (let i = 0; i < adminTodo.length; i += BATCH) {
    if (Date.now() > deadline) {
      stopped = "deadline";
      break;
    }
    const chunk = adminTodo.slice(i, i + BATCH);
    const vectors = await embed(chunk.map((t) => t.text));
    for (let j = 0; j < chunk.length; j++) {
      if (await saveVector(chunk[j].id, chunk[j].text, vectors[j])) updated++;
    }
  }

  // 일반 가입자 게시물(주인별로)
  for (const owner of ownerIds) {
    if (stopped === "deadline") break;
    if (adminIds.has(owner)) continue;
    const generation = generationByOwner.get(owner);
    if (generation === undefined) continue;
    const todo = reels
      .filter((r) => r.userId === owner)
      .map((r) => ({ id: r.id, text: textOf(r, false) }))
      .filter((r) => needsEmbedding(r.text, hashById.get(r.id)));

    for (let i = 0; i < todo.length; i += BATCH) {
      if (Date.now() > deadline) {
        stopped = "deadline";
        break;
      }
      if (!(await consentStillValid(owner, generation))) {
        stopped = "revoked";
        break;
      }
      const wanted = todo.slice(i, i + BATCH);
      const granted = await consumeAiQuota(owner, "document", wanted.length);
      const chunk = wanted.slice(0, granted);
      if (chunk.length > 0) {
        const vectors = await embed(chunk.map((t) => t.text));
        let revoked = false;
        for (let j = 0; j < chunk.length; j++) {
          const saved = await saveVectorIfConsented(owner, generation, chunk[j].id, chunk[j].text, vectors[j]);
          if (saved === "revoked") {
            revoked = true;
            break;
          }
          if (saved === "saved") updated++;
        }
        if (revoked) {
          stopped = "revoked";
          break;
        }
      }
      if (granted < wanted.length) {
        stopped = "quota";
        break;
      }
    }
    // revoked, quota는 이 주인만 멈춘다. 다른 주인의 게시물은 계속 처리한다
  }

  return { updated, skipped: requested.length - updated, ...(stopped ? { stopped } : {}) };
}

async function consentStillValid(userId: string, generation: number): Promise<boolean> {
  const row = await prisma.aiSearchConsent.findUnique({ where: { userId }, select: { enabled: true, generation: true } });
  return Boolean(row?.enabled && row.generation === generation);
}

/** 관리자 게시물 저장. 게시물이 그사이 지워졌으면(외래키 오류) 건너뛴다 */
async function saveVector(reelId: string, text: string, values: number[]): Promise<boolean> {
  try {
    const vec = toVectorLiteral(values, EMBEDDING_DIM);
    await prisma.$executeRaw`
      INSERT INTO "ReelEmbedding" ("reelId", "embedding", "textHash", "updatedAt")
      VALUES (${reelId}, ${vec}::vector, ${hashText(text)}, now())
      ON CONFLICT ("reelId") DO UPDATE
        SET "embedding" = EXCLUDED."embedding", "textHash" = EXCLUDED."textHash", "updatedAt" = now()`;
    return true;
  } catch (e) {
    console.error("[embeddings] 벡터 저장 실패", reelId, e instanceof Error ? e.message : e);
    return false;
  }
}

/**
 * 일반 가입자 게시물 저장: 동의 상태 줄이 켜져 있고 작업 버전이 같을 때만 넣는다(문장 하나).
 * 그 줄에 읽기 잠금(FOR SHARE)을 걸어서, 철회가 진행 중이면 끝날 때까지 기다린 뒤 바뀐 줄로 다시 판단한다.
 */
async function saveVectorIfConsented(
  owner: string,
  generation: number,
  reelId: string,
  text: string,
  values: number[],
): Promise<"saved" | "revoked" | "failed"> {
  try {
    const vec = toVectorLiteral(values, EMBEDDING_DIM);
    const n = await prisma.$executeRaw`
      INSERT INTO "ReelEmbedding" ("reelId", "embedding", "textHash", "updatedAt")
      SELECT ${reelId}, ${vec}::vector, ${hashText(text)}, now()
      WHERE EXISTS (
        SELECT 1 FROM "AiSearchConsent"
        WHERE "userId" = ${owner} AND "enabled" AND "generation" = ${generation}
        FOR SHARE)
      ON CONFLICT ("reelId") DO UPDATE
        SET "embedding" = EXCLUDED."embedding", "textHash" = EXCLUDED."textHash", "updatedAt" = now()`;
    return n > 0 ? "saved" : "revoked";
  } catch (e) {
    console.error("[embeddings] 벡터 저장 실패", reelId, e instanceof Error ? e.message : e);
    return "failed";
  }
}
