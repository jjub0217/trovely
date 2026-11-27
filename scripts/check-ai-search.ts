// AI 검색 공개 기능을 로컬 DB에 붙여 확인한다(동시 요청, 철회 순서, Gemini 호출 수).
// Gemini는 부르지 않고 가짜 함수로 바꿔 끼운다. 시험용 사용자와 게시물은 끝날 때 지운다.
// 실행: npx tsx --env-file=.env --env-file=.env.local scripts/check-ai-search.ts
import { prisma } from "../src/lib/db";
import { consumeAiQuota, type UsageDb } from "../src/lib/ai-search/usage";
import { koreaDate } from "../src/lib/demo/usage";
import { enableAiSearch, revokeAiSearch, getAiSearchStatus } from "../src/lib/ai-search/access";
import { AI_SEARCH_POLICY_VERSION } from "../src/lib/ai-search/limits";
import { upsertReelEmbeddings, type EmbedFn } from "../src/lib/search/embeddings";

const url = process.env.DATABASE_URL ?? "";
if (!url.includes("127.0.0.1") && !url.includes("localhost")) {
  console.error("로컬 DB가 아니라서 멈춘다(운영 DB에서 실행하지 않는다).");
  process.exit(1);
}

const PREFIX = "aicheck-";
const uid = (name: string) => `${PREFIX}${name}`;

let failed = 0;
async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`통과  ${name}`);
  } catch (e) {
    failed++;
    console.log(`실패  ${name}\n      ${e instanceof Error ? e.message : e}`);
  }
}
function expectEqual<T>(actual: T, expected: T, label = "") {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${label} 기대 ${b}, 실제 ${a}`);
}

async function cleanup() {
  const users = { startsWith: PREFIX };
  await prisma.reel.deleteMany({ where: { userId: users } });
  await prisma.category.deleteMany({ where: { userId: users } });
  await prisma.adminRole.deleteMany({ where: { userId: users } });
  await prisma.aiSearchConsent.deleteMany({ where: { userId: users } });
  await prisma.aiSearchConsentLog.deleteMany({ where: { userId: users } });
  await prisma.queryEmbeddingCache.deleteMany({ where: { userId: users } });
  await prisma.aiUsageUser.deleteMany({ where: { userId: users } });
  // 전체 사용량은 시험용 날짜 줄만 지운다(오늘 실제 줄은 건드리지 않는다)
  await prisma.aiUsageTotal.deleteMany({ where: { day: { startsWith: "1999-" } } });
}

async function usageChecks() {
  const day = new Date("1999-01-01T03:00:00Z"); // 한국 1999-01-01, 시험 전용 날짜
  const dayKey = koreaDate(day);

  await check("query 상한 30: 동시에 40번 1씩 → 합계 30", async () => {
    const results = await Promise.all(
      Array.from({ length: 40 }, () => consumeAiQuota(uid("u1"), "query", 1, { now: day })),
    );
    expectEqual(results.reduce((a, b) => a + b, 0), 30, "허락 합계");
    const row = await prisma.aiUsageUser.findUnique({ where: { userId_day_kind: { userId: uid("u1"), day: dayKey, kind: "query" } } });
    expectEqual(row?.count, 30, "가입자별 줄");
  });

  await check("전체 상한: 전체 줄 9,999(상한 10,000)에서 두 사용자가 동시에 1씩 → 합계 1", async () => {
    await prisma.aiUsageTotal.upsert({
      where: { day_kind: { day: dayKey, kind: "document" } },
      create: { day: dayKey, kind: "document", count: 9999 },
      update: { count: 9999 },
    });
    const [a, b] = await Promise.all([
      consumeAiQuota(uid("u2"), "document", 1, { now: day }),
      consumeAiQuota(uid("u3"), "document", 1, { now: day }),
    ]);
    expectEqual(a + b, 1, "허락 합계");
  });

  await check("document 부분 허락: 가입자별 남은 양 5일 때 100 요청 → 5", async () => {
    await prisma.aiUsageTotal.update({ where: { day_kind: { day: dayKey, kind: "document" } }, data: { count: 0 } });
    await prisma.aiUsageUser.create({ data: { userId: uid("u4"), day: dayKey, kind: "document", count: 2995 } });
    expectEqual(await consumeAiQuota(uid("u4"), "document", 100, { now: day }), 5);
  });

  await check("사용량 DB 오류: $transaction이 실패하는 db → 0, 예외 없음", async () => {
    const broken = { $transaction: async () => { throw new Error("연결 끊김(시험)"); } } as unknown as UsageDb;
    expectEqual(await consumeAiQuota(uid("u5"), "query", 1, { now: day, db: broken }), 0);
  });
}

/** 가짜 Gemini: 받은 글과 호출 수를 기록하고 768개짜리 고정 벡터를 돌려준다. gate를 주면 그 약속이 풀릴 때까지 기다린다 */
function fakeEmbed(gate?: Promise<void>, onEnter?: () => void) {
  const calls: string[][] = [];
  const embed: EmbedFn = async (texts) => {
    calls.push(texts);
    onEnter?.();
    if (gate) await gate;
    return texts.map((_, i) => Array.from({ length: 768 }, (_, j) => (j === i % 768 ? 1 : 0)));
  };
  return { embed, calls };
}

async function makeReels(userId: string, n: number) {
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    const r = await prisma.reel.create({
      data: { userId, url: `https://example.com/${userId}/${i}`, caption: `캡션 ${i} 파주 카페`, memo: `비밀 메모 ${i}`, review: `후기 ${i}` },
    });
    ids.push(r.id);
  }
  return ids;
}
const embeddingCount = async (userId: string) =>
  Number(
    (await prisma.$queryRaw<{ n: bigint }[]>`
      SELECT count(*) AS n FROM "ReelEmbedding" e JOIN "Reel" r ON r."id" = e."reelId" WHERE r."userId" = ${userId}`)[0].n,
  );
