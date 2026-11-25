"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getRetagGroups,
  getRetagReels,
  setReelTags,
  type RetagGroup,
  type RetagReel,
} from "@/lib/instagram-import/retag-actions";
import { tagsChanged } from "@/lib/instagram-import/retag";

type SaveState = "idle" | "saving" | "saved" | "failed";
const STATUS_TEXT: Record<SaveState, string> = {
  idle: "",
  saving: "저장 중…",
  saved: "저장됨",
  failed: "저장 실패, 다시 시도해 주세요",
};

/** 태그 칸에서 벗어나면 바뀐 경우에만 자동 저장. 실패하면 입력한 값은 칸에 남긴다. */
function RetagRow({ reel }: { reel: RetagReel }) {
  const [saved, setSaved] = useState(reel.tags);
  const [value, setValue] = useState(reel.tags.join(", "));
  const [state, setState] = useState<SaveState>("idle");

  async function handleBlur() {
    if (!tagsChanged(saved, value)) return;
    setState("saving");
    const r = await setReelTags(reel.id, value);
    if ("error" in r) {
      setState("failed");
      return;
    }
    setSaved(r.tags);
    setValue(r.tags.join(", "));
    setState("saved");
  }

  return (
    <li className="space-y-2 py-3">
      <a href={reel.url} target="_blank" rel="noreferrer" className="block text-sm text-gray-200 hover:underline">
        {reel.caption ? reel.caption.slice(0, 80) + (reel.caption.length > 80 ? "…" : "") : "(캡션 없음)"}
      </a>
      <p className="text-xs text-gray-500">카테고리: {reel.categories.join(", ") || "미분류"}</p>
      <div className="flex items-center gap-2 text-xs">
        <label className="flex flex-1 items-center gap-2">
          태그
          <input
            className="flex-1 rounded bg-gray-900 px-2 py-1.5"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (state !== "saving") setState("idle");
            }}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
        </label>
        <span
          role="status"
          className={`w-40 shrink-0 text-right ${state === "failed" ? "text-red-400" : state === "saved" ? "text-green-400" : "text-gray-400"}`}
        >
          {STATUS_TEXT[state]}
        </span>
      </div>
    </li>
  );
}

export function RetagClient({ batchId }: { batchId: string | null }) {
  const [groups, setGroups] = useState<RetagGroup[] | null>(null);
  const [open, setOpen] = useState<RetagGroup | null>(null);
  const [reels, setReels] = useState<RetagReel[] | null>(null);

  useEffect(() => {
    if (batchId) getRetagGroups(batchId).then(setGroups);
  }, [batchId]);

  useEffect(() => {
    if (!batchId || !open) return;
    let cancelled = false;
    getRetagReels(batchId, open.key).then((r) => {
      if (!cancelled) setReels(r);
    });
    return () => {
      cancelled = true;
    };
  }, [batchId, open]);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/admin/import" className="text-sm text-gray-400 hover:text-gray-200">
          ← 인스타그램 가져오기
        </Link>
        <h1 className="mt-2 text-xl font-semibold">저장한 릴스 태그 다시 보기</h1>
        <p className="mt-1 text-sm text-gray-400">
          가져오기로 저장한 릴스를 카테고리별로 보여 줍니다. 태그 칸을 고치고 다른 곳을 누르면 바로 저장되고, 검색에도 반영됩니다. 태그는 쉼표로 나눠 적어 주세요.
        </p>
      </div>

      {!batchId && <p className="text-sm text-gray-400">아직 가져오기 기록이 없습니다.</p>}
      {batchId && !groups && <p className="text-sm text-gray-400">불러오는 중…</p>}

      {groups && !open && (
        <ul className="divide-y divide-gray-800 rounded-xl border border-gray-800 px-5">
          {groups.map((g) => (
            <li key={g.key} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">{g.label}</span>
                <span className="text-sm text-gray-400">{g.count}개</span>
              </div>
              <button
                type="button"
                className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm"
                onClick={() => {
                  setReels(null);
                  setOpen(g);
                }}
              >
                묶음 열기
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <section className="space-y-3 rounded-xl border border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">
              {open.label} <span className="text-sm text-gray-400">{reels?.length ?? open.count}개</span>
            </h2>
            <button type="button" className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm" onClick={() => setOpen(null)}>
              묶음 목록으로
            </button>
          </div>
          {!reels ? (
            <p className="text-sm text-gray-400">불러오는 중…</p>
          ) : (
            <ul className="divide-y divide-gray-800">
              {reels.map((r) => (
                <RetagRow key={r.id} reel={r} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
