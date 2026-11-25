import { isAdmin } from "@/lib/auth";
import { AskShell } from "@/components/ask-shell";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // AI에게 물어보기 창의 상태를 화면 이동과 상관없이 유지하려고 앱 전체 틀에 둔다(관리자만 켬)
  const admin = await isAdmin();
  return (
    <div className="mx-auto max-w-[420px] min-h-screen bg-gray-900">
      <AskShell enabled={admin}>{children}</AskShell>
    </div>
  );
}
