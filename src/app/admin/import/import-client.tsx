"use client";

import { useCallback, useEffect, useState } from "react";
import { parseCollections, parseSavedPosts } from "@/lib/instagram-import/parse-export";
import { ADD_CHUNK_SIZE, planImport } from "@/lib/instagram-import/plan-import";
import {
  addCandidates,
  createImportBatch,
  getBatchSummary,
  getReviewGroups,
  runSuggestions,
  type ReviewGroup,
} from "@/lib/instagram-import/actions";
import { GroupPanel } from "./group-panel";

type Summary = { total: number; pending: number; aiTotal: number; unsuggested: number; saved: number; excluded: number };

const KIND_BADGE: Record<ReviewGroup["kind"], { text: string; className: string } | null> = {
  kept: { text: "내 컬렉션", className: "bg-gray-800 text-gray-300" },
  ai: { text: "AI 제안", className: "bg-blue-950 text-blue-300" },
  new: { text: "새 카테고리", className: "bg-amber-950 text-amber-300" },
  uncertain: { text: "분류 애매", className: "bg-red-950 text-red-300" },
};

export function ImportClient({ initialBatchId }: { initialBatchId: string | null }) {
  const [batchId, setBatchId] = useState<string | null>(initialBatchId);
  const [postsFile, setPostsFile] = useState<File | null>(null);
  const [collectionsFile, setCollectionsFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [groups, setGroups] = useState<ReviewGroup[]>([]);
  const [openGroup, setOpenGroup] = useState<ReviewGroup | null>(null);

  const refresh = useCallback(async (id: string) => {
    const s = await getBatchSummary(id);
    if (!("error" in s)) setSummary(s);
    setGroups(await getReviewGroups(id));
  }, []);

  useEffect(() => {
    if (batchId) refresh(batchId);
  }, [batchId, refresh]);

  async function handleUpload() {
    if (!postsFile || !collectionsFile) return;
    setBusy(true);
    setMessage("파일을 읽는 중…");
    try {
      const posts = parseSavedPosts(JSON.parse(await postsFile.text()));
      const collections = parseCollections(JSON.parse(await collectionsFile.text()));
      if (posts.length === 0) throw new Error("저장 게시물을 찾지 못했습니다. saved_posts.json이 맞는지 확인해 주세요.");
      const plan = planImport({ posts, collections, existingUrls: new Set() });

      const created = await createImportBatch();
      if ("error" in created) throw new Error(created.error);

      let added = 0, existing = 0, pending = 0;
      for (let i = 0; i < plan.items.length; i += ADD_CHUNK_SIZE) {
        const chunk = plan.items.slice(i, i + ADD_CHUNK_SIZE).map((it) => ({
          ...it,
          savedAt: it.savedAt.toISOString(),
        }));
        const r = await addCandidates(created.batchId, chunk);
        if ("error" in r) throw new Error(r.error);
        added += r.added;
        existing += r.skippedExisting;
        pending += r.skippedPending;
        setMessage(`올리는 중… ${Math.min(i + ADD_CHUNK_SIZE, plan.items.length)} / ${plan.items.length}`);
      }
      setBatchId(created.batchId);
      setMessage(
        `가져올 게시물 ${added}개. 이미 Trovely에 있어 건너뜀 ${existing}개, 다른 가져오기에서 대기 중이라 건너뜀 ${pending}개.` +
          (plan.droppedEmptyCollections.length ? ` 빈 컬렉션은 옮기지 않음: ${plan.droppedEmptyCollections.join(", ")}.` : ""),
      );
      await refresh(created.batchId);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "파일을 처리하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSuggest() {
    if (!batchId) return;
    setBusy(true);
    try {
      for (;;) {
        const r = await runSuggestions(batchId);
        if ("error" in r) {
          setMessage(r.error);
          break;
        }
        setMessage(r.remaining > 0 ? `AI 제안 중… 남은 게시물 ${r.remaining}개` : "AI 제안을 모두 마쳤습니다.");
        await refresh(batchId);
        if (r.remaining === 0 || r.processed === 0) break;
      }
    } finally {
      setBusy(false);
    }
  }

  const done = summary ? summary.total - summary.pending : 0;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">인스타그램 가져오기</h1>
        <p className="mt-1 text-sm text-gray-400">
          인스타그램 &quot;내 정보 내보내기&quot;에서 받은 saved_posts.json과 saved_collections.json을 올리면, 큰 컬렉션은 카테고리로 옮기고 나머지는 AI가 분류를 제안합니다.
        </p>
      </div>

      <section className="space-y-3 rounded-xl border border-gray-800 p-5">
        <h2 className="font-medium">1. 파일 올리기</h2>
        <label className="block text-sm">
          saved_posts.json
          <input type="file" accept="application/json" className="mt-1 block text-sm" onChange={(e) => setPostsFile(e.target.files?.[0] ?? null)} />
        </label>
        <label className="block text-sm">
          saved_collections.json
          <input type="file" accept="application/json" className="mt-1 block text-sm" onChange={(e) => setCollectionsFile(e.target.files?.[0] ?? null)} />
        </label>
        <button
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-900 disabled:opacity-40"
          disabled={busy || !postsFile || !collectionsFile}
          onClick={handleUpload}
        >
          가져오기 시작
        </button>
      </section>

      {batchId && summary && (
        <section className="space-y-3 rounded-xl border border-gray-800 p-5">
          <h2 className="font-medium">2. AI 제안(모든 게시물에 태그, 카테고리가 필요한 게시물엔 카테고리도)</h2>
          <div className="h-2 w-full overflow-hidden rounded bg-gray-800">
            <div
              className="h-full bg-blue-500"
              style={{ width: `${summary.aiTotal ? ((summary.aiTotal - summary.unsuggested) / summary.aiTotal) * 100 : 100}%` }}
            />
          </div>
          <p className="text-sm text-gray-400">
            AI 제안 {summary.aiTotal - summary.unsuggested}/{summary.aiTotal}개 끝 · 대기 {summary.pending}개 · 저장 {summary.saved}개 · 뺌 {summary.excluded}개 · 처리 {done}/{summary.total}. AI 제안이 끝난 게시물부터 아래 묶음에 나타납니다. 직접 넣은 태그는 AI가 덮어쓰지 않습니다.
          </p>
          <button
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-900 disabled:opacity-40"
            disabled={busy || summary.unsuggested === 0}
            onClick={handleSuggest}
          >
            {summary.unsuggested === summary.aiTotal ? "AI 제안 시작" : "이어서 하기"}
          </button>
        </section>
      )}

      {message && <p className="text-sm text-gray-300">{message}</p>}

      {batchId && groups.length > 0 && (
        <section className="space-y-3 rounded-xl border border-gray-800 p-5">
          <h2 className="font-medium">3. 묶음별 검토</h2>
          <ul className="divide-y divide-gray-800">
            {groups.map((g) => {
              const badge = KIND_BADGE[g.kind];
              return (
                <li key={g.key} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{g.label}</span>
                    <span className="text-sm text-gray-400">{g.count}개</span>
                    {badge && <span className={`rounded px-2 py-0.5 text-xs ${badge.className}`}>{badge.text}</span>}
                  </div>
                  <button className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm" onClick={() => setOpenGroup(g)}>
                    묶음 열기
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {batchId && openGroup && (
        <GroupPanel
          batchId={batchId}
          group={openGroup}
          onClose={() => setOpenGroup(null)}
          onChanged={() => refresh(batchId)}
        />
      )}
    </div>
  );
}
