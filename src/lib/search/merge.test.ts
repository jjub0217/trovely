import { test } from "node:test";
import assert from "node:assert/strict";
import { similarExtras, hybridOrder } from "./merge";

test("similarExtras: 뜻 결과 중 낱말 결과에 없는 것만, 뜻 순서대로", () => {
  assert.deepEqual(similarExtras(["a", "b"], ["b", "c", "a", "d"]), ["c", "d"]);
  assert.deepEqual(similarExtras([], ["c", "d"]), ["c", "d"]);
  assert.deepEqual(similarExtras(["a"], []), []);
});

test("hybridOrder: 낱말 결과 먼저, 그 아래 나머지 뜻 결과", () => {
  assert.deepEqual(hybridOrder(["k1", "k2"], ["s1", "k2", "s2"]), ["k1", "k2", "s1", "s2"]);
});
