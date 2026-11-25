import { Pool } from "pg";

/**
 * 데모 링크의 하루 AI 사용량 세기(데모 전용 Supabase의 demo_usage 표).
 * 운영 DB와 완전히 따로 연결한다(DEMO_USAGE_DATABASE_URL).
 */
export type DemoUsageKind = "search" | "ask";

// ask는 AI를 부르는 요청 단위(질문 하나 = 질문 읽기 + 답 쓰기 2회, 약 30개 질문)
const DEFAULT_LIMIT: Record<DemoUsageKind, number> = { search: 300, ask: 60 };

export { DEMO_QUOTA_MESSAGE } from "./quota-message";

/** 한국 시각 기준 날짜 YYYY-MM-DD */
export function koreaDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** 하루 상한(데모 전체 합계). 환경변수 DEMO_LIMIT_SEARCH, DEMO_LIMIT_ASK로 바꿀 수 있다. */
export function demoLimit(kind: DemoUsageKind): number {
  const raw = process.env[kind === "search" ? "DEMO_LIMIT_SEARCH" : "DEMO_LIMIT_ASK"];
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_LIMIT[kind];
}

let pool: Pool | null = null;
function usagePool(): Pool | null {
  const url = process.env.DEMO_USAGE_DATABASE_URL;
  if (!url) return null;
  pool ??= new Pool({
    connectionString: url,
    max: 2,
    connectionTimeoutMillis: 3000,
    ssl: url.includes("127.0.0.1") || url.includes("localhost") ? false : { rejectUnauthorized: false },
  });
  return pool;
}

/**
 * 오늘 이 기능의 횟수를 1 올린다. 상한보다 작을 때만 올리고 true, 아니면 false.
 * 올리기와 검사를 SQL 한 번으로 해서 동시에 요청이 와도 상한을 넘지 않는다.
 * 사용량 DB가 없거나 연결이 안 되면 false(세지 못하면 AI를 부르지 않는다).
 */
export async function consumeDemoQuota(kind: DemoUsageKind, now = new Date()): Promise<boolean> {
  const limit = demoLimit(kind);
  if (limit <= 0) return false;
  const p = usagePool();
  if (!p) return false;
  try {
    const r = await p.query(
      `INSERT INTO demo_usage (day, kind, count) VALUES ($1, $2, 1)
       ON CONFLICT (day, kind) DO UPDATE SET count = demo_usage.count + 1
       WHERE demo_usage.count < $3
       RETURNING count`,
      [koreaDate(now), kind, limit],
    );
    return (r.rowCount ?? 0) > 0;
  } catch (e) {
    console.error("[demo-usage] 사용량을 세지 못함", e instanceof Error ? e.message : e);
    return false;
  }
}
