"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CategoryOption } from "@/types";
import { normalizeCategoryIds, toggleCategory, UNCATEGORIZED } from "@/lib/search/category-selection";

export function CategoryFilter({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // 여러 개를 고를 수 있다(모두 가진 게시물). 옛 주소 ?category=a 도 그대로 읽힌다
  const selected = normalizeCategoryIds(searchParams.getAll("category"));
  const selectedKey = selected.join(",");
  const listRef = useRef<HTMLDivElement>(null);

  // 고른 버튼이 가로 스크롤 밖에 있으면 무엇이 선택됐는지 안 보인다. 첫 번째로 고른 버튼이 보이게 옮긴다
  useEffect(() => {
    const list = listRef.current;
    const first = list?.querySelector<HTMLElement>('button[aria-pressed="true"]');
    if (!list || !first) return;
    const left = first.offsetLeft - list.offsetLeft;
    if (left < list.scrollLeft || left + first.offsetWidth > list.scrollLeft + list.clientWidth) {
      list.scrollTo({ left: Math.max(0, left - 24) });
    }
  }, [selectedKey]);

  function handleClick(categoryId: string) {
    const next = toggleCategory(selected, categoryId);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("category");
    for (const id of next) params.append("category", id);
    const query = params.toString();
    router.push(query ? `/?${query}` : "/");
  }

  const chips = [
    { id: "", name: "전체" },
    { id: UNCATEGORIZED, name: "미분류" },
    ...categories,
  ];

  return (
    <div ref={listRef} className="flex gap-2 overflow-x-auto scrollbar-hide pb-4">
      {chips.map((chip) => {
        const active = chip.id ? selected.includes(chip.id) : selected.length === 0;
        return (
          <button
            key={chip.id}
            onClick={() => handleClick(chip.id)}
            aria-pressed={active}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs transition-colors ${
              active ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-300 border border-gray-600"
            }`}
          >
            {chip.name}
          </button>
        );
      })}
    </div>
  );
}
