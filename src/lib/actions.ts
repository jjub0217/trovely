"use server";

import { prisma } from "./db";
import { deleteAccountData } from "./account-deletion";
import { extractThumbnail } from "./og";
import type { ReelWithRelations } from "@/types";
import { refreshEmbeddingsAfterResponse } from "./search/embedding-refresh";
import { semanticReels } from "./search/semantic";
import { buildKeywordWhere } from "./search/keyword-where";
import { similarExtras } from "./search/merge";
import { isQuestionTooLong } from "./search/ask";
import { demoSemanticIds } from "./search/demo-search";
import { consumeDemoQuota } from "./demo/usage";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { isAdmin, requireAuth } from "./auth";
import { normalizeReelUrl, type ReelSource } from "./reel-url";
import { normalizeTagName, normalizeTagNames } from "./tag-name";
import { normalizeThumbnailUrl } from "./thumbnail-url";
import { cacheThumbnail } from "./thumbnail-cache";
import { DEMO_MODE } from "./demo";
import {
  getMockReels,
  getMockReel,
  getMockCategories,
  getMockTags,
  getMockUserStats,
  getMockUserEmail,
} from "./mocks/portal";

async function resolveThumbnail(
  raw: string | null | undefined,
  stableKey: string
): Promise<string | null> {
  const normalized = normalizeThumbnailUrl(raw);
  if (!normalized) return null;
  const cached = await cacheThumbnail(normalized, stableKey);
  return cached ?? normalized;
}

export async function createReel(formData: {
  url: string;
  thumbnail?: string | null;
  caption?: string | null;
  memo?: string;
  review?: string;
  categoryIds: string[];
  tagNames: string[];
}) {
  if (DEMO_MODE) return { error: "데모 모드에서는 변경할 수 없습니다" };
  const userId = await requireAuth();
  const parsed = normalizeReelUrl(formData.url);
  if (!parsed) {
    return { error: "올바른 인스타그램 게시물 또는 유튜브 영상 URL을 입력해주세요" };
  }
  const { url: normalizedUrl, source } = parsed;

  const { memo, review, categoryIds, tagNames } = formData;
  const hasReview = Boolean(review?.trim());
  const normalizedTagNames = normalizeTagNames(tagNames);

  const existing = await prisma.reel.findUnique({
    where: { url_userId: { url: normalizedUrl, userId } },
  });
  if (existing) {
    return { error: "이미 저장된 콘텐츠입니다" };
  }

  const thumbnail =
    formData.thumbnail !== undefined
      ? await resolveThumbnail(formData.thumbnail, normalizedUrl)
      : await extractThumbnail(normalizedUrl);

  const tags = await Promise.all(
    normalizedTagNames.map(async (name) => {
      return prisma.tag.upsert({
        where: { name_userId: { name, userId } },
        update: {},
        create: { name, userId },
      });
    })
  );

  const reel = await prisma.reel.create({
    data: {
      url: normalizedUrl,
      thumbnail,
      caption: formData.caption?.trim() || null,
      source,
      memo: memo || null,
      review: review || null,
      visited: hasReview,
      userId,
      categories: {
        create: categoryIds.map((categoryId) => ({ categoryId })),
      },
      tags: {
        create: tags.map((tag) => ({ tagId: tag.id })),
      },
    },
  });

  refreshEmbeddingsAfterResponse([reel.id]);
  revalidatePath("/");
  return { success: true, id: reel.id };
}

