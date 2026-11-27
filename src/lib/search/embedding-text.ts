import { createHash } from "node:crypto";

const CAPTION_LIMIT = 2000;

export type EmbeddingSource = {
  caption: string | null;
  memo: string | null;
  review: string | null;
  categories: string[];
  tags: string[];
};

/**
 * 벡터로 바꿀 글. 줄 순서: 카테고리, 태그, 캡션, 메모, 후기(빈 칸은 생략).
 * includePrivateNotes가 false면 메모와 후기를 뺀다(일반 가입자: 직접 쓴 메모, 후기는 Gemini로 보내지 않는다).
 */
export function buildEmbeddingText(r: EmbeddingSource, options: { includePrivateNotes?: boolean } = {}): string {
  const includePrivateNotes = options.includePrivateNotes ?? true;
  const lines: [string, string][] = [
    ["카테고리", r.categories.join(", ")],
    ["태그", r.tags.join(", ")],
    ["캡션", (r.caption ?? "").trim().slice(0, CAPTION_LIMIT)],
    ["메모", includePrivateNotes ? (r.memo ?? "").trim() : ""],
    ["후기", includePrivateNotes ? (r.review ?? "").trim() : ""],
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

/** 운영에서는 관리자 게시물만 벡터로 만든다(다른 가입자의 메모, 후기를 Gemini로 보내지 않기 위해, 2026-11-25 사용자 결정) */
export function filterAdminOwned(reels: { id: string; userId: string }[], adminIds: Set<string>): string[] {
  return reels.filter((r) => adminIds.has(r.userId)).map((r) => r.id);
}
