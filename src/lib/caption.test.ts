import { test } from "node:test";
import assert from "node:assert/strict";
import { stripInstagramMetaPrefix } from "./caption";

test("microlink 설명 앞의 좋아요, 댓글, 계정, 날짜와 따옴표를 떼어 낸다", () => {
  assert.equal(
    stripInstagramMetaPrefix(
      "234 likes, 0 comments - confier.seoul on November 4, 2026: ”미식의 일상화, 잠실과 광화문에서 만나보세요.”.",
    ),
    "미식의 일상화, 잠실과 광화문에서 만나보세요.",
  );
});

test("천 단위 쉼표가 있는 좋아요 수도 처리한다", () => {
  assert.equal(
    stripInstagramMetaPrefix("2,442 likes, 188 comments - someone on September 18, 2026: ”본문”."),
    "본문",
  );
});

test("접두가 없으면 그대로 돌려준다", () => {
  assert.equal(stripInstagramMetaPrefix("그냥 설명"), "그냥 설명");
});

test("빈 문자열은 빈 문자열", () => {
  assert.equal(stripInstagramMetaPrefix(""), "");
});

import { captionFromMicrolink, captionFromOembed } from "./caption";

test("captionFromMicrolink: description의 메타 접두를 떼고 본문만", () => {
  const data = { data: { description: "12 likes, 3 comments - acct on November 4, 2026: ”파주 사우나 후기”." } };
  assert.equal(captionFromMicrolink(data), "파주 사우나 후기");
});

test("captionFromMicrolink: 설명이 없거나 비어 있으면 null", () => {
  assert.equal(captionFromMicrolink({ data: {} }), null);
  assert.equal(captionFromMicrolink({ data: { description: "   " } }), null);
  assert.equal(captionFromMicrolink(null), null);
});

test("captionFromOembed: 유튜브 title", () => {
  assert.equal(captionFromOembed({ title: " 일산 파스타 브이로그 " }), "일산 파스타 브이로그");
  assert.equal(captionFromOembed({}), null);
});
