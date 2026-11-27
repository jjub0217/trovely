import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildEmbeddingText, needsEmbedding } from "@/lib/search/embedding-text";
import { AI_SEARCH_POLICY_VERSION, decideAiAccess, isAiSearchPublic } from "./limits";

/**
 * 이 가입자가 AI 검색(비슷한 콘텐츠 찾기)을 써도 되는가. 서버 함수, 벡터 생성, 화면이 모두 이 판단 하나를 쓴다.
 * 관리자이거나, 공개 스위치가 켜져 있고 본인이 동의한 경우만.
 */
export async function canUseAiSearch(userId: string): Promise<boolean> {
  const [admin, consent] = await Promise.all([
    prisma.adminRole.findUnique({ where: { userId }, select: { userId: true } }),
    prisma.aiSearchConsent.findUnique({ where: { userId }, select: { enabled: true } }),
  ]);
  return decideAiAccess({ isAdmin: Boolean(admin), isPublic: isAiSearchPublic(), consentEnabled: Boolean(consent?.enabled) });
}

export type AiSearchResult = { ok: true } | { error: string };

/** 동의 켜기: 동의 상태를 켜고 작업 버전을 1 올리고 이력을 남긴다(한 번의 DB 처리) */
export async function enableAiSearch(
  userId: string,
  input: { adultConfirmed: boolean; policyVersion: string },
): Promise<AiSearchResult> {
  if (input.adultConfirmed !== true) return { error: "만 18세 이상인지 확인해 주세요." };
  if (input.policyVersion !== AI_SEARCH_POLICY_VERSION) {
    return { error: "안내 내용이 바뀌었어요. 화면을 새로 고친 뒤 다시 확인해 주세요." };
  }
  try {
    await prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.aiSearchConsent.upsert({
        where: { userId },
        create: { userId, enabled: true, policyVersion: input.policyVersion, generation: 1, consentedAt: now },
        update: { enabled: true, policyVersion: input.policyVersion, generation: { increment: 1 }, consentedAt: now, revokedAt: null },
      });
      await tx.aiSearchConsentLog.create({ data: { userId, action: "consent", policyVersion: input.policyVersion } });
    });
    return { ok: true };
  } catch (e) {
    console.error("[ai-search] 동의 저장 실패", e instanceof Error ? e.message : e);
    return { error: "설정을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  }
}

/**
 * 철회: 동의 상태 줄을 잠그고 끄며 작업 버전을 1 올린 뒤, 그 사람의 게시물 벡터와 검색어 캐시를 지우고 이력을 남긴다.
 * 모두 한 번의 DB 처리라 하나라도 실패하면 전부 되돌린다. 벡터 저장은 이 줄에 읽기 잠금을 걸고 확인하므로,
 * 저장 중이면 저장이 끝난 뒤 이 처리가 이어지고, 방금 저장된 벡터도 함께 지워진다.
 * beforeCommit은 시험에서 삭제 뒤 일부러 실패시키려고 둔다.
 */
export async function revokeAiSearch(
  userId: string,
  options: { beforeCommit?: (tx: Prisma.TransactionClient) => Promise<void> } = {},
): Promise<AiSearchResult> {
  try {
    await prisma.$transaction(async (tx) => {
      const [row] = await tx.$queryRaw<{ policyVersion: string }[]>`
        SELECT "policyVersion" FROM "AiSearchConsent" WHERE "userId" = ${userId} FOR UPDATE`;
      if (row) {
        await tx.$executeRaw`
          UPDATE "AiSearchConsent" SET "enabled" = false, "generation" = "generation" + 1, "revokedAt" = now()
          WHERE "userId" = ${userId}`;
      }
      await deleteAiSearchVectors(tx, userId);
      if (row) {
        await tx.aiSearchConsentLog.create({ data: { userId, action: "revoke", policyVersion: row.policyVersion } });
      }
      await options.beforeCommit?.(tx);
    });
    return { ok: true };
  } catch (e) {
    console.error("[ai-search] 철회 실패", e instanceof Error ? e.message : e);
    return { error: "AI 검색을 끄지 못했어요. 데이터는 그대로 있으니 잠시 뒤 다시 시도해 주세요." };
  }
}

/** 그 사람의 게시물 벡터와 검색어 캐시 삭제(원본 게시물과 사용량은 그대로) */
async function deleteAiSearchVectors(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  await tx.$executeRaw`
    DELETE FROM "ReelEmbedding" WHERE "reelId" IN (SELECT "id" FROM "Reel" WHERE "userId" = ${userId})`;
  await tx.$executeRaw`DELETE FROM "QueryEmbeddingCache" WHERE "userId" = ${userId}`;
}

/** 설정 화면 상태: pending = 아직 벡터가 없거나 글이 바뀐 게시물 수(일반 가입자는 메모, 후기 뺀 글 기준) */
export async function getAiSearchStatus(userId: string): Promise<{ enabled: boolean; total: number; pending: number }> {
  const [consent, admin, reels, existing] = await Promise.all([
    prisma.aiSearchConsent.findUnique({ where: { userId }, select: { enabled: true } }),
    prisma.adminRole.findUnique({ where: { userId }, select: { userId: true } }),
    prisma.reel.findMany({
      where: { userId },
      select: {
        id: true,
        caption: true,
        memo: true,
        review: true,
        categories: { select: { category: { select: { name: true } } } },
        tags: { select: { tag: { select: { name: true } } } },
      },
    }),
    prisma.$queryRaw<{ reelId: string; textHash: string }[]>`
      SELECT e."reelId", e."textHash" FROM "ReelEmbedding" e JOIN "Reel" r ON r."id" = e."reelId" WHERE r."userId" = ${userId}`,
  ]);
  const hashById = new Map(existing.map((e) => [e.reelId, e.textHash]));
  const pending = reels.filter((r) =>
    needsEmbedding(
      buildEmbeddingText(
        {
          caption: r.caption,
          memo: r.memo,
          review: r.review,
          categories: r.categories.map((c) => c.category.name),
          tags: r.tags.map((t) => t.tag.name),
        },
        { includePrivateNotes: Boolean(admin) },
      ),
      hashById.get(r.id),
    ),
  ).length;
  return { enabled: Boolean(consent?.enabled), total: reels.length, pending };
}
