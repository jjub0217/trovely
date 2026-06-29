"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Play, Star, Plus } from "lucide-react";
import { ReelWithRelations } from "@/types";
import { toggleVisited } from "@/lib/actions";
import { ReelThumbnail } from "./reel-thumbnail";
import { writeListReturnState } from "@/lib/list-navigation";
import { DEMO_MODE } from "@/lib/demo";

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
            reelId={reel.id}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "low"}
          />
          {DEMO_MODE
            ? reel.thumbnail && (
                // 데모: mock 썸네일(picsum)엔 영상 표식이 없어서, 모든 카드에 큰 ▶ 오버레이를 그려 실서비스와 비슷하게 보이게 함
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40">
                    <Play size={20} className="ml-0.5 fill-white text-white" />
                  </div>
                </div>
              )
            : reel.source === "youtube" && reel.thumbnail && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-black/45 backdrop-blur-sm">
                    <Play size={13} className="ml-0.5 fill-white text-white" />
                  </div>
                </div>
              )}
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
        <div className="p-2.5">
          {reel.categories.length > 0 || reel.tags.length > 0 || reel.memo ? (
            <>
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
            </>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-600 px-2 py-0.5 text-[10px] text-gray-500">
              <Plus size={10} strokeWidth={2} aria-hidden />
              태그 추가
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
