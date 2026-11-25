/** AI에게 물어보기(RAG 생성 단계): 질문 읽기와 답 쓰기의 프롬프트, 응답 검사(순수 함수) */

/** AI에게 건네는 릴스 수(측정 기준 상위 5개와 맞춤) */
export const ANSWER_CONTEXT_SIZE = 5;
const CAPTION_LIMIT = 800;

export type AskChipKind = "keyword" | "unvisited" | "visited";
export type AskChip = { label: string; kind: AskChipKind };

const CONDITION_LABEL: Record<Exclude<AskChipKind, "keyword">, string> = {
  unvisited: "안 가 본 곳만",
  visited: "가 본 곳만",
};

export function buildReadPrompt(question: string): string {
  return `사용자가 개인 스크랩북 앱에 저장한 콘텐츠(인스타그램 릴스 등)를 찾으려고 쓴 질문이다. 검색에 쓸 칩을 뽑아 줘.

칩 종류
- keyword: 장소, 종류, 카테고리 이름처럼 찾을 때 쓸 낱말. 질문에 있는 낱말을 조사만 떼고 그대로 쓴다. 최대 5개.
- unvisited: "안 가 본", "아직 안 간", "못 가 본"처럼 아직 가지 않은 곳을 찾는다는 표현이 있을 때만.
- visited: "가 본", "갔던", "다녀온"처럼 이미 가 본 곳을 찾는다는 표현이 있을 때만.

규칙
- "이번 주말", "추천해 줘", "어디", "있어?"처럼 찾을 대상이 아닌 말은 칩으로 만들지 않는다.
- 질문에 없는 낱말을 지어내지 않는다.

질문: ${question}`;
}

export const READ_SCHEMA = {
  type: "OBJECT",
  properties: {
    chips: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          label: { type: "STRING" },
          kind: { type: "STRING", enum: ["keyword", "unvisited", "visited"] },
        },
        required: ["label", "kind"],
      },
    },
  },
  required: ["chips"],
};

export function validateChips(raw: unknown): AskChip[] {
  const list = (raw as { chips?: unknown } | null)?.chips;
  if (!Array.isArray(list)) return [];
  const out: AskChip[] = [];
  for (const item of list) {
    const kind = (item as { kind?: unknown })?.kind;
    const label = (item as { label?: unknown })?.label;
    if (kind !== "keyword" && kind !== "unvisited" && kind !== "visited") continue;
    const text = kind === "keyword" ? (typeof label === "string" ? label.trim() : "") : CONDITION_LABEL[kind];
    if (!text) continue;
    if (out.some((c) => c.kind === kind && c.label === text)) continue;
    out.push({ label: text, kind });
  }
  const hasUnvisited = out.some((c) => c.kind === "unvisited");
  const hasVisited = out.some((c) => c.kind === "visited");
  return hasUnvisited && hasVisited ? out.filter((c) => c.kind === "keyword") : out;
}

/** 뜻 검색에 쓸 글: 낱말 칩을 이어 붙이고, 없으면 질문 문장 그대로 */
export function searchTextFrom(chips: AskChip[], question: string): string {
  const words = chips.filter((c) => c.kind === "keyword").map((c) => c.label);
  return words.length > 0 ? words.join(" ") : question;
}

/** 조건 칩 → visited 거르기 값 */
export function visitedFilterFrom(chips: AskChip[]): boolean | undefined {
  if (chips.some((c) => c.kind === "unvisited")) return false;
  if (chips.some((c) => c.kind === "visited")) return true;
  return undefined;
}

export type AnswerReel = {
  id: string;
  caption: string | null;
  memo: string | null;
  review: string | null;
  categories: string[];
  tags: string[];
  visited: boolean;
};

export function buildAnswerPrompt(question: string, reels: AnswerReel[]): string {
  const list = reels
    .map((r) =>
      [
        `id: ${r.id}`,
        r.categories.length ? `카테고리: ${r.categories.join(", ")}` : "",
        r.tags.length ? `태그: ${r.tags.join(", ")}` : "",
        `방문 완료 표시: ${r.visited ? "있음" : "없음"}`,
        r.caption ? `캡션: ${r.caption.slice(0, CAPTION_LIMIT)}` : "",
        r.memo ? `메모: ${r.memo}` : "",
        r.review ? `후기: ${r.review}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");

  return `사용자가 개인 스크랩북 앱에 저장한 콘텐츠 중에서, 질문에 답하는 데 쓸 만한 것을 골라 짧게 답해 줘.

규칙
- 아래 콘텐츠에 적힌 내용만 쓴다. 적혀 있지 않은 장소, 가격, 영업시간은 지어내지 않는다.
- 질문에 맞는 콘텐츠가 하나도 없으면 found를 false로 한다.
- 질문에 바로 답한다. "저장하신 콘텐츠 중에"처럼 매번 같은 말로 시작하지 않는다. 저장 이야기를 해야 할 때는 사용자가 저장했다는 게 드러나게 쓴다.
- 담백한 "~해요"체로 3~5문장. "가 보신"처럼 지나치게 높이는 말은 쓰지 않는다. 장소 이름이 캡션에 있으면 그 이름을 쓴다.
- 관련된 내용끼리 문단을 나누고, 문단 사이는 빈 줄로 구분한다. 첫 문단은 질문에 대한 바로 답(어떤 곳들이 있는지), 그다음은 장소나 콘텐츠마다 한 문단씩. 한 문단은 1~2문장.
- 방문 여부는 질문이 물을 때만 말한다. 말할 때는 "방문 완료 표시가 없는 곳"처럼 표시 기준으로 쓰고, 실제로 가지 않았다고 단정하지 않는다(가 봤지만 표시를 안 했을 수 있다).
- usedIds에는 답에 실제로 쓴 콘텐츠의 id만 넣는다.

질문: ${question}

콘텐츠
${list}`;
}

export const ANSWER_SCHEMA = {
  type: "OBJECT",
  properties: {
    found: { type: "BOOLEAN" },
    text: { type: "STRING" },
    usedIds: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["found", "text", "usedIds"],
};

export type AnswerResult = { text: string; usedIds: string[] } | { notFound: true };

/** 지어냄 검사: 건넨 릴스 밖의 id는 버리고, 근거가 안 남거나 못 찾았다고 하면 notFound */
export function validateAnswer(raw: unknown, givenIds: string[]): AnswerResult {
  const r = raw as { found?: unknown; text?: unknown; usedIds?: unknown } | null;
  if (!r || r.found !== true) return { notFound: true };
  const text = typeof r.text === "string" ? r.text.trim() : "";
  const given = new Set(givenIds);
  const usedIds = Array.isArray(r.usedIds)
    ? [...new Set(r.usedIds.filter((id): id is string => typeof id === "string" && given.has(id)))]
    : [];
  if (!text || usedIds.length === 0) return { notFound: true };
  return { text, usedIds };
}

/** 답 문장을 화면에 문단으로 나눠 보여 주려고 줄바꿈 기준으로 나눈다 */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}