const consent = (userId: string) => enableAiSearch(userId, { adultConfirmed: true, policyVersion: AI_SEARCH_POLICY_VERSION });

async function embeddingChecks() {
  process.env.AI_SEARCH_PUBLIC = "true";

  await check("동의 안 함: embed 0번, 벡터 0줄", async () => {
    const ids = await makeReels(uid("e1"), 3);
    const f = fakeEmbed();
    await upsertReelEmbeddings(ids, { embed: f.embed });
    expectEqual(f.calls.length, 0, "embed 호출");
    expectEqual(await embeddingCount(uid("e1")), 0, "벡터");
  });

  await check("공개 스위치 꺼짐: 동의해도 embed 0번", async () => {
    const ids = await makeReels(uid("e2"), 2);
    await consent(uid("e2"));
    delete process.env.AI_SEARCH_PUBLIC;
    const f = fakeEmbed();
    await upsertReelEmbeddings(ids, { embed: f.embed });
    process.env.AI_SEARCH_PUBLIC = "true";
    expectEqual(f.calls.length, 0, "embed 호출");
  });

  await check("만 18세 확인 없이 켜기 → 거절", async () => {
    const r = await enableAiSearch(uid("e3"), { adultConfirmed: false, policyVersion: AI_SEARCH_POLICY_VERSION });
    expectEqual("error" in r, true, "오류");
    expectEqual(await prisma.aiSearchConsent.count({ where: { userId: uid("e3") } }), 0, "동의 줄");
  });

  await check("동의 함: 메모, 후기는 안 보내고 벡터 수 = 게시물 수", async () => {
    const ids = await makeReels(uid("e4"), 3);
    await consent(uid("e4"));
    const f = fakeEmbed();
    const r = await upsertReelEmbeddings(ids, { embed: f.embed });
    const sent = f.calls.flat().join("\n");
    expectEqual(sent.includes("비밀 메모") || sent.includes("후기"), false, "메모나 후기 전송");
    expectEqual(r.updated, 3, "updated");
    expectEqual(await embeddingCount(uid("e4")), 3, "벡터");
    const status = await getAiSearchStatus(uid("e4"));
    expectEqual(status, { enabled: true, total: 3, pending: 0 }, "상태");
  });

  await check("생성 중 철회: 철회가 끝난 뒤 벡터 0줄", async () => {
    const ids = await makeReels(uid("e5"), 3);
    await consent(uid("e5"));
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    let entered!: () => void;
    const inEmbed = new Promise<void>((r) => (entered = r));
    const f = fakeEmbed(gate, () => entered());
    const job = upsertReelEmbeddings(ids, { embed: f.embed });
    await inEmbed; // Gemini 요청 중
    const revoke = revokeAiSearch(uid("e5"));
    release();
    const [jobResult, revokeResult] = await Promise.all([job, revoke]);
    expectEqual(revokeResult, { ok: true }, "철회");
    expectEqual(await embeddingCount(uid("e5")), 0, "남은 벡터");
    expectEqual(jobResult.stopped, "revoked", "멈춘 이유");
  });

  await check("철회 뒤 재동의: 벡터 다시 생성, 그날 document 사용량은 줄지 않음", async () => {
    const ids = await makeReels(uid("e6"), 2);
    await consent(uid("e6"));
    await upsertReelEmbeddings(ids, { embed: fakeEmbed().embed });
    await revokeAiSearch(uid("e6"));
    const usageAfterRevoke = await prisma.aiUsageUser.findFirst({ where: { userId: uid("e6"), kind: "document" } });
    expectEqual(usageAfterRevoke?.count, 2, "철회 뒤 사용량");
    await consent(uid("e6"));
    await upsertReelEmbeddings(ids, { embed: fakeEmbed().embed });
    expectEqual(await embeddingCount(uid("e6")), 2, "다시 만든 벡터");
    const usage = await prisma.aiUsageUser.findFirst({ where: { userId: uid("e6"), kind: "document" } });
    expectEqual(usage?.count, 4, "사용량");
  });

  await check("다시 시도: 글 하나만 바꾸면 그 하나만 보냄", async () => {
    const ids = await makeReels(uid("e7"), 3);
    await consent(uid("e7"));
    await upsertReelEmbeddings(ids, { embed: fakeEmbed().embed });
    await prisma.reel.update({ where: { id: ids[1] }, data: { caption: "바뀐 캡션" } });
    const f = fakeEmbed();
    await upsertReelEmbeddings(ids, { embed: f.embed });
    expectEqual(f.calls.flat().length, 1, "보낸 글 수");
  });

  await check("상한: 가입자별 남은 양 2, 게시물 5 → 저장 2, stopped quota", async () => {
    const ids = await makeReels(uid("e8"), 5);
    await consent(uid("e8"));
    await prisma.aiUsageUser.create({ data: { userId: uid("e8"), day: koreaDate(new Date()), kind: "document", count: 2998 } });
    const f = fakeEmbed();
    const r = await upsertReelEmbeddings(ids, { embed: f.embed });
    expectEqual(f.calls.flat().length, 2, "보낸 글 수");
    expectEqual(await embeddingCount(uid("e8")), 2, "벡터");
    expectEqual(r.stopped, "quota", "멈춘 이유");
  });

  await check("철회 실패 되돌림: 삭제 뒤 실패 → 오류, 동의와 벡터 그대로", async () => {
    const ids = await makeReels(uid("e9"), 2);
    await consent(uid("e9"));
    await upsertReelEmbeddings(ids, { embed: fakeEmbed().embed });
    const r = await revokeAiSearch(uid("e9"), { beforeCommit: async () => { throw new Error("시험 실패"); } });
    expectEqual("error" in r, true, "오류");
    expectEqual((await prisma.aiSearchConsent.findUnique({ where: { userId: uid("e9") } }))?.enabled, true, "동의 상태");
    expectEqual(await embeddingCount(uid("e9")), 2, "벡터");
  });

  await check("관리자: 동의 없이 메모 포함 벡터 생성, 사용량 안 셈", async () => {
    await prisma.adminRole.create({ data: { userId: uid("admin"), email: "aicheck-admin@example.com" } });
    const ids = await makeReels(uid("admin"), 2);
    const f = fakeEmbed();
    await upsertReelEmbeddings(ids, { embed: f.embed });
    expectEqual(f.calls.flat().join("\n").includes("비밀 메모"), true, "메모 포함");
    expectEqual(await embeddingCount(uid("admin")), 2, "벡터");
    expectEqual(await prisma.aiUsageUser.count({ where: { userId: uid("admin") } }), 0, "사용량 줄");
  });

  delete process.env.AI_SEARCH_PUBLIC;
}

async function main() {
  await cleanup();
  try {
    await usageChecks();
    await embeddingChecks();
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }
  console.log(failed === 0 ? "\n모두 통과" : `\n실패 ${failed}개`);
  if (failed > 0) process.exitCode = 1;
}

main();
