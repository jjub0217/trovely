"use server";

import { revalidatePath } from "next/cache";
import type { ImportCandidate } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { DEMO_MODE } from "@/lib/demo";
import { normalizeTagNames } from "@/lib/tag-name";
import { requestSuggestions, SUGGEST_BATCH_SIZE } from "./suggest";
import { describeAiError } from "@/lib/ai/gemini";
import { ADD_CHUNK_SIZE } from "./plan-import";
import { finalCategories, groupOf, type GroupKind } from "./review";

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

export async function runSuggestions(
  batchId: string,
): Promise<{ processed: number; remaining: number } | { error: string }> {
  if (DEMO_MODE) return DEMO_ERROR;
  const userId = await requireAdmin();
  if (!(await ownBatch(batchId, userId))) return { error: "가져오기 작업을 찾을 수 없습니다" };

  const todo = await prisma.importCandidate.findMany({
    where: { batchId, suggested: false, status: "pending" },
    // 카테고리가 필요한 게시물(needsAi)부터: 검토할 AI 묶음이 먼저 생기게
    orderBy: [{ needsAi: "desc" }, { savedAt: "desc" }],
    take: SUGGEST_BATCH_SIZE,
  });

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

    try {
      const suggestions = await requestSuggestions(
        todo.map((c) => ({
          url: c.url,
          caption: c.caption,
          fromCollections: c.fromCollections,
          needsCategory: c.needsAi,
        })),
        existingNames,
      );
      const byUrl = new Map(suggestions.map((s) => [s.url, s]));
      await prisma.$transaction(
        todo.map((c) => {
          const s = byUrl.get(c.url);
          return prisma.importCandidate.update({
            where: { id: c.id },
            data: {
              suggested: true,
              tags: s?.tags ?? [],
              suggestedCategories: c.needsAi ? (s?.categories ?? []) : [],
              newCategories: c.needsAi ? (s?.newCategories ?? []) : [],
              uncertain: c.needsAi ? (s?.uncertain ?? true) : false,
            },
          });
        }),
      );
    } catch (e) {
      // 처리 못 한 후보는 suggested=false로 남아 다음 호출에서 이어서 한다.
      return { error: describeAiError(e) };
    }
  }

  const remaining = await prisma.importCandidate.count({
    where: { batchId, suggested: false, status: "pending" },
  });
  return { processed: todo.length, remaining };
}

export async function getReviewGroups(batchId: string): Promise<ReviewGroup[]> {
  if (DEMO_MODE) return [];
  const userId = await requireAdmin();
  if (!(await ownBatch(batchId, userId))) return [];
  const candidates = await prisma.importCandidate.findMany({
    where: { batchId, status: "pending", suggested: true },
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
    where: { batchId, status: "pending", suggested: true },
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
    await prisma.importCandidate.findMany({ where: { batchId, status: "pending", suggested: true } })
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
  return { saved: reelIds.length, reelIds };
}

export async function getBatchSummary(batchId: string): Promise<
  { total: number; pending: number; unsuggested: number; saved: number; excluded: number } | { error: string }
> {
  if (DEMO_MODE) return DEMO_ERROR;
  const userId = await requireAdmin();
  if (!(await ownBatch(batchId, userId))) return { error: "가져오기 작업을 찾을 수 없습니다" };
  const [total, pending, unsuggested, saved, excluded] = await Promise.all([
    prisma.importCandidate.count({ where: { batchId } }),
    prisma.importCandidate.count({ where: { batchId, status: "pending" } }),
    prisma.importCandidate.count({ where: { batchId, status: "pending", suggested: false } }),
    prisma.importCandidate.count({ where: { batchId, status: "saved" } }),
    prisma.importCandidate.count({ where: { batchId, status: "excluded" } }),
  ]);
  return { total, pending, unsuggested, saved, excluded };
}

export async function getLatestBatchId(): Promise<string | null> {
  if (DEMO_MODE) return null;
  const userId = await requireAdmin();
  const b = await prisma.importBatch.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  return b?.id ?? null;
}
