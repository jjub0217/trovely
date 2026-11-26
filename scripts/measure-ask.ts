// AI에게 물어보기를 시험 질문으로 돌려 기록한다(맞다/틀리다는 사용자가 판단).
// 실행: npx tsx --env-file=.env --env-file=.env.local scripts/measure-ask.ts [--user <id>]
import { readFileSync, writeFileSync } from "node:fs";
import { prisma } from "../src/lib/db";
import { answerWithChips, readChips } from "../src/lib/search/ask-core";

type Q = { id: string; question: string; check: string };
const arg = (n: string) => {
  const i = process.argv.indexOf(n);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const oneLine = (s: string | null, n: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

async function main() {
  const qs: Q[] = JSON.parse(readFileSync("docs/search-eval/ask-questions.json", "utf8"));
  const userId = arg("--user") ?? (await prisma.category.findFirstOrThrow({ select: { userId: true } })).userId;
  const day = new Date().toISOString().slice(0, 10);
  const out: string[] = [`# AI에게 물어보기 측정 (${day})`, "", "질문: docs/search-eval/ask-questions.json. 맞다/틀리다 칸은 사용자가 채운다.", ""];
  for (const q of qs) {
    const t0 = Date.now();
    const chips = await readChips(q.question);
    const t1 = Date.now();
    const r = await answerWithChips(userId, q.question, chips);
    const t2 = Date.now();
    const context = await prisma.reel.findMany({ where: { id: { in: r.contextIds } }, select: { id: true, caption: true, visited: true } });
    const byId = new Map(context.map((c) => [c.id, c]));
    const dropped = r.rawUsedIds.filter((id) => !r.contextIds.includes(id)).length;
    out.push(
      `## ${q.id}. ${q.question}`,
      `- 확인할 점: ${q.check}`,
      `- 알아들은 조건: ${r.chips.map((c) => c.label).join(", ") || "(없음)"}`,
      `- 걸린 시간: 질문 읽기 ${((t1 - t0) / 1000).toFixed(1)}초, 찾기와 답 쓰기 ${((t2 - t1) / 1000).toFixed(1)}초`,
      `- AI에게 건넨 5개: ${r.contextIds.map((id) => `${oneLine(byId.get(id)?.caption ?? "", 25)}${byId.get(id)?.visited ? "(방문 완료)" : ""}`).join(" / ")}`,
      `- 지어냄 검사로 버린 근거: ${dropped}개`,
      "- 답:",
      "",
      ...("notFound" in r.answer ? ["  (찾지 못했어요)"] : r.answer.text.split(/\n+/).filter(Boolean).map((p) => `  > ${p.trim()}`)),
      "",
      `- 답에 쓴 콘텐츠: ${r.sources.map((s) => oneLine(s.caption, 30)).join(" / ") || "(없음)"}`,
      "- 맞다/틀리다: ",
      "",
    );
  }
  const md = out.join("\n");
  writeFileSync(`docs/search-eval/answers-${day}.md`, md);
  console.log(md);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
