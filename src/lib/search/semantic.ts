import { Prisma, type ReelSource } from "@prisma/client";
import { prisma } from "@/lib/db";
import { embedTexts, EMBEDDING_DIM } from "@/lib/ai/gemini";
import { toVectorLiteral } from "./embedding-text";
import { orderByIds } from "./rank";

export const SEMANTIC_TAKE = 20;

export type SemanticFilter = {
  categoryId?: string | "uncategorized";
  source?: ReelSource;
  visited?: boolean;
};

/** 검색어와 뜻이 가까운 순서로 릴스 id를 돌려준다(필터 안에서, 잘라 내는 기준 없이 상위 take개) */
export async function semanticReelIds(
  userId: string,
  query: string,
  filter: SemanticFilter = {},
  take = SEMANTIC_TAKE,
): Promise<string[]> {
  const [values] = await embedTexts([query], "RETRIEVAL_QUERY");
  const vec = toVectorLiteral(values, EMBEDDING_DIM);

  const conds: Prisma.Sql[] = [Prisma.sql`r."userId" = ${userId}`];
  if (filter.source) conds.push(Prisma.sql`r."source" = ${filter.source}::"ReelSource"`);
  if (filter.categoryId === "uncategorized") {
    conds.push(Prisma.sql`NOT EXISTS (SELECT 1 FROM "ReelCategory" rc WHERE rc."reelId" = r."id")`);
  } else if (filter.categoryId) {
    conds.push(
      Prisma.sql`EXISTS (SELECT 1 FROM "ReelCategory" rc WHERE rc."reelId" = r."id" AND rc."categoryId" = ${filter.categoryId})`,
    );
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
export async function semanticReels(userId: string, query: string, filter: SemanticFilter = {}, take = SEMANTIC_TAKE) {
  const ids = await semanticReelIds(userId, query, filter, take);
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
