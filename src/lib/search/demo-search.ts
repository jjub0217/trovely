import type { ReelSource } from "@prisma/client";
import { embedTexts } from "@/lib/ai/gemini";
import { getAllMockReels } from "@/lib/mocks/portal";
import demoEmbeddings from "@/lib/mocks/demo-embeddings.json";

/** 코사인 유사도(두 벡터의 방향이 얼마나 같은지)가 큰 순서로 id를 고른다 */
export function rankByVector(query: number[], items: { id: string; vector: number[] }[], take: number): string[] {
  const norm = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  const qn = norm(query);
  return items
    .map((it) => ({ id: it.id, score: it.vector.reduce((s, x, i) => s + x * (query[i] ?? 0), 0) / (norm(it.vector) * qn) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, take)
    .map((x) => x.id);
}

export type DemoFilter = { categoryId?: string | "uncategorized"; source?: ReelSource; visited?: boolean };

const vectors = demoEmbeddings as Record<string, { hash: string; vector: number[] }>;

/** 데모: 검색어를 실제로 벡터로 바꾸고(Gemini), 예시 게시물 벡터와 가까운 순서로 id를 고른다 */
export async function demoSemanticIds(query: string, filter: DemoFilter, take: number): Promise<string[]> {
  const [q] = await embedTexts([query], "RETRIEVAL_QUERY", { retries: 0, timeoutMs: 3000 });
  const items = getAllMockReels()
    .filter((r) => !filter.source || r.source === filter.source)
    .filter((r) =>
      filter.categoryId === "uncategorized"
        ? r.categories.length === 0
        : !filter.categoryId || r.categories.some((c) => c.category.id === filter.categoryId),
    )
    .filter((r) => filter.visited === undefined || r.visited === filter.visited)
    .filter((r) => vectors[r.id])
    .map((r) => ({ id: r.id, vector: vectors[r.id].vector }));
  return rankByVector(q, items, take);
}
