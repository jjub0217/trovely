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

/** AI에게 물어보기 창 문구(2026-11-25 사용자가 준 화면 시안 기준) */
export const ASK_EMPTY_TITLE = "저장한 콘텐츠에 대해 궁금한 점을 물어보세요.";
export const ASK_EXAMPLE_QUESTION = "이번 주말 파주에서 안 가 본 데이트 장소 있어?";
export const ASK_LOADING = "저장한 콘텐츠를 살펴보고 있어요.";
export const ASK_NOT_FOUND = "저장한 콘텐츠에서 맞는 답을 찾지 못했어요.";
export const ASK_INPUT_PLACEHOLDER = "궁금한 점을 입력하세요";
/** 화면에는 안 보이고 스크린 리더만 읽는 이름 */
export const ASK_SOURCES_LABEL = "답변에 참고한 콘텐츠";
export const ASK_CHIPS_LABEL = "AI가 알아들은 조건";

/** 비슷한 콘텐츠를 버튼을 누를 때 불러오기(2026-11-26 사용자 결정: 버튼에 개수 없음) */
export const SIMILAR_LOADING = "찾는 중...";
export const SIMILAR_EMPTY = "비슷한 콘텐츠가 없습니다";
export const SIMILAR_PREPARING = "AI 검색을 준비하고 있어요. 잠시 뒤 다시 눌러 주세요.";
/** 일반 가입자 하루 상한을 넘었을 때(데모 문구와 같은 방식) */
export const AI_SEARCH_QUOTA_MESSAGE = "오늘 AI 검색을 쓸 수 있는 횟수를 다 썼어요. 내일 다시 써 주세요.";
