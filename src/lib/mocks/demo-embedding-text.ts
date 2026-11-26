import { buildEmbeddingText } from "@/lib/search/embedding-text";

type DemoReelLike = {
  caption: string | null;
  memo: string | null;
  review: string | null;
  categories: { category: { name: string } }[];
  tags: { tag: { name: string } }[];
};

/** 데모 예시 게시물을 벡터로 바꿀 글(운영과 같은 규칙) */
export function demoEmbeddingText(r: DemoReelLike): string {
  return buildEmbeddingText({
    caption: r.caption,
    memo: r.memo,
    review: r.review,
    categories: r.categories.map((c) => c.category.name),
    tags: r.tags.map((t) => t.tag.name),
  });
}
