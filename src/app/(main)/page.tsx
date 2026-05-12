import nextDynamic from "next/dynamic";
import { Suspense } from "react";
import { Header } from "@/components/header";
import { ReelGrid } from "@/components/reel-grid";
import { getReels, getCategories, getUserStats, getUserEmail } from "@/lib/actions";
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

  const [{ items, nextCursor }, categories, stats, email] = await Promise.all([
    getReels({ search, categoryId, source, take: 10 }),
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
        search={search}
        categoryId={categoryId}
        source={source}
      />
    </div>
  );
}
