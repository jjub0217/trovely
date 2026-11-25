import { test } from "node:test";
import assert from "node:assert/strict";
import { validateChips, searchTextFrom, visitedFilterFrom, validateAnswer, buildAnswerPrompt } from "./ask";

test("validateChips: 모르는 종류와 빈 글자는 버리고, 조건 칩 글자는 고정, 중복 제거", () => {
  const raw = {
    chips: [
      { label: "파주", kind: "keyword" },
      { label: " ", kind: "keyword" },
      { label: "x", kind: "weird" },
      { label: "안 가본 곳", kind: "unvisited" },
      { label: "파주", kind: "keyword" },
    ],
  };
  assert.deepEqual(validateChips(raw), [
    { label: "파주", kind: "keyword" },
    { label: "안 가 본 곳만", kind: "unvisited" },
  ]);
});

test("validateChips: 서로 반대 조건이 함께 오면 둘 다 버린다, 이상한 응답은 빈 배열", () => {
  const raw = { chips: [{ label: "a", kind: "unvisited" }, { label: "b", kind: "visited" }, { label: "사우나", kind: "keyword" }] };
  assert.deepEqual(validateChips(raw), [{ label: "사우나", kind: "keyword" }]);
  assert.deepEqual(validateChips(null), []);
  assert.deepEqual(validateChips({ chips: "x" }), []);
});

test("searchTextFrom: 낱말 칩을 이어 붙이고, 없으면 질문 그대로", () => {
  assert.equal(searchTextFrom([{ label: "파주", kind: "keyword" }, { label: "안 가 본 곳만", kind: "unvisited" }, { label: "데이트", kind: "keyword" }], "질문"), "파주 데이트");
  assert.equal(searchTextFrom([{ label: "안 가 본 곳만", kind: "unvisited" }], "이번 주말 어디 가지?"), "이번 주말 어디 가지?");
  assert.equal(searchTextFrom([], "질문"), "질문");
});

test("visitedFilterFrom", () => {
  assert.equal(visitedFilterFrom([{ label: "안 가 본 곳만", kind: "unvisited" }]), false);
  assert.equal(visitedFilterFrom([{ label: "가 본 곳만", kind: "visited" }]), true);
  assert.equal(visitedFilterFrom([{ label: "파주", kind: "keyword" }]), undefined);
});

test("validateAnswer: 건네지 않은 id는 버린다", () => {
  assert.deepEqual(validateAnswer({ found: true, text: " 답이에요. ", usedIds: ["a", "zzz", "b"] }, ["a", "b", "c"]), {
    text: "답이에요.",
    usedIds: ["a", "b"],
  });
});

test("validateAnswer: 근거가 하나도 안 남거나, 못 찾았다고 하거나, 글이 비면 notFound", () => {
  assert.deepEqual(validateAnswer({ found: true, text: "지어낸 답", usedIds: ["zzz"] }, ["a"]), { notFound: true });
  assert.deepEqual(validateAnswer({ found: false, text: "없어요", usedIds: [] }, ["a"]), { notFound: true });
  assert.deepEqual(validateAnswer({ found: true, text: "  ", usedIds: ["a"] }, ["a"]), { notFound: true });
  assert.deepEqual(validateAnswer(null, ["a"]), { notFound: true });
});

test("buildAnswerPrompt: 질문, 릴스 id, 가 봤는지가 들어간다", () => {
  const p = buildAnswerPrompt("파주 사우나?", [
    { id: "r1", caption: "파주 사우나 후기", memo: null, review: null, categories: ["데이트"], tags: ["파주"], visited: false },
  ]);
  assert.match(p, /파주 사우나\?/);
  assert.match(p, /id: r1/);
  assert.match(p, /가 봤는지: 아직 안 가 봄/);
});
