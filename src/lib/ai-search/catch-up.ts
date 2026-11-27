import { after } from "next/server";
import { buildAllForUser } from "./build";

/**
 * 응답을 먼저 보내고 그 사람 게시물 전체의 AI 검색용 데이터를 만든다(해시가 같은 게시물은 건너뛴다).
 * 처음 켤 때, 그리고 처음 보는 검색어로 검색할 때 부른다. 처음 켤 때 일부가 실패해도(장애, 상한, 시간 한도) 다음 검색 때 이어서 만든다.
 * 이미 도는 작업이 있으면 건너뛴다(buildAllForUser).
 */
export function buildAllAfterResponse(userId: string): void {
  after(async () => {
    try {
      await buildAllForUser(userId);
    } catch (e) {
      console.error("[ai-search] 벡터 만들기 실패", e instanceof Error ? e.message : e);
    }
  });
}
