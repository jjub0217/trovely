"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TagInput } from "./tag-input";
import { CategorySelect } from "./category-select";
import { createReel, updateReel } from "@/lib/actions";
import { CategoryOption, ReelWithRelations } from "@/types";
import { normalizeInstagramUrl } from "@/lib/reel-url";
import { ReelThumbnail } from "./reel-thumbnail";

export function ReelForm({
  categories,
  reel,
  initialUrl,
  backHref,
}: {
  categories: CategoryOption[];
  reel?: ReelWithRelations;
  initialUrl?: string;
  backHref?: string;
}) {
  const router = useRouter();
  const isEdit = !!reel;
  const initialNormalizedUrl = reel ? normalizeInstagramUrl(reel.url) : null;

  const [url, setUrl] = useState(reel?.url || initialUrl || "");
  const [categoryIds, setCategoryIds] = useState<string[]>(reel?.categories.map(({ category }) => category.id) || []);
  const [tags, setTags] = useState<string[]>(reel?.tags.map(({ tag }) => tag.name) || []);
  const [memo, setMemo] = useState(reel?.memo || "");
  const [review, setReview] = useState(reel?.review || "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMode, setSubmitMode] = useState<"home" | "continue">("home");
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(reel?.thumbnail || null);
  const [previewAttempted, setPreviewAttempted] = useState(Boolean(reel?.thumbnail));
  const [previewLoading, setPreviewLoading] = useState(false);
  const [manualThumbnail, setManualThumbnail] = useState<string | null>(null);
  const [manualThumbnailName, setManualThumbnailName] = useState("");

  useEffect(() => {
    if (manualThumbnail) {
      setThumbnailPreview(manualThumbnail);
      setPreviewAttempted(true);
      setPreviewLoading(false);
      return;
    }

    const normalizedUrl = normalizeInstagramUrl(url);
    if (!normalizedUrl) {
      setThumbnailPreview(null);
      setPreviewAttempted(false);
      setPreviewLoading(false);
      return;
    }

    if (normalizedUrl === initialNormalizedUrl && reel?.thumbnail) {
      setThumbnailPreview(reel.thumbnail);
      setPreviewAttempted(true);
      setPreviewLoading(false);
      return;
    }

    setThumbnailPreview(null);
    setPreviewAttempted(false);
    setPreviewLoading(true);

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/og?url=${encodeURIComponent(normalizedUrl)}`);
        const data = await res.json();
        setThumbnailPreview(data.thumbnail || null);
        setPreviewAttempted(true);
        setPreviewLoading(false);
      } catch {
        setThumbnailPreview(null);
        setPreviewAttempted(true);
        setPreviewLoading(false);
      }
    }, 500);
    return () => {
      clearTimeout(timeout);
      setPreviewLoading(false);
    };
  }, [url, initialNormalizedUrl, manualThumbnail, reel?.thumbnail]);

  function handleThumbnailFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 썸네일로 업로드할 수 있습니다.");
      return;
    }

    const maxSizeInBytes = 2 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      setError("썸네일 이미지는 2MB 이하만 업로드할 수 있습니다.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      setManualThumbnail(result);
      setManualThumbnailName(file.name);
      setThumbnailPreview(result);
      setPreviewAttempted(true);
      setPreviewLoading(false);
      setError("");
    };
    reader.onerror = () => {
      setError("썸네일 이미지를 불러오지 못했습니다.");
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveManualThumbnail() {
    setManualThumbnail(null);
    setManualThumbnailName("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      setError("릴스 URL을 입력해주세요");
      return;
    }

    const normalizedUrl = normalizeInstagramUrl(url);
    if (!normalizedUrl) {
      setError("올바른 인스타그램 릴스 URL을 입력해주세요");
      return;
    }
    setSubmitting(true);
    setError("");

    const formData = {
      url: normalizedUrl,
      thumbnail: manualThumbnail ?? (previewAttempted ? thumbnailPreview : undefined),
      memo: memo.trim() || undefined,
      review: review.trim() || undefined,
      categoryIds,
      tagNames: tags,
    };

    const result = isEdit
      ? await updateReel(reel!.id, formData)
      : await createReel(formData);

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    if (isEdit) {
      router.push(backHref ? `/reels/${reel!.id}?back=${encodeURIComponent(backHref)}` : `/reels/${reel!.id}`);
      return;
    }

    if (submitMode === "continue") {
      setUrl("");
      setCategoryIds([]);
      setTags([]);
      setMemo("");
      setReview("");
      setThumbnailPreview(null);
      setPreviewAttempted(false);
      setPreviewLoading(false);
      setManualThumbnail(null);
      setManualThumbnailName("");
      setSubmitting(false);
      setSubmitMode("home");
      return;
    }

    router.push("/");
  }

  function handleContinueClick() {
    setSubmitMode("continue");
  }

  function handleDefaultClick() {
    setSubmitMode("home");
  }

  const submitLabel = submitting
    ? "저장 중..."
    : isEdit
      ? "수정하기"
      : "저장 후 홈으로";

  const continueLabel = submitting ? "저장 중..." : "저장하고 계속 추가";

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-5">
      <div>
        <label className="text-xs text-gray-400 font-semibold mb-2 block">릴스 URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.instagram.com/reel/..."
          className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
        <p className="mt-2 text-xs text-gray-500">
          인스타그램 게시물 화면에서 주소를 복사한 링크만 저장할 수 있습니다.
        </p>
      </div>

      {(thumbnailPreview || previewAttempted || previewLoading) && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="relative aspect-square w-full max-h-80">
            {previewLoading ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gray-700/90 px-4 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-500 border-t-purple-400" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-200">썸네일을 불러오는 중입니다</p>
                  <p className="text-xs text-gray-400">추출까지 몇 초 정도 걸릴 수 있어요.</p>
                </div>
              </div>
            ) : (
              <ReelThumbnail
                src={thumbnailPreview}
                alt=""
                className="h-full w-full object-cover"
                loading="eager"
                fetchPriority="high"
                fallbackLabel={"썸네일을 불러오지 못했어요.\n직접 이미지를 추가할 수 있어요."}
              />
            )}
            {!previewLoading && (
              <label className="absolute bottom-3 right-3 inline-flex cursor-pointer items-center gap-2 rounded-full bg-gray-950/80 px-3 py-2 text-xs font-semibold text-white shadow-lg ring-1 ring-white/10 backdrop-blur">
                <span>직접 썸네일 추가</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailFileChange}
                  className="sr-only"
                />
              </label>
            )}
          </div>
        </div>
      )}

      {manualThumbnailName ? (
        <div className="rounded-xl border border-gray-700 bg-gray-800/70 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-300">직접 추가한 썸네일</p>
              <p className="mt-1 truncate text-xs text-gray-500">{manualThumbnailName}</p>
            </div>
            <button
              type="button"
              onClick={handleRemoveManualThumbnail}
              className="shrink-0 text-xs text-red-400"
            >
              제거
            </button>
          </div>
        </div>
      ) : null}

      <div>
        <label className="text-xs text-gray-400 font-semibold mb-2 block">카테고리</label>
        <CategorySelect categories={categories} value={categoryIds} onChange={setCategoryIds} />
      </div>

      <div>
        <label className="text-xs text-gray-400 font-semibold mb-2 block">태그</label>
        <TagInput value={tags} onChange={setTags} />
      </div>

      <div>
        <label className="text-xs text-gray-400 font-semibold mb-2 block">메모</label>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="자유롭게 메모를 입력하세요..."
          rows={3}
          className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
        />
      </div>

      <div>
        <label className="text-xs text-gray-400 font-semibold mb-2 block">후기</label>
        <textarea
          id="review"
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="방문/구매 후기를 입력하세요..."
          rows={3}
          className="w-full scroll-mt-24 bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
        />
        <p className="mt-2 text-xs text-gray-500">
          후기를 입력하면 방문 완료 상태로 자동 반영됩니다.
        </p>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {isEdit ? (
        <button
          type="submit"
          disabled={submitting}
          onClick={handleDefaultClick}
          className="w-full bg-purple-600 py-3.5 rounded-xl text-sm font-semibold disabled:opacity-50"
        >
          {submitLabel}
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="submit"
            disabled={submitting}
            onClick={handleDefaultClick}
            className="bg-purple-600 py-3.5 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {submitLabel}
          </button>
          <button
            type="submit"
            disabled={submitting}
            onClick={handleContinueClick}
            className="bg-gray-800 border border-gray-600 py-3.5 rounded-xl text-sm font-semibold text-gray-100 disabled:opacity-50"
          >
            {continueLabel}
          </button>
        </div>
      )}
    </form>
  );
}
