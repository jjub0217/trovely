"use server";

import { revalidatePath } from "next/cache";
import type { ImportCandidate } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { DEMO_MODE } from "@/lib/demo";
import { normalizeTagNames } from "@/lib/tag-name";
import { requestSuggestions, SUGGEST_BATCH_SIZE } from "./suggest";
import { describeAiError } from "@/lib/ai/gemini";
import { ADD_CHUNK_SIZE, chooseBatchId } from "./plan-import";
import { refreshEmbeddingsAfterResponse } from "@/lib/search/embedding-refresh";
import { finalCategories, groupOf, REVIEWABLE_WHERE, suggestionUpdate, type GroupKind } from "./review";

const DEMO_ERROR = { error: "데모 모드에서는 가져오기를 쓸 수 없습니다" } as const;

export type ReviewGroup = { key: string; label: string; count: number; kind: GroupKind };

async function ownBatch(batchId: string, userId: string) {
  return prisma.importBatch.findFirst({ where: { id: batchId, userId } });
}

/** 브라우저가 내보내기 파일을 읽어 planImport까지 한 결과를 조금씩 보낸다(요청 크기 제한 때문). */
export type CandidateInput = {
  url: string;
  caption: string;
  savedAt: string; // ISO 문자열
  keptCategories: string[];
  fromCollections: string[];
  needsAi: boolean;
};

export async function createImportBatch(): Promise<{ batchId: string } | { error: string }> {
  if (DEMO_MODE) return DEMO_ERROR;
  const userId = await requireAdmin();
  const batch = await prisma.importBatch.create({ data: { userId } });
  return { batchId: batch.id };
}

export async function addCandidates(
  batchId: string,
  items: CandidateInput[],
): Promise<{ added: number; skippedExisting: number; skippedPending: number } | { error: string }> {
  if (DEMO_MODE) return DEMO_ERROR;
  const userId = await requireAdmin();
  if (!(await ownBatch(batchId, userId))) return { error: "가져오기 작업을 찾을 수 없습니다" };
  if (items.length > ADD_CHUNK_SIZE) return { error: `한 번에 ${ADD_CHUNK_SIZE}개까지 보낼 수 있습니다` };

  const urls = items.map((i) => i.url);
  const existing = new Set(
    (await prisma.reel.findMany({ where: { userId, url: { in: urls } }, select: { url: true } })).map((r) => r.url),
  );
  // 다른 배치(또는 같은 배치)에서 아직 저장을 기다리는 주소는 다시 넣지 않는다.
  const pending = new Set(
    (
      await prisma.importCandidate.findMany({
        where: { status: "pending", batch: { userId }, url: { in: urls } },
        select: { url: true },
      })
    ).map((p) => p.url),
  );
  const fresh = items.filter((i) => !existing.has(i.url) && !pending.has(i.url));

  await prisma.importCandidate.createMany({
    data: fresh.map((i) => ({
      batchId,
      url: i.url,
      caption: i.caption,
      savedAt: new Date(i.savedAt),
      keptCategories: i.keptCategories,
      fromCollections: i.fromCollections,
      needsAi: i.needsAi,
    })),
    skipDuplicates: true,
  });

  return {
    added: fresh.length,
    skippedExisting: items.filter((i) => existing.has(i.url)).length,
    skippedPending: items.filter((i) => !existing.has(i.url) && pending.has(i.url)).length,
  };
}

/** 한 번 호출에 AI 요청을 몇 개까지 동시에 보낼지 */
const SUGGEST_PARALLEL = 4;

