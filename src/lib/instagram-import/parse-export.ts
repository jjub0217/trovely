import { normalizeReelUrl } from "@/lib/reel-url";

/**
 * 인스타그램 "내 정보 내보내기" JSON 읽기.
 * 이 파일은 UTF-8 바이트를 한 글자씩(latin-1처럼) 적어 두어서 한글이 깨져 보인다.
 */

export type ExportPost = { url: string; caption: string; savedAt: Date };
export type ExportCollection = { name: string; urls: string[] };

type LabelValue = {
  label?: string;
  value?: string;
  title?: string;
  dict?: unknown[];
};

type ExportEntry = { timestamp?: number; label_values?: LabelValue[] };

export function fixMojibake(s: string): string {
  // 이미 0xFF보다 큰 글자가 있으면 정상 문자열로 본다.
  for (const ch of s) {
    if (ch.codePointAt(0)! > 0xff) return s;
  }
  // 브라우저에서도 돌도록 Buffer 대신 TextDecoder를 쓴다(파일은 브라우저에서 읽는다).
  const bytes = Uint8Array.from(s, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

function asEntries(json: unknown): ExportEntry[] {
  return Array.isArray(json) ? (json as ExportEntry[]) : [];
}

function labelOf(lv: LabelValue): string | null {
  return typeof lv.label === "string" ? fixMojibake(lv.label) : null;
}

function normalize(url: string | undefined): string | null {
  if (!url) return null;
  return normalizeReelUrl(url)?.url ?? null;
}

function readFields(labelValues: LabelValue[]): { url: string | null; captions: string[] } {
  let url: string | null = null;
  const captions: string[] = [];
  for (const lv of labelValues) {
    const label = labelOf(lv);
    if (label === "URL" && url === null) url = normalize(lv.value);
    else if (label === "캡션" && typeof lv.value === "string" && lv.value.trim()) {
      captions.push(fixMojibake(lv.value));
    }
  }
  return { url, captions };
}

export function parseSavedPosts(json: unknown): ExportPost[] {
  const posts: ExportPost[] = [];
  for (const entry of asEntries(json)) {
    const { url, captions } = readFields(entry.label_values ?? []);
    if (!url) continue;
    posts.push({
      url,
      caption: captions.join("\n\n"),
      savedAt: new Date((entry.timestamp ?? 0) * 1000),
    });
  }
  return posts;
}

export function parseCollections(json: unknown): ExportCollection[] {
  const collections: ExportCollection[] = [];
  for (const entry of asEntries(json)) {
    let name: string | null = null;
    const urls: string[] = [];
    for (const lv of entry.label_values ?? []) {
      const label = labelOf(lv);
      if (label === "이름" && typeof lv.value === "string") {
        name = fixMojibake(lv.value);
      } else if (label === null && Array.isArray(lv.dict)) {
        for (const item of lv.dict as { dict?: LabelValue[] }[]) {
          const { url } = readFields(item?.dict ?? []);
          if (url && !urls.includes(url)) urls.push(url);
        }
      }
    }
    if (name !== null) collections.push({ name, urls });
  }
  return collections;
}