export async function updateReel(
  id: string,
  formData: {
    url: string;
    thumbnail?: string | null;
    memo?: string;
    review?: string;
    categoryIds: string[];
    tagNames: string[];
  }
) {
  if (DEMO_MODE) return { error: "데모 모드에서는 변경할 수 없습니다" };
  const userId = await requireAuth();
  const parsed = normalizeReelUrl(formData.url);
  if (!parsed) {
    return { error: "올바른 인스타그램 게시물 또는 유튜브 영상 URL을 입력해주세요" };
  }
  const { url: normalizedUrl, source } = parsed;

  const { memo, review, categoryIds, tagNames } = formData;
  const hasReview = Boolean(review?.trim());
  const normalizedTagNames = normalizeTagNames(tagNames);

  const reel = await prisma.reel.findFirst({ where: { id, userId } });
  if (!reel) return { error: "콘텐츠를 찾을 수 없습니다" };

  const existing = await prisma.reel.findFirst({
    where: { url: normalizedUrl, userId, NOT: { id } },
  });
  if (existing) {
    return { error: "이미 저장된 콘텐츠입니다" };
  }

  const thumbnail =
    formData.thumbnail !== undefined
      ? await resolveThumbnail(formData.thumbnail, normalizedUrl)
      : normalizedUrl !== reel.url
        ? await extractThumbnail(normalizedUrl)
        : reel.thumbnail;

  const tags = await Promise.all(
    normalizedTagNames.map(async (name) => {
      return prisma.tag.upsert({
        where: { name_userId: { name, userId } },
        update: {},
        create: { name, userId },
      });
    })
  );

  await prisma.$transaction([
    prisma.reelCategory.deleteMany({ where: { reelId: id } }),
    prisma.reelTag.deleteMany({ where: { reelId: id } }),
    prisma.reel.update({
      where: { id },
      data: {
        url: normalizedUrl,
        thumbnail,
        source,
        memo: memo || null,
        review: review || null,
        visited: hasReview ? true : reel.visited,
        categories: {
          create: categoryIds.map((categoryId) => ({ categoryId })),
        },
        tags: {
          create: tags.map((tag) => ({ tagId: tag.id })),
        },
      },
    }),
  ]);

  revalidatePath("/");
  revalidatePath(`/reels/${id}`);
  refreshEmbeddingsAfterResponse([id]);
  return { success: true };
}

export async function toggleVisited(id: string) {
  if (DEMO_MODE) return { error: "데모 모드에서는 변경할 수 없습니다" };
  const userId = await requireAuth();
  const reel = await prisma.reel.findFirst({
    where: { id, userId },
    select: { visited: true },
  });
  if (!reel) return { error: "콘텐츠를 찾을 수 없습니다" };

  await prisma.reel.update({ where: { id }, data: { visited: !reel.visited } });
  revalidatePath("/");
  revalidatePath(`/reels/${id}`);
  return { success: true, visited: !reel.visited };
}

export async function deleteReel(id: string) {
  if (DEMO_MODE) return { error: "데모 모드에서는 변경할 수 없습니다" };
  const userId = await requireAuth();
  const reel = await prisma.reel.findFirst({ where: { id, userId } });
  if (!reel) return { error: "콘텐츠를 찾을 수 없습니다" };

  await prisma.reel.delete({ where: { id } });
  revalidatePath("/");
  return { success: true };
}

