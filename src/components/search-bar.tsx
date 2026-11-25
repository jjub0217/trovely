"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { SEARCH_MODE_LABELS } from "@/lib/search/labels";

export function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("search") || "");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query) {
        params.set("search", query);
      } else {
        params.delete("search");
      }
      const queryString = params.toString();
      const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;
      const currentUrl = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;

      if (nextUrl !== currentUrl) {
        router.replace(nextUrl);
      }
    }, 300);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query, searchParams, router, pathname]);

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
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="검색 (태그, 메모, 후기, 카테고리...)"
          className="w-full bg-gray-800 border border-gray-600 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
      </div>
    </div>
  );
}
