import { Prisma, type ReelSource } from "@prisma/client";
import { prisma } from "@/lib/db";
import { embedTexts, EMBEDDING_DIM } from "@/lib/ai/gemini";
import { toVectorLiteral } from "./embedding-text";
import { orderByIds } from "./rank";
import { UNCATEGORIZED } from "./category-selection";

export const SEMANTIC_TAKE = 20;

export type SemanticFilter = {
  /** 빈 목록 = 전체, ["uncategorized"] = 미분류, 그 밖에는 모두 가진 게시물(AND) */
  categoryIds?: string[];
  source?: ReelSource;
  visited?: boolean;
};

/** 검색어와 뜻이 가까운 순서로 릴스 id를 돌려준다(필터 안에서, 잘라 내는 기준 없이 상위 take개) */
export async function semanticReelIds(
  userId: string,
  query: string,
  filter: SemanticFilter = {},
  take = SEMANTIC_TAKE,
  options?: { fast?: boolean },
): Promise<string[]> {
  // 홈 화면 검색은 빨라야 해서 다시 시도하지 않고 3초 안에 끝낸다(실패하면 낱말 결과만 보인다)
  const [values] = await embedTexts([query], "RETRIEVAL_QUERY", options?.fast ? { retries: 0, timeoutMs: 3000 } : undefined);
  return semanticReelIdsByVector(userId, values, filter, take);
}

/** 이미 만든 검색어 벡터로, 그 사람 게시물 중 뜻이 가까운 순서의 id(필터 안에서 상위 take개) */
export async function semanticReelIdsByVector(
  userId: string,
  values: number[],
  filter: SemanticFilter = {},
  take = SEMANTIC_TAKE,
): Promise<string[]> {
  const vec = toVectorLiteral(values, EMBEDDING_DIM);
  const conds: Prisma.Sql[] = [Prisma.sql`r."userId" = ${userId}`];
  if (filter.source) conds.push(Prisma.sql`r."source" = ${filter.source}::"ReelSource"`);
  const categoryIds = filter.categoryIds ?? [];
  if (categoryIds.includes(UNCATEGORIZED)) {
    conds.push(Prisma.sql`NOT EXISTS (SELECT 1 FROM "ReelCategory" rc WHERE rc."reelId" = r."id")`);
  } else {
    // 고른 카테고리마다 "붙어 있음" 조건 하나(모두 만족). 조건으로 먼저 거른 뒤 그 안에서 가까운 순으로 고른다
    for (const categoryId of categoryIds) {
      conds.push(
        Prisma.sql`EXISTS (SELECT 1 FROM "ReelCategory" rc WHERE rc."reelId" = r."id" AND rc."categoryId" = ${categoryId})`,
      );
    }
  }
  if (filter.visited !== undefined) conds.push(Prisma.sql`r."visited" = ${filter.visited}`);

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT r."id" FROM "Reel" r
    JOIN "ReelEmbedding" e ON e."reelId" = r."id"
    WHERE ${Prisma.join(conds, " AND ")}
    ORDER BY e."embedding" <=> ${vec}::vector
    LIMIT ${take}`;
  return rows.map((r) => r.id);
}

/** 뜻 검색 결과를 목록 카드에 쓰는 모양(getReels의 items와 같은 include)으로 */
export async function semanticReels(
  userId: string,
  query: string,
  filter: SemanticFilter = {},
  take = SEMANTIC_TAKE,
  options?: { fast?: boolean },
) {
  const ids = await semanticReelIds(userId, query, filter, take, options);
  return reelsByIds(userId, ids);
}

/** id 목록을 그 순서대로 목록 카드 모양으로(그 사람 게시물만) */
export async function reelsByIds(userId: string, ids: string[]) {
  if (ids.length === 0) return [];
  const reels = await prisma.reel.findMany({
    where: { id: { in: ids }, userId },
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
  });
  return orderByIds(reels, ids);
}
