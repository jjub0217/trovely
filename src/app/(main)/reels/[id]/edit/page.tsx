import Link from "next/link";
import { notFound } from "next/navigation";
import { getReel, getCategories } from "@/lib/actions";
import { ReelForm } from "@/components/reel-form";

export const dynamic = "force-dynamic";

export default async function EditReelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ back?: string }>;
}) {
  const { id } = await params;
  const { back } = await searchParams;
  const [reel, categories] = await Promise.all([
    getReel(id),
    getCategories(),
  ]);
  if (!reel) notFound();

  return (
    <div>
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800">
        <Link
          href={back ? `/reels/${id}?back=${encodeURIComponent(back)}` : `/reels/${id}`}
          className="text-gray-400"
          aria-label="뒤로가기"
        >
          ←
        </Link>
        <h1 className="text-lg font-bold text-purple-100">콘텐츠 수정</h1>
      </div>
      <ReelForm categories={categories} reel={reel} backHref={back} />
    </div>
  );
}
