"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { ReelCard } from "./reel-card";
import { getReels, getSimilarReels } from "@/lib/actions";
import { ReelWithRelations } from "@/types";
import { clearListReturnState, readListReturnState } from "@/lib/list-navigation";
import {
  AI_SEARCH_QUOTA_MESSAGE,
  NO_KEYWORD_MATCH_NOTE,
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
  similarReels = [],
  similarLimited = false,
  similarNeedsConsent = false,
  canLoadSimilar = false,
}: {
  initialReels: ReelWithRelations[];
  /** 낱말 결과가 0개일 때 서버가 미리 불러온 "뜻이 비슷한 릴스"(홈 화면 검색만) */
  similarReels?: ReelWithRelations[];
  /** 하루 사용량을 넘어서 비슷한 콘텐츠를 못 불러온 경우 */
  similarLimited?: boolean;
  /** 낱말 결과가 0개인데 AI 검색에 동의하지 않아 미리 못 불러온 경우(버튼을 누르면 동의 창) */
  similarNeedsConsent?: boolean;
  /** 낱말 결과 아래에 "비슷한 콘텐츠 더 보기" 버튼을 보여 줄지(검색어가 있고 쓸 수 있는 사람) */
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
  // 상황 2(낱말 결과가 있을 때) 비슷한 릴스는 버튼을 누를 때 서버에서 불러오고, 새로 검색하면 처음 상태로 돌아간다
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

  // 상황 1: 낱말 결과가 없으면 비슷한 릴스가 주 목록이 된다
  if (reels.length === 0 && similarReels.length > 0 && search) {
    return (
      <div className="px-6 pb-6">
        <p className="mb-3 text-sm text-gray-400">{NO_KEYWORD_MATCH_NOTE}</p>
        {gridOf(similarReels)}
      </div>
    );
  }

  // 상황 2: 낱말 결과를 끝까지 불러온 뒤 맨 아래에 버튼 하나. 누르면 불러와서 펼친다(개수는 누르기 전에 알 수 없어 표시하지 않음).
  // 결과 수와 상관없이 늘 같은 테두리 버튼(보조 행동, 2026-11-25 사용자 결정).
  const quotaNote = similarLimited && !cursor && (
    <p className="px-6 pb-6 text-center text-xs text-gray-500">{QUOTA_MESSAGE}</p>
  );

  const showSimilarButton = Boolean(search) && !cursor && (reels.length > 0 ? canLoadSimilar : similarNeedsConsent);
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
          {similar.status === "loading" ? (
            SIMILAR_LOADING
          ) : (
            <>
              {SIMILAR_MORE_BUTTON}
              <ChevronDown size={16} aria-hidden />
            </>
          )}
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
    return (
      <>
        <div className="px-6 py-12 text-center text-gray-500 text-sm">
          {hasFilters ? "조건에 맞는 콘텐츠가 없습니다" : "저장된 콘텐츠가 없습니다"}
        </div>
        {similarSection}
        {quotaNote}
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
      {quotaNote}
      {consentSheet}
    </>
  );
}
