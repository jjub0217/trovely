import { test } from "node:test";
import assert from "node:assert/strict";
import { rankByVector } from "./demo-search";

test("rankByVector: 방향이 가까운 순서, 상위 take개", () => {
  const items = [
    { id: "far", vector: [0, 1] },
    { id: "same", vector: [2, 0] },
    { id: "near", vector: [1, 0.2] },
  ];
  assert.deepEqual(rankByVector([1, 0], items, 2), ["same", "near"]);
  assert.deepEqual(rankByVector([1, 0], [], 5), []);
});
