"use client";

import { useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import { isRejectedThumbnailUrl } from "@/lib/thumbnail-url";
import { refreshThumbnail } from "@/lib/actions";

export function ReelThumbnail({
  src,
  reelId,
  alt = "",
  className,
  loading = "lazy",
  fetchPriority = "low",
  iconClassName = "text-gray-500",
  fallbackLabel,
}: {
  src?: string | null;
  reelId?: string;
  alt?: string;
  className?: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  iconClassName?: string;
  fallbackLabel?: string;
}) {
  const initialOk = !!src && !isRejectedThumbnailUrl(src);
  const [currentSrc, setCurrentSrc] = useState<string | null>(initialOk ? src! : null);
  const [failed, setFailed] = useState(!initialOk);
  const [recovering, setRecovering] = useState(false);
  const [triedRecovery, setTriedRecovery] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const ok = !!src && !isRejectedThumbnailUrl(src);
    setCurrentSrc(ok ? src! : null);
    setFailed(!ok);
    setRecovering(false);
    setTriedRecovery(false);
  }, [src]);

  async function handleError() {
    // 이미 시도했거나 reelId 없으면 복구 불가 → 대체 UI 고정 (무한루프 차단)
    if (triedRecovery || !reelId) {
      setRecovering(false);
      setFailed(true);
      return;
    }
    setTriedRecovery(true);
    setRecovering(true); // 복구 동안: 배경 펄스
    setFailed(false);
    try {
      const { thumbnail } = await refreshThumbnail(reelId);
      if (thumbnail) {
        // 같은 URL로 재캐시될 수도 있으니 캐시버스트로 강제 재로드
        const busted = thumbnail + (thumbnail.includes("?") ? "&" : "?") + "v=" + Date.now();
        setCurrentSrc(busted);
        setRecovering(false);
        setFailed(false);
      } else {
        setRecovering(false);
        setFailed(true);
      }
    } catch {
      setRecovering(false);
      setFailed(true);
    }
  }

  // SSR로 그려진 img가 하이드레이션 전에 이미 로드 실패하면 onError를 놓친다.
  // 마운트/소스변경 후 "이미 깨진 상태"(complete=true, naturalWidth=0)면 직접 복구 트리거.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      handleError();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSrc]);

  // 복구 중: 배경만 은은하게 펄스 (아이콘·텍스트 없음)
  if (recovering) {
    return <div className="h-full w-full animate-pulse bg-gray-600" />;
  }

  // 썸네일 없음/복구 실패: 차분한 단색 + lucide ImageOff 아이콘만 (기본 문구 없음)
  if (!currentSrc || failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gray-700">
        <ImageOff className={iconClassName} size={26} strokeWidth={1.5} aria-hidden />
        {fallbackLabel && (
          <p className="max-w-[11rem] whitespace-pre-line text-center text-xs leading-relaxed text-gray-400">
            {fallbackLabel}
          </p>
        )}
      </div>
    );
  }

  return (
    // CDN/Supabase 썸네일이라 의도적으로 <img> 사용 (next/image 미적용 — 프로젝트 컨벤션)
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={currentSrc}
      alt={alt}
      className={className}
      loading={loading}
      fetchPriority={fetchPriority}
      referrerPolicy="no-referrer"
      onError={handleError}
    />
  );
}
