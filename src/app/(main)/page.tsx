import nextDynamic from "next/dynamic";
import { Suspense } from "react";
import { Header } from "@/components/header";
import { ReelGrid } from "@/components/reel-grid";
import { getReels, getCategories, getUserStats, getUserEmail, getSimilarReels } from "@/lib/actions";
import { parseReelSource } from "@/lib/reel-url";

const SearchBar = nextDynamic(() => import("@/components/search-bar").then((m) => m.SearchBar));
const CategoryFilter = nextDynamic(() => import("@/components/category-filter").then((m) => m.CategoryFilter));
const SourceTabs = nextDynamic(() => import("@/components/source-tabs").then((m) => m.SourceTabs));

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string; source?: string }>;
}) {
  const params = await searchParams;
  const search = params.search;
  const categoryId = params.category;
  const source = parseReelSource(params.source);

  // 뜻 검색이 실패해도(키 없음, AI 오류) 낱말 결과는 그대로 보여 준다
  async function loadSimilar(): Promise<{ items: Awaited<ReturnType<typeof getSimilarReels>>["items"]; limited?: boolean }> {
    if (!search?.trim()) return { items: [] };
    try {
      return await getSimilarReels({ query: search, categoryId, source });
    } catch (e) {
      console.error("[search] 뜻이 비슷한 릴스를 못 불러옴", e instanceof Error ? e.message : e);
      return { items: [] };
    }
  }

  const [{ items, nextCursor }, similar, categories, stats, email] = await Promise.all([
    getReels({ search, categoryId, source, take: 10 }),
    loadSimilar(),
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
      <ReelGrid
        initialReels={items}
        initialCursor={nextCursor}
        similarReels={similar.items}
        similarLimited={similar.limited}
        search={search}
        categoryId={categoryId}
        source={source}
      />
    </div>
  );
}
