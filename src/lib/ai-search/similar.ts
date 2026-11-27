import { prisma } from "@/lib/db";
import { buildKeywordWhere } from "@/lib/search/keyword-where";
import { similarExtras } from "@/lib/search/merge";
import { reelsByIds, semanticReelIdsByVector, type SemanticFilter } from "@/lib/search/semantic";
import type { EmbedFn } from "@/lib/search/embeddings";
import { canUseAiSearch } from "./access";
import { isAiSearchPublic } from "./limits";
import { getQueryVector } from "./query-vector";

export type SimilarResult = {
  items: Awaited<ReturnType<typeof reelsByIds>>;
  limited?: boolean;
  /** 공개 스위치는 켜져 있지만 본인이 동의하지 않아 쓸 수 없음(화면이 동의 창을 띄운다) */
  needsConsent?: boolean;
};

/**
 * 일반 가입자(관리자 아님)의 비슷한 콘텐츠 찾기. 쓸 수 없으면 Gemini를 부르지 않는다.
 * 키워드 결과에 이미 있는 게시물은 뺀다. 그 사람 게시물에서만 찾는다.
 */
export async function findSimilarForMember(
  userId: string,
  query: string,
  filter: Pick<SemanticFilter, "categoryIds" | "source">,
  options: { embed?: EmbedFn } = {},
): Promise<SimilarResult> {
  if (!(await canUseAiSearch(userId))) {
    return isAiSearchPublic() ? { items: [], needsConsent: true } : { items: [] };
  }
  const result = await getQueryVector(userId, query, { embed: options.embed });
  if ("limited" in result) return { items: [], limited: true };
  if ("unavailable" in result) return { items: [] };

  const [ids, keywordIds] = await Promise.all([
    semanticReelIdsByVector(userId, result.vector, filter),
    prisma.reel
      .findMany({ where: buildKeywordWhere({ userId, search: query, ...filter }), select: { id: true } })
      .then((rows) => rows.map((r) => r.id)),
  ]);
  return { items: await reelsByIds(userId, similarExtras(keywordIds, ids)) };
}
