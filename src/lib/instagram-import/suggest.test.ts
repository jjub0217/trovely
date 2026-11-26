import { test } from "node:test";
import assert from "node:assert/strict";
import { validateSuggestions, buildSuggestPrompt, SUGGEST_BATCH_SIZE } from "./suggest";

const existing = ["카페", "맛집"];

test("한 번에 25개씩 보낸다", () => {
  assert.equal(SUGGEST_BATCH_SIZE, 25);
});

test("입력에 없는 주소는 버린다", () => {
  const out = validateSuggestions(
    { items: [
      { url: "u1", categories: ["카페"], tags: ["a"] },
      { url: "u2", categories: ["맛집"], tags: ["b"] },
      { url: "모르는", categories: ["카페"], tags: [] },
    ] },
    { urls: ["u1", "u2"], existingCategories: existing },
  );
  assert.deepEqual(out.map((s) => s.url), ["u1", "u2"]);
});

test("기존 목록에 없는 카테고리는 새 카테고리로 옮긴다", () => {
  const [s] = validateSuggestions(
    { items: [{ url: "u1", categories: ["피부 관리"], tags: [] }] },
    { urls: ["u1"], existingCategories: existing },
  );
  assert.deepEqual(s.categories, []);
  assert.deepEqual(s.newCategories, ["피부 관리"]);
  assert.equal(s.uncertain, false);
});

test("카테고리가 하나도 없으면 분류 애매", () => {
  const [s] = validateSuggestions(
    { items: [{ url: "u1", categories: [], tags: [] }] },
    { urls: ["u1"], existingCategories: existing },
  );
  assert.equal(s.uncertain, true);
});

test("태그는 다듬고 중복을 없애고 최대 5개", () => {
  const [s] = validateSuggestions(
    { items: [{ url: "u1", categories: ["카페"], tags: ["#파주", " 파주 ", "사우나", "스파", "데이트", "노천", "교하"] }] },
    { urls: ["u1"], existingCategories: existing },
  );
  assert.deepEqual(s.tags, ["파주", "사우나", "스파", "데이트", "노천"]);
});

test("응답 모양이 이상하면 빈 결과", () => {
  assert.deepEqual(validateSuggestions("이상한 응답", { urls: ["u1"], existingCategories: existing }), []);
});

test("프롬프트에 기존 카테고리와 캡션, 원래 컬렉션 이름이 들어간다", () => {
  const p = buildSuggestPrompt(
    [{ url: "u1", caption: "파주 노천탕 사우나", fromCollections: ["모공"], needsCategory: true }],
    existing,
  );
  assert.ok(p.includes("카페") && p.includes("파주 노천탕 사우나") && p.includes("모공"));
});
