import Link from "next/link";
import { ReelForm } from "@/components/reel-form";
import { getCategories } from "@/lib/actions";
import { extractSharedInstagramUrl } from "@/lib/share-input";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  url?: string | string[];
  title?: string | string[];
  text?: string | string[];
}>;

export default async function NewReelPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = (await searchParams) ?? {};
  const categories = await getCategories();
  const initialUrl = extractSharedInstagramUrl(params);

  return (
    <div>
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800">
        <Link href="/" className="text-gray-400" aria-label="뒤로가기">←</Link>
        <h1 className="text-lg font-bold text-purple-100">릴스 추가</h1>
      </div>
      <ReelForm categories={categories} initialUrl={initialUrl} />
    </div>
  );
}