export async function runSuggestions(
  batchId: string,
): Promise<{ processed: number; remaining: number } | { error: string }> {
  if (DEMO_MODE) return DEMO_ERROR;
  const userId = await requireAdmin();
  if (!(await ownBatch(batchId, userId))) return { error: "가져오기 작업을 찾을 수 없습니다" };

  // 모든 게시물에 AI 태그를 붙인다(2026-11-25 사용자 결정). 카테고리가 필요한 게시물부터.
  const todo = await prisma.importCandidate.findMany({
    where: { batchId, suggested: false, status: "pending" },
    orderBy: [{ needsAi: "desc" }, { savedAt: "desc" }],
    take: SUGGEST_BATCH_SIZE * SUGGEST_PARALLEL,
  });

  let processed = 0;
  let firstError: unknown = null;
  if (todo.length > 0) {
    const categories = await prisma.category.findMany({ where: { userId }, select: { name: true } });
    const keptNames = await prisma.importCandidate.findMany({
      where: { batchId },
      select: { keptCategories: true },
      distinct: ["keptCategories"],
    });
    const existingNames = [
      ...new Set([...categories.map((c) => c.name), ...keptNames.flatMap((k) => k.keptCategories)]),
    ];

    const chunks: (typeof todo)[] = [];
    for (let i = 0; i < todo.length; i += SUGGEST_BATCH_SIZE) chunks.push(todo.slice(i, i + SUGGEST_BATCH_SIZE));

    const results = await Promise.allSettled(
      chunks.map(async (chunk) => {
        const suggestions = await requestSuggestions(
          chunk.map((c) => ({
            url: c.url,
            caption: c.caption,
            fromCollections: c.fromCollections,
            needsCategory: c.needsAi,
          })),
          existingNames,
        );
        const byUrl = new Map(suggestions.map((s) => [s.url, s]));
        await prisma.$transaction(
          chunk.map((c) =>
            prisma.importCandidate.update({ where: { id: c.id }, data: suggestionUpdate(c, byUrl.get(c.url)) }),
          ),
        );
        return chunk.length;
      }),
    );
    for (const r of results) {
      if (r.status === "fulfilled") processed += r.value;
      else firstError ??= r.reason;
    }
  }

  // 처리 못 한 후보는 suggested=false로 남아 다음 호출에서 이어서 한다.
  if (firstError && processed === 0) return { error: describeAiError(firstError) };
  const remaining = await prisma.importCandidate.count({
    where: { batchId, suggested: false, status: "pending" },
  });
  return { processed, remaining };
}