export async function getReels({
  search,
  categoryId,
  source,
  status,
  sort = "newest",
  cursor,
  take = 20,
}: {
  search?: string;
  categoryId?: string | "uncategorized";
  source?: ReelSource;
  status?: string;
  sort?: string;
  cursor?: string;
  take?: number;
}) {
  if (DEMO_MODE) return getMockReels({ search, categoryId, source, status, sort, cursor, take });
  const userId = await requireAuth();
  const where = buildKeywordWhere({ userId, search, categoryId, source, status });

  const orderBy: Prisma.ReelOrderByWithRelationInput[] =
    sort === "oldest"
      ? [{ createdAt: "asc" }]
      : sort === "unvisited"
        ? [{ visited: "asc" }, { createdAt: "desc" }]
        : sort === "no-review"
          ? [{ review: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }]
          : [{ createdAt: "desc" }];

  const reels = await prisma.reel.findMany({
    where,
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
    orderBy,
    take: take + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  const hasMore = reels.length > take;
  const items = hasMore ? reels.slice(0, take) : reels;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return { items, nextCursor };
}

/**
 * 낱말 결과 아래에 붙일 "뜻이 비슷한 릴스": 고른 카테고리, 출처 안에서 뜻이 가까운 순 상위 20개 중
 * 낱말 검색에 이미 걸린 릴스를 뺀 것(2026-11-25 측정 뒤 사용자 결정: 낱말 먼저, 뜻 결과는 그 아래).
 */
export async function getSimilarReels({
  query,
  categoryId,
  source,
}: {
  query: string;
  categoryId?: string | "uncategorized";
  source?: ReelSource;
}): Promise<{ items: ReelWithRelations[]; limited?: boolean }> {
  const q = query.trim();
  // 아주 긴 검색어는 벡터로 바꾸지 않는다(사용량을 쓰기 전에 막는다)
  if (!q || isQuestionTooLong(q)) return { items: [] };
  if (DEMO_MODE) {
    // 데모: 방문자 누구나 쓰되 하루 상한(데모 전용 DB)을 넘으면 Gemini를 부르지 않는다
    if (!(await consumeDemoQuota("search"))) return { items: [], limited: true };
    const ids = await demoSemanticIds(q, { categoryId, source }, 20);
    const keywordIds = getMockReels({ search: q, categoryId, source, take: 1000 }).items.map((r) => r.id);
    const items = similarExtras(keywordIds, ids).flatMap((id) => {
      const r = getMockReel(id);
      return r ? [r] : [];
    });
    return { items: items as unknown as ReelWithRelations[] };
  }
  const userId = await requireAuth();
  // 운영에서는 관리자 게시물만 벡터가 있다. 다른 가입자는 검색어를 Gemini로 보내지 않고 키워드 검색만 쓴다.
  if (!(await isAdmin())) return { items: [] };
  const [semantic, keywordIds] = await Promise.all([
    semanticReels(userId, q, { categoryId, source }, undefined, { fast: true }),
    prisma.reel
      .findMany({ where: buildKeywordWhere({ userId, search: q, categoryId, source }), select: { id: true } })
      .then((rows) => rows.map((r) => r.id)),
  ]);
  const extra = new Set(similarExtras(keywordIds, semantic.map((r) => r.id)));
  return { items: semantic.filter((r) => extra.has(r.id)) };
}

export async function getReel(id: string) {
  if (DEMO_MODE) return getMockReel(id);
  const userId = await requireAuth();

  return prisma.reel.findFirst({
    where: { id, userId },
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
  });
}

export async function getCategories() {
  if (DEMO_MODE) return getMockCategories();
  const userId = await requireAuth();
  return prisma.category.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
}

export async function getTags() {
  if (DEMO_MODE) return getMockTags();
  const userId = await requireAuth();
  const tags = await prisma.tag.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { reels: true },
      },
    },
  });

  return tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    reelCount: tag._count.reels,
  }));
}

export async function createCategory(name: string) {
  if (DEMO_MODE) return { error: "데모 모드에서는 변경할 수 없습니다" };
  const userId = await requireAuth();
  const trimmed = name.trim();
  if (!trimmed) return { error: "카테고리명을 입력해주세요" };

  const existing = await prisma.category.findUnique({
    where: { name_userId: { name: trimmed, userId } },
  });
  if (existing) return { error: "이미 존재하는 카테고리입니다" };

  const category = await prisma.category.create({
    data: { name: trimmed, userId },
  });
  revalidatePath("/");
  revalidatePath("/categories");
  return { success: true, category };
}

export async function createTag(name: string) {
  if (DEMO_MODE) return { error: "데모 모드에서는 변경할 수 없습니다" };
  const userId = await requireAuth();
  const normalized = normalizeTagName(name);
  if (!normalized) return { error: "태그명을 입력해주세요" };

  const existing = await prisma.tag.findUnique({
    where: { name_userId: { name: normalized, userId } },
  });
  if (existing) return { error: "이미 존재하는 태그입니다" };

  const tag = await prisma.tag.create({
    data: { name: normalized, userId },
  });
  revalidatePath("/");
  revalidatePath("/archive");
  revalidatePath("/tags");
  return { success: true, tag };
}

async function reelIdsWithCategory(categoryId: string): Promise<string[]> {
  return (await prisma.reelCategory.findMany({ where: { categoryId }, select: { reelId: true } })).map((r) => r.reelId);
}

async function reelIdsWithTag(tagId: string): Promise<string[]> {
  return (await prisma.reelTag.findMany({ where: { tagId }, select: { reelId: true } })).map((r) => r.reelId);
}

export async function updateCategory(id: string, name: string) {
  if (DEMO_MODE) return { error: "데모 모드에서는 변경할 수 없습니다" };
  const userId = await requireAuth();
  const trimmed = name.trim();
  if (!trimmed) return { error: "카테고리명을 입력해주세요" };

  const category = await prisma.category.findFirst({ where: { id, userId } });
  if (!category) return { error: "카테고리를 찾을 수 없습니다" };

  const existing = await prisma.category.findFirst({
    where: { name: trimmed, userId, NOT: { id } },
  });
  if (existing) return { error: "이미 존재하는 카테고리입니다" };

  await prisma.category.update({ where: { id }, data: { name: trimmed } });
  refreshEmbeddingsAfterResponse(await reelIdsWithCategory(id));
  revalidatePath("/");
  revalidatePath("/categories");
  return { success: true };
}

