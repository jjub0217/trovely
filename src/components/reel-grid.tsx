"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { ReelCard } from "./reel-card";
import { getReels } from "@/lib/actions";
import { ReelWithRelations } from "@/types";
import { clearListReturnState, readListReturnState } from "@/lib/list-navigation";
import { NO_KEYWORD_MATCH_NOTE, SIMILAR_MORE_BUTTON } from "@/lib/search/labels";

export function ReelGrid({
  initialReels,
  initialCursor,
  search,
  categoryId,
  source,
  status,
  sort,
  similarReels = [],
}: {
  initialReels: ReelWithRelations[];
  /** 낱말 결과를 끝까지 불러온 뒤 아래에 붙이는 "뜻이 비슷한 릴스"(홈 화면 검색만) */
  similarReels?: ReelWithRelations[];
  initialCursor: string | null;
  search?: string;
  categoryId?: string;
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
  // 상황 2(낱말 결과가 있을 때) 비슷한 릴스는 버튼을 눌러야 펼치고, 새로 검색하면 다시 접는다
  const [similarOpen, setSimilarOpen] = useState(false);
  if (initialReels !== prevInitialReels) {
    setPrevInitialReels(initialReels);
    setReels(initialReels);
    setCursor(initialCursor);
    setSimilarOpen(false);
  }

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    const result = await getReels({ search, categoryId, source, status, sort, cursor });
    setReels((prev) => [...prev, ...result.items]);
    setCursor(result.nextCursor);
    setLoading(false);
  }, [cursor, loading, search, categoryId, source, status, sort]);

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

  const similarGrid = (
    <div className="grid grid-cols-2 gap-3.5">
      {similarReels.map((reel) => (
        <ReelCard key={reel.id} reel={reel} />
      ))}
    </div>
  );

  // 상황 1: 낱말 결과가 없으면 비슷한 릴스가 주 목록이 된다
  if (reels.length === 0 && similarReels.length > 0 && search) {
    return (
      <div className="px-6 pb-6">
        <p className="mb-3 text-sm text-gray-400">{NO_KEYWORD_MATCH_NOTE}</p>
        {similarGrid}
      </div>
    );
  }

  // 상황 2: 낱말 결과를 끝까지 불러온 뒤 맨 아래에 버튼 하나. 누르면 버튼이 사라지고 펼쳐진다.
  // 결과 수와 상관없이 늘 같은 테두리 버튼(보조 행동). 결과 수로 모양을 바꿀 근거가 없어서(2026-11-25 사용자 결정).
  const similarSection = !cursor && similarReels.length > 0 && (
    <section className="px-6 pb-6">
      {similarOpen ? (
        similarGrid
      ) : (
        <button
          type="button"
          onClick={() => setSimilarOpen(true)}
          className="flex h-12 w-full items-center justify-center gap-1 rounded-xl border border-gray-700 text-sm text-purple-200"
        >
          {SIMILAR_MORE_BUTTON} ({similarReels.length})
          <ChevronDown size={16} aria-hidden />
        </button>
      )}
    </section>
  );

  if (reels.length === 0) {
    const hasFilters = Boolean(search || categoryId || status);
    return (
      <div className="px-6 py-12 text-center text-gray-500 text-sm">
        {hasFilters ? "조건에 맞는 콘텐츠가 없습니다" : "저장된 콘텐츠가 없습니다"}
      </div>
    );
  }

  return (
    <>
      <div className={similarReels.length > 0 && !cursor ? "px-6 pb-3" : "px-6 pb-6"}>
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
    </>
  );
}
