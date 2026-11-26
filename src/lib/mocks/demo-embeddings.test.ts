import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getAllMockReels } from "./portal";
import { demoEmbeddingText } from "./demo-embedding-text";
import { hashText } from "@/lib/search/embedding-text";
import { EMBEDDING_DIM } from "@/lib/ai/gemini";

const file = JSON.parse(readFileSync(new URL("./demo-embeddings.json", import.meta.url), "utf8")) as Record<
  string,
  { hash: string; vector: number[] }
>;

test("데모 벡터 파일: 모든 예시 게시물에 768차원 벡터가 있다", () => {
  for (const r of getAllMockReels()) {
    assert.ok(file[r.id], `${r.id} 벡터 없음`);
    assert.equal(file[r.id].vector.length, EMBEDDING_DIM);
  }
});

test("데모 벡터 파일: 저장된 해시가 지금 글과 같다(글을 고쳤으면 scripts/build-demo-embeddings.ts를 다시 돌려야 함)", () => {
  for (const r of getAllMockReels()) {
    assert.equal(file[r.id].hash, hashText(demoEmbeddingText(r)), `${r.id} 글이 바뀜`);
  }
});
