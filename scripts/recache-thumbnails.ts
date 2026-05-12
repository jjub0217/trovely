import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { extractThumbnail } from "../src/lib/og";

const DELAY_MS = 500;
const DEFAULT_LIMIT = 50;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const required = ["DATABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Missing env vars: ${missing.join(", ")}`);
    process.exit(1);
  }

  const limitArg = process.argv[2];
  const limit = limitArg ? parseInt(limitArg, 10) : DEFAULT_LIMIT;
  if (Number.isNaN(limit) || limit <= 0) {
    console.error(`Invalid limit: ${limitArg}`);
    process.exit(1);
  }

  const storagePrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/reel-thumbnails/`;

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const totalUncached = await prisma.reel.count({
    where: {
      thumbnail: { not: null },
      NOT: { thumbnail: { startsWith: storagePrefix } },
    },
  });

  const reels = await prisma.reel.findMany({
    where: {
      thumbnail: { not: null },
      NOT: { thumbnail: { startsWith: storagePrefix } },
    },
    select: { id: true, url: true, thumbnail: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  console.log(`Uncached reels in DB: ${totalUncached}`);
  console.log(`Processing latest ${reels.length} (limit=${limit})\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < reels.length; i++) {
    const reel = reels[i];
    const prefix = `[${i + 1}/${reels.length}] ${reel.url}`;

    try {
      const fresh = await extractThumbnail(reel.url);
      if (fresh && fresh.startsWith(storagePrefix)) {
        await prisma.reel.update({
          where: { id: reel.id },
          data: { thumbnail: fresh },
        });
        success++;
        console.log(`${prefix} → OK (cached)`);
      } else if (fresh) {
        failed++;
        console.log(`${prefix} → SKIP (extracted but cache upload failed)`);
      } else {
        failed++;
        console.log(`${prefix} → FAILED (no thumbnail extracted)`);
      }
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`${prefix} → ERROR: ${msg}`);
    }

    if (i < reels.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\nDone: ${success} succeeded, ${failed} failed`);
  console.log(`Remaining uncached: ${totalUncached - success}`);
  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
