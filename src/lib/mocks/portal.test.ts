import { test } from "node:test";
import assert from "node:assert/strict";
import { getMockReels, getAllMockReels } from "./portal";

const all = getAllMockReels();

test("데모 예시 게시물: 25개 이상, id 중복 없음", () => {
  assert.ok(all.length >= 25, `지금 ${all.length}개`);
  assert.equal(new Set(all.map((r) => r.id)).size, all.length);
});

test("데모 예시 게시물: 사우나 묶음 4개 이상, 방문 완료 3개 이상, 새 게시물은 캡션이 있다", () => {
  // 캡션에 "사우나" 글자가 없는 예시(한증막, 히노끼탕)도 있어서 태그로 센다
  const sauna = all.filter((r) => r.tags.some((t) => t.tag.name === "사우나"));
  assert.ok(sauna.length >= 4, `사우나 ${sauna.length}개`);
  assert.ok(all.filter((r) => r.visited).length >= 3);
  assert.ok(all.filter((r) => r.caption).length >= 18);
});

test("키워드 검색은 캡션도 찾는다: '고깃집'은 글자가 같은 게시물만, '고기집'은 못 찾는다", () => {
  const hits = getMockReels({ search: "고깃집" }).items;
  assert.ok(hits.length >= 1);
  assert.ok(hits.every((r) => `${r.caption ?? ""} ${r.memo ?? ""}`.includes("고깃집") || r.tags.some((t) => t.tag.name.includes("고깃집"))));
  assert.ok(all.some((r) => (r.caption ?? "").includes("고기집") && !hits.includes(r)), "고기집 게시물이 키워드 결과에 없어야 함");
});
