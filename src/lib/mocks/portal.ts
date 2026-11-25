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
  { id: "cat-date", name: "데이트", userId: DEMO_USER_ID },
  { id: "cat-food", name: "맛집", userId: DEMO_USER_ID },
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
  // 아래는 RAG 데모용(2026-11-25). 지역, 장소 종류 태그
  paju: { id: "tag-paju", name: "파주", userId: DEMO_USER_ID },
  incheon: { id: "tag-incheon", name: "인천", userId: DEMO_USER_ID },
  ilsan: { id: "tag-ilsan", name: "일산", userId: DEMO_USER_ID },
  busan: { id: "tag-busan", name: "부산", userId: DEMO_USER_ID },
  daegu: { id: "tag-daegu", name: "대구", userId: DEMO_USER_ID },
  seoul: { id: "tag-seoul", name: "서울", userId: DEMO_USER_ID },
  sauna: { id: "tag-sauna", name: "사우나", userId: DEMO_USER_ID },
  meat: { id: "tag-meat", name: "고기", userId: DEMO_USER_ID },
  cafe: { id: "tag-cafe", name: "카페", userId: DEMO_USER_ID },
  stay: { id: "tag-stay", name: "숙소", userId: DEMO_USER_ID },
  walk: { id: "tag-walk", name: "산책", userId: DEMO_USER_ID },
  shop: { id: "tag-shop", name: "소품샵", userId: DEMO_USER_ID },
  wine: { id: "tag-wine", name: "와인", userId: DEMO_USER_ID },
  pasta: { id: "tag-pasta", name: "파스타", userId: DEMO_USER_ID },
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
// reel-14 ~ reel-31은 RAG 데모용(2026-11-25). 캡션은 새로 지어 쓴 글이다(실제 게시물, 가게 이름 아님).
const REELS = [
  {
    id: "reel-31", url: "https://www.instagram.com/p/demo31",
    thumbnail: "https://picsum.photos/seed/trovely31/640/360",
    caption: "파주 근교 사우나 다녀왔어요. 뜨끈한 노천탕이랑 찜질 끝나고 쉬는 야외 테라스가 있어서 둘이 쉬기 좋았어요. 주말 오후는 사람이 많으니 평일 추천!",
    memo: "노천탕 있는 곳. 주말 저녁에 가 보기", review: null,
    visited: false, source: "instagram" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-11-24"), updatedAt: d("2026-11-24"),
    categories: [cat("cat-date")], tags: [tag(TAG.paju), tag(TAG.sauna)],
  },
  {
    id: "reel-30", url: "https://www.instagram.com/p/demo30",
    thumbnail: "https://picsum.photos/seed/trovely30/640/360",
    caption: "바닷물을 데워서 찜질하는 곳이 있다고 해서 영종도까지 다녀왔어요. 바다 보면서 몸 지지고 나오면 피곤이 싹 풀려요.",
    memo: "해수 찜질", review: "생각보다 물이 짜고 좋았음",
    visited: true, source: "instagram" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-11-23"), updatedAt: d("2026-11-23"),
    categories: [cat("cat-date")], tags: [tag(TAG.incheon), tag(TAG.sauna)],
  },
  {
    id: "reel-29", url: "https://www.instagram.com/p/demo29",
    thumbnail: "https://picsum.photos/seed/trovely29/640/360",
    caption: "정발산역 근처 편백나무 찜질 코스. 황토방에서 땀 빼고 족욕까지 한 번에 할 수 있어요.",
    memo: "일산 찜질방", review: null,
    visited: false, source: "instagram" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-11-22"), updatedAt: d("2026-11-22"),
    categories: [cat("cat-date")], tags: [tag(TAG.ilsan), tag(TAG.sauna)],
  },
  {
    id: "reel-28", url: "https://www.youtube.com/watch?v=demo28",
    thumbnail: "https://picsum.photos/seed/trovely28/640/360",
    caption: "숲속 독채 숙소인데 방마다 개인 히노끼탕이 있어요. 눈 오는 날 창밖 보면서 탕에 들어가 있으면 시간 가는 줄 몰라요.",
    memo: "커플 여행 숙소 후보", review: null,
    visited: false, source: "youtube" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-11-21"), updatedAt: d("2026-11-21"),
    categories: [cat("cat-date"), cat("cat-travel")], tags: [tag(TAG.stay), tag(TAG.sauna)],
  },
  {
    id: "reel-27", url: "https://www.instagram.com/p/demo27",
    thumbnail: "https://picsum.photos/seed/trovely27/640/360",
    caption: "도심 한가운데 있는 한증막. 퇴근하고 들러서 뜨겁게 땀 빼기 좋아요. 수건이랑 식혜가 기본으로 나와요.",
    memo: "서울 한증막", review: "생각보다 깔끔했음",
    visited: true, source: "instagram" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-11-20"), updatedAt: d("2026-11-20"),
    categories: [cat("cat-date")], tags: [tag(TAG.seoul), tag(TAG.sauna)],
  },
  {
    id: "reel-26", url: "https://www.instagram.com/p/demo26",
    thumbnail: "https://picsum.photos/seed/trovely26/640/360",
    caption: "광안리 바다 앞 고기집. 숯불에 직접 구워 주는 한우 갈빗살이 정말 맛있어요. 창가 자리는 예약 필수!",
    memo: "부산 가면 여기", review: null,
    visited: false, source: "instagram" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-11-19"), updatedAt: d("2026-11-19"),
    categories: [cat("cat-food")], tags: [tag(TAG.busan), tag(TAG.meat)],
  },
  {
    id: "reel-25", url: "https://www.instagram.com/p/demo25",
    thumbnail: "https://picsum.photos/seed/trovely25/640/360",
    caption: "대구 야키니쿠 고깃집. 웨이팅이 길지만 와규 모둠이 그만한 값을 해요.",
    memo: "대구 고깃집", review: "줄 1시간 섰지만 만족",
    visited: true, source: "instagram" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-11-18"), updatedAt: d("2026-11-18"),
    categories: [cat("cat-food")], tags: [tag(TAG.daegu), tag(TAG.meat)],
  },
  {
    id: "reel-24", url: "https://www.youtube.com/watch?v=demo24",
    thumbnail: "https://picsum.photos/seed/trovely24/640/360",
    caption: "마포 연탄불 삼겹살 노포. 두툼하게 썬 삼겹살을 연탄에 구워 먹는 집이에요.",
    memo: "마포 삼겹살", review: null,
    visited: false, source: "youtube" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-11-17"), updatedAt: d("2026-11-17"),
    categories: [cat("cat-food")], tags: [tag(TAG.seoul), tag(TAG.meat)],
  },
  {
    id: "reel-23", url: "https://www.instagram.com/p/demo23",
    thumbnail: "https://picsum.photos/seed/trovely23/640/360",
    caption: "성수동 드라이에이징 스테이크 하우스. 기념일 저녁으로 딱이에요.",
    memo: "기념일 후보", review: null,
    visited: false, source: "instagram" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-11-16"), updatedAt: d("2026-11-16"),
    categories: [cat("cat-food"), cat("cat-date")], tags: [tag(TAG.seoul), tag(TAG.meat)],
  },
  {
    id: "reel-22", url: "https://www.instagram.com/p/demo22",
    thumbnail: "https://picsum.photos/seed/trovely22/640/360",
    caption: "파주에 생긴 대형 카페. 통창 너머로 갈대밭이 보이고, 빵 종류가 많아요.",
    memo: "파주 카페", review: null,
    visited: false, source: "instagram" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-11-15"), updatedAt: d("2026-11-15"),
    categories: [cat("cat-date")], tags: [tag(TAG.paju), tag(TAG.cafe)],
  },
  {
    id: "reel-21", url: "https://www.instagram.com/p/demo21",
    thumbnail: "https://picsum.photos/seed/trovely21/640/360",
    caption: "파주 출판단지 산책 코스. 책방 구경하고 강변 따라 걷기 좋아요.",
    memo: "파주 산책", review: "가을에 가니 좋았음",
    visited: true, source: "instagram" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-11-14"), updatedAt: d("2026-11-14"),
    categories: [cat("cat-date")], tags: [tag(TAG.paju), tag(TAG.walk)],
  },
  {
    id: "reel-20", url: "https://www.instagram.com/p/demo20",
    thumbnail: "https://picsum.photos/seed/trovely20/640/360",
    caption: "헤이리마을 리빙 소품샵. 컵, 접시, 조명까지 구경할 게 많고 주차가 편해요.",
    memo: "헤이리 소품샵", review: null,
    visited: false, source: "instagram" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-11-13"), updatedAt: d("2026-11-13"),
    categories: [cat("cat-date")], tags: [tag(TAG.paju), tag(TAG.shop)],
  },
  {
    id: "reel-19", url: "https://www.instagram.com/p/demo19",
    thumbnail: "https://picsum.photos/seed/trovely19/640/360",
    caption: "파주 창고를 개조한 레스토랑. 겉은 허름한데 안은 넓고 분위기가 좋아요.",
    memo: "파주 레스토랑", review: null,
    visited: false, source: "instagram" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-11-12"), updatedAt: d("2026-11-12"),
    categories: [cat("cat-date"), cat("cat-food")], tags: [tag(TAG.paju)],
  },
  {
    id: "reel-18", url: "https://www.youtube.com/watch?v=demo18",
    thumbnail: "https://picsum.photos/seed/trovely18/640/360",
    caption: "강릉 바다 앞 카페 모음. 창가에 앉으면 바다만 보여요.",
    memo: "강릉 카페", review: null,
    visited: false, source: "youtube" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-11-11"), updatedAt: d("2026-11-11"),
    categories: [cat("cat-travel"), cat("cat-date")], tags: [tag(TAG.cafe)],
  },
  {
    id: "reel-17", url: "https://www.instagram.com/p/demo17",
    thumbnail: "https://picsum.photos/seed/trovely17/640/360",
    caption: "을지로 골목 안 와인바. 조용하고 안주가 맛있어요.",
    memo: "을지로 와인바", review: "내추럴 와인 추천받음",
    visited: true, source: "instagram" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-11-10"), updatedAt: d("2026-11-10"),
    categories: [cat("cat-date")], tags: [tag(TAG.seoul), tag(TAG.wine)],
  },
  {
    id: "reel-16", url: "https://www.instagram.com/p/demo16",
    thumbnail: "https://picsum.photos/seed/trovely16/640/360",
    caption: "홍대 생면 파스타 맛집. 트러플 크림 파스타가 대표 메뉴예요.",
    memo: "홍대 파스타", review: null,
    visited: false, source: "instagram" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-11-09"), updatedAt: d("2026-11-09"),
    categories: [cat("cat-food")], tags: [tag(TAG.seoul), tag(TAG.pasta)],
  },
  {
    id: "reel-15", url: "https://www.youtube.com/watch?v=demo15",
    thumbnail: "https://picsum.photos/seed/trovely15/640/360",
    caption: "집들이 손님상 차리기. 한 시간 안에 만드는 메뉴 다섯 가지.",
    memo: "집들이 메뉴", review: null,
    visited: false, source: "youtube" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-11-08"), updatedAt: d("2026-11-08"),
    categories: [cat("cat-cook")], tags: [tag(TAG.recipe)],
  },
  {
    id: "reel-14", url: "https://www.instagram.com/p/demo14",
    thumbnail: "https://picsum.photos/seed/trovely14/640/360",
    caption: "인천 바다 보이는 오션뷰 카페. 해 질 녘에 가면 노을이 예뻐요.",
    memo: "인천 카페", review: null,
    visited: false, source: "instagram" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-11-07"), updatedAt: d("2026-11-07"),
    categories: [cat("cat-date")], tags: [tag(TAG.incheon), tag(TAG.cafe)],
  },
  {
    id: "reel-01", url: "https://www.youtube.com/watch?v=demo01",
    thumbnail: "https://picsum.photos/seed/trovely01/640/360",
    caption: null as string | null,
    memo: "React 19 use 훅 정리 영상. 서버 컴포넌트랑 같이 보면 좋음", review: "설명이 깔끔해서 입문자에게 추천",
    visited: true, source: "youtube" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-06-20"), updatedAt: d("2026-06-20"),
    categories: [cat("cat-dev")], tags: [tag(TAG.react), tag(TAG.tip)],
  },
  {
    id: "reel-02", url: "https://www.instagram.com/p/demo02",
    thumbnail: "https://picsum.photos/seed/trovely02/640/360",
    caption: null as string | null,
    memo: "10분 김치볶음밥 레시피", review: null,
    visited: false, source: "instagram" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-06-19"), updatedAt: d("2026-06-19"),
    categories: [cat("cat-cook")], tags: [tag(TAG.recipe), tag(TAG.tip)],
  },
  {
    id: "reel-03", url: "https://www.youtube.com/watch?v=demo03",
    thumbnail: "https://picsum.photos/seed/trovely03/640/360",
    caption: null as string | null,
    memo: "제주 3박4일 코스. 우도 자전거 꼭", review: "동선 참고하기 좋았음",
    visited: true, source: "youtube" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-06-18"), updatedAt: d("2026-06-18"),
    categories: [cat("cat-travel")], tags: [tag(TAG.domestic)],
  },
  {
    id: "reel-04", url: "https://www.instagram.com/p/demo04",
    thumbnail: "https://picsum.photos/seed/trovely04/640/360",
    caption: null as string | null,
    memo: "집에서 하는 전신 홈트 15분", review: null,
    visited: false, source: "instagram" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-06-17"), updatedAt: d("2026-06-17"),
    categories: [cat("cat-workout")], tags: [tag(TAG.home), tag(TAG.beginner)],
  },
  {
    id: "reel-05", url: "https://www.instagram.com/p/demo05",
    thumbnail: "https://picsum.photos/seed/trovely05/640/360",
    caption: null as string | null,
    memo: "6평 원룸 수납 아이디어", review: "선반 위치 따라해봄",
    visited: true, source: "instagram" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-06-16"), updatedAt: d("2026-06-16"),
    categories: [cat("cat-interior")], tags: [tag(TAG.small), tag(TAG.tip)],
  },
  {
    id: "reel-06", url: "https://www.youtube.com/watch?v=demo06",
    thumbnail: "https://picsum.photos/seed/trovely06/640/360",
    caption: null as string | null,
    memo: "TypeScript 제네릭 30분 완성", review: null,
    visited: false, source: "youtube" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-06-15"), updatedAt: d("2026-06-15"),
    categories: [cat("cat-dev")], tags: [tag(TAG.beginner)],
  },
  {
    id: "reel-07", url: "https://www.instagram.com/p/demo07",
    thumbnail: "https://picsum.photos/seed/trovely07/640/360",
    caption: null as string | null,
    memo: "에어프라이어 닭다리 황금레시피", review: "온도 200도 12분 완벽",
    visited: true, source: "instagram" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-06-14"), updatedAt: d("2026-06-14"),
    categories: [cat("cat-cook")], tags: [tag(TAG.recipe)],
  },
  {
    id: "reel-08", url: "https://www.youtube.com/watch?v=demo08",
    thumbnail: "https://picsum.photos/seed/trovely08/640/360",
    caption: null as string | null,
    memo: "오사카 먹방 투어 가이드", review: null,
    visited: false, source: "youtube" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-06-13"), updatedAt: d("2026-06-13"),
    categories: [cat("cat-travel")], tags: [tag(TAG.abroad)],
  },
  {
    id: "reel-09", url: "https://www.youtube.com/watch?v=demo09",
    thumbnail: "https://picsum.photos/seed/trovely09/640/360",
    caption: null as string | null,
    memo: "초보 헬스 3분할 루틴", review: "주 3회로 시작",
    visited: true, source: "youtube" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-06-12"), updatedAt: d("2026-06-12"),
    categories: [cat("cat-workout")], tags: [tag(TAG.beginner), tag(TAG.tip)],
  },
  {
    id: "reel-10", url: "https://www.instagram.com/p/demo10",
    thumbnail: "https://picsum.photos/seed/trovely10/640/360",
    caption: null as string | null,
    memo: "Next.js App Router 폴더 구조 정리", review: null,
    visited: false, source: "instagram" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-06-11"), updatedAt: d("2026-06-11"),
    categories: [cat("cat-dev")], tags: [tag(TAG.react), tag(TAG.tip)],
  },
  {
    id: "reel-11", url: "https://www.instagram.com/p/demo11",
    thumbnail: "https://picsum.photos/seed/trovely11/640/360",
    caption: null as string | null,
    memo: "셀프 인테리어 페인팅 전후", review: "민트색 추천",
    visited: true, source: "instagram" as const, userId: DEMO_USER_ID,
    createdAt: d("2026-06-10"), updatedAt: d("2026-06-10"),
    categories: [cat("cat-interior")], tags: [tag(TAG.home)],
  },
  {
    id: "reel-12", url: "https://www.youtube.com/watch?v=demo12",
    thumbnail: "https://picsum.photos/seed/trovely12/640/360",
    caption: null as string | null,
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
        (r.caption?.toLowerCase().includes(kw) ?? false) ||
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

/** 데모 예시 게시물 전체(벡터 파일 만들기, 데모 검색에 쓴다) */
export function getAllMockReels() {
  return REELS;
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
