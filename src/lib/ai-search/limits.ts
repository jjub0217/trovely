/** AI 검색(비슷한 콘텐츠 찾기)을 일반 가입자에게 여는 데 쓰는 고정값과 판단(순수 함수) */

export type AiUsageKind = "query" | "document";

/** 하루 상한(한국 날짜 기준). query = 검색어 벡터, document = 게시물 벡터 개수 (2026-11-26 사용자 결정) */
export const AI_LIMITS: Record<AiUsageKind, { perUser: number; total: number }> = {
  query: { perUser: 30, total: 1000 },
  document: { perUser: 3000, total: 10000 },
};

/** 동의 창과 처리방침이 같은 버전을 가리키는지 확인하는 값. 처리방침 시행일이 정해지면 같은 날짜로 바꾼다 */
export const AI_SEARCH_POLICY_VERSION = "2026-11-27";

/** 공개 스위치(서버 전용 환경변수). "true"일 때만 일반 가입자에게 열린다 */
export function isAiSearchPublic(): boolean {
  return process.env.AI_SEARCH_PUBLIC === "true";
}

/** 관리자는 운영자 본인이라 동의 없이 쓴다. 일반 가입자는 공개 스위치가 켜지고 본인이 동의했을 때만 */
export function decideAiAccess(input: { isAdmin: boolean; isPublic: boolean; consentEnabled: boolean }): boolean {
  return input.isAdmin || (input.isPublic && input.consentEnabled);
}
