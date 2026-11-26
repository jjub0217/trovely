"use server";

import { prisma } from "./db";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Pool } from "pg";
import { DEMO_MODE, DEMO_USER_ID } from "@/lib/demo";
import {
  getMockDashboardStats,
  getMockMemberStats,
  getMockSignupTrend,
  getMockReelTrend,
  getMockWithdrawalStats,
  getMockWithdrawalTrend,
  getMockAdminUsers,
  getMockUserDetail,
} from "./mocks/admin";

async function requireAdmin(): Promise<string> {
  if (DEMO_MODE) return DEMO_USER_ID;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const adminRole = await prisma.adminRole.findUnique({ where: { userId: user.id } });
  if (!adminRole) redirect("/");

  return user.id;
}

function getPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL!,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });
}

export async function getDashboardStats() {
  if (DEMO_MODE) return getMockDashboardStats();
  await requireAdmin();

  const pool = getPool();
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [usersResult, todayUsersResult, totalReels, todayReels] =
      await Promise.all([
        pool.query("SELECT count(*)::int FROM auth.users"),
        pool.query("SELECT count(*)::int FROM auth.users WHERE created_at >= $1", [
          today.toISOString(),
        ]),
        prisma.reel.count(),
        prisma.reel.count({ where: { createdAt: { gte: today } } }),
      ]);

    return {
      totalUsers: usersResult.rows[0].count,
      todayUsers: todayUsersResult.rows[0].count,
      totalReels,
      todayReels,
    };
  } finally {
    await pool.end();
  }
}

export async function getMemberStats() {
  if (DEMO_MODE) return getMockMemberStats();
  await requireAdmin();

  const pool = getPool();
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [totalResult, todayResult, weekResult, recentResult, withdrawalCount] = await Promise.all([
      pool.query("SELECT count(*)::int FROM auth.users"),
      pool.query("SELECT count(*)::int FROM auth.users WHERE created_at >= $1", [today.toISOString()]),
      pool.query("SELECT count(*)::int FROM auth.users WHERE created_at >= $1", [weekAgo.toISOString()]),
      pool.query("SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 10"),
      prisma.withdrawal.count(),
    ]);

    return {
      // 탈퇴하면 로그인 계정이 지워지므로 auth.users 수가 곧 활성 계정 수다
      totalUsers: totalResult.rows[0].count,
      todaySignups: todayResult.rows[0].count,
      weekSignups: weekResult.rows[0].count,
      totalWithdrawals: withdrawalCount,
      recentUsers: recentResult.rows.map((u: { id: string; email: string; created_at: string }) => ({
        id: u.id,
        email: u.email,
        createdAt: u.created_at,
      })),
    };
  } finally {
    await pool.end();
  }
}

