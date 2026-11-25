import { test } from "node:test";
import assert from "node:assert/strict";
import { buildEmbeddingText, hashText } from "./embedding-text";

const base = { caption: "파주 노천탕 사우나", memo: null, review: null, categories: ["데이트"], tags: ["파주", "사우나"] };

test("카테고리, 태그, 캡션 순서로 줄을 만들고 빈 칸은 생략한다", () => {
  assert.equal(buildEmbeddingText(base), "카테고리: 데이트\n태그: 파주, 사우나\n캡션: 파주 노천탕 사우나");
});

test("메모가 바뀌면 해시가 바뀐다", () => {
  const a = hashText(buildEmbeddingText(base));
  const b = hashText(buildEmbeddingText({ ...base, memo: "주말에 가 보기" }));
  assert.notEqual(a, b);
});

test("같은 내용이면 해시가 같다", () => {
  assert.equal(hashText(buildEmbeddingText(base)), hashText(buildEmbeddingText({ ...base })));
});

test("캡션은 최대 2,000자", () => {
  const text = buildEmbeddingText({ ...base, caption: "가".repeat(3000) });
  const captionLine = text.split("\n").find((l) => l.startsWith("캡션: "))!;
  assert.equal(captionLine.length, "캡션: ".length + 2000);
});

import { needsEmbedding, toVectorLiteral } from "./embedding-text";

test("needsEmbedding: 글이 비었으면 만들지 않고, 해시가 같으면 건너뛴다", () => {
  assert.equal(needsEmbedding("", undefined), false);
  assert.equal(needsEmbedding("태그: 파주", undefined), true);
  assert.equal(needsEmbedding("태그: 파주", hashText("태그: 파주")), false);
  assert.equal(needsEmbedding("태그: 파주, 사우나", hashText("태그: 파주")), true);
});

test("toVectorLiteral: pgvector 글 형식, 차원이 다르면 오류", () => {
  assert.equal(toVectorLiteral([0.5, -1, 2], 3), "[0.5,-1,2]");
  assert.throws(() => toVectorLiteral([1, 2], 3), /차원/);
  assert.throws(() => toVectorLiteral([1, Number.NaN, 2], 3), /숫자/);
});
