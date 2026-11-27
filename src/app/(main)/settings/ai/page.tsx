import { redirect } from "next/navigation";
import { isAdmin, requireAuth } from "@/lib/auth";
import { DEMO_MODE } from "@/lib/demo";
import { getAiSearchStatus } from "@/lib/ai-search/access";
import { isAiSearchPublic } from "@/lib/ai-search/limits";
import { AiSearchSettings } from "@/components/ai-search-settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI 검색 설정" };

export default async function AiSearchSettingsPage() {
  if (DEMO_MODE) redirect("/");
  const userId = await requireAuth();
  const admin = await isAdmin();
  if (!admin && !isAiSearchPublic()) redirect("/");
  const status = await getAiSearchStatus(userId);
  return <AiSearchSettings {...status} admin={admin} />;
}
