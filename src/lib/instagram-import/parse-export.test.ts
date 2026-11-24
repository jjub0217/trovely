import { test } from "node:test";
import assert from "node:assert/strict";
import { fixMojibake, parseSavedPosts, parseCollections } from "./parse-export";

// 인스타그램 내보내기 파일은 UTF-8 바이트를 한 글자씩 적어 둔다. 같은 모양을 만든다.
const broken = (s: string) => Buffer.from(s, "utf8").toString("latin1");

test("fixMojibake: 깨진 한글을 되돌린다", () => {
  assert.equal(fixMojibake(broken("제목")), "제목");
});

test("fixMojibake: 4바이트 이모지와 줄바꿈도 되돌린다", () => {
  assert.equal(fixMojibake(broken("🍝파스타\n줄바꿈")), "🍝파스타\n줄바꿈");
});

test("fixMojibake: 이미 정상인 문자열은 그대로 둔다", () => {
  assert.equal(fixMojibake("이미 정상"), "이미 정상");
});

const post = (url: string, captions: string[], timestamp: number) => ({
  timestamp,
  media: [],
  label_values: [
    { label: "URL", value: url, href: url },
    ...captions.map((c) => ({ label: broken("캡션"), value: broken(c) })),
    { label: broken("제목"), value: "" },
    { title: broken("소유자"), dict: [] },
  ],
});

test("parseSavedPosts: 주소를 정규화하고 캡션과 저장 시각을 읽는다", () => {
  const [p] = parseSavedPosts([post("https://www.instagram.com/reels/ABC", ["파주 사우나 🧖"], 1700000000)]);
  assert.equal(p.url, "https://www.instagram.com/reel/ABC/");
  assert.equal(p.caption, "파주 사우나 🧖");
  assert.deepEqual(p.savedAt, new Date(1700000000 * 1000));
});

test("parseSavedPosts: 캡션이 둘이면 빈 줄로 이어 붙인다", () => {
  const [p] = parseSavedPosts([post("https://www.instagram.com/p/X1/", ["첫째", "둘째"], 1)]);
  assert.equal(p.caption, "첫째\n\n둘째");
});

test("parseSavedPosts: 캡션이 없으면 빈 문자열", () => {
  const [p] = parseSavedPosts([post("https://www.instagram.com/p/X2/", [], 1)]);
  assert.equal(p.caption, "");
});

test("parseSavedPosts: 정규화할 수 없는 주소는 버린다", () => {
  assert.equal(parseSavedPosts([post("https://example.com/x", ["a"], 1)]).length, 0);
});

const collection = (name: string, urls: string[]) => ({
  timestamp: 1,
  media: [],
  label_values: [
    { label: broken("이름"), value: broken(name) },
    { label: broken("유형"), value: broken("기본") },
    {
      title: "",
      dict: urls.map((u) => ({
        dict: [
          { label: "URL", value: u, href: u },
          { label: broken("캡션"), value: broken("아무 캡션") },
        ],
        title: "",
      })),
    },
  ],
});

test("parseCollections: 이름과 속한 게시물 주소를 읽는다", () => {
  const cols = parseCollections([
    collection("데이트", ["https://www.instagram.com/reel/A/", "https://www.instagram.com/p/B"]),
    collection("네일", []),
  ]);
  assert.deepEqual(cols, [
    { name: "데이트", urls: ["https://www.instagram.com/reel/A/", "https://www.instagram.com/p/B/"] },
    { name: "네일", urls: [] },
  ]);
});
