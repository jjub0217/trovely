// Gemini 연결 확인용. 실행: npx tsx --env-file=.env.local scripts/gemini-smoke.ts
import { embedTexts, generateJson, EMBEDDING_DIM, EMBEDDING_MODEL, TEXT_MODEL } from "../src/lib/ai/gemini";

const cosine = (a: number[], b: number[]) => {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2; }
  return dot / Math.sqrt(na * nb);
};

async function main() {
  const [a, b, c] = await embedTexts(
    ["파주 사우나 왜 아무도 안 알려줬어요, 노천탕이 있는 찜질방", "파주 사우나", "인천 파스타 맛집"],
    "RETRIEVAL_DOCUMENT",
  );
  console.log(`${EMBEDDING_MODEL}: 길이 ${a.length} (기대 ${EMBEDDING_DIM})`);
  console.log("문서-'파주 사우나' 유사도", cosine(a, b).toFixed(3));
  console.log("문서-'인천 파스타 맛집' 유사도", cosine(a, c).toFixed(3));
  const j = await generateJson<{ ok: boolean }>("ok 값을 true로 하는 JSON을 돌려줘", {
    type: "OBJECT",
    properties: { ok: { type: "BOOLEAN" } },
    required: ["ok"],
  });
  console.log(`${TEXT_MODEL} JSON 응답:`, JSON.stringify(j));
}

main().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1); });
