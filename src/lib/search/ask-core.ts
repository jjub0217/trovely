import { prisma } from "@/lib/db";
import { generateJson } from "@/lib/ai/gemini";
import { semanticReelIds } from "./semantic";
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

/** 찾기와 답 쓰기: 조건으로 뜻이 가까운 릴스 5개 → AI 답 → 지어냄 검사 */
export async function answerWithChips(userId: string, question: string, chips: AskChip[]) {
  const finalChips = validateChips({ chips });
  const contextIds = await semanticReelIds(
    userId,
    searchTextFrom(finalChips, question),
    { visited: visitedFilterFrom(finalChips) },
    ANSWER_CONTEXT_SIZE,
  );
  if (contextIds.length === 0) {
    return { chips: finalChips, answer: { notFound: true } as AnswerResult, sources: [], contextIds, rawUsedIds: [] as string[] };
  }
  const reels = orderByIds(
    await prisma.reel.findMany({
      where: { id: { in: contextIds }, userId },
      include: { categories: { include: { category: true } }, tags: { include: { tag: true } } },
    }),
    contextIds,
  );
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
