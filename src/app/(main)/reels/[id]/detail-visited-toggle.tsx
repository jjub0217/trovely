"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { toggleVisited } from "@/lib/actions";

export function DetailVisitedToggle({
  reelId,
  initialVisited,
}: {
  reelId: string;
  initialVisited: boolean;
}) {
  const [visited, setVisited] = useState(initialVisited);

  async function handleToggle() {
    setVisited((prev) => !prev);
    await toggleVisited(reelId);
  }

  // 우측 상단, 목록 카드의 별표와 같은 어두운 동그라미 배경(밝은 썸네일 위에서도 보이게, 2026-11-25)
  return (
    <button
      type="button"
      onClick={handleToggle}
      className="absolute top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm transition-colors hover:bg-black/70"
      aria-label={visited ? "방문 완료 해제" : "방문 완료 표시"}
      aria-pressed={visited}
    >
      <Star size={20} className={visited ? "text-green-400" : "text-white/80"} fill={visited ? "currentColor" : "none"} />
    </button>
  );
}
