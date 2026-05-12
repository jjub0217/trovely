"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Star } from "lucide-react";
import { ReelWithRelations } from "@/types";
import { toggleVisited } from "@/lib/actions";
import { ReelThumbnail } from "./reel-thumbnail";
import { writeListReturnState } from "@/lib/list-navigation";

export function ReelCard({ reel, priority = false }: { reel: ReelWithRelations; priority?: boolean }) {
  const [visited, setVisited] = useState(reel.visited);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setVisited(!visited);
    await toggleVisited(reel.id);
  }

  function handleOpen() {
    const query = searchParams.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    writeListReturnState({
      url,
      scrollY: window.scrollY,
      reelId: reel.id,
    });
  }

  const query = searchParams.toString();
  const backUrl = query ? `${pathname}?${query}` : pathname;
  const detailHref = `/reels/${reel.id}?back=${encodeURIComponent(backUrl)}`;

  return (
    <Link href={detailHref} onClick={handleOpen}>
      <div
        data-reel-id={reel.id}
        className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-gray-600 transition-colors"
      >
        <div className="bg-gray-700 h-30 flex items-center justify-center relative">
          <ReelThumbnail
            src={reel.thumbnail}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "low"}
          />
          <button
            onClick={handleToggle}
            aria-label={visited ? "방문 완료 해제" : "방문 완료 표시"}
            className="absolute top-1.5 right-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm transition-colors hover:bg-black/70"
          >
            <Star
              size={14}
              className={visited ? "text-green-400" : "text-white/60"}
              fill={visited ? "currentColor" : "none"}
            />
          </button>
          <span
            className={`absolute bottom-1.5 right-1.5 z-10 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${
              reel.source === "youtube" ? "bg-[#ea333e]" : "bg-[#ff29fd]"
            }`}
          >
            {reel.source === "youtube" ? "유튜브" : "인스타"}
          </span>
        </div>
        <div className="p-3">
          <div className="flex gap-1 flex-wrap">
            {reel.categories.map(({ category }) => (
              <span key={category.id} className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full text-[10px]">
                {category.name}
              </span>
            ))}
            {reel.tags.map(({ tag }) => (
              <span key={tag.id} className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full text-[10px]">
                {tag.name}
              </span>
            ))}
          </div>
          {reel.memo && (
            <p className="text-[11px] text-gray-400 truncate mt-2">{reel.memo}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
