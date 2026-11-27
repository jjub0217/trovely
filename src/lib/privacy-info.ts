/**
 * 개인정보 처리방침에 들어가는 운영 정보(대시보드 확인과 사용자 결정으로 채운 값).
 * 값을 바꾸면 시행일도 함께 바꾼다.
 */

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
  // AI 검색(선택 기능, 동의한 경우만). 공개 전 확인할 것: 받는 자의 정확한 법인명과 연락처(Google Cloud 결제 계정의 계약 법인),
  // 개인정보 보호법 제28조의8 제2항 알릴 사항을 동의 창에도 다 넣어야 하는지. 확인 뒤 시행일(effectiveDate)도 함께 바꾼다.
  aiSearch: {
    // 임시 값: 결제 계정의 계약 법인 확인 뒤 교체
    recipient: "Google LLC",
    // 임시 값: 공개 전에 Google의 개인정보 문의처를 확인해 채운다(확인하지 않은 주소를 넣지 않는다)
    contact: "확인 필요",
    items: "게시물의 카테고리, 태그, 캡션과 검색어(직접 작성한 메모와 후기, 이메일, 로그인 정보는 보내지 않습니다)",
    country: "미국 등 Google 또는 그 대리인의 시설이 있는 국가",
    timing: "AI 검색에 동의한 뒤 게시물을 저장하거나 고칠 때, 그리고 검색할 때 인터넷으로 전송",
    purpose: "검색어와 의미가 비슷한 게시물을 찾기 위해 글을 숫자 값(벡터)으로 바꾸는 일",
    retention: "Google은 남용 방지를 위해 최대 55일 동안 보관하며, AI 학습에는 쓰지 않습니다.",
    refuse: "AI 검색은 선택 기능이라 동의하지 않아도 다른 기능을 그대로 쓸 수 있습니다. AI 검색 설정에서 언제든 끌 수 있고, 끄면 Trovely에 저장된 AI 검색용 데이터를 바로 삭제합니다.",
  },
} as const;
