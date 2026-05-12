"use client";

import { useRouter, useSearchParams } from "next/navigation";

const TABS = [
  { id: "", label: "전체" },
  { id: "instagram", label: "인스타" },
  { id: "youtube", label: "유튜브" },
] as const;

export function SourceTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSource = searchParams.get("source") || "";

  function handleClick(source: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (source) {
      params.set("source", source);
    } else {
      params.delete("source");
    }
    const query = params.toString();
    router.push(query ? `/?${query}` : "/");
  }

  return (
    <div className="flex border-b border-gray-800 px-6">
      {TABS.map((tab, index) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => handleClick(tab.id)}
          className={`relative py-3 text-sm transition-colors ${
            index === 0 ? "pr-4" : "px-4"
          } ${
            activeSource === tab.id
              ? "text-gray-100 font-semibold"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          {tab.label}
          {activeSource === tab.id && (
            <span
              className={`absolute bottom-[-1px] h-0.5 bg-purple-500 right-4 ${
                index === 0 ? "left-0" : "left-4"
              }`}
            />
          )}
        </button>
      ))}
    </div>
  );
}
