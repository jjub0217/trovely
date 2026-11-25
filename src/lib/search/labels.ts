/**
 * 검색 화면 문구. 모두 임시다(2026-11-25 사용자가 다른 AI에게 문구 제안을 받는 중).
 * 정해지면 이 파일만 바꾼다.
 */

/** 상황 1: 낱말 결과가 0개라 뜻이 비슷한 릴스를 주 목록으로 보여 줄 때 위에 붙는 안내 */
export function noKeywordMatchNote(query: string): string {
  return `'${query}'이(가) 들어간 릴스는 없어서, 뜻이 비슷한 릴스를 보여 드려요.`;
}

/** 상황 2: 낱말 결과 아래에 접어 둔 비슷한 릴스를 펼치는 버튼 */
export const SIMILAR_MORE_BUTTON = "비슷한 릴스 더 보기";

/** 상황 2: 펼친 뒤 다시 접는 버튼 */
export const SIMILAR_LESS_BUTTON = "비슷한 릴스 접기";
