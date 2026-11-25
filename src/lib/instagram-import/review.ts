/** 검토 화면(묶음별 검토)에서 후보가 어느 묶음에 들어가는지 정하는 순수 함수 */

export type CandidateLike = {
  needsAi: boolean;
  keptCategories: string[];
  suggestedCategories: string[];
  newCategories: string[];
  uncertain: boolean;
};

export type GroupKind = "kept" | "ai" | "new" | "uncertain";
export type GroupRef = { key: string; label: string; kind: GroupKind };

export const UNCERTAIN_GROUP: GroupRef = { key: "uncertain", label: "분류 애매", kind: "uncertain" };

export function groupOf(c: CandidateLike): GroupRef {
  if (!c.needsAi && c.keptCategories.length > 0) {
    const label = c.keptCategories[0];
    return { key: `kept:${label}`, label, kind: "kept" };
  }
  if (c.suggestedCategories.length > 0) {
    const label = c.suggestedCategories[0];
    return { key: `ai:${label}`, label, kind: "ai" };
  }
  if (c.newCategories.length > 0) {
    const label = c.newCategories[0];
    return { key: `new:${label}`, label, kind: "new" };
  }
  return UNCERTAIN_GROUP;
}

/** 저장할 때 붙일 카테고리 이름들 */
export function finalCategories(c: CandidateLike): string[] {
  if (!c.needsAi) return c.keptCategories;
  return [...new Set([...c.suggestedCategories, ...c.newCategories])];
}

/** 검토 목록에 보일 수 있는가: 모든 게시물은 AI 제안(태그 포함)이 끝난 뒤 (2026-11-25 사용자 결정으로 큰 컬렉션도 AI 태그) */
export function isReviewable(c: { needsAi: boolean; suggested: boolean }): boolean {
  return c.suggested;
}

/** Prisma where 조건으로 같은 규칙 */
export const REVIEWABLE_WHERE = { suggested: true };

type SuggestionLike = { categories: string[]; newCategories: string[]; tags: string[]; uncertain: boolean };

/** AI 응답 하나를 후보에 쓸 값으로. 큰 컬렉션 게시물은 태그만, 사용자가 넣은 태그는 그대로 둔다. */
export function suggestionUpdate(c: { needsAi: boolean; tags: string[] }, s: SuggestionLike | undefined) {
  return {
    suggested: true,
    tags: c.tags.length > 0 ? c.tags : (s?.tags ?? []),
    suggestedCategories: c.needsAi ? (s?.categories ?? []) : [],
    newCategories: c.needsAi ? (s?.newCategories ?? []) : [],
    uncertain: c.needsAi ? (s?.uncertain ?? true) : false,
  };
}
