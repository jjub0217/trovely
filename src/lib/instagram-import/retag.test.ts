import { test } from "node:test";
import assert from "node:assert/strict";
import { tagsChanged, parseTagInput, retagGroupOf } from "./retag";

test("tagsChanged: 순서만 다르거나 #만 붙었으면 바뀌지 않은 것", () => {
  assert.equal(tagsChanged(["파주", "사우나"], "사우나, 파주"), false);
  assert.equal(tagsChanged(["파주"], "#파주"), false);
  assert.equal(tagsChanged(["파주"], " 파주 ,  "), false);
});

test("tagsChanged: 하나 추가하거나 모두 지우면 바뀐 것", () => {
  assert.equal(tagsChanged(["파주"], "파주, 노천탕"), true);
  assert.equal(tagsChanged(["파주"], ""), true);
  assert.equal(tagsChanged([], ""), false);
});

test("parseTagInput: 쉼표로 나눠 정규화, 중복 제거", () => {
  assert.deepEqual(parseTagInput("#파주, 사우나 , 파주,,"), ["파주", "사우나"]);
});

test("retagGroupOf: 첫 번째 카테고리 이름, 없으면 미분류", () => {
  assert.deepEqual(retagGroupOf(["데이트", "카페"]), { key: "데이트", label: "데이트" });
  assert.deepEqual(retagGroupOf([]), { key: "__none__", label: "미분류" });
});