export async function getReviewGroups(batchId: string): Promise<ReviewGroup[]> {
  if (DEMO_MODE) return [];
  const userId = await requireAdmin();
  if (!(await ownBatch(batchId, userId))) return [];
  const candidates = await prisma.importCandidate.findMany({
    where: { batchId, status: "pending", ...REVIEWABLE_WHERE },
  });
  const groups = new Map<string, ReviewGroup>();
  for (const c of candidates) {
    const g = groupOf(c);
    const cur = groups.get(g.key) ?? { ...g, count: 0 };
    cur.count++;
    groups.set(g.key, cur);
  }
  const order: GroupKind[] = ["kept", "ai", "new", "uncertain"];
  return [...groups.values()].sort(
    (a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || b.count - a.count,
  );
}

export async function getGroupCandidates(batchId: string, groupKey: string): Promise<ImportCandidate[]> {
  if (DEMO_MODE) return [];
  const userId = await requireAdmin();
  if (!(await ownBatch(batchId, userId))) return [];
  const candidates = await prisma.importCandidate.findMany({
    where: { batchId, status: "pending", ...REVIEWABLE_WHERE },
    orderBy: { savedAt: "desc" },
  });
  return candidates.filter((c) => groupOf(c).key === groupKey);
}

async function ownCandidate(id: string, userId: string) {
  return prisma.importCandidate.findFirst({ where: { id, batch: { userId } } });
}

export async function updateCandidate(
  id: string,
  patch: { categories?: string[]; tags?: string[] },
): Promise<{ ok: true } | { error: string }> {
  if (DEMO_MODE) return DEMO_ERROR;
  const userId = await requireAdmin();
  const c = await ownCandidate(id, userId);
  if (!c) return { error: "후보를 찾을 수 없습니다" };

  const data: Partial<ImportCandidate> = {};
  if (patch.tags) data.tags = normalizeTagNames(patch.tags);
  if (patch.categories) {
    const cats = [...new Set(patch.categories.map((s) => s.trim()).filter(Boolean))];
    if (c.needsAi) {
      // 사용자가 정한 카테고리는 확정값으로 본다.
      data.suggestedCategories = cats;
      data.newCategories = [];
      data.uncertain = cats.length === 0;
    } else {
      data.keptCategories = cats;
    }
  }
  await prisma.importCandidate.update({ where: { id }, data });
  return { ok: true };
}

export async function excludeCandidate(id: string): Promise<{ ok: true } | { error: string }> {
  if (DEMO_MODE) return DEMO_ERROR;
  const userId = await requireAdmin();
  if (!(await ownCandidate(id, userId))) return { error: "후보를 찾을 수 없습니다" };
  await prisma.importCandidate.update({ where: { id }, data: { status: "excluded" } });
  return { ok: true };
}

export async function saveGroup(
  batchId: string,
  groupKey: string,
): Promise<{ saved: number; reelIds: string[] } | { error: string }> {
  if (DEMO_MODE) return DEMO_ERROR;
  const userId = await requireAdmin();
  if (!(await ownBatch(batchId, userId))) return { error: "가져오기 작업을 찾을 수 없습니다" };

  const candidates = (
    await prisma.importCandidate.findMany({ where: { batchId, status: "pending", ...REVIEWABLE_WHERE } })
  ).filter((c) => groupOf(c).key === groupKey);

  const reelIds: string[] = [];
  for (const c of candidates) {
    const exists = await prisma.reel.findUnique({ where: { url_userId: { url: c.url, userId } } });
    if (!exists) {
      const categories = await Promise.all(
        finalCategories(c).map((name) =>
          prisma.category.upsert({
            where: { name_userId: { name, userId } },
            update: {},
            create: { name, userId },
          }),
        ),
      );
      const tags = await Promise.all(
        normalizeTagNames(c.tags).map((name) =>
          prisma.tag.upsert({
            where: { name_userId: { name, userId } },
            update: {},
            create: { name, userId },
          }),
        ),
      );
      const reel = await prisma.reel.create({
        data: {
          url: c.url,
          thumbnail: null,
          caption: c.caption || null,
          source: "instagram",
          userId,
          createdAt: c.savedAt,
          categories: { create: categories.map((cat) => ({ categoryId: cat.id })) },
          tags: { create: tags.map((t) => ({ tagId: t.id })) },
        },
      });
      reelIds.push(reel.id);
    }
    await prisma.importCandidate.update({ where: { id: c.id }, data: { status: "saved" } });
  }

  revalidatePath("/");
  refreshEmbeddingsAfterResponse(reelIds);
  return { saved: reelIds.length, reelIds };
}

export async function getBatchSummary(batchId: string): Promise<
  { total: number; pending: number; aiTotal: number; unsuggested: number; saved: number; excluded: number } | { error: string }
> {
  if (DEMO_MODE) return DEMO_ERROR;
  const userId = await requireAdmin();
  if (!(await ownBatch(batchId, userId))) return { error: "가져오기 작업을 찾을 수 없습니다" };
  const [total, pending, aiTotal, unsuggested, saved, excluded] = await Promise.all([
    prisma.importCandidate.count({ where: { batchId } }),
    prisma.importCandidate.count({ where: { batchId, status: "pending" } }),
    prisma.importCandidate.count({ where: { batchId, status: "pending" } }),
    prisma.importCandidate.count({ where: { batchId, status: "pending", suggested: false } }),
    prisma.importCandidate.count({ where: { batchId, status: "saved" } }),
    prisma.importCandidate.count({ where: { batchId, status: "excluded" } }),
  ]);
  return { total, pending, aiTotal, unsuggested, saved, excluded };
}

export async function getLatestBatchId(): Promise<string | null> {
  if (DEMO_MODE) return null;
  const userId = await requireAdmin();
  const batches = await prisma.importBatch.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, _count: { select: { candidates: true } } },
  });
  return chooseBatchId(batches.map((b) => ({ id: b.id, candidateCount: b._count.candidates })));
}

/** 새로 넣은 후보가 0개인 배치(같은 파일을 다시 올린 경우)는 지운다 */
export async function deleteEmptyBatch(batchId: string): Promise<{ ok: true } | { error: string }> {
  if (DEMO_MODE) return DEMO_ERROR;
  const userId = await requireAdmin();
  if (!(await ownBatch(batchId, userId))) return { error: "가져오기 작업을 찾을 수 없습니다" };
  if ((await prisma.importCandidate.count({ where: { batchId } })) > 0) return { error: "후보가 있는 가져오기는 지우지 않습니다" };
  await prisma.importBatch.delete({ where: { id: batchId } });
  return { ok: true };
}
