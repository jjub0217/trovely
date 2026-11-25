import { test } from "node:test";
import assert from "node:assert/strict";
import { koreaDate, demoLimit } from "./usage";

test("koreaDate: 한국 시각 기준 날짜(UTC 15:30은 한국 다음 날 00:30)", () => {
  assert.equal(koreaDate(new Date("2026-11-25T15:30:00Z")), "2026-11-26");
  assert.equal(koreaDate(new Date("2026-11-25T14:59:00Z")), "2026-11-25");
});

test("demoLimit: 기본값과 환경변수", () => {
  delete process.env.DEMO_LIMIT_SEARCH;
  delete process.env.DEMO_LIMIT_ASK;
  assert.equal(demoLimit("search"), 300);
  assert.equal(demoLimit("ask"), 30);
  process.env.DEMO_LIMIT_ASK = "2";
  assert.equal(demoLimit("ask"), 2);
  process.env.DEMO_LIMIT_ASK = "abc";
  assert.equal(demoLimit("ask"), 30);
  delete process.env.DEMO_LIMIT_ASK;
});
