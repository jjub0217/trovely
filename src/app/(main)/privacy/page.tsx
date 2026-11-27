import Link from "next/link";
import type { Metadata } from "next";
import { PRIVACY_INFO } from "@/lib/privacy-info";
import { isAiSearchPublic } from "@/lib/ai-search/limits";

export const metadata: Metadata = { title: "개인정보 처리방침" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold text-gray-100">{title}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-gray-300">{children}</div>
    </section>
  );
}

function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc pl-5 flex flex-col gap-1">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export default function PrivacyPage() {
  const info = PRIVACY_INFO;
  // AI 검색 항목은 공개 전 공지나 공개가 시작된 뒤에만 보인다(그 전에는 지금 방침 그대로)
  const showAiSearch = process.env.AI_SEARCH_NOTICE === "true" || isAiSearchPublic();
  return (
    <main className="px-6 py-10 flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link href="/" className="text-xs text-gray-500 hover:text-gray-300">
          ← Trovely로 돌아가기
        </Link>
        <h1 className="text-2xl font-bold text-purple-100">개인정보 처리방침</h1>
        <p className="text-sm text-gray-400">
          Trovely는 이용자의 개인정보를 어떤 목적으로 어떻게 처리하는지 알리기 위해 이 방침을 공개합니다.
        </p>
      </div>

      <Section title="1. 처리 목적">
        <List
          items={[
            "회원가입, 로그인, 계정 관리",
            "콘텐츠(인스타그램 릴스, 유튜브 영상 주소) 저장, 분류, 검색, 기록 관리",
            "문의 응대와 안전한 서비스 운영",
          ]}
        />
      </Section>

      <Section title="2. 처리하는 개인정보 항목">
        <p className="font-medium text-gray-200">가입 방식에 따라 받는 정보</p>
        <List
          items={[
            "이메일 가입: 이메일 주소, 비밀번호(암호화된 형태로만 저장)",
            "Google 로그인: 이메일 주소, 이름, 프로필 사진 주소, Google 계정 식별값",
            "카카오 로그인: 이메일 주소, 닉네임, 카카오 회원번호",
          ]}
        />
        <p className="font-medium text-gray-200">서비스를 이용하며 저장되는 정보</p>
        <List
          items={[
            "저장한 콘텐츠의 주소, 썸네일 주소, 게시물 설명 글(캡션)",
            "직접 입력한 카테고리, 태그, 메모, 후기, 방문 완료 여부",
          ]}
        />
        <p className="font-medium text-gray-200">자동으로 생성되는 정보</p>
        <List
          items={[
            "로그인 상태를 유지하기 위한 쿠키",
            "서비스 운영 기록(접속 IP 주소, 접속 일시, 요청 기록 등). 아래 위탁 업체가 운영 과정에서 남깁니다.",
          ]}
        />
      </Section>

      <Section title="3. 보유 기간과 파기">
        <List
          items={[
            "계정 정보와 저장한 콘텐츠는 회원탈퇴 때까지 보관합니다.",
            "회원탈퇴를 하면 로그인 계정과 저장한 콘텐츠, 캡션, 카테고리, 태그, 메모, 후기를 바로 삭제합니다. 삭제한 정보는 복구할 수 없습니다.",
            "탈퇴할 때 고른 탈퇴 사유는 서비스 개선 통계를 위해 탈퇴 날짜와 함께 남깁니다. 이 기록에는 이메일, 계정 식별값 등 누가 탈퇴했는지 알 수 있는 정보가 없습니다.",
            `데이터베이스 백업: ${info.backupRetention}`,
            "서비스 운영 기록은 각 위탁 업체가 정한 기간 동안 보관된 뒤 삭제됩니다.",
            "관계 법령에 따라 보관해야 하는 정보가 생기면 그 법령에서 정한 기간 동안 보관합니다.",
          ]}
        />
      </Section>

      <Section title="4. 개인정보의 제3자 제공">
        <p>Trovely는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 법령에 따라 요구되는 경우는 예외로 합니다.</p>
      </Section>

      <Section title="5. 개인정보 처리 위탁과 국외 이전">
        <p>Trovely는 서비스 운영을 위해 아래 업체에 개인정보 처리를 맡깁니다.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-gray-700">
            <thead className="bg-gray-800 text-gray-300">
              <tr>
                <th className="p-2 text-left border-b border-gray-700">업체</th>
                <th className="p-2 text-left border-b border-gray-700">맡기는 일</th>
                <th className="p-2 text-left border-b border-gray-700">처리 장소</th>
              </tr>
            </thead>
            <tbody>
              {info.processors.map((p) => (
                <tr key={p.name} className="align-top">
                  <td className="p-2 border-b border-gray-800">{p.name}</td>
                  <td className="p-2 border-b border-gray-800">{p.task}</td>
                  <td className="p-2 border-b border-gray-800">{p.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>{info.overseasTransfer}</p>
        {showAiSearch && (
          <>
            <p className="font-medium text-gray-200">AI 검색(선택 기능, 동의한 경우만)</p>
            <List
              items={[
                `받는 자: ${info.aiSearch.recipient} (문의: ${info.aiSearch.contact})`,
                `보내는 항목: ${info.aiSearch.items}`,
                `보내는 국가: ${info.aiSearch.country}`,
                `보내는 시기와 방법: ${info.aiSearch.timing}`,
                `목적: ${info.aiSearch.purpose}`,
                `보유 기간: ${info.aiSearch.retention}`,
                `거부 방법: ${info.aiSearch.refuse}`,
              ]}
            />
          </>
        )}
        <p>
          콘텐츠 썸네일과 설명 글을 가져오기 위해 저장한 게시물 주소를 Iframely, Microlink, YouTube, Instagram에 보냅니다. 이때 이메일 등 계정 정보는 함께 보내지 않습니다.
        </p>
      </Section>

      <Section title="6. 이용자의 권리와 행사 방법">
        <List
          items={[
            "저장한 콘텐츠, 카테고리, 태그, 메모, 후기는 서비스 안에서 언제든 확인, 수정, 삭제할 수 있습니다.",
            "비밀번호는 메뉴의 비밀번호 변경에서 바꿀 수 있습니다.",
            "메뉴의 회원탈퇴로 계정과 모든 데이터를 삭제할 수 있습니다.",
            ...(showAiSearch ? ["AI 검색은 메뉴의 AI 검색 설정에서 언제든 끌 수 있습니다. 끄면 Trovely에 저장된 AI 검색용 데이터를 바로 삭제합니다."] : []),
            "그 밖에 개인정보 열람, 정정, 삭제, 처리 정지를 원하면 아래 문의 메일로 요청할 수 있습니다.",
            "Google, 카카오 계정에서 Trovely 연결을 끊고 싶다면 각 서비스의 계정 설정에서 끊을 수 있습니다.",
          ]}
        />
      </Section>

      <Section title="7. 안전성 확보 조치">
        <List
          items={[
            "비밀번호는 원래 글자를 알아볼 수 없는 암호화된 형태로만 저장합니다.",
            "서비스와 이용자 사이의 통신은 암호화(HTTPS)합니다.",
            "데이터베이스에는 서버만 접근하며, 관리자 화면은 관리자 권한이 있는 계정만 볼 수 있습니다.",
          ]}
        />
      </Section>

      <Section title="8. 쿠키">
        <p>
          로그인 상태를 유지하기 위해 쿠키를 사용합니다. 광고나 방문 분석 목적의 쿠키는 쓰지 않습니다. 브라우저 설정에서 쿠키를 막을 수 있지만, 그러면 로그인이 필요한 기능을 쓸 수 없습니다.
        </p>
      </Section>

      <Section title="9. 만 14세 미만 아동">
        <p>{info.children}</p>
      </Section>

      <Section title="10. 개인정보 보호책임자와 문의">
        <List
          items={[
            `개인정보 보호책임자: ${info.officerName}`,
            `문의 메일: ${info.contactEmail}`,
          ]}
        />
        <p>
          개인정보 침해에 대한 상담이 필요하면 개인정보침해 신고센터(국번 없이 118, privacy.kisa.or.kr)에 문의할 수 있습니다.
        </p>
      </Section>

      <Section title="11. 처리방침의 변경">
        <p>처리방침을 바꾸면 서비스 안에서 알립니다.</p>
        <p>시행일: {info.effectiveDate}</p>
      </Section>
    </main>
  );
}
