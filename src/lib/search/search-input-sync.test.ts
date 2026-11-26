import { test } from "node:test";
import assert from "node:assert/strict";
import { syncSearchInput, type SearchInputState } from "./search-input-sync";

const typed: SearchInputState = { prevUrl: "명란", pushed: "명란", query: "명란" };

test("로고를 눌러 주소의 검색어가 사라지면 검색창도 비운다", () => {
  assert.deepEqual(syncSearchInput(typed, ""), { prevUrl: "", pushed: "", query: "" });
});

test("검색창이 스스로 넣은 검색어가 주소에 돌아오면 입력 중인 값을 건드리지 않는다", () => {
  const s = { prevUrl: "", pushed: "명", query: "명란" };
  assert.deepEqual(syncSearchInput(s, "명"), { prevUrl: "명", pushed: "명", query: "명란" });
});

test("로고로 비운 뒤 뒤로 가기로 검색어가 돌아오면 검색창도 다시 채운다", () => {
  const afterLogo = syncSearchInput(typed, "");
  assert.equal(syncSearchInput(afterLogo, "명란").query, "명란");
});

test("주소가 그대로면 상태도 그대로", () => {
  assert.equal(syncSearchInput(typed, "명란"), typed);
});
