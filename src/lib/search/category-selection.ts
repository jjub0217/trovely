/**
 * 카테고리 여러 개 동시 선택(AND)의 규칙. 화면과 서버가 같은 규칙을 쓴다(순수 함수).
 * - 빈 목록 = 전체
 * - ["uncategorized"] = 미분류(다른 카테고리와 함께 고를 수 없다)
 * - 그 밖에는 고른 카테고리를 모두 가진 게시물
 */
export const UNCATEGORIZED = "uncategorized";

/** 주소를 직접 고쳐 넣는 경우까지 막는 선택 상한 */
export const MAX_CATEGORY_SELECTION = 10;

/** 주소 값(?category=a 또는 ?category=a&category=b)이나 서버 함수 인자를 정리한다 */
export function normalizeCategoryIds(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : raw === undefined || raw === null ? [] : [raw];
  const out: string[] = [];
  for (const item of list) {
    if (typeof item !== "string") continue;
    const id = item.trim();
    if (!id || out.includes(id)) continue;
    out.push(id);
  }
  if (out.includes(UNCATEGORIZED)) return [UNCATEGORIZED];
  return out.slice(0, MAX_CATEGORY_SELECTION);
}

/** 버튼을 눌렀을 때 다음 선택. id가 ""이면 "전체" 버튼이다 */
export function toggleCategory(current: string[], id: string): string[] {
  if (!id) return [];
  if (id === UNCATEGORIZED) return current.includes(UNCATEGORIZED) ? [] : [UNCATEGORIZED];
  const ids = current.filter((c) => c !== UNCATEGORIZED);
  if (ids.includes(id)) return ids.filter((c) => c !== id);
  if (ids.length >= MAX_CATEGORY_SELECTION) return ids;
  return [...ids, id];
}

/** 게시물의 카테고리 목록이 선택을 만족하는지(데모 예시 데이터처럼 메모리에서 거를 때) */
export function matchesCategories(reelCategoryIds: string[], selected: string[]): boolean {
  if (selected.length === 0) return true;
  if (selected.includes(UNCATEGORIZED)) return reelCategoryIds.length === 0;
  return selected.every((id) => reelCategoryIds.includes(id));
}
