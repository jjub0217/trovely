// 포털(일반 사용자) 데모용 mock 데이터.
// DEMO_MODE에서 actions.ts의 읽기 함수들이 이 데이터를 반환한다.
import { DEMO_USER_ID } from "@/lib/demo";

type MockCategory = { id: string; name: string; userId: string };
type MockTagRef = { id: string; name: string; userId: string };

const CATEGORIES: MockCategory[] = [
  { id: "cat-dev", name: "개발", userId: DEMO_USER_ID },
  { id: "cat-cook", name: "요리", userId: DEMO_USER_ID },
  { id: "cat-travel", name: "여행", userId: DEMO_USER_ID },
  { id: "cat-workout", name: "운동", userId: DEMO_USER_ID },
  { id: "cat-interior", name: "인테리어", userId: DEMO_USER_ID },
];

const TAG: Record<string, MockTagRef> = {
  tip: { id: "tag-tip", name: "꿀팁", userId: DEMO_USER_ID },
  beginner: { id: "tag-beginner", name: "입문", userId: DEMO_USER_ID },
  react: { id: "tag-react", name: "React", userId: DEMO_USER_ID },
  recipe: { id: "tag-recipe", name: "레시피", userId: DEMO_USER_ID },
  domestic: { id: "tag-domestic", name: "국내", userId: DEMO_USER_ID },
  abroad: { id: "tag-abroad", name: "해외", userId: DEMO_USER_ID },
  home: { id: "tag-home", name: "홈트", userId: DEMO_USER_ID },
  small: { id: "tag-small", name: "원룸", userId: DEMO_USER_ID },
};

const cat = (id: string) => {
  const c = CATEGORIES.find((x) => x.id === id)!;
  return { category: c };
};
const tag = (t: MockTagRef) => ({ tag: t });

function d(iso: string) {
  return new Date(iso);
}

// getReels의 include payload 형태(categories/tags join 포함)에 맞춘 mock Reel 목록
const REELS = [
  {
    id: "reel-01", url: "https://www.youtube.com/watch?v=demo01",
    thumbnail: "https://picsum.photos/seed/trovely01/640/360",
    memo: "React 19 use 훅 정리 영상. 서버 컴포넌트랑 같이 보면 좋음", review: "설명이 깔끔해서 입문자에게 추천",
    visited: true, source: "youtube" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-06-20"), updatedAt: d("2026-06-20"),
    categories: [cat("cat-dev")], tags: [tag(TAG.react), tag(TAG.tip)],
  },
  {
    id: "reel-02", url: "https://www.instagram.com/p/demo02",
    thumbnail: "https://picsum.photos/seed/trovely02/640/360",
    memo: "10분 김치볶음밥 레시피", review: null,
    visited: false, source: "instagram" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-06-19"), updatedAt: d("2026-06-19"),
    categories: [cat("cat-cook")], tags: [tag(TAG.recipe), tag(TAG.tip)],
  },
  {
    id: "reel-03", url: "https://www.youtube.com/watch?v=demo03",
    thumbnail: "https://picsum.photos/seed/trovely03/640/360",
    memo: "제주 3박4일 코스. 우도 자전거 꼭", review: "동선 참고하기 좋았음",
    visited: true, source: "youtube" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-06-18"), updatedAt: d("2026-06-18"),
    categories: [cat("cat-travel")], tags: [tag(TAG.domestic)],
  },
  {
    id: "reel-04", url: "https://www.instagram.com/p/demo04",
    thumbnail: "https://picsum.photos/seed/trovely04/640/360",
    memo: "집에서 하는 전신 홈트 15분", review: null,
    visited: false, source: "instagram" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-06-17"), updatedAt: d("2026-06-17"),
    categories: [cat("cat-workout")], tags: [tag(TAG.home), tag(TAG.beginner)],
  },
  {
    id: "reel-05", url: "https://www.instagram.com/p/demo05",
    thumbnail: "https://picsum.photos/seed/trovely05/640/360",
    memo: "6평 원룸 수납 아이디어", review: "선반 위치 따라해봄",
    visited: true, source: "instagram" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-06-16"), updatedAt: d("2026-06-16"),
    categories: [cat("cat-interior")], tags: [tag(TAG.small), tag(TAG.tip)],
  },
  {
    id: "reel-06", url: "https://www.youtube.com/watch?v=demo06",
    thumbnail: "https://picsum.photos/seed/trovely06/640/360",
    memo: "TypeScript 제네릭 30분 완성", review: null,
    visited: false, source: "youtube" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-06-15"), updatedAt: d("2026-06-15"),
    categories: [cat("cat-dev")], tags: [tag(TAG.beginner)],
  },
  {
    id: "reel-07", url: "https://www.instagram.com/p/demo07",
    thumbnail: "https://picsum.photos/seed/trovely07/640/360",
    memo: "에어프라이어 닭다리 황금레시피", review: "온도 200도 12분 완벽",
    visited: true, source: "instagram" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-06-14"), updatedAt: d("2026-06-14"),
    categories: [cat("cat-cook")], tags: [tag(TAG.recipe)],
  },
  {
    id: "reel-08", url: "https://www.youtube.com/watch?v=demo08",
    thumbnail: "https://picsum.photos/seed/trovely08/640/360",
    memo: "오사카 먹방 투어 가이드", review: null,
    visited: false, source: "youtube" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-06-13"), updatedAt: d("2026-06-13"),
    categories: [cat("cat-travel")], tags: [tag(TAG.abroad)],
  },
  {
    id: "reel-09", url: "https://www.youtube.com/watch?v=demo09",
    thumbnail: "https://picsum.photos/seed/trovely09/640/360",
    memo: "초보 헬스 3분할 루틴", review: "주 3회로 시작",
    visited: true, source: "youtube" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-06-12"), updatedAt: d("2026-06-12"),
    categories: [cat("cat-workout")], tags: [tag(TAG.beginner), tag(TAG.tip)],
  },
  {
    id: "reel-10", url: "https://www.instagram.com/p/demo10",
    thumbnail: "https://picsum.photos/seed/trovely10/640/360",
    memo: "Next.js App Router 폴더 구조 정리", review: null,
    visited: false, source: "instagram" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-06-11"), updatedAt: d("2026-06-11"),
    categories: [cat("cat-dev")], tags: [tag(TAG.react), tag(TAG.tip)],
  },
  {
    id: "reel-11", url: "https://www.instagram.com/p/demo11",
    thumbnail: "https://picsum.photos/seed/trovely11/640/360",
    memo: "셀프 인테리어 페인팅 전후", review: "민트색 추천",
    visited: true, source: "instagram" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-06-10"), updatedAt: d("2026-06-10"),
    categories: [cat("cat-interior")], tags: [tag(TAG.home)],
  },
  {
    id: "reel-12", url: "https://www.youtube.com/watch?v=demo12",
    thumbnail: "https://picsum.photos/seed/trovely12/640/360",
    memo: "방콕 가성비 호텔 추천", review: null,
    visited: false, source: "youtube" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-06-09"), updatedAt: d("2026-06-09"),
    categories: [], tags: [tag(TAG.abroad)], // 미분류(카테고리 없음) 샘플
  },
];

