"use server";

import { after } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { DEMO_MODE } from "@/lib/demo";
import { upsertReelEmbeddings } from "@/lib/search/embeddings";
import { canUseAiSearch, enableAiSearch, revokeAiSearch, type AiSearchResult } from "./access";
import { isAiSearchPublic } from "./limits";

/** 응답을 먼저 보내고 그 사람 게시물 전체의 벡터를 만든다(해시가 같은 게시물은 건너뛴다) */
function buildAllAfterResponse(userId: string): void {
  after(async () => {
    try {
      const ids = (await prisma.reel.findMany({ where: { userId }, select: { id: true } })).map((r) => r.id);
      const r = await upsertReelEmbeddings(ids);
      if (r.stopped) console.log("[ai-search] 벡터 만들기 멈춤", r.stopped, r.updated);
    } catch (e) {
      console.error("[ai-search] 벡터 만들기 실패", e instanceof Error ? e.message : e);
    }
  });
}

/** 동의 창의 "동의하고 사용하기" */
export async function enableAiSearchAction(input: { adultConfirmed: boolean; policyVersion: string }): Promise<AiSearchResult> {
  if (DEMO_MODE || !isAiSearchPublic()) return { error: "지금은 AI 검색을 켤 수 없어요." };
  const userId = await requireAuth();
  const result = await enableAiSearch(userId, input);
  if ("ok" in result) buildAllAfterResponse(userId);
  return result;
}

/** 설정 화면의 끄기: 그 사람의 AI 검색용 데이터를 바로 지운다(공개 스위치와 관계없이 언제든 끌 수 있다) */
export async function revokeAiSearchAction(): Promise<AiSearchResult> {
  if (DEMO_MODE) return { error: "데모에서는 바꿀 수 없어요." };
  const userId = await requireAuth();
  return revokeAiSearch(userId);
}

/** 설정 화면의 다시 시도: 쓸 수 있는 사람만, 남은 게시물을 응답 뒤에 처리한다 */
export async function retryAiSearchAction(): Promise<AiSearchResult> {
  if (DEMO_MODE) return { error: "데모에서는 바꿀 수 없어요." };
  const userId = await requireAuth();
  if (!(await canUseAiSearch(userId))) return { error: "AI 검색이 꺼져 있어요." };
  buildAllAfterResponse(userId);
  return { ok: true };
}
