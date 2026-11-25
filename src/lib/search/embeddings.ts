import { prisma } from "@/lib/db";
import { DEMO_MODE } from "@/lib/demo";
import { embedTexts, EMBEDDING_DIM } from "@/lib/ai/gemini";
import { buildEmbeddingText, hashText, needsEmbedding, toVectorLiteral } from "./embedding-text";

/**
 * 릴스들의 뜻 검색용 벡터를 만들거나 갱신한다.
 * 벡터로 바꿀 글의 해시가 저장된 값과 같으면 건너뛴다(같은 글을 다시 보내지 않음).
 */
export async function upsertReelEmbeddings(reelIds: string[]): Promise<{ updated: number; skipped: number }> {
  const ids = [...new Set(reelIds)];
  if (DEMO_MODE || ids.length === 0) return { updated: 0, skipped: ids.length };

  const reels = await prisma.reel.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      caption: true,
      memo: true,
      review: true,
      categories: { select: { category: { select: { name: true } } } },
      tags: { select: { tag: { select: { name: true } } } },
    },
  });
  const existing = await prisma.$queryRaw<{ reelId: string; textHash: string }[]>`
    SELECT "reelId", "textHash" FROM "ReelEmbedding" WHERE "reelId" = ANY(${ids})`;
  const hashById = new Map(existing.map((e) => [e.reelId, e.textHash]));

  const todo = reels
    .map((r) => ({
      id: r.id,
      text: buildEmbeddingText({
        caption: r.caption,
        memo: r.memo,
        review: r.review,
        categories: r.categories.map((c) => c.category.name),
        tags: r.tags.map((t) => t.tag.name),
      }),
    }))
    .filter((r) => needsEmbedding(r.text, hashById.get(r.id)));

  if (todo.length === 0) return { updated: 0, skipped: ids.length };

  const vectors = await embedTexts(
    todo.map((t) => t.text),
    "RETRIEVAL_DOCUMENT",
  );
  for (let i = 0; i < todo.length; i++) {
    const vec = toVectorLiteral(vectors[i], EMBEDDING_DIM);
    const hash = hashText(todo[i].text);
    await prisma.$executeRaw`
      INSERT INTO "ReelEmbedding" ("reelId", "embedding", "textHash", "updatedAt")
      VALUES (${todo[i].id}, ${vec}::vector, ${hash}, now())
      ON CONFLICT ("reelId") DO UPDATE
        SET "embedding" = EXCLUDED."embedding", "textHash" = EXCLUDED."textHash", "updatedAt" = now()`;
  }
  return { updated: todo.length, skipped: ids.length - todo.length };
}
