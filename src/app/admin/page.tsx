import { getDashboardStats, getMemberStats, getSignupTrend, getReelTrend, getWithdrawalTrend, getWithdrawalStats } from "@/lib/admin-actions";
import { Users, UserPlus, UserX, TrendingUp, Film, FilePlus } from "lucide-react";
import { DashboardCharts } from "./dashboard-charts";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [dashboardStats, memberStats, signupTrend, reelTrend, withdrawalTrend, withdrawalStats] = await Promise.all([
    getDashboardStats(),
    getMemberStats(),
    getSignupTrend(),
    getReelTrend(),
    getWithdrawalTrend(),
    getWithdrawalStats(),
  ]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">대시보드</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard icon={Users} label="전체 회원" value={memberStats.totalUsers} />
        <StatCard icon={UserPlus} label="오늘 가입" value={memberStats.todaySignups} />
        <StatCard icon={TrendingUp} label="이번 주 가입" value={memberStats.weekSignups} />
        <StatCard icon={UserX} label="탈퇴 회원" value={memberStats.totalWithdrawals} />
        <StatCard icon={Film} label="전체 콘텐츠" value={dashboardStats.totalReels} />
        <StatCard icon={FilePlus} label="오늘 콘텐츠" value={dashboardStats.todayReels} />
      </div>

      <DashboardCharts
        signupTrend={signupTrend}
        withdrawalTrend={withdrawalTrend}
        reelTrend={reelTrend}
        reasonStats={withdrawalStats.reasonStats}
      />

      <h3 className="text-lg font-semibold mb-4">최근 가입 회원 (최근 10명)</h3>
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left px-4 py-3 text-gray-400 font-medium">이메일</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium w-32">가입일</th>
            </tr>
          </thead>
          <tbody>
            {memberStats.recentUsers.map((user: { id: string; email: string; createdAt: string }) => (
              <tr key={user.id} className="border-b border-gray-700/50">
                <td className="px-4 py-3 text-gray-100">{user.email}</td>
                <td className="px-4 py-3 text-gray-400">
                  {new Date(user.createdAt).toLocaleDateString("ko-KR")}
                </td>
              </tr>
            ))}
            {memberStats.recentUsers.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-gray-500">
                  가입한 회원이 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 flex items-center justify-between">
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-gray-400 mt-1">{label}</p>
      </div>
      <Icon size={24} className="text-gray-500" />
    </div>
  );
}