type MockReel = (typeof REELS)[number];

export function getMockReels(params: {
  search?: string;
  categoryId?: string | "uncategorized";
  source?: "instagram" | "youtube";
  status?: string;
  sort?: string;
  cursor?: string;
  take?: number;
}) {
  const { search, categoryId, source, status, sort = "newest", take = 20 } = params;
  let items: MockReel[] = [...REELS];

  if (source) items = items.filter((r) => r.source === source);

  if (categoryId === "uncategorized") {
    items = items.filter((r) => r.categories.length === 0);
  } else if (categoryId) {
    items = items.filter((r) => r.categories.some((c) => c.category.id === categoryId));
  }

  if (status === "visited") items = items.filter((r) => r.visited);
  else if (status === "unvisited") items = items.filter((r) => !r.visited);
  else if (status === "reviewed") items = items.filter((r) => r.review != null);

  if (search) {
    const kws = search.toLowerCase().trim().split(/\s+/).filter(Boolean);
    items = items.filter((r) =>
      kws.every((kw) =>
        (r.memo?.toLowerCase().includes(kw) ?? false) ||
        (r.review?.toLowerCase().includes(kw) ?? false) ||
        r.tags.some((t) => t.tag.name.toLowerCase().includes(kw)) ||
        r.categories.some((c) => c.category.name.toLowerCase().includes(kw))
      )
    );
  }

  if (sort === "oldest") items = [...items].reverse();
  else if (sort === "unvisited") items = [...items].sort((a, b) => Number(a.visited) - Number(b.visited));
  // newest는 이미 최신순(REELS가 내림차순)

  return { items: items.slice(0, take), nextCursor: null };
}

export function getMockReel(id: string) {
  return REELS.find((r) => r.id === id) ?? null;
}

export function getMockCategories() {
  return CATEGORIES;
}

export function getMockTags() {
  const counts: Record<string, number> = {};
  for (const r of REELS) for (const t of r.tags) counts[t.tag.id] = (counts[t.tag.id] ?? 0) + 1;
  return Object.values(TAG)
    .map((t) => ({ id: t.id, name: t.name, reelCount: counts[t.id] ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

export function getMockUserStats() {
  return { totalReels: REELS.length, visitedReels: REELS.filter((r) => r.visited).length };
}

export function getMockUserEmail() {
  return "demo@trovely.app";
}
