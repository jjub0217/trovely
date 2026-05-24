"use server";

import { prisma } from "./db";
import { extractThumbnail } from "./og";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireAuth } from "./auth";
import { normalizeReelUrl, type ReelSource } from "./reel-url";
import { normalizeTagName, normalizeTagNames } from "./tag-name";
import { normalizeThumbnailUrl } from "./thumbnail-url";
import { cacheThumbnail } from "./thumbnail-cache";

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
  memo?: string;
  review?: string;
  categoryIds: string[];
  tagNames: string[];
}) {
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
  return { success: true };
}

export async function toggleVisited(id: string) {
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
  const userId = await requireAuth();
  const where: Prisma.ReelWhereInput = { userId };

  if (source) {
    where.source = source;
  }

  if (categoryId === "uncategorized") {
    where.categories = { none: {} };
  } else if (categoryId) {
    where.categories = { some: { categoryId } };
  }

  if (status === "visited") {
    where.visited = true;
  } else if (status === "unvisited") {
    where.visited = false;
  } else if (status === "reviewed") {
    where.review = { not: null };
  }

  if (search) {
    const keywords = search.trim().split(/\s+/).filter(Boolean);
    where.AND = keywords.map((keyword) => ({
      OR: [
        { memo: { contains: keyword, mode: "insensitive" as const } },
        { review: { contains: keyword, mode: "insensitive" as const } },
        { tags: { some: { tag: { name: { contains: keyword, mode: "insensitive" as const } } } } },
        { categories: { some: { category: { name: { contains: keyword, mode: "insensitive" as const } } } } },
      ],
    }));
  }

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

export async function getReel(id: string) {
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
  const userId = await requireAuth();
  return prisma.category.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
}

export async function getTags() {
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

export async function updateCategory(id: string, name: string) {
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
  revalidatePath("/");
  revalidatePath("/categories");
  return { success: true };
}

export async function updateTag(id: string, name: string) {
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
  revalidatePath("/");
  revalidatePath("/archive");
  revalidatePath(`/reels/${id}`);
  revalidatePath("/tags");
  return { success: true };
}

export async function deleteCategory(id: string) {
  const userId = await requireAuth();
  const category = await prisma.category.findFirst({ where: { id, userId } });
  if (!category) return { error: "카테고리를 찾을 수 없습니다" };

  await prisma.category.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/categories");
  return { success: true };
}

export async function deleteTag(id: string) {
  const userId = await requireAuth();
  const tag = await prisma.tag.findFirst({ where: { id, userId } });
  if (!tag) return { error: "태그를 찾을 수 없습니다" };

  await prisma.tag.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/archive");
  revalidatePath("/tags");
  return { success: true };
}

export async function refreshThumbnail(
  reelId: string
): Promise<{ thumbnail: string | null }> {
  const userId = await requireAuth();

  const reel = await prisma.reel.findFirst({ where: { id: reelId, userId } });
  if (!reel) return { thumbnail: null };

  const fresh = await extractThumbnail(reel.url);
  if (!fresh) return { thumbnail: null };

  await prisma.reel.update({
    where: { id: reel.id },
    data: { thumbnail: fresh },
  });
  revalidatePath("/");

  return { thumbnail: fresh };
}

export async function getUserStats() {
  const userId = await requireAuth();
  const [totalReels, visitedReels] = await Promise.all([
    prisma.reel.count({ where: { userId } }),
    prisma.reel.count({ where: { userId, visited: true } }),
  ]);
  return { totalReels, visitedReels };
}

export async function getUserEmail() {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email || "";
}

export async function deleteAccount({ reason, detail }: { reason: string; detail?: string }) {
  const userId = await requireAuth();

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email || "";

  await prisma.$transaction([
    prisma.reelCategory.deleteMany({ where: { reel: { userId } } }),
    prisma.reelTag.deleteMany({ where: { reel: { userId } } }),
    prisma.reel.deleteMany({ where: { userId } }),
    prisma.category.deleteMany({ where: { userId } }),
    prisma.tag.deleteMany({ where: { userId } }),
    prisma.withdrawal.create({ data: { email, reason, detail: detail || null } }),
  ]);

  await supabase.auth.signOut();

  return { success: true };
}

export async function signOut() {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  await supabase.auth.signOut();
}
