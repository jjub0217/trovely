import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { koreaDate } from "@/lib/demo/usage";
import { AI_LIMITS, type AiUsageKind } from "./limits";

export type UsageDb = Pick<PrismaClient, "$transaction">;

/**
 * 오늘 사용량에서 amount만큼 빼려고 시도하고, 실제로 허락된 개수(0..amount)를 돌려준다.
 * 가입자별 상한과 서비스 전체 상한을 함께 본다. 두 줄을 잠근 뒤 남은 양만큼만 올려서 동시에 요청이 와도 상한을 넘지 않는다.
 * 잠그는 순서는 늘 가입자별 → 전체(순서를 고정해 서로 기다리다 멈추는 일을 막는다).
 * DB 오류면 0(세지 못하면 Gemini를 부르지 않는다).
 */
export async function consumeAiQuota(
  userId: string,
  kind: AiUsageKind,
  amount: number,
  options: { now?: Date; db?: UsageDb } = {},
): Promise<number> {
  if (amount <= 0) return 0;
  const day = koreaDate(options.now ?? new Date());
  const limit = AI_LIMITS[kind];
  const db = options.db ?? prisma;
  try {
    return await db.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "AiUsageUser" ("userId", "day", "kind", "count") VALUES (${userId}, ${day}, ${kind}, 0)
        ON CONFLICT DO NOTHING`;
      await tx.$executeRaw`
        INSERT INTO "AiUsageTotal" ("day", "kind", "count") VALUES (${day}, ${kind}, 0)
        ON CONFLICT DO NOTHING`;
      const [user] = await tx.$queryRaw<{ count: number }[]>`
        SELECT "count" FROM "AiUsageUser" WHERE "userId" = ${userId} AND "day" = ${day} AND "kind" = ${kind} FOR UPDATE`;
      const [total] = await tx.$queryRaw<{ count: number }[]>`
        SELECT "count" FROM "AiUsageTotal" WHERE "day" = ${day} AND "kind" = ${kind} FOR UPDATE`;
      const granted = Math.max(0, Math.min(amount, limit.perUser - user.count, limit.total - total.count));
      if (granted === 0) return 0;
      await tx.$executeRaw`
        UPDATE "AiUsageUser" SET "count" = "count" + ${granted} WHERE "userId" = ${userId} AND "day" = ${day} AND "kind" = ${kind}`;
      await tx.$executeRaw`
        UPDATE "AiUsageTotal" SET "count" = "count" + ${granted} WHERE "day" = ${day} AND "kind" = ${kind}`;
      return granted;
    });
  } catch (e) {
    console.error("[ai-usage] 사용량을 세지 못함", e instanceof Error ? e.message : e);
    return 0;
  }
}
