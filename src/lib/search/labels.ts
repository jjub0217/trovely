/**
 * 검색 화면 문구. 확정된 것과 임시인 것을 주석으로 구분한다.
 * 정해지면 이 파일만 바꾼다.
 */

/** 상황 1: 낱말 결과가 0개라 뜻이 비슷한 릴스를 주 목록으로 보여 줄 때 위에 붙는 안내(2026-11-25 사용자 확정) */
export const NO_KEYWORD_MATCH_NOTE = "검색어와 비슷한 콘텐츠를 찾았습니다";

/** 상황 2: 낱말 결과 아래 비슷한 결과를 펼치는 버튼(2026-11-25 사용자 확정). 누르면 사라지고 펼쳐진다 */
export const SIMILAR_MORE_BUTTON = "비슷한 콘텐츠 더 보기";

/** 검색창 안내 문구(2026-11-25 사용자 확정) */
export const SEARCH_PLACEHOLDER = "검색 (태그, 메모, 후기, 카테고리...)"; // AI 질문을 봇 창으로 옮겨서 예전 문구로(2026-11-25)

/** AI 창 제목, 봇 버튼 이름(2026-11-25 사용자 확정) */
export const ASK_AI_BUTTON = "AI에게 물어보기";

/** AI에게 물어보기 화면 문구(시안 a 문구를 "콘텐츠"로 맞춤. 바꾸고 싶으면 여기서) */
export const ASK_LOADING = "질문을 읽고 저장한 콘텐츠를 찾는 중…";
export const ASK_CHIPS_LABEL = "AI가 알아들은 조건";
export const ASK_ANSWER_TITLE = "AI 답";
export const ASK_NOT_FOUND = "저장한 콘텐츠에서 맞는 답을 찾지 못했어요.";
export const ASK_FOOTNOTE = "조건이 틀렸으면 ×를 눌러 빼 주세요.";
/** 화면에는 안 보이고 스크린 리더만 읽는 카드 묶음 이름 */
export const ASK_SOURCES_LABEL = "답변에 참고한 콘텐츠";
/** AI 창 질문 입력 칸 안내(사용자 확정) */
export const ASK_INPUT_PLACEHOLDER = "저장한 콘텐츠에 대해 궁금한 점을 물어보세요";
