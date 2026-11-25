"use server";

import type { ReelSource } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isAdmin, requireAuth } from "@/lib/auth";
import { DEMO_MODE } from "@/lib/demo";
import { describeAiError, generateJson } from "@/lib/ai/gemini";
import type { ReelWithRelations } from "@/types";
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

export type AskResult = { chips: AskChip[]; answer: AnswerResult; sources: ReelWithRelations[] };

/**
 * AI에게 물어보기: 질문 읽기(칩) → 뜻 검색으로 릴스 5개 → 답 쓰기 → 지어냄 검사.
 * chips를 넘기면(칩 ×로 뺀 뒤 다시 할 때) 질문 읽기를 건너뛴다.
 * 측정이 끝날 때까지 관리자만(2026-11-25 사용자 결정).
 */
export async function askReels({
  question,
  chips,
  categoryId,
  source,
}: {
  question: string;
  chips?: AskChip[];
  categoryId?: string | "uncategorized";
  source?: ReelSource;
}): Promise<AskResult | { error: string }> {
  if (DEMO_MODE) return { error: "데모 모드에서는 쓸 수 없습니다" };
  const userId = await requireAuth();
  if (!(await isAdmin())) return { error: "관리자만 쓸 수 있습니다" };
  const q = question.trim();
  if (!q) return { error: "질문을 입력해 주세요" };

  try {
    const finalChips = chips ? validateChips({ chips }) : validateChips(await generateJson(buildReadPrompt(q), READ_SCHEMA));

    const ids = await semanticReelIds(
      userId,
      searchTextFrom(finalChips, q),
      { categoryId, source, visited: visitedFilterFrom(finalChips) },
      ANSWER_CONTEXT_SIZE,
    );
    if (ids.length === 0) return { chips: finalChips, answer: { notFound: true }, sources: [] };

    const reels = orderByIds(
      await prisma.reel.findMany({
        where: { id: { in: ids }, userId },
        include: { categories: { include: { category: true } }, tags: { include: { tag: true } } },
      }),
      ids,
    );
    const raw = await generateJson(
      buildAnswerPrompt(
        q,
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
    const answer = validateAnswer(raw, ids);
    const sources = "notFound" in answer ? [] : orderByIds(reels, answer.usedIds);
    return { chips: finalChips, answer, sources };
  } catch (e) {
    return { error: describeAiError(e) };
  }
}
