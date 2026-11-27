import { prisma } from "@/lib/db";
import { upsertReelEmbeddings, type EmbedFn, type UpsertResult } from "@/lib/search/embeddings";

/** 작업 하나가 잡아 두는 시간. 게시물 만들기 시간 한도(200초)보다 길게 */
const LEASE_SECONDS = 240;

/**
 * 그 사람 게시물 전체의 AI 검색용 데이터를 만든다(이미 만든 게시물은 건너뛴다).
 * 처음 켤 때와 처음 보는 검색어로 검색할 때 겹쳐 부를 수 있어서, 한 사람에게 작업 하나만 돌게 한다.
 * 동의 상태 줄의 buildingUntil을 "비어 있거나 지났을 때만" 바꾸는 문장 하나로 차지하고, 못 차지하면 건너뛴다.
 * 작업이 중간에 죽어도 240초가 지나면 다음 작업이 차지할 수 있다.
 */
export async function buildAllForUser(
  userId: string,
  options: { embed?: EmbedFn } = {},
): Promise<"done" | "skipped"> {
  const claimed = await prisma.$executeRaw`
    UPDATE "AiSearchConsent" SET "buildingUntil" = now() + make_interval(secs => ${LEASE_SECONDS})
    WHERE "userId" = ${userId} AND "enabled" AND ("buildingUntil" IS NULL OR "buildingUntil" < now())`;
  if (claimed === 0) return "skipped";
  try {
    const ids = (await prisma.reel.findMany({ where: { userId }, select: { id: true } })).map((r) => r.id);
    const r: UpsertResult = await upsertReelEmbeddings(ids, { embed: options.embed });
    if (r.stopped) console.log("[ai-search] 벡터 만들기 멈춤", r.stopped, r.updated);
    return "done";
  } finally {
    await prisma.$executeRaw`UPDATE "AiSearchConsent" SET "buildingUntil" = NULL WHERE "userId" = ${userId}`;
  }
}
