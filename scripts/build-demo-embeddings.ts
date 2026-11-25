// 데모 예시 게시물(src/lib/mocks/portal.ts)의 벡터를 실제 Gemini로 만들어 파일로 저장한다.
// 예시 게시물 글을 고치면 다시 실행한다. 실행: npx tsx --env-file=.env.local --tsconfig ./tsconfig.json scripts/build-demo-embeddings.ts
import { writeFileSync } from "node:fs";
import { getAllMockReels } from "../src/lib/mocks/portal";
import { demoEmbeddingText } from "../src/lib/mocks/demo-embedding-text";
import { hashText } from "../src/lib/search/embedding-text";
import { embedTexts } from "../src/lib/ai/gemini";

async function main() {
  const reels = getAllMockReels();
  const texts = reels.map((r) => demoEmbeddingText(r));
  const vectors = await embedTexts(texts, "RETRIEVAL_DOCUMENT");
  const out: Record<string, { hash: string; vector: number[] }> = {};
  reels.forEach((r, i) => {
    out[r.id] = { hash: hashText(texts[i]), vector: vectors[i].map((v) => Number(v.toFixed(6))) };
  });
  writeFileSync("src/lib/mocks/demo-embeddings.json", JSON.stringify(out));
  console.log(`예시 게시물 ${reels.length}개 벡터 저장`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
