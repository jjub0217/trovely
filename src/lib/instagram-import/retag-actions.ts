"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { DEMO_MODE } from "@/lib/demo";
import { refreshEmbeddingsAfterResponse } from "@/lib/search/embedding-refresh";
import { parseTagInput, retagGroupOf } from "./retag";

export type RetagGroup = { key: string; label: string; count: number };
export type RetagReel = { id: string; url: string; caption: string | null; categories: string[]; tags: string[] };

/** 이 가져오기에서 저장한 릴스(가져오기 기록의 주소로 찾음, 그사이 지운 릴스는 빠짐) */
async function importedReels(batchId: string, userId: string) {
  const urls = (
    await prisma.importCandidate.findMany({
      where: { batchId, status: "saved", batch: { userId } },
      select: { url: true },
    })
  ).map((c) => c.url);
  if (urls.length === 0) return [];
  return prisma.reel.findMany({
    where: { userId, url: { in: urls } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      url: true,
      caption: true,
      categories: { select: { category: { select: { name: true } } }, orderBy: { category: { name: "asc" } } },
      tags: { select: { tag: { select: { name: true } } } },
    },
  });
}

const toRetagReel = (r: Awaited<ReturnType<typeof importedReels>>[number]): RetagReel => ({
  id: r.id,
  url: r.url,
  caption: r.caption,
  categories: r.categories.map((c) => c.category.name),
  tags: r.tags.map((t) => t.tag.name),
});

export async function getRetagGroups(batchId: string): Promise<RetagGroup[]> {
  if (DEMO_MODE) return [];
  const userId = await requireAdmin();
  const groups = new Map<string, RetagGroup>();
  for (const r of await importedReels(batchId, userId)) {
    const g = retagGroupOf(r.categories.map((c) => c.category.name));
    const cur = groups.get(g.key) ?? { ...g, count: 0 };
    cur.count++;
    groups.set(g.key, cur);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

export async function getRetagReels(batchId: string, groupKey: string): Promise<RetagReel[]> {
  if (DEMO_MODE) return [];
  const userId = await requireAdmin();
  return (await importedReels(batchId, userId))
    .map(toRetagReel)
    .filter((r) => retagGroupOf(r.categories).key === groupKey);
}

/** 릴스 하나의 태그를 통째로 바꾼다(기존 수정 화면과 같은 규칙: 연결만 바꾸고, 쓰이지 않게 된 태그는 남겨 둠). 뜻 검색 벡터도 다시 만든다. */
export async function setReelTags(reelId: string, typed: string): Promise<{ ok: true; tags: string[] } | { error: string }> {
  if (DEMO_MODE) return { error: "데모 모드에서는 변경할 수 없습니다" };
  const userId = await requireAdmin();
  const reel = await prisma.reel.findFirst({ where: { id: reelId, userId }, select: { id: true } });
  if (!reel) return { error: "콘텐츠를 찾을 수 없습니다" };

  const names = parseTagInput(typed);
  const tags = await Promise.all(
    names.map((name) =>
      prisma.tag.upsert({ where: { name_userId: { name, userId } }, update: {}, create: { name, userId } }),
    ),
  );
  await prisma.$transaction([
    prisma.reelTag.deleteMany({ where: { reelId } }),
    prisma.reelTag.createMany({ data: tags.map((t) => ({ reelId, tagId: t.id })) }),
  ]);
  refreshEmbeddingsAfterResponse([reelId]);
  revalidatePath(`/reels/${reelId}`);
  return { ok: true, tags: names };
}
