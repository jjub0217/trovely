import { prisma } from "@/lib/db";
import { embedTexts, EMBEDDING_DIM, EMBEDDING_MODEL } from "@/lib/ai/gemini";
import { koreaDate } from "@/lib/demo/usage";
import { hashText, toVectorLiteral } from "@/lib/search/embedding-text";
import type { EmbedFn } from "@/lib/search/embeddings";
import { consumeAiQuota } from "./usage";

// 홈 화면 검색은 빨라야 해서 다시 시도하지 않고 3초 안에 끝낸다
const defaultEmbed: EmbedFn = (texts) => embedTexts(texts, "RETRIEVAL_QUERY", { retries: 0, timeoutMs: 3000 });
const POLL_MS = 200;

/** fresh = 이번 요청에서 Gemini를 불러 새로 만들었음(저장해 둔 벡터를 쓴 경우는 없음) */
export type QueryVectorResult = { vector: number[]; fresh?: true } | { limited: true } | { unavailable: true };

/**
 * 검색어 벡터를 돌려준다. 같은 날 같은 사람이 같은 검색어를 다시 쓰면 저장해 둔 벡터를 쓴다(Gemini를 다시 부르지 않음).
 * 검색어 원문은 저장하지 않고 해시만 저장한다.
 * 처음 만들 때는 "만드는 중" 줄(벡터 없음)을 먼저 넣고, 넣는 데 성공한 요청만 사용량을 빼고 Gemini를 부른다.
 * 그래서 같은 검색어가 동시에 와도 Gemini는 한 번, 사용량도 한 번만 빠진다. 나머지 요청은 잠깐 기다렸다가 그 벡터를 쓴다.
 */
export async function getQueryVector(
  userId: string,
  query: string,
  options: { embed?: EmbedFn; now?: Date; waitMs?: number } = {},
): Promise<QueryVectorResult> {
  const day = koreaDate(options.now ?? new Date());
  const textHash = hashText(query.trim());
  const model = EMBEDDING_MODEL;
  const embed = options.embed ?? defaultEmbed;

  try {
    // 지난 날짜 줄은 쓰지 않으므로 그 사람 것부터 지운다
    await prisma.$executeRaw`DELETE FROM "QueryEmbeddingCache" WHERE "userId" = ${userId} AND "day" <> ${day}`;

    const cached = await readVector(userId, day, model, textHash);
    if (cached) return { vector: cached };

    const inserted = await prisma.$executeRaw`
      INSERT INTO "QueryEmbeddingCache" ("userId", "day", "model", "textHash") VALUES (${userId}, ${day}, ${model}, ${textHash})
      ON CONFLICT DO NOTHING`;
    if (inserted === 0) return await waitForVector(userId, day, model, textHash, options.waitMs ?? 3000);

    const removePlaceholder = () => prisma.$executeRaw`
      DELETE FROM "QueryEmbeddingCache"
      WHERE "userId" = ${userId} AND "day" = ${day} AND "model" = ${model} AND "textHash" = ${textHash} AND "embedding" IS NULL`;

    if ((await consumeAiQuota(userId, "query", 1, { now: options.now })) === 0) {
      await removePlaceholder();
      return { limited: true };
    }
    try {
      const [values] = await embed([query.trim()]);
      const vec = toVectorLiteral(values, EMBEDDING_DIM);
      await prisma.$executeRaw`
        UPDATE "QueryEmbeddingCache" SET "embedding" = ${vec}::vector
        WHERE "userId" = ${userId} AND "day" = ${day} AND "model" = ${model} AND "textHash" = ${textHash}`;
      return { vector: values, fresh: true };
    } catch (e) {
      await removePlaceholder();
      throw e;
    }
  } catch (e) {
    console.error("[ai-search] 검색어 벡터를 만들지 못함", e instanceof Error ? e.message : e);
    return { unavailable: true };
  }
}

async function readVector(userId: string, day: string, model: string, textHash: string): Promise<number[] | null> {
  const [row] = await prisma.$queryRaw<{ v: string | null }[]>`
    SELECT "embedding"::text AS v FROM "QueryEmbeddingCache"
    WHERE "userId" = ${userId} AND "day" = ${day} AND "model" = ${model} AND "textHash" = ${textHash}`;
  return row?.v ? (JSON.parse(row.v) as number[]) : null;
}

async function waitForVector(userId: string, day: string, model: string, textHash: string, waitMs: number): Promise<QueryVectorResult> {
  const until = Date.now() + waitMs;
  while (Date.now() < until) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    const v = await readVector(userId, day, model, textHash);
    if (v) return { vector: v };
  }
  return { unavailable: true };
}
