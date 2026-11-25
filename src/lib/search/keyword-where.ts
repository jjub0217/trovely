import type { Prisma, ReelSource } from "@prisma/client";

/**
 * 낱말 검색 조건(홈 화면과 측정 스크립트가 함께 쓴다).
 * 검색어를 띄어쓰기로 나눈 낱말이 모두 메모, 후기, 캡션, 태그, 카테고리 이름 중 어딘가에 들어 있어야 한다.
 */
export function buildKeywordWhere({
  userId,
  search,
  categoryId,
  source,
  status,
}: {
  userId: string;
  search?: string;
  categoryId?: string | "uncategorized";
  source?: ReelSource;
  status?: string;
}): Prisma.ReelWhereInput {
  const where: Prisma.ReelWhereInput = { userId };

  if (source) where.source = source;

  if (categoryId === "uncategorized") {
    where.categories = { none: {} };
  } else if (categoryId) {
    where.categories = { some: { categoryId } };
  }

  if (status === "visited") {
    where.visited = true;
  } else if (status === "unvisited") {
    where.visited = false;
  } else if (status === "reviewed") {
    where.review = { not: null };
  }

  const keywords = (search ?? "").trim().split(/\s+/).filter(Boolean);
  if (keywords.length > 0) {
    where.AND = keywords.map((keyword) => ({
      OR: [
        { memo: { contains: keyword, mode: "insensitive" as const } },
        { review: { contains: keyword, mode: "insensitive" as const } },
        { caption: { contains: keyword, mode: "insensitive" as const } },
        { tags: { some: { tag: { name: { contains: keyword, mode: "insensitive" as const } } } } },
        { categories: { some: { category: { name: { contains: keyword, mode: "insensitive" as const } } } } },
      ],
    }));
  }
  return where;
}
