// 어드민 데모용 mock 데이터.
// DEMO_MODE에서 admin-actions.ts의 읽기 함수들이 이 데이터를 반환한다.
import { DEMO_USER_ID } from "@/lib/demo";
import { getMockReels, getMockCategories } from "./portal";

const REASON_MAP: Record<string, string> = {
  SERVICE_DISSATISFACTION: "서비스 불만족",
  PRIVACY_CONCERN: "개인정보 우려",
  LOW_USAGE: "사용 빈도 낮음",
  COMPETITOR: "다른 서비스 이용",
  OTHER: "기타",
};

type AdminUser = {
  id: string;
  email: string;
  createdAt: string;
  status: "active" | "withdrawn";
  reelCount: number;
  categoryCount: number;
  tagCount: number;
  isAdmin: boolean;
};

// 어드민 회원 목록(활성 + 탈퇴 섞임)
const USERS: AdminUser[] = [
  { id: "u-01", email: "admin@trovely.app", createdAt: "2026-03-02T09:00:00Z", status: "active", reelCount: 12, categoryCount: 5, tagCount: 8, isAdmin: true },
  { id: "u-02", email: "minji.kim@example.com", createdAt: "2026-03-10T11:20:00Z", status: "active", reelCount: 34, categoryCount: 6, tagCount: 12, isAdmin: false },
  { id: "u-03", email: "junho.lee@example.com", createdAt: "2026-03-18T14:05:00Z", status: "active", reelCount: 8, categoryCount: 3, tagCount: 5, isAdmin: false },
  { id: "u-04", email: "seoyeon@example.com", createdAt: "2026-04-01T08:40:00Z", status: "active", reelCount: 51, categoryCount: 9, tagCount: 20, isAdmin: false },
  { id: "u-05", email: "doyun.park@example.com", createdAt: "2026-04-12T16:55:00Z", status: "active", reelCount: 3, categoryCount: 2, tagCount: 2, isAdmin: false },
  { id: "u-06", email: "haeun@example.com", createdAt: "2026-04-25T10:10:00Z", status: "active", reelCount: 27, categoryCount: 5, tagCount: 11, isAdmin: false },
  { id: "u-07", email: "yujin.cho@example.com", createdAt: "2026-05-03T13:30:00Z", status: "active", reelCount: 15, categoryCount: 4, tagCount: 7, isAdmin: false },
  { id: "u-08", email: "minseok@example.com", createdAt: "2026-05-14T19:00:00Z", status: "active", reelCount: 42, categoryCount: 7, tagCount: 16, isAdmin: false },
  { id: "u-09", email: "subin.han@example.com", createdAt: "2026-05-22T07:25:00Z", status: "active", reelCount: 6, categoryCount: 2, tagCount: 4, isAdmin: false },
  { id: "u-10", email: "jiwoo@example.com", createdAt: "2026-06-05T12:45:00Z", status: "active", reelCount: 19, categoryCount: 4, tagCount: 9, isAdmin: false },
  // 탈퇴 회원(목록엔 withdrawn으로 표시)
  { id: "u-11", email: "former.user1@example.com", createdAt: "2026-03-28T09:00:00Z", status: "withdrawn", reelCount: 0, categoryCount: 0, tagCount: 0, isAdmin: false },
  { id: "u-12", email: "former.user2@example.com", createdAt: "2026-04-18T09:00:00Z", status: "withdrawn", reelCount: 0, categoryCount: 0, tagCount: 0, isAdmin: false },
];

type WithdrawalRow = { id: string; email: string; reason: string; detail: string | null; createdAt: string };

// 탈퇴 로그(원본: reason은 영문 코드)
const WITHDRAWALS: WithdrawalRow[] = [
  { id: "w-01", email: "former.user1@example.com", reason: "SERVICE_DISSATISFACTION", detail: "원하는 카테고리 정리 기능이 부족했어요.", createdAt: "2026-06-10T10:00:00Z" },
  { id: "w-02", email: "former.user2@example.com", reason: "LOW_USAGE", detail: null, createdAt: "2026-06-02T15:30:00Z" },
  { id: "w-03", email: "leaver3@example.com", reason: "PRIVACY_CONCERN", detail: "개인정보 처리 방침이 궁금했습니다.", createdAt: "2026-05-20T08:15:00Z" },
  { id: "w-04", email: "leaver4@example.com", reason: "OTHER", detail: "잠시 쉬어가려고요.", createdAt: "2026-05-08T21:40:00Z" },
];

