import { createHash } from "node:crypto";

const CAPTION_LIMIT = 2000;

export type EmbeddingSource = {
  caption: string | null;
  memo: string | null;
  review: string | null;
  categories: string[];
  tags: string[];
};

/** 벡터로 바꿀 글. 줄 순서: 카테고리, 태그, 캡션, 메모, 후기(빈 칸은 생략) */
export function buildEmbeddingText(r: EmbeddingSource): string {
  const lines: [string, string][] = [
    ["카테고리", r.categories.join(", ")],
    ["태그", r.tags.join(", ")],
    ["캡션", (r.caption ?? "").trim().slice(0, CAPTION_LIMIT)],
    ["메모", (r.memo ?? "").trim()],
    ["후기", (r.review ?? "").trim()],
  ];
  return lines
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

export function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/** 벡터를 새로 만들어야 하는가: 글이 있고, 저장된 해시와 다를 때만 */
export function needsEmbedding(text: string, existingHash: string | undefined): boolean {
  return text.length > 0 && hashText(text) !== existingHash;
}

/** pgvector에 넣을 글 형식 `[0.1,0.2,…]` */
export function toVectorLiteral(values: number[], dim: number): string {
  if (values.length !== dim) throw new Error(`벡터 차원이 맞지 않습니다(기대 ${dim}, 실제 ${values.length})`);
  if (values.some((v) => !Number.isFinite(v))) throw new Error("벡터에 숫자가 아닌 값이 있습니다");
  return `[${values.join(",")}]`;
}
