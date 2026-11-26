import { test } from "node:test";
import assert from "node:assert/strict";
import { orderByIds } from "./rank";

test("orderByIds: 검색이 돌려준 id 순서대로, 없는 id는 건너뜀", () => {
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(orderByIds(items, ["c", "x", "a"]).map((i) => i.id), ["c", "a"]);
  assert.deepEqual(orderByIds(items, []), []);
});
