import { after } from "next/server";
import { upsertReelEmbeddings } from "./embeddings";

/**
 * 저장, 수정 응답을 먼저 보내고 그 뒤에 벡터를 갱신한다(저장이 느려지지 않게).
 * 벡터 갱신이 실패해도 저장은 실패로 처리하지 않고 로그만 남긴다.
 */
export function refreshEmbeddingsAfterResponse(reelIds: string[]): void {
  if (reelIds.length === 0) return;
  after(async () => {
    try {
      await upsertReelEmbeddings(reelIds);
    } catch (e) {
      console.error("[embeddings] 벡터 갱신 실패", e instanceof Error ? e.message : e);
    }
  });
}
