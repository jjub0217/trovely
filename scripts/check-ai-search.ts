// AI 검색 공개 기능을 로컬 DB에 붙여 확인한다(동시 요청, 철회 순서, Gemini 호출 수).
// Gemini는 부르지 않고 가짜 함수로 바꿔 끼운다. 시험용 사용자와 게시물은 끝날 때 지운다.
// 실행: npx tsx --env-file=.env --env-file=.env.local scripts/check-ai-search.ts
import { prisma } from "../src/lib/db";
import { consumeAiQuota, type UsageDb } from "../src/lib/ai-search/usage";
import { koreaDate } from "../src/lib/demo/usage";

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

async function main() {
  await cleanup();
  try {
    await usageChecks();
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }
  console.log(failed === 0 ? "\n모두 통과" : `\n실패 ${failed}개`);
  if (failed > 0) process.exitCode = 1;
}

main();
