"use client";

import { useEffect, useState } from "react";
import type { ImportCandidate } from "@prisma/client";
import {
  excludeCandidate,
  getGroupCandidates,
  saveGroup,
  updateCandidate,
  type ReviewGroup,
} from "@/lib/instagram-import/actions";
import { finalCategories } from "@/lib/instagram-import/review";

const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

function CandidateRow({ c, onChanged }: { c: ImportCandidate; onChanged: () => void }) {
  const [cats, setCats] = useState(finalCategories(c).join(", "));
  const [tags, setTags] = useState(c.tags.join(", "));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await updateCandidate(c.id, { categories: split(cats), tags: split(tags) });
    setSaving(false);
    onChanged();
  }

  return (
    <li className="space-y-2 py-3">
      <div className="flex items-start justify-between gap-3">
        <a href={c.url} target="_blank" rel="noreferrer" className="text-sm text-gray-200 hover:underline">
          {c.caption ? c.caption.slice(0, 80) + (c.caption.length > 80 ? "…" : "") : "(캡션 없음)"}
        </a>
        <button
          className="shrink-0 rounded border border-gray-700 px-2 py-1 text-xs text-gray-400"
          onClick={async () => {
            await excludeCandidate(c.id);
            onChanged();
          }}
        >
          가져오지 않기
        </button>
      </div>
      {c.newCategories.length > 0 && <p className="text-xs text-amber-300">새 카테고리: {c.newCategories.join(", ")}</p>}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label className="flex items-center gap-1">
          카테고리
          <input className="w-48 rounded bg-gray-900 px-2 py-1" value={cats} onChange={(e) => setCats(e.target.value)} />
        </label>
        <label className="flex items-center gap-1">
          태그
          <input className="w-64 rounded bg-gray-900 px-2 py-1" value={tags} onChange={(e) => setTags(e.target.value)} />
        </label>
        <button className="rounded border border-gray-700 px-2 py-1" disabled={saving} onClick={save}>
          고치기
        </button>
      </div>
    </li>
  );
}

export function GroupPanel({
  batchId,
  group,
  onClose,
  onChanged,
}: {
  batchId: string;
  group: ReviewGroup;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<ImportCandidate[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function load() {
    setItems(await getGroupCandidates(batchId, group.key));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.key]);

  async function changed() {
    await load();
    onChanged();
  }

  async function saveAll() {
    setBusy(true);
    const r = await saveGroup(batchId, group.key);
    setBusy(false);
    setNote("error" in r ? r.error : `${r.saved}개를 저장했습니다.`);
    await changed();
  }

  return (
    <section className="space-y-3 rounded-xl border border-gray-700 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">
          {group.label} <span className="text-sm text-gray-400">{items?.length ?? group.count}개</span>
        </h2>
        <div className="flex gap-2">
          <button
            className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-gray-900 disabled:opacity-40"
            disabled={busy || !items || items.length === 0}
            onClick={saveAll}
          >
            {items?.length ?? 0}개 모두 저장
          </button>
          <button className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-500">
        카테고리를 고치면 그 게시물은 다른 묶음으로 옮겨 갈 수 있습니다. 태그는 저장한 뒤에도 수정 화면에서 고칠 수 있습니다.
      </p>
      {note && <p className="text-sm text-gray-300">{note}</p>}
      {!items ? (
        <p className="text-sm text-gray-400">불러오는 중…</p>
      ) : (
        <ul className="divide-y divide-gray-800">
          {items.map((c) => (
            <CandidateRow key={c.id} c={c} onChanged={changed} />
          ))}
        </ul>
      )}
    </section>
  );
}
