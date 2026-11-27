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

import { describeAiError } from "./gemini";

test("describeAiError: 시간 초과와 503은 '붐빔'으로, 그 밖은 앞부분만", () => {
  assert.match(describeAiError(new DOMException("aborted", "TimeoutError")), /오래 걸려/);
  assert.match(describeAiError(new Error("Gemini 요청 실패(503): high demand")), /붐벼/);
  assert.match(describeAiError(new Error("Gemini 요청 실패(400): bad")), /400/);
});

import { retryDelays } from "./gemini";

test("retryDelays: 기본은 1, 2, 4, 8초, 빠른 요청은 다시 시도하지 않는다", () => {
  assert.deepEqual(retryDelays(), [1000, 2000, 4000, 8000]);
  assert.deepEqual(retryDelays(0), []);
});

import { buildGenerateBody } from "./gemini";

test("buildGenerateBody: 생각 단계를 주면 thinkingConfig를 넣고, 안 주면 넣지 않는다", () => {
  const low = buildGenerateBody("질문", { type: "OBJECT" }, { thinkingLevel: "low" }) as { generationConfig: Record<string, unknown> };
  assert.deepEqual(low.generationConfig.thinkingConfig, { thinkingLevel: "low" });
  assert.equal(low.generationConfig.responseMimeType, "application/json");
  const plain = buildGenerateBody("질문", { type: "OBJECT" }) as { generationConfig: Record<string, unknown> };
  assert.equal("thinkingConfig" in plain.generationConfig, false);
});
