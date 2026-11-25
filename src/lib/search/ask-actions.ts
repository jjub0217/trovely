"use server";

import { isAdmin, requireAuth } from "@/lib/auth";
import { DEMO_MODE, DEMO_USER_ID } from "@/lib/demo";
import { describeAiError } from "@/lib/ai/gemini";
import type { ReelWithRelations } from "@/types";
import { answerWithChips, answerWithChipsDemo, readChips } from "./ask-core";
import { consumeDemoQuota, DEMO_QUOTA_MESSAGE } from "@/lib/demo/usage";
import type { AnswerResult, AskChip } from "./ask";

export type AskResult = { chips: AskChip[]; answer: AnswerResult; sources: ReelWithRelations[] };

async function guard(question: string): Promise<{ userId: string; q: string; demo: boolean } | { error: string }> {
  const q = question.trim();
  if (!q) return { error: "질문을 입력해 주세요" };
  if (DEMO_MODE) {
    // 데모: 로그인 없이 누구나 쓰되, AI를 부르는 요청마다 하루 상한(데모 전용 DB)에서 1씩 뺀다
    if (!(await consumeDemoQuota("ask"))) return { error: DEMO_QUOTA_MESSAGE };
    return { userId: DEMO_USER_ID, q, demo: true };
  }
  const userId = await requireAuth();
  if (!(await isAdmin())) return { error: "관리자만 쓸 수 있습니다" };
  return { userId, q, demo: false };
}

/**
 * 1단계 질문 읽기: AI가 질문에서 조건(낱말, 안 가 본 곳만 등)을 뽑는다.
 * 화면은 이 결과를 먼저 보여 주고 답을 기다린다. 측정이 끝날 때까지 관리자만(2026-11-25 사용자 결정).
 */
export async function readQuestion(question: string): Promise<{ chips: AskChip[] } | { error: string }> {
  const g = await guard(question);
  if ("error" in g) return g;
  try {
    return { chips: await readChips(g.q) };
  } catch (e) {
    return { error: describeAiError(e) };
  }
}

/**
 * 2단계 찾기와 답 쓰기: 조건으로 뜻이 가까운 릴스 5개를 고르고, AI가 답을 쓴 뒤 지어냄 검사를 한다.
 * 조건 표시의 ×로 조건을 뺀 뒤 다시 물을 때는 이 단계만 다시 한다.
 */
export async function answerQuestion({
  question,
  chips,
}: {
  question: string;
  chips: AskChip[];
}): Promise<AskResult | { error: string }> {
  const g = await guard(question);
  if ("error" in g) return g;
  try {
    const r = g.demo ? await answerWithChipsDemo(g.q, chips) : await answerWithChips(g.userId, g.q, chips);
    return { chips: r.chips, answer: r.answer, sources: r.sources };
  } catch (e) {
    return { error: describeAiError(e) };
  }
}
