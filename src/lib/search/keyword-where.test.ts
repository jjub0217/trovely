import { test } from "node:test";
import assert from "node:assert/strict";
import { buildKeywordWhere } from "./keyword-where";

test("buildKeywordWhere: 띄어쓰기로 나눈 낱말마다 조건 하나(모두 만족), 캡션도 찾는다", () => {
  const w = buildKeywordWhere({ userId: "u", search: " 인천  사우나 ", categoryId: "c1" });
  assert.equal(w.userId, "u");
  assert.deepEqual(w.categories, { some: { categoryId: "c1" } });
  const and = w.AND as { OR: object[] }[];
  assert.equal(and.length, 2);
  assert.ok(JSON.stringify(and[0]).includes('"caption":{"contains":"인천"'));
});

test("buildKeywordWhere: 미분류와 검색어 없음", () => {
  const w = buildKeywordWhere({ userId: "u", categoryId: "uncategorized" });
  assert.deepEqual(w.categories, { none: {} });
  assert.equal(w.AND, undefined);
});
