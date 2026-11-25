// 낱말 검색과 뜻 검색을 같은 시험 질문으로 잰다.
// 실행: npx tsx --env-file=.env --env-file=.env.local scripts/measure-search.ts [--user <id>] [--out <md 경로>]
import { readFileSync, writeFileSync } from "node:fs";
import { prisma } from "../src/lib/db";
import { buildKeywordWhere } from "../src/lib/search/keyword-where";
import { semanticReelIds, SEMANTIC_TAKE } from "../src/lib/search/semantic";

type Query = { id: string; category: string; query: string; expected: string[] };
const TOP = 5;

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

const short = (url: string) => url.match(/\/(?:reel|p)\/([^/]+)/)?.[1] ?? url;

async function main() {
  const queries: Query[] = JSON.parse(readFileSync("docs/search-eval/queries.json", "utf8"));
  const userId = arg("--user") ?? (await prisma.category.findFirstOrThrow({ select: { userId: true } })).userId;
  const out = arg("--out") ?? `docs/search-eval/results-${new Date().toISOString().slice(0, 10)}.md`;

  const rows: string[] = [];
  let kwHit = 0, smHit = 0, kwWrong = 0, smWrong = 0;
  const details: string[] = [];

  for (const q of queries) {
    const cat = await prisma.category.findFirstOrThrow({ where: { userId, name: q.category } });
    // 낱말 검색: 홈 화면과 같은 조건, 같은 정렬(최신 저장 순)
    const kw = await prisma.reel.findMany({
      where: buildKeywordWhere({ userId, search: q.query, categoryId: cat.id }),
      orderBy: { createdAt: "desc" },
      take: SEMANTIC_TAKE,
      select: { id: true },
    });
    const sm = await semanticReelIds(userId, q.query, { categoryId: cat.id });
    const urlById = new Map(
      (await prisma.reel.findMany({ where: { id: { in: [...kw.map((k) => k.id), ...sm] } }, select: { id: true, url: true } })).map((r) => [r.id, r.url]),
    );
    const kwUrls = kw.map((k) => urlById.get(k.id)!);
    const smUrls = sm.map((id) => urlById.get(id)!);

    const rank = (urls: string[]) => {
      const i = urls.findIndex((u) => q.expected.includes(u));
      return i >= 0 ? i + 1 : null;
    };
    const wrong = (urls: string[]) => urls.slice(0, TOP).filter((u) => !q.expected.includes(u)).length;
    const kr = rank(kwUrls), sr = rank(smUrls);
    if (kr !== null && kr <= TOP) kwHit++;
    if (sr !== null && sr <= TOP) smHit++;
    kwWrong += wrong(kwUrls);
    smWrong += wrong(smUrls);

    rows.push(`| ${q.id} | ${q.category} | ${q.query} | ${kr ?? "-"} | ${kwUrls.length} | ${wrong(kwUrls)} | ${sr ?? "-"} | ${wrong(smUrls)} |`);
    details.push(
      `- ${q.id} "${q.query}" 낱말 상위 ${TOP}: ${kwUrls.slice(0, TOP).map(short).join(", ") || "(없음)"} / 뜻 상위 ${TOP}: ${smUrls.slice(0, TOP).map(short).join(", ")}`,
    );
  }

  const n = queries.length;
  const summary = `keyword hit@${TOP} = ${kwHit}/${n}, semantic hit@${TOP} = ${smHit}/${n} (상위 ${TOP}개 안 엉뚱한 릴스 합계: 낱말 ${kwWrong}, 뜻 ${smWrong})`;
  const md = [
    `# 검색 측정 결과 (${new Date().toISOString().slice(0, 10)})`,
    "",
    `질문: docs/search-eval/queries.json (${n}개). 두 방식 모두 같은 카테고리 안에서 찾는다. 낱말 검색은 홈 화면과 같은 규칙(낱말 모두 포함, 최신 저장 순), 뜻 검색은 가까운 순 상위 ${SEMANTIC_TAKE}개.`,
    "순위는 정답 중 가장 먼저 나온 것의 순위, `-`는 상위 20개 안에 없음. 엉뚱한 수는 상위 5개 중 정답이 아닌 릴스 수(낱말 검색은 결과가 5개보다 적으면 그만큼만 센다).",
    "",
    `| 번호 | 카테고리 | 검색어 | 낱말 순위 | 낱말 결과 수 | 낱말 엉뚱한 수 | 뜻 순위 | 뜻 엉뚱한 수 |`,
    `|---|---|---|---|---|---|---|---|`,
    ...rows,
    "",
    summary,
    "",
    "## 상위 5개 (릴스 주소 끝부분)",
    ...details,
    "",
  ].join("\n");
  writeFileSync(out, md);
  console.log(md);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
