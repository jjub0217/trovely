/**
 * 개인정보 처리방침에 들어가는 운영 정보.
 * "[확인 필요]"가 남아 있으면 배포하지 않는다(대시보드나 사용자 결정으로 채울 값).
 */
const PENDING = "[확인 필요]";

export const PRIVACY_INFO = {
  officerName: `${PENDING} 운영자 실명`,
  contactEmail: `${PENDING} Trovely 문의 메일`,
  effectiveDate: `${PENDING} 배포일`,
  // Supabase 무료 요금제의 백업 제공 여부를 대시보드(Database → Backups)에서 확인한 뒤 적는다
  backupRetention: `${PENDING} 운영 데이터베이스의 백업 보관 여부와 기간`,
  processors: [
    {
      name: "Supabase, Inc.",
      task: "데이터베이스, 회원 인증(로그인, 비밀번호 재설정 메일), 썸네일 이미지 저장",
      // 운영 프로젝트 Project Settings → General의 Region
      location: `${PENDING} 운영 프로젝트 리전`,
    },
    {
      name: "Vercel Inc.",
      task: "웹사이트 호스팅과 서버 실행",
      // vercel.json의 regions: ["icn1"] = 서버 함수는 서울. 정적 파일과 요청 전달 경로는 전 세계 지점을 거칠 수 있다.
      location: "서버 실행: 대한민국(서울). 요청 전달과 정적 파일 제공: Vercel의 전 세계 지점",
    },
  ],
  overseasTransfer: `${PENDING} 국외 이전 항목(이전 국가, 시기와 방법, 이전받는 자의 연락처, 보유 기간, 거부 방법). 리전 확인 뒤 작성`,
  children: `${PENDING} 만 14세 미만 가입 정책`,
} as const;
