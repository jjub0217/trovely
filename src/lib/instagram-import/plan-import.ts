import type { ExportCollection, ExportPost } from "./parse-export";

/** 게시물이 이 수 이상인 인스타그램 컬렉션은 이름 그대로 카테고리로 옮긴다. */
export const SMALL_COLLECTION_THRESHOLD = 10;

/** 브라우저가 서버로 한 번에 보내는 후보 수(서버 액션 요청 1MB 제한 안쪽) */
export const ADD_CHUNK_SIZE = 200;

export type PlannedItem = {
  url: string;
  caption: string;
  savedAt: Date;
  /** 그대로 옮기는 큰 컬렉션 이름들 */
  keptCategories: string[];
  /** 큰 컬렉션에 하나도 속하지 않으면 AI가 카테고리를 제안한다 */
  needsAi: boolean;
  /** 원래 속했던 작은 컬렉션 이름들(AI 참고용) */
  fromCollections: string[];
};

export function planImport(input: {
  posts: ExportPost[];
  collections: ExportCollection[];
  existingUrls: Set<string>;
  threshold?: number;
}): { items: PlannedItem[]; skippedExisting: number; droppedEmptyCollections: string[] } {
  const threshold = input.threshold ?? SMALL_COLLECTION_THRESHOLD;

  // 이름이 같은 컬렉션은 하나로 합친다(내보내기 파일에 같은 이름이 두 번 나오기도 한다).
  const byName = new Map<string, Set<string>>();
  for (const c of input.collections) {
    const set = byName.get(c.name) ?? new Set<string>();
    c.urls.forEach((u) => set.add(u));
    byName.set(c.name, set);
  }

  const droppedEmptyCollections = [...byName].filter(([, s]) => s.size === 0).map(([n]) => n);
  const bigNamesByUrl = new Map<string, string[]>();
  const smallNamesByUrl = new Map<string, string[]>();
  for (const [name, urls] of byName) {
    const target = urls.size >= threshold ? bigNamesByUrl : smallNamesByUrl;
    for (const u of urls) target.set(u, [...(target.get(u) ?? []), name]);
  }

  let skippedExisting = 0;
  const items: PlannedItem[] = [];
  for (const p of input.posts) {
    if (input.existingUrls.has(p.url)) {
      skippedExisting++;
      continue;
    }
    const keptCategories = bigNamesByUrl.get(p.url) ?? [];
    items.push({
      url: p.url,
      caption: p.caption,
      savedAt: p.savedAt,
      keptCategories,
      needsAi: keptCategories.length === 0,
      fromCollections: smallNamesByUrl.get(p.url) ?? [],
    });
  }

  return { items, skippedExisting, droppedEmptyCollections };
}
