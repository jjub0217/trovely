import { test } from "node:test";
import assert from "node:assert/strict";
import { AI_LIMITS, decideAiAccess, isAiSearchPublic } from "./limits";

test("decideAiAccess: 관리자는 늘 허용, 일반은 공개+동의일 때만", () => {
  assert.equal(decideAiAccess({ isAdmin: true, isPublic: false, consentEnabled: false }), true);
  assert.equal(decideAiAccess({ isAdmin: false, isPublic: true, consentEnabled: true }), true);
  assert.equal(decideAiAccess({ isAdmin: false, isPublic: false, consentEnabled: true }), false);
  assert.equal(decideAiAccess({ isAdmin: false, isPublic: true, consentEnabled: false }), false);
});

test("isAiSearchPublic: 'true'일 때만 켜짐", () => {
  const values: [string | undefined, boolean][] = [[undefined, false], ["1", false], ["TRUE", false], ["true", true]];
  for (const [v, expected] of values) {
    if (v === undefined) delete process.env.AI_SEARCH_PUBLIC;
    else process.env.AI_SEARCH_PUBLIC = v;
    assert.equal(isAiSearchPublic(), expected, String(v));
  }
  delete process.env.AI_SEARCH_PUBLIC;
});

test("AI_LIMITS: 설계 문서의 숫자", () => {
  assert.deepEqual(AI_LIMITS, { query: { perUser: 30, total: 1000 }, document: { perUser: 3000, total: 10000 } });
});
