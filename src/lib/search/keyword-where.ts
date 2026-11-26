import type { Prisma, ReelSource } from "@prisma/client";
import { UNCATEGORIZED } from "./category-selection";

/**
 * 낱말 검색 조건(홈 화면과 측정 스크립트가 함께 쓴다).
 * 검색어를 띄어쓰기로 나눈 낱말이 모두 메모, 후기, 캡션, 태그, 카테고리 이름 중 어딘가에 들어 있어야 한다.
 */
export function buildKeywordWhere({
  userId,
  search,
  categoryIds = [],
  source,
  status,
}: {
  userId: string;
  search?: string;
  /** 빈 목록 = 전체, ["uncategorized"] = 미분류, 그 밖에는 모두 가진 게시물(AND) */
  categoryIds?: string[];
  source?: ReelSource;
  status?: string;
}): Prisma.ReelWhereInput {
  const where: Prisma.ReelWhereInput = { userId };

  if (source) where.source = source;

  // 카테고리 조건과 검색어 조건을 한 AND 목록에 모은다(따로 넣으면 한쪽이 다른 쪽을 덮어쓴다)
  const and: Prisma.ReelWhereInput[] = [];
  if (categoryIds.includes(UNCATEGORIZED)) {
    where.categories = { none: {} };
  } else {
    for (const categoryId of categoryIds) and.push({ categories: { some: { categoryId } } });
  }

  if (status === "visited") {
    where.visited = true;
  } else if (status === "unvisited") {
    where.visited = false;
  } else if (status === "reviewed") {
    where.review = { not: null };
  }

  const keywords = (search ?? "").trim().split(/\s+/).filter(Boolean);
  for (const keyword of keywords) {
    and.push({
      OR: [
        { memo: { contains: keyword, mode: "insensitive" as const } },
        { review: { contains: keyword, mode: "insensitive" as const } },
        { caption: { contains: keyword, mode: "insensitive" as const } },
        { tags: { some: { tag: { name: { contains: keyword, mode: "insensitive" as const } } } } },
        { categories: { some: { category: { name: { contains: keyword, mode: "insensitive" as const } } } } },
      ],
    });
  }
  if (and.length > 0) where.AND = and;
  return where;
}
