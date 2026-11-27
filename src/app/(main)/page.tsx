import nextDynamic from "next/dynamic";
import { normalizeCategoryIds } from "@/lib/search/category-selection";
import { Suspense } from "react";
import { Header } from "@/components/header";
import { ReelGrid } from "@/components/reel-grid";
import { getReels, getCategories, getUserStats, getUserEmail } from "@/lib/actions";
import { parseReelSource } from "@/lib/reel-url";
import { isAdmin } from "@/lib/auth";
import { DEMO_MODE } from "@/lib/demo";
import { isAiSearchPublic } from "@/lib/ai-search/limits";
import { AiSearchNotice } from "@/components/ai-search-notice";

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

  const [{ items, nextCursor }, categories, stats, email, admin] = await Promise.all([
    getReels({ search, categoryIds, source, take: 10 }),
    getCategories(),
    getUserStats(),
    getUserEmail(),
    isAdmin(),
  ]);
  // 비슷한 콘텐츠는 늘 버튼을 누를 때 불러온다(2026-11-27 사용자 결정). 공개 전에는 일반 가입자에게 버튼을 보여 주지 않는다
  const canLoadSimilar = Boolean(search?.trim()) && (DEMO_MODE || admin || isAiSearchPublic());

  return (
    <div>
      <Header
        email={email}
        totalReels={stats.totalReels}
        visitedReels={stats.visitedReels}
        showAiSettings={!DEMO_MODE && isAiSearchPublic()}
      />
      {/* 공개 전 7일 공지(서버 전용 환경변수 AI_SEARCH_NOTICE="true"일 때) */}
      {!DEMO_MODE && process.env.AI_SEARCH_NOTICE === "true" && <AiSearchNotice />}
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
        canLoadSimilar={canLoadSimilar}
        search={search}
        categoryIds={categoryIds}
        source={source}
      />
    </div>
  );
}
