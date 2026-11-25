import { test } from "node:test";
import assert from "node:assert/strict";
import { groupOf, finalCategories, type CandidateLike } from "./review";

const base: CandidateLike = {
  needsAi: false,
  keptCategories: ["데이트"],
  suggestedCategories: [],
  newCategories: [],
  uncertain: false,
};

test("큰 컬렉션 게시물은 첫 번째 컬렉션 이름 묶음(kept)", () => {
  assert.deepEqual(groupOf(base), { key: "kept:데이트", label: "데이트", kind: "kept" });
  assert.deepEqual(finalCategories(base), ["데이트"]);
});

test("AI가 기존 카테고리를 고른 게시물은 ai 묶음", () => {
  const c = { ...base, needsAi: true, keptCategories: [], suggestedCategories: ["카페"] };
  assert.deepEqual(groupOf(c), { key: "ai:카페", label: "카페", kind: "ai" });
  assert.deepEqual(finalCategories(c), ["카페"]);
});

test("새 카테고리 제안은 new 묶음, 저장할 카테고리에 포함", () => {
  const c = { ...base, needsAi: true, keptCategories: [], newCategories: ["피부 관리"] };
  assert.deepEqual(groupOf(c), { key: "new:피부 관리", label: "피부 관리", kind: "new" });
  assert.deepEqual(finalCategories(c), ["피부 관리"]);
});

test("AI가 확신하지 못하면 분류 애매 묶음, 카테고리 없이", () => {
  const c = { ...base, needsAi: true, keptCategories: [], uncertain: true };
  assert.deepEqual(groupOf(c), { key: "uncertain", label: "분류 애매", kind: "uncertain" });
  assert.deepEqual(finalCategories(c), []);
});

test("큰 컬렉션 게시물은 AI 응답의 uncertain 표시를 무시한다", () => {
  assert.equal(groupOf({ ...base, uncertain: true }).kind, "kept");
});

import { isReviewable } from "./review";

test("모든 게시물은 AI 제안(태그 포함)이 끝나야 검토할 수 있다", () => {
  assert.equal(isReviewable({ needsAi: false, suggested: false }), false);
  assert.equal(isReviewable({ needsAi: false, suggested: true }), true);
  assert.equal(isReviewable({ needsAi: true, suggested: false }), false);
  assert.equal(isReviewable({ needsAi: true, suggested: true }), true);
});

import { suggestionUpdate } from "./review";

const sug = { url: "u", categories: ["카페"], newCategories: [], tags: ["파주", "사우나"], uncertain: false };

test("suggestionUpdate: 큰 컬렉션 게시물은 태그만 받고 카테고리는 건드리지 않는다", () => {
  assert.deepEqual(suggestionUpdate({ needsAi: false, tags: [] }, sug), {
    suggested: true,
    tags: ["파주", "사우나"],
    suggestedCategories: [],
    newCategories: [],
    uncertain: false,
  });
});

test("suggestionUpdate: 사용자가 이미 넣은 태그는 AI 태그로 덮어쓰지 않는다", () => {
  assert.deepEqual(suggestionUpdate({ needsAi: false, tags: ["내 태그"] }, sug).tags, ["내 태그"]);
});

test("suggestionUpdate: 카테고리가 필요한 게시물은 카테고리와 태그를 모두 받는다", () => {
  const d = suggestionUpdate({ needsAi: true, tags: [] }, sug);
  assert.deepEqual(d.suggestedCategories, ["카페"]);
  assert.deepEqual(d.tags, ["파주", "사우나"]);
});

test("suggestionUpdate: AI 응답에 빠진 게시물은 태그 없이, 카테고리가 필요하면 분류 애매로", () => {
  assert.deepEqual(suggestionUpdate({ needsAi: false, tags: [] }, undefined).tags, []);
  assert.equal(suggestionUpdate({ needsAi: true, tags: [] }, undefined).uncertain, true);
});
