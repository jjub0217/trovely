/**
 * 개인정보 처리방침에 들어가는 운영 정보.
 * "[확인 필요]"가 남아 있으면 배포하지 않는다(대시보드나 사용자 결정으로 채울 값).
 */
const PENDING = "[확인 필요]";

export const PRIVACY_INFO = {
  officerName: "강주현",
  // 2026-11-26 사용자 결정: 기존 계정을 문의 메일로 공개
  contactEmail: "devel.jjub@gmail.com",
  effectiveDate: "2026년 11월 26일",
  // 2026-11-26 확인: 운영 Supabase는 무료 요금제라 예약 백업이 없다(Database → Backups "Free Plan does not include project backups")
  backupRetention: "운영 데이터베이스의 별도 백업은 보관하지 않습니다. 그래서 삭제한 정보는 백업에도 남지 않습니다.",
  processors: [
    {
      name: "Supabase, Inc.",
      task: "데이터베이스, 회원 인증(로그인, 비밀번호 재설정 메일), 썸네일 이미지 저장",
      // 운영 프로젝트 Project Settings → General의 Region
      // 운영 프로젝트 리전 ap-northeast-2(AWS 서울), 2026-11-26 사용자 확인
      location: "대한민국(서울)",
    },
    {
      name: "Vercel Inc.",
      task: "웹사이트 호스팅과 서버 실행",
      // vercel.json의 regions: ["icn1"] = 서버 함수는 서울. 정적 파일과 요청 전달 경로는 전 세계 지점을 거칠 수 있다.
      location: "서버 실행: 대한민국(서울). 요청 전달과 정적 파일 제공: Vercel의 전 세계 지점",
    },
  ],
  overseasTransfer:
    "개인정보는 대한민국(서울)에 있는 서버에 저장하고 처리합니다. 두 업체의 본사는 미국에 있으며, 업체 운영 정책에 따라 장애 대응 등을 위해 해외에서 접근할 수 있습니다.",
  children: "Trovely는 만 14세 이상만 가입할 수 있습니다. 만 14세 미만 아동의 개인정보는 받지 않으며, 만 14세 미만이 가입한 사실을 알게 되면 계정과 정보를 삭제합니다.",
} as const;
