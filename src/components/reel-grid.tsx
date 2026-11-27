"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { SearchX } from "lucide-react";
import { ReelCard } from "./reel-card";
import { getReels, getSimilarReels } from "@/lib/actions";
import { ReelWithRelations } from "@/types";
import { clearListReturnState, readListReturnState } from "@/lib/list-navigation";
import {
  AI_SEARCH_QUOTA_MESSAGE,
  NO_KEYWORD_RESULT,
  SIMILAR_EMPTY,
  SIMILAR_LOADING,
  SIMILAR_MORE_BUTTON,
  SIMILAR_PREPARING,
} from "@/lib/search/labels";
import { DEMO_QUOTA_MESSAGE } from "@/lib/demo/quota-message";
import { DEMO_MODE } from "@/lib/demo";
import { AiConsentSheet } from "./ai-consent-sheet";

const QUOTA_MESSAGE = DEMO_MODE ? DEMO_QUOTA_MESSAGE : AI_SEARCH_QUOTA_MESSAGE;

type SimilarState = { status: "idle" | "loading" | "done"; items: ReelWithRelations[]; note?: string };
const SIMILAR_IDLE: SimilarState = { status: "idle", items: [] };

export function ReelGrid({
  initialReels,
  initialCursor,
  search,
  categoryIds = [],
  source,
  status,
  sort,
  canLoadSimilar = false,
}: {
  initialReels: ReelWithRelations[];
  /** "비슷한 콘텐츠 찾기" 버튼을 보여 줄지(홈 화면 검색에서 검색어가 있고 누를 수 있는 사람). 낱말 결과 수와 관계없이 같은 버튼 */
  canLoadSimilar?: boolean;
  initialCursor: string | null;
  search?: string;
  /** 고른 카테고리(빈 목록 = 전체, ["uncategorized"] = 미분류, 그 밖에는 모두 가진 게시물) */
  categoryIds?: string[];
  source?: "instagram" | "youtube";
  status?: string;
  sort?: string;
}) {
  const [reels, setReels] = useState(initialReels);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const restoreIntervalRef = useRef<number | null>(null);

  // 서버가 새 initialReels를 보내면(검색·필터·갱신) 누적 상태 리셋.
  // useEffect+setState 대신 "렌더 중 prop 변화 감지"로 처리 (React 공식 패턴, set-state-in-effect 회피).
  const [prevInitialReels, setPrevInitialReels] = useState(initialReels);
  // 비슷한 릴스는 버튼을 누를 때 서버에서 불러오고, 새로 검색하면 처음 상태로 돌아간다
  const [similar, setSimilar] = useState<SimilarState>(SIMILAR_IDLE);
  const [consentOpen, setConsentOpen] = useState(false);
  if (initialReels !== prevInitialReels) {
    setPrevInitialReels(initialReels);
    setReels(initialReels);
    setCursor(initialCursor);
    setSimilar(SIMILAR_IDLE);
    setConsentOpen(false);
  }

  // 목록은 렌더마다 새로 만들어지므로, 의존성에는 글자로 이은 값을 쓴다
  const categoryKey = categoryIds.join(",");
  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    const result = await getReels({ search, categoryIds: categoryKey ? categoryKey.split(",") : [], source, status, sort, cursor });
    setReels((prev) => [...prev, ...result.items]);
    setCursor(result.nextCursor);
    setLoading(false);
  }, [cursor, loading, search, categoryKey, source, status, sort]);

  useEffect(() => {
    const query = searchParams.toString();
    const currentUrl = query ? `${pathname}?${query}` : pathname;
    const state = readListReturnState();

    if (restoreIntervalRef.current !== null) {
      window.clearInterval(restoreIntervalRef.current);
      restoreIntervalRef.current = null;
    }

    if (!state || state.url !== currentUrl) return;

    let attempts = 0;

    const tryRestore = () => {
      const latest = readListReturnState();
      if (!latest || latest.url !== currentUrl) {
        if (restoreIntervalRef.current !== null) {
          window.clearInterval(restoreIntervalRef.current);
          restoreIntervalRef.current = null;
        }
        return;
      }

      const reelId = latest.reelId;
      const target = latest.scrollY;

      if (reelId) {
        const card = document.querySelector<HTMLElement>(`[data-reel-id="${reelId}"]`);
        if (card) {
          card.scrollIntoView({ block: "center", behavior: "auto" });
          clearListReturnState();
          if (restoreIntervalRef.current !== null) {
            window.clearInterval(restoreIntervalRef.current);
            restoreIntervalRef.current = null;
          }
          return;
        }
      }

      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

      if (!reelId && maxScroll >= target) {
        window.scrollTo({ top: target, behavior: "auto" });
        clearListReturnState();
        if (restoreIntervalRef.current !== null) {
          window.clearInterval(restoreIntervalRef.current);
          restoreIntervalRef.current = null;
        }
        return;
      }

      if (cursor && !loading) {
        void loadMore();
      }

      attempts += 1;
      if (attempts >= 40) {
        if (maxScroll > 0) {
          window.scrollTo({ top: Math.min(target, maxScroll), behavior: "auto" });
        }
        clearListReturnState();
        if (restoreIntervalRef.current !== null) {
          window.clearInterval(restoreIntervalRef.current);
          restoreIntervalRef.current = null;
        }
      }
    };

    restoreIntervalRef.current = window.setInterval(tryRestore, 150);
    tryRestore();

    return () => {
      if (restoreIntervalRef.current !== null) {
        window.clearInterval(restoreIntervalRef.current);
        restoreIntervalRef.current = null;
      }
    };
  }, [pathname, searchParams, cursor, loading, loadMore]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [loadMore]);

  // 버튼을 누를 때 불러온다. 동의가 필요하면 동의 창을 연다. 방금 동의했으면 벡터를 만드는 중일 수 있어 안내가 다르다
  const loadSimilar = async (justEnabled = false) => {
    if (!search) return;
    setSimilar({ status: "loading", items: [] });
    try {
      const r = await getSimilarReels({ query: search, categoryIds: categoryKey ? categoryKey.split(",") : [], source });
      if (r.needsConsent) {
        setSimilar(SIMILAR_IDLE);
        setConsentOpen(true);
        return;
      }
      if (r.limited) setSimilar({ status: "done", items: [], note: QUOTA_MESSAGE });
      else setSimilar({ status: "done", items: r.items, note: r.items.length ? undefined : justEnabled ? SIMILAR_PREPARING : SIMILAR_EMPTY });
    } catch {
      setSimilar({ status: "done", items: [], note: SIMILAR_EMPTY });
    }
  };

  const gridOf = (list: ReelWithRelations[]) => (
    <div className="grid grid-cols-2 gap-3.5">
      {list.map((reel) => (
        <ReelCard key={reel.id} reel={reel} />
      ))}
    </div>
  );

  // 낱말 결과를 끝까지 불러온 뒤(0개면 안내 문구 아래) 버튼 하나. 누르면 불러와서 버튼 자리에 펼친다.
  // 개수는 누르기 전에 알 수 없어 표시하지 않는다. 늘 같은 테두리 버튼(보조 행동, 2026-11-25 사용자 결정).
  // 0개일 때도 자동으로 불러오지 않는다(2026-11-27 사용자 결정: 두 상황을 같은 버튼으로 통일, 사용량은 누를 때만 빠짐)
  const showSimilarButton = Boolean(search) && !cursor && canLoadSimilar;
  const similarSection = showSimilarButton && (
    <section className="px-6 pb-6">
      {similar.status === "done" ? (
        similar.note ? (
          <p className="text-center text-sm text-gray-500">{similar.note}</p>
        ) : (
          gridOf(similar.items)
        )
      ) : (
        <button
          type="button"
          onClick={() => loadSimilar()}
          disabled={similar.status === "loading"}
          className="flex h-12 w-full items-center justify-center gap-1 rounded-xl border border-gray-700 text-sm text-purple-200 disabled:opacity-60"
        >
          {similar.status === "loading" ? SIMILAR_LOADING : SIMILAR_MORE_BUTTON}
        </button>
      )}
    </section>
  );

  const consentSheet = (
    <AiConsentSheet
      open={consentOpen}
      onClose={() => setConsentOpen(false)}
      onEnabled={() => {
        setConsentOpen(false);
        void loadSimilar(true);
      }}
    />
  );

  if (reels.length === 0) {
    const hasFilters = Boolean(search || categoryIds.length > 0 || status);
    // 검색어만으로 검색했으면 "검색어가 포함된" 안내. 카테고리나 출처도 골랐으면 그 조건 때문일 수 있어 "조건에 맞는"
    const searchOnly = Boolean(search) && categoryIds.length === 0 && !source && !status;
    return (
      <>
        {searchOnly ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center text-sm text-gray-300">
            <SearchX size={28} className="text-gray-500" aria-hidden />
            <p>{NO_KEYWORD_RESULT}</p>
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-gray-500 text-sm">
            {hasFilters ? "조건에 맞는 콘텐츠가 없습니다" : "저장된 콘텐츠가 없습니다"}
          </div>
        )}
        {similarSection}
        {consentSheet}
      </>
    );
  }

  return (
    <>
      <div className={showSimilarButton ? "px-6 pb-3" : "px-6 pb-6"}>
        <div className="grid grid-cols-2 gap-3.5">
          {reels.map((reel, index) => (
            <ReelCard key={reel.id} reel={reel} priority={index < 2} />
          ))}
        </div>
        {cursor && (
          <div ref={observerRef} className="py-4 text-center">
            {loading && <span className="text-gray-500 text-sm">로딩 중...</span>}
          </div>
        )}
      </div>
      {similarSection}
      {consentSheet}
    </>
  );
}