export async function getSignupTrend() {
  if (DEMO_MODE) return getMockSignupTrend();
  await requireAdmin();

  const pool = getPool();
  try {
    const result = await pool.query(`
      SELECT
        DATE(created_at) as date,
        count(*)::int as count
      FROM auth.users
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // 빈 날짜 채우기
    const data: { date: string; count: number }[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const found = result.rows.find((r: { date: Date }) => r.date.toISOString().split("T")[0] === dateStr);
      data.push({ date: dateStr, count: found ? found.count : 0 });
    }

    return data;
  } finally {
    await pool.end();
  }
}

export async function getReelTrend() {
  if (DEMO_MODE) return getMockReelTrend();
  await requireAdmin();

  const result = await prisma.$queryRaw<{ date: Date; count: bigint }[]>`
    SELECT DATE("createdAt") as date, count(*)::int as count
    FROM "Reel"
    WHERE "createdAt" >= NOW() - INTERVAL '30 days'
    GROUP BY DATE("createdAt")
    ORDER BY date ASC
  `;

  const data: { date: string; count: number }[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const found = result.find((r) => r.date.toISOString().split("T")[0] === dateStr);
    data.push({ date: dateStr, count: found ? Number(found.count) : 0 });
  }

  return data;
}

export async function getWithdrawalStats({
  page = 1,
  pageSize = 10,
}: {
  page?: number;
  pageSize?: number;
} = {}) {
  if (DEMO_MODE) return getMockWithdrawalStats({ page, pageSize });
  await requireAdmin();

  const [totalCount, withdrawals, trend] = await Promise.all([
    prisma.withdrawal.count(),
    prisma.withdrawal.findMany({
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    prisma.withdrawal.groupBy({
      by: ["reason"],
      _count: true,
    }),
  ]);

  const reasonMap: Record<string, string> = {
    SERVICE_DISSATISFACTION: "서비스 불만족",
    PRIVACY_CONCERN: "개인정보 우려",
    LOW_USAGE: "사용 빈도 낮음",
    COMPETITOR: "다른 서비스 이용",
    OTHER: "기타",
  };

  const reasonStats = trend.map((t) => ({
    reason: reasonMap[t.reason] || t.reason,
    count: t._count,
  }));

  return {
    total: totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
    withdrawals: withdrawals.map((w) => ({
      id: w.id,
      reason: reasonMap[w.reason] || w.reason,
      createdAt: w.createdAt.toISOString(),
    })),
    reasonStats,
  };
}

export async function getWithdrawalTrend() {
  if (DEMO_MODE) return getMockWithdrawalTrend();
  await requireAdmin();

  const result = await prisma.$queryRaw<{ date: Date; count: bigint }[]>`
    SELECT DATE("createdAt") as date, count(*)::int as count
    FROM "Withdrawal"
    WHERE "createdAt" >= NOW() - INTERVAL '30 days'
    GROUP BY DATE("createdAt")
    ORDER BY date ASC
  `;

  const data: { date: string; count: number }[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const found = result.find((r) => r.date.toISOString().split("T")[0] === dateStr);
    data.push({ date: dateStr, count: found ? Number(found.count) : 0 });
  }

  return data;
}

export async function toggleAdminRole(userId: string, email: string) {
  if (DEMO_MODE) return { isAdmin: false };
  await requireAdmin();

  const existing = await prisma.adminRole.findUnique({ where: { userId } });
  if (existing) {
    await prisma.adminRole.delete({ where: { userId } });
    return { isAdmin: false };
  } else {
    await prisma.adminRole.create({ data: { userId, email } });
    return { isAdmin: true };
  }
}

export async function getAdminUsers({
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
  if (DEMO_MODE) return getMockAdminUsers({ search, status, page, pageSize });
  await requireAdmin();

  const pool = getPool();
  try {
    // 탈퇴하면 로그인 계정이 지워지므로 auth.users에는 활성 회원만 있다.
    // 탈퇴 기록에는 누가 탈퇴했는지 알 수 있는 정보가 없어서 회원 목록에 넣지 않는다(탈퇴 통계는 탈퇴 화면에서 본다).
    const activeResult = await pool.query("SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC");
    let allUsers = activeResult.rows.map((u: { id: string; email: string; created_at: string }) => ({
      id: u.id,
      email: u.email,
      createdAt: u.created_at,
      status: "active" as const,
    }));
    if (status === "withdrawn") allUsers = [];

    // 검색 필터
    if (search) {
      allUsers = allUsers.filter((u) => u.email.toLowerCase().includes(search.toLowerCase()));
    }

    // 정렬 (최신순)
    allUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = allUsers.length;
    const totalPages = Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;
    const pagedUsers = allUsers.slice(offset, offset + pageSize);

    const activeIds = pagedUsers.filter((u) => u.status === "active").map((u) => u.id);

    const [reelCounts, categoryCounts, tagCounts, adminRoles] = activeIds.length > 0
      ? await Promise.all([
          prisma.reel.groupBy({ by: ["userId"], where: { userId: { in: activeIds } }, _count: true }),
          prisma.category.groupBy({ by: ["userId"], where: { userId: { in: activeIds } }, _count: true }),
          prisma.tag.groupBy({ by: ["userId"], where: { userId: { in: activeIds } }, _count: true }),
          prisma.adminRole.findMany({ where: { userId: { in: activeIds } }, select: { userId: true } }),
        ])
      : [[], [], [], []];

    const reelMap = Object.fromEntries(reelCounts.map((r) => [r.userId, r._count]));
    const categoryMap = Object.fromEntries(categoryCounts.map((c) => [c.userId, c._count]));
    const tagMap = Object.fromEntries(tagCounts.map((t) => [t.userId, t._count]));
    const adminSet = new Set(adminRoles.map((a: { userId: string }) => a.userId));

    const users = pagedUsers.map((u) => ({
      id: u.id,
      email: u.email,
      createdAt: u.createdAt,
      status: u.status,
      reelCount: u.status === "active" ? (reelMap[u.id] || 0) : 0,
      categoryCount: u.status === "active" ? (categoryMap[u.id] || 0) : 0,
      tagCount: u.status === "active" ? (tagMap[u.id] || 0) : 0,
      isAdmin: u.status === "active" ? adminSet.has(u.id) : false,
    }));

    return { users, total, page, pageSize, totalPages };
  } finally {
    await pool.end();
  }
}

export async function getUserDetail(userId: string) {
  if (DEMO_MODE) return getMockUserDetail(userId);
  await requireAdmin();

  const pool = getPool();
  try {
    const userResult = await pool.query(
      "SELECT id, email, created_at FROM auth.users WHERE id = $1",
      [userId]
    );
    if (userResult.rows.length === 0) return null;

    const user = userResult.rows[0] as {
      id: string;
      email: string;
      created_at: string;
    };

    const [reels, categories, tags, adminRole] = await Promise.all([
      prisma.reel.findMany({
        where: { userId },
        include: {
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.category.findMany({
        where: { userId },
        orderBy: { name: "asc" },
      }),
      prisma.tag.findMany({
        where: { userId },
        orderBy: { name: "asc" },
      }),
      prisma.adminRole.findUnique({ where: { userId } }),
    ]);

    return {
      id: user.id,
      email: user.email,
      createdAt: user.created_at,
      isAdmin: !!adminRole,
      reels,
      categories,
      tags,
    };
  } finally {
    await pool.end();
  }
}
