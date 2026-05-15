import sharp from "sharp";
import path from "node:path";

const SOURCE_PATH = path.join("public", "trove-icon.png");
const OUTPUT_DIR = "public";

const TARGETS: Array<{ name: string; size: number }> = [
  { name: "logo.png", size: 256 },
  { name: "icon-32.png", size: 32 },
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

async function main() {
  for (const { name, size } of TARGETS) {
    const outPath = path.join(OUTPUT_DIR, name);
    await sharp(SOURCE_PATH).resize(size, size).png().toFile(outPath);
    console.log(`✓ ${name} (${size}x${size})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
