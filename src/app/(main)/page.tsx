import nextDynamic from "next/dynamic";
import { normalizeCategoryIds } from "@/lib/search/category-selection";
import { Suspense } from "react";
import { Header } from "@/components/header";
import { ReelGrid } from "@/components/reel-grid";
import { getReels, getCategories, getUserStats, getUserEmail, getSimilarReels } from "@/lib/actions";
import { parseReelSource } from "@/lib/reel-url";
import { isAdmin } from "@/lib/auth";
import { DEMO_MODE } from "@/lib/demo";
import { isAiSearchPublic } from "@/lib/ai-search/limits";

const SearchBar = nextDynamic(() => import("@/components/search-bar").then((m) => m.SearchBar));
const CategoryFilter = nextDynamic(() => import("@/components/category-filter").then((m) => m.CategoryFilter));
const SourceTabs = nextDynamic(() => import("@/components/source-tabs").then((m) => m.SourceTabs));

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string | string[]; source?: string }>;
}) {
  const params = await searchParams;
  const search = params.search;
  // ?category=a(옛 주소) 또는 ?category=a&category=b
  const categoryIds = normalizeCategoryIds(params.category);
  const source = parseReelSource(params.source);

  // 뜻 검색이 실패해도(키 없음, AI 오류) 낱말 결과는 그대로 보여 준다
  async function loadSimilar(): Promise<Awaited<ReturnType<typeof getSimilarReels>>> {
    if (!search?.trim()) return { items: [] };
    try {
      return await getSimilarReels({ query: search, categoryIds, source });
    } catch (e) {
      console.error("[search] 뜻이 비슷한 릴스를 못 불러옴", e instanceof Error ? e.message : e);
      return { items: [] };
    }
  }

  const [{ items, nextCursor }, categories, stats, email, admin] = await Promise.all([
    getReels({ search, categoryIds, source, take: 10 }),
    getCategories(),
    getUserStats(),
    getUserEmail(),
    isAdmin(),
  ]);
  // 비슷한 콘텐츠는 낱말 결과가 0개일 때만 화면을 그리며 미리 불러온다. 결과가 있으면 버튼을 누를 때 불러온다(2026-11-26 사용자 결정)
  const similar: Awaited<ReturnType<typeof getSimilarReels>> = items.length === 0 ? await loadSimilar() : { items: [] };
  // 공개 전에는 일반 가입자에게 버튼을 보여 주지 않는다(누를 수 있는 사람만)
  const canLoadSimilar = Boolean(search?.trim()) && (DEMO_MODE || admin || isAiSearchPublic());

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
        similarNeedsConsent={similar.needsConsent}
        canLoadSimilar={canLoadSimilar}
        search={search}
        categoryIds={categoryIds}
        source={source}
      />
    </div>
  );
}
