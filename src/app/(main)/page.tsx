import nextDynamic from "next/dynamic";
import { Suspense } from "react";
import { Header } from "@/components/header";
import { ReelGrid } from "@/components/reel-grid";
import { getReels, getCategories, getUserStats, getUserEmail, searchReelsSemantic } from "@/lib/actions";
import { SEMANTIC_RESULT_LABEL } from "@/lib/search/labels";
import { describeAiError } from "@/lib/ai/gemini";
import { parseReelSource } from "@/lib/reel-url";

const SearchBar = nextDynamic(() => import("@/components/search-bar").then((m) => m.SearchBar));
const CategoryFilter = nextDynamic(() => import("@/components/category-filter").then((m) => m.CategoryFilter));
const SourceTabs = nextDynamic(() => import("@/components/source-tabs").then((m) => m.SourceTabs));

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string; source?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const search = params.search;
  const categoryId = params.category;
  const source = parseReelSource(params.source);

  const semantic = params.mode === "semantic" && Boolean(search?.trim());

  // 뜻 검색은 상위 20개만(이어 불러오기 없음). AI 연결이 실패하면 목록 대신 안내 문구.
  async function loadList(): Promise<{ items: Awaited<ReturnType<typeof getReels>>["items"]; nextCursor: string | null; error?: string }> {
    if (!semantic) return getReels({ search, categoryId, source, take: 10 });
    try {
      const { items } = await searchReelsSemantic({ query: search!, categoryId, source });
      return { items, nextCursor: null };
    } catch (e) {
      return { items: [], nextCursor: null, error: describeAiError(e) };
    }
  }

  const [{ items, nextCursor, error: listError }, categories, stats, email] = await Promise.all([
    loadList(),
    getCategories(),
    getUserStats(),
    getUserEmail(),
  ]);

  return (
    <div>
      <Header email={email} totalReels={stats.totalReels} visitedReels={stats.visitedReels} />
      <Suspense>
        <SearchBar />
      </Suspense>
      <Suspense>
        <SourceTabs />
      </Suspense>
      <div className="px-6 pt-3 pb-1">
        <Suspense>
          <CategoryFilter categories={categories} />
        </Suspense>
      </div>
      {semantic && (
        <p className="px-6 pb-2 text-xs text-gray-500">{listError ?? SEMANTIC_RESULT_LABEL}</p>
      )}
      <ReelGrid
        initialReels={items}
        initialCursor={nextCursor}
        search={search}
        categoryId={categoryId}
        source={source}
      />
    </div>
  );
}
