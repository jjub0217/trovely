// 데모 모드 공용 플래그.
// NEXT_PUBLIC_DEMO_MODE=true 로 빌드된 배포(별도 데모 프로젝트)에서만 켜진다.
// 켜지면: 인증을 우회하고(로그인 없이 접근), DB 조회를 mock으로 갈아끼운다.
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// 데모에서 requireAuth/requireAdmin이 돌려줄 더미 userId.
// mock 함수들은 이 값을 실제로 쓰지 않으므로(고정 mock 반환) 값 자체는 의미 없음.
export const DEMO_USER_ID = "demo-user-id";
