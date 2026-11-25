// 벡터가 없거나 글이 바뀐 릴스의 뜻 검색 벡터를 만든다.
// 실행: npx tsx --env-file=.env --env-file=.env.local scripts/backfill-embeddings.ts
import { prisma } from "../src/lib/db";
import { upsertReelEmbeddings } from "../src/lib/search/embeddings";

const CHUNK = 100;

async function main() {
  const ids = (await prisma.reel.findMany({ select: { id: true }, orderBy: { createdAt: "desc" } })).map((r) => r.id);
  let updated = 0;
  let skipped = 0;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const r = await upsertReelEmbeddings(ids.slice(i, i + CHUNK));
    updated += r.updated;
    skipped += r.skipped;
    console.log(`${Math.min(i + CHUNK, ids.length)} / ${ids.length}`);
  }
  console.log(`updated: ${updated}, skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
