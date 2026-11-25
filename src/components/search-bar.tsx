"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { SEARCH_MODE_LABELS } from "@/lib/search/labels";
import { syncSearchInput, type SearchInputState } from "@/lib/search/search-input-sync";

export function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const [input, setInput] = useState<SearchInputState>({ prevUrl: urlSearch, pushed: urlSearch, query: urlSearch });
  // 로고, 뒤로 가기처럼 검색창 밖에서 주소의 검색어가 바뀌면 입력값을 주소에 맞춘다
  // (렌더 중 값 변화 감지, set-state-in-effect 회피). 예전에는 입력값이 주소를 다시 덮어써서 로고를 눌러도 검색이 안 풀렸다.
  const synced = syncSearchInput(input, urlSearch);
  if (synced !== input) setInput(synced);
  const query = synced.query;
  const setQuery = (value: string) => setInput((s) => ({ ...s, query: value }));

  // 엔터(휴대폰은 키보드 검색 버튼)를 누를 때만 주소를 바꾼다(2026-11-25 사용자 결정).
  // 치는 동안 주소를 바꾸면 늦게 돌아온 예전 검색어와 입력이 부딪히고, 뜻 검색은 글자마다 유료 요청이 나간다.
  function applySearch(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("search", value);
    else params.delete("search");
    const qs = params.toString();
    setInput((s) => ({ ...s, pushed: value }));
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function handleChange(value: string) {
    setQuery(value);
    // 검색어를 모두 지우면 엔터 없이 바로 전체 목록으로
    if (!value.trim() && urlSearch) applySearch("");
  }

  const semantic = searchParams.get("mode") === "semantic";

  function setMode(next: "keyword" | "semantic") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "semantic") params.set("mode", "semantic");
    else params.delete("mode");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="px-6 pt-5 pb-3">
      <div className="mb-2 flex gap-1.5" role="group" aria-label="검색 방식">
        {(["keyword", "semantic"] as const).map((m) => {
          const active = (m === "semantic") === semantic;
          return (
            <button
              key={m}
              type="button"
              aria-pressed={active}
              onClick={() => setMode(m)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                active ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 border border-gray-600"
              }`}
            >
              {SEARCH_MODE_LABELS[m]}
            </button>
          );
        })}
      </div>
      <form
        className="relative"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          applySearch(query.trim());
        }}
      >
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          enterKeyHint="search"
          placeholder="검색 (태그, 메모, 후기, 카테고리...)"
          className="w-full bg-gray-800 border border-gray-600 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
      </form>
    </div>
  );
}
