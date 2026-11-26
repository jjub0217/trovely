import { test } from "node:test";
import assert from "node:assert/strict";
import { buildKeywordWhere } from "./keyword-where";

test("buildKeywordWhere: 띄어쓰기로 나눈 낱말마다 조건 하나(모두 만족), 캡션도 찾는다", () => {
  const w = buildKeywordWhere({ userId: "u", search: " 인천  사우나 " });
  assert.equal(w.userId, "u");
  const and = w.AND as { OR: object[] }[];
  assert.equal(and.length, 2);
  assert.ok(JSON.stringify(and[0]).includes('"caption":{"contains":"인천"'));
});

test("buildKeywordWhere: 미분류와 검색어 없음", () => {
  const w = buildKeywordWhere({ userId: "u", categoryIds: ["uncategorized"] });
  assert.deepEqual(w.categories, { none: {} });
  assert.equal(w.AND, undefined);
});

test("buildKeywordWhere: 카테고리 여러 개는 모두 가진 게시물(AND)", () => {
  const w = buildKeywordWhere({ userId: "u", categoryIds: ["c1", "c2"] });
  assert.deepEqual(w.AND, [{ categories: { some: { categoryId: "c1" } } }, { categories: { some: { categoryId: "c2" } } }]);
  assert.equal(w.categories, undefined);
});

test("buildKeywordWhere: 검색어와 카테고리 여러 개를 함께 쓰면 둘 다 남는다(서로 덮어쓰지 않음)", () => {
  const w = buildKeywordWhere({ userId: "u", search: "인천 사우나", categoryIds: ["c1", "c2"] });
  const and = w.AND as object[];
  assert.equal(and.length, 4);
  assert.ok(and.some((c) => JSON.stringify(c) === JSON.stringify({ categories: { some: { categoryId: "c2" } } })));
  assert.ok(and.some((c) => JSON.stringify(c).includes('"contains":"사우나"')));
});

test("buildKeywordWhere: 빈 목록은 전체(카테고리 조건 없음)", () => {
  const w = buildKeywordWhere({ userId: "u", categoryIds: [] });
  assert.equal(w.AND, undefined);
  assert.equal(w.categories, undefined);
});