// 오늘 기준 최근 30일 트렌드 배열 생성(결정적: 날짜+seed로 count 산출)
function makeTrend(seed: number): { date: string; count: number }[] {
  const data: { date: string; count: number }[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const base = 2 + Math.round(2.5 * (Math.sin((i + seed) / 3.3) + 1));
    data.push({ date: dateStr, count: Math.max(0, base) });
  }
  return data;
}

export function getMockDashboardStats() {
  return { totalUsers: 10, todayUsers: 1, totalReels: 412, todayReels: 7 };
}

export function getMockMemberStats() {
  const recentUsers = USERS.filter((u) => u.status === "active")
    .slice(0, 10)
    .map((u) => ({ id: u.id, email: u.email, createdAt: u.createdAt }));
  return {
    totalUsers: 10,
    todaySignups: 1,
    weekSignups: 4,
    totalWithdrawals: WITHDRAWALS.length,
    recentUsers,
  };
}

export function getMockSignupTrend() {
  return makeTrend(0);
}

export function getMockReelTrend() {
  return makeTrend(7);
}

export function getMockWithdrawalTrend() {
  return makeTrend(15).map((p) => ({ ...p, count: Math.round(p.count / 3) }));
}

export function getMockWithdrawalStats({ page = 1, pageSize = 10 }: { page?: number; pageSize?: number } = {}) {
  const total = WITHDRAWALS.length;
  const offset = (page - 1) * pageSize;
  const paged = WITHDRAWALS.slice(offset, offset + pageSize);

  const reasonCount: Record<string, number> = {};
  for (const w of WITHDRAWALS) reasonCount[w.reason] = (reasonCount[w.reason] ?? 0) + 1;
  const reasonStats = Object.entries(reasonCount).map(([reason, count]) => ({
    reason: REASON_MAP[reason] ?? reason,
    count,
  }));

  return {
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    withdrawals: paged.map((w) => ({
      id: w.id,
      email: w.email,
      reason: REASON_MAP[w.reason] ?? w.reason,
      detail: w.detail,
      createdAt: w.createdAt,
    })),
    reasonStats,
  };
}

export function getMockAdminUsers({
  search,
  status,
  page = 1,
  pageSize = 10,
}: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  let all = [...USERS];
  if (status === "active") all = all.filter((u) => u.status === "active");
  else if (status === "withdrawn") all = all.filter((u) => u.status === "withdrawn");
  if (search) all = all.filter((u) => u.email.toLowerCase().includes(search.toLowerCase()));

  all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = all.length;
  const offset = (page - 1) * pageSize;
  return {
    users: all.slice(offset, offset + pageSize),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export function getMockWithdrawalDetail(withdrawalId: string) {
  const w = WITHDRAWALS.find((x) => x.id === withdrawalId) ?? WITHDRAWALS[0];
  if (!w) return null;
  return {
    id: w.id,
    email: w.email,
    reason: REASON_MAP[w.reason] ?? w.reason,
    detail: w.detail,
    createdAt: w.createdAt,
  };
}

export function getMockUserDetail(userId: string) {
  const u = USERS.find((x) => x.id === userId) ?? USERS[0];
  if (!u) return null;
  // 회원 상세: 포털 mock의 reel/카테고리를 일부 재사용
  const reels = getMockReels({ take: 6 }).items;
  const categories = getMockCategories();
  const tags = categories.map((c, i) => ({ id: `t-${i}`, name: c.name, userId: DEMO_USER_ID }));
  return {
    id: u.id,
    email: u.email,
    createdAt: u.createdAt,
    isAdmin: u.isAdmin,
    reels,
    categories,
    tags,
  };
}
