import { test } from "node:test";
import assert from "node:assert/strict";
import { planImport, SMALL_COLLECTION_THRESHOLD } from "./plan-import";
import type { ExportPost, ExportCollection } from "./parse-export";

const url = (id: string) => `https://www.instagram.com/reel/${id}/`;
const post = (id: string): ExportPost => ({ url: url(id), caption: `캡션 ${id}`, savedAt: new Date(1000) });
const ids = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}${i}`);

const big = ids("big", 10); // 10개 = 기준과 같음 → 큰 컬렉션
const small = ids("small", 9); // 9개 → 작은 컬렉션
const posts = [...big, ...small, "both", "outside", "already"].map(post);
const collections: ExportCollection[] = [
  { name: "데이트", urls: [...big, "both"].map(url) },
  { name: "모공", urls: [...small, "both"].map(url).slice(0, 9) },
  { name: "네일", urls: [] },
];

const run = () =>
  planImport({ posts, collections, existingUrls: new Set([url("already")]) });
const find = (id: string) => run().items.find((i) => i.url === url(id));

test("기준값은 10", () => {
  assert.equal(SMALL_COLLECTION_THRESHOLD, 10);
});

test("게시물 10개 이상 컬렉션의 게시물은 그 이름을 카테고리로 가져가고 AI가 필요 없다", () => {
  const item = find("big0")!;
  assert.deepEqual(item.keptCategories, ["데이트"]);
  assert.equal(item.needsAi, false);
});

test("10개 미만 컬렉션에만 있는 게시물은 AI가 맡고 원래 컬렉션 이름을 남긴다", () => {
  const item = find("small0")!;
  assert.deepEqual(item.keptCategories, []);
  assert.equal(item.needsAi, true);
  assert.deepEqual(item.fromCollections, ["모공"]);
});

test("큰 컬렉션과 작은 컬렉션에 모두 있으면 큰 것만 카테고리로, AI는 필요 없다", () => {
  // both는 데이트(11개)에 있고, 모공 목록은 slice로 잘려 both가 빠져 있다 → 데이트만
  const item = find("both")!;
  assert.deepEqual(item.keptCategories, ["데이트"]);
  assert.equal(item.needsAi, false);
});

test("컬렉션 밖 게시물은 AI가 맡는다", () => {
  const item = find("outside")!;
  assert.equal(item.needsAi, true);
  assert.deepEqual(item.fromCollections, []);
});

test("이미 Trovely에 있는 주소는 빼고 센다", () => {
  const result = run();
  assert.equal(find("already"), undefined);
  assert.equal(result.skippedExisting, 1);
});

test("빈 컬렉션은 옮기지 않고 이름만 알린다", () => {
  assert.deepEqual(run().droppedEmptyCollections, ["네일"]);
});

test("이름이 같은 컬렉션은 하나로 합쳐 크기를 센다", () => {
  const result = planImport({
    posts: ids("d", 10).map(post),
    collections: [
      { name: "요리", urls: ids("d", 5).map(url) },
      { name: "요리", urls: ids("d", 10).slice(5).map(url) },
    ],
    existingUrls: new Set(),
  });
  assert.ok(result.items.every((i) => i.keptCategories.includes("요리") && !i.needsAi));
});

import { chooseBatchId } from "./plan-import";

test("chooseBatchId: 후보가 하나도 없는 빈 배치는 건너뛰고 가장 최근 배치를 고른다(같은 파일을 다시 올린 경우)", () => {
  const batches = [
    { id: "empty-new", candidateCount: 0 },
    { id: "old", candidateCount: 2831 },
  ];
  assert.equal(chooseBatchId(batches), "old");
  assert.equal(chooseBatchId([{ id: "a", candidateCount: 0 }]), null);
  assert.equal(chooseBatchId([]), null);
});