export async function updateTag(id: string, name: string) {
  if (DEMO_MODE) return { error: "데모 모드에서는 변경할 수 없습니다" };
  const userId = await requireAuth();
  const normalized = normalizeTagName(name);
  if (!normalized) return { error: "태그명을 입력해주세요" };

  const tag = await prisma.tag.findFirst({ where: { id, userId } });
  if (!tag) return { error: "태그를 찾을 수 없습니다" };

  const existing = await prisma.tag.findFirst({
    where: { name: normalized, userId, NOT: { id } },
  });
  if (existing) return { error: "이미 존재하는 태그입니다" };

  await prisma.tag.update({
    where: { id },
    data: { name: normalized },
  });
  refreshEmbeddingsAfterResponse(await reelIdsWithTag(id));
  revalidatePath("/");
  revalidatePath("/archive");
  revalidatePath(`/reels/${id}`);
  revalidatePath("/tags");
  return { success: true };
}

export async function deleteCategory(id: string) {
  if (DEMO_MODE) return { error: "데모 모드에서는 변경할 수 없습니다" };
  const userId = await requireAuth();
  const category = await prisma.category.findFirst({ where: { id, userId } });
  if (!category) return { error: "카테고리를 찾을 수 없습니다" };

  const affectedReels = await reelIdsWithCategory(id);
  await prisma.category.delete({ where: { id } });
  refreshEmbeddingsAfterResponse(affectedReels);
  revalidatePath("/");
  revalidatePath("/categories");
  return { success: true };
}

export async function deleteTag(id: string) {
  if (DEMO_MODE) return { error: "데모 모드에서는 변경할 수 없습니다" };
  const userId = await requireAuth();
  const tag = await prisma.tag.findFirst({ where: { id, userId } });
  if (!tag) return { error: "태그를 찾을 수 없습니다" };

  const affectedReels = await reelIdsWithTag(id);
  await prisma.tag.delete({ where: { id } });
  refreshEmbeddingsAfterResponse(affectedReels);
  revalidatePath("/");
  revalidatePath("/archive");
  revalidatePath("/tags");
  return { success: true };
}

export async function refreshThumbnail(
  reelId: string,
  options: { revalidate?: boolean } = {}
): Promise<{ thumbnail: string | null }> {
  if (DEMO_MODE) return { thumbnail: null };
  const userId = await requireAuth();

  const reel = await prisma.reel.findFirst({ where: { id: reelId, userId } });
  if (!reel) return { thumbnail: null };

  const fresh = await extractThumbnail(reel.url);
  if (!fresh) return { thumbnail: null };

  await prisma.reel.update({
    where: { id: reel.id },
    data: { thumbnail: fresh },
  });
  // 비어 있던 썸네일을 채울 때는 카드마다 홈 화면을 다시 그리지 않는다(가져온 게시물 수천 개)
  if (options.revalidate !== false) revalidatePath("/");

  return { thumbnail: fresh };
}

export async function getUserStats() {
  if (DEMO_MODE) return getMockUserStats();
  const userId = await requireAuth();
  const [totalReels, visitedReels] = await Promise.all([
    prisma.reel.count({ where: { userId } }),
    prisma.reel.count({ where: { userId, visited: true } }),
  ]);
  return { totalReels, visitedReels };
}

export async function getUserEmail() {
  if (DEMO_MODE) return getMockUserEmail();
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email || "";
}

export async function deleteAccount({ reason }: { reason: string }) {
  if (DEMO_MODE) return { success: true as const };
  const userId = await requireAuth();

  const result = await deleteAccountData(userId, reason);
  if ("error" in result) return result;

  // 이 브라우저의 로그인 쿠키를 지운다. 계정은 이미 지워졌으므로 서버 쪽 로그아웃 요청이 실패해도 괜찮다.
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});

  return { success: true as const };
}

export async function signOut() {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  await supabase.auth.signOut();
}
