/**
 * microlink가 돌려주는 인스타그램 설명은
 * `234 likes, 0 comments - 계정 on November 4, 2026: ”본문”.` 모양이다. 본문만 남긴다.
 */
const META_PREFIX = /^[\d,.]+[KkMm]?\s+likes?,\s*[\d,.]+[KkMm]?\s+comments?\s+-\s+.+?\s+on\s+[^:]+:\s*/;

export function stripInstagramMetaPrefix(description: string): string {
  const match = description.match(META_PREFIX);
  if (!match) return description;
  return description
    .slice(match[0].length)
    .replace(/^[“”"]/, "")
    .replace(/[“”"]\.?$/, "")
    .trim();
}

const clean = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/** microlink 응답에서 인스타그램 캡션(본문만) */
export function captionFromMicrolink(json: unknown): string | null {
  const desc = clean((json as { data?: { description?: unknown } } | null)?.data?.description);
  return desc ? clean(stripInstagramMetaPrefix(desc)) : null;
}

/** 유튜브 oEmbed 응답에서 제목 */
export function captionFromOembed(json: unknown): string | null {
  return clean((json as { title?: unknown } | null)?.title);
}
