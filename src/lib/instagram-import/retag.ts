/** 가져온 릴스 태그 다시 보기 화면의 순수 함수 */
import { normalizeTagNames } from "@/lib/tag-name";

/** 태그 칸에 쓴 글(쉼표로 나눔)을 저장할 태그 이름으로 */
export function parseTagInput(typed: string): string[] {
  return normalizeTagNames(typed.split(","));
}

/** 칸에서 벗어날 때 저장할지: 정규화한 태그가 순서 무시하고 같으면 저장하지 않는다 */
export function tagsChanged(before: string[], typed: string): boolean {
  const a = [...new Set(normalizeTagNames(before))].sort();
  const b = [...parseTagInput(typed)].sort();
  return a.length !== b.length || a.some((v, i) => v !== b[i]);
}

/** 묶음: 릴스에 지금 붙어 있는 첫 번째 카테고리 이름, 없으면 미분류 */
export const RETAG_NONE_KEY = "__none__";
export function retagGroupOf(categories: string[]): { key: string; label: string } {
  return categories.length > 0 ? { key: categories[0], label: categories[0] } : { key: RETAG_NONE_KEY, label: "미분류" };
}
