import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_CATEGORY_SELECTION, normalizeCategoryIds, toggleCategory } from "./category-selection";

test("normalizeCategoryIds: 옛 주소(문자열 하나)와 새 주소(목록)를 같은 모양으로", () => {
  assert.deepEqual(normalizeCategoryIds(undefined), []);
  assert.deepEqual(normalizeCategoryIds(""), []);
  assert.deepEqual(normalizeCategoryIds("a"), ["a"]);
  assert.deepEqual(normalizeCategoryIds(["a", "b"]), ["a", "b"]);
});

test("normalizeCategoryIds: 중복, 빈 값, 문자열이 아닌 값은 버린다", () => {
  assert.deepEqual(normalizeCategoryIds(["a", " a ", "", 3, null, "b"]), ["a", "b"]);
  assert.deepEqual(normalizeCategoryIds({ evil: true }), []);
});

test("normalizeCategoryIds: 미분류가 섞이면 미분류만 남는다", () => {
  assert.deepEqual(normalizeCategoryIds(["a", "uncategorized", "b"]), ["uncategorized"]);
});

test("normalizeCategoryIds: 상한까지만 남긴다", () => {
  const many = Array.from({ length: 15 }, (_, i) => `c${i}`);
  assert.equal(normalizeCategoryIds(many).length, MAX_CATEGORY_SELECTION);
  assert.equal(MAX_CATEGORY_SELECTION, 10);
});

test("toggleCategory: 켜고 끄기, 마지막 해제는 전체", () => {
  assert.deepEqual(toggleCategory([], "a"), ["a"]);
  assert.deepEqual(toggleCategory(["a"], "b"), ["a", "b"]);
  assert.deepEqual(toggleCategory(["a", "b"], "a"), ["b"]);
  assert.deepEqual(toggleCategory(["b"], "b"), []);
});

test("toggleCategory: 전체는 모두 해제", () => {
  assert.deepEqual(toggleCategory(["a", "b"], ""), []);
});

test("toggleCategory: 미분류는 다른 선택과 함께하지 않는다", () => {
  assert.deepEqual(toggleCategory(["a", "b"], "uncategorized"), ["uncategorized"]);
  assert.deepEqual(toggleCategory(["uncategorized"], "a"), ["a"]);
  assert.deepEqual(toggleCategory(["uncategorized"], "uncategorized"), []);
});

test("toggleCategory: 상한에 닿으면 더 켜지지 않는다(끄기는 된다)", () => {
  const full = Array.from({ length: 10 }, (_, i) => `c${i}`);
  assert.deepEqual(toggleCategory(full, "new"), full);
  assert.deepEqual(toggleCategory(full, "c0").length, 9);
});

import { matchesCategories } from "./category-selection";

test("matchesCategories: 전체, 미분류, 모두 가진 게시물(AND)", () => {
  assert.equal(matchesCategories(["a"], []), true);
  assert.equal(matchesCategories([], ["uncategorized"]), true);
  assert.equal(matchesCategories(["a"], ["uncategorized"]), false);
  assert.equal(matchesCategories(["a", "b", "c"], ["a", "b"]), true);
  assert.equal(matchesCategories(["a", "c"], ["a", "b"]), false);
});
