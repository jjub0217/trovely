"use server";

import { requireAuth } from "@/lib/auth";
import { DEMO_MODE } from "@/lib/demo";
import { enableAiSearch, revokeAiSearch, type AiSearchResult } from "./access";
import { buildAllAfterResponse } from "./catch-up";
import { isAiSearchPublic } from "./limits";

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

