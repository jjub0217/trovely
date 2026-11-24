import { generateJson } from "@/lib/ai/gemini";
import { normalizeTagName } from "@/lib/tag-name";

/** AI에게 한 번에 보내는 게시물 수 */
export const SUGGEST_BATCH_SIZE = 25;
const MAX_TAGS = 5;
const CAPTION_LIMIT = 1200;

export type SuggestInput = {
  url: string;
  caption: string;
  fromCollections: string[];
  /** false면 카테고리는 이미 정해져 있고 태그만 제안받는다 */
  needsCategory: boolean;
};

export type Suggestion = {
  url: string;
  categories: string[];
  newCategories: string[];
  tags: string[];
  uncertain: boolean;
};

export function buildSuggestPrompt(items: SuggestInput[], existingCategories: string[]): string {
  const list = items
    .map((it, i) =>
      [
        `### ${i + 1}`,
        `url: ${it.url}`,
        `카테고리 제안 필요: ${it.needsCategory ? "예" : "아니오(태그만)"}`,
        it.fromCollections.length ? `원래 인스타그램 컬렉션: ${it.fromCollections.join(", ")}` : "",
        `캡션: ${it.caption.slice(0, CAPTION_LIMIT) || "(없음)"}`,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");

  return `사용자가 인스타그램에 저장한 게시물을 개인 스크랩북 앱으로 옮긴다. 게시물마다 카테고리와 태그를 제안해 줘.

기존 카테고리: ${existingCategories.join(", ") || "(없음)"}

규칙
- 카테고리 제안이 필요한 게시물만 categories를 채운다. 기존 카테고리 중 맞는 것을 고르고, 맞는 게 없으면 짧은 새 카테고리 이름(예: 피부 관리)을 하나 만든다. 작은 컬렉션 여러 개(모공, 선크림 등)는 큰 카테고리 하나로 묶는다.
- 캡션만으로 확신이 없으면 categories를 빈 배열로 둔다.
- 태그 제안 필요 여부와 상관없이 tags는 3~5개. 지역, 장소 종류, 핵심 대상처럼 나중에 찾을 때 떠올릴 낱말로. 해시태그 기호 없이.
- 모든 게시물에 대해 url을 그대로 돌려준다.

게시물
${list}`;
}

export const SUGGEST_SCHEMA = {
  type: "OBJECT",
  properties: {
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          url: { type: "STRING" },
          categories: { type: "ARRAY", items: { type: "STRING" } },
          tags: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["url", "categories", "tags"],
      },
    },
  },
  required: ["items"],
};

type RawItem = { url?: unknown; categories?: unknown; tags?: unknown };
const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean) : [];

export function validateSuggestions(
  raw: unknown,
  input: { urls: string[]; existingCategories: string[] },
): Suggestion[] {
  const items = (raw as { items?: unknown })?.items;
  if (!Array.isArray(items)) return [];
  const allowed = new Set(input.urls);
  const known = new Set(input.existingCategories);
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const it of items as RawItem[]) {
    if (typeof it?.url !== "string" || !allowed.has(it.url) || seen.has(it.url)) continue;
    seen.add(it.url);
    const cats = [...new Set(strings(it.categories))];
    const categories = cats.filter((c) => known.has(c));
    const newCategories = cats.filter((c) => !known.has(c));
    const tags = [...new Set(strings(it.tags).map(normalizeTagName).filter(Boolean))].slice(0, MAX_TAGS);
    out.push({
      url: it.url,
      categories,
      newCategories,
      tags,
      uncertain: categories.length === 0 && newCategories.length === 0,
    });
  }
  return out;
}

export async function requestSuggestions(
  items: SuggestInput[],
  existingCategories: string[],
): Promise<Suggestion[]> {
  const raw = await generateJson<unknown>(buildSuggestPrompt(items, existingCategories), SUGGEST_SCHEMA);
  return validateSuggestions(raw, { urls: items.map((i) => i.url), existingCategories });
}
