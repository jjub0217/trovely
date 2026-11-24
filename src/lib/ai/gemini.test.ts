import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldRetry } from "./gemini";

test("shouldRetry: 요청 한도(429)와 서버 오류(5xx)만 다시 시도한다", () => {
  assert.equal(shouldRetry(429), true);
  assert.equal(shouldRetry(503), true);
  assert.equal(shouldRetry(500), true);
  assert.equal(shouldRetry(400), false);
  assert.equal(shouldRetry(403), false);
});
