import { prisma } from "@/lib/db";
import { generateJson } from "@/lib/ai/gemini";
import { semanticReelIds } from "./semantic";
import { demoSemanticIds } from "./demo-search";
import { getMockReel } from "@/lib/mocks/portal";
import { orderByIds } from "./rank";
import {
  ANSWER_CONTEXT_SIZE,
  ANSWER_SCHEMA,
  buildAnswerPrompt,
  buildReadPrompt,
  READ_SCHEMA,
  searchTextFrom,
  validateAnswer,
  validateChips,
  visitedFilterFrom,
  type AnswerResult,
  type AskChip,
} from "./ask";

/** 질문 읽기: AI가 질문에서 조건을 뽑는다(화면의 서버 액션과 측정 스크립트가 함께 쓴다) */
export async function readChips(question: string): Promise<AskChip[]> {
  return validateChips(await generateJson(buildReadPrompt(question), READ_SCHEMA));
}

type ReelForAnswer = {
  id: string;
  caption: string | null;
  memo: string | null;
  review: string | null;
  visited: boolean;
  categories: { category: { name: string } }[];
  tags: { tag: { name: string } }[];
};

/**
 * 찾기와 답 쓰기의 공통 흐름: 조건으로 가까운 게시물 5개를 찾고(find), 그 게시물을 읽어(load) AI 답 → 지어냄 검사.
 * 운영은 DB와 pgvector, 데모는 예시 게시물과 벡터 파일을 넘긴다.
 */
async function answerFrom<T extends ReelForAnswer>(
  question: string,
  chips: AskChip[],
  find: (text: string, visited: boolean | undefined) => Promise<string[]>,
  load: (ids: string[]) => Promise<T[]>,
) {
  const finalChips = validateChips({ chips });
  const contextIds = await find(searchTextFrom(finalChips, question), visitedFilterFrom(finalChips));
  if (contextIds.length === 0) {
    return { chips: finalChips, answer: { notFound: true } as AnswerResult, sources: [] as T[], contextIds, rawUsedIds: [] as string[] };
  }
  const reels = orderByIds(await load(contextIds), contextIds);
  const raw = await generateJson(
    buildAnswerPrompt(
      question,
      reels.map((r) => ({
        id: r.id,
        caption: r.caption,
        memo: r.memo,
        review: r.review,
        categories: r.categories.map((c) => c.category.name),
        tags: r.tags.map((t) => t.tag.name),
        visited: r.visited,
      })),
    ),
    ANSWER_SCHEMA,
  );
  const answer = validateAnswer(raw, contextIds);
  const sources = "notFound" in answer ? [] : orderByIds(reels, answer.usedIds);
  const rawUsedIds = Array.isArray((raw as { usedIds?: unknown })?.usedIds)
    ? ((raw as { usedIds: unknown[] }).usedIds.filter((x) => typeof x === "string") as string[])
    : [];
  return { chips: finalChips, answer, sources, contextIds, rawUsedIds };
}

/** 운영: 내 게시물(DB)에서 찾기와 답 쓰기 */
export async function answerWithChips(userId: string, question: string, chips: AskChip[]) {
  return answerFrom(
    question,
    chips,
    (text, visited) => semanticReelIds(userId, text, { visited }, ANSWER_CONTEXT_SIZE),
    (ids) =>
      prisma.reel.findMany({
        where: { id: { in: ids }, userId },
        include: { categories: { include: { category: true } }, tags: { include: { tag: true } } },
      }),
  );
}

/** 데모: 예시 게시물과 벡터 파일에서 찾기와 답 쓰기(질문 벡터와 답은 실제 Gemini) */
export async function answerWithChipsDemo(question: string, chips: AskChip[]) {
  return answerFrom(
    question,
    chips,
    (text, visited) => demoSemanticIds(text, { visited }, ANSWER_CONTEXT_SIZE),
    async (ids) => ids.flatMap((id) => {
      const r = getMockReel(id);
      return r ? [r] : [];
    }),
  );
}
