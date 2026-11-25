/**
 * 검색창 입력값과 주소의 검색어(?search=)를 맞추는 규칙.
 * - prevUrl: 마지막으로 본 주소의 검색어
 * - pushed: 검색창이 스스로 주소에 넣은 검색어
 * - query: 검색창에 지금 보이는 값
 * 주소의 검색어가 바뀌었는데 검색창이 넣은 값이 아니면(로고, 뒤로 가기 등) 검색창을 주소에 맞춘다.
 */
export type SearchInputState = { prevUrl: string; pushed: string; query: string };

export function syncSearchInput(state: SearchInputState, urlSearch: string): SearchInputState {
  if (urlSearch === state.prevUrl) return state;
  if (urlSearch === state.pushed) return { ...state, prevUrl: urlSearch };
  return { prevUrl: urlSearch, pushed: urlSearch, query: urlSearch };
}
