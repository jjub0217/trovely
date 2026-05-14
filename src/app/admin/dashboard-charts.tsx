"use client";

import { useState } from "react";
import { SignupTrendChart, ReelTrendChart, WithdrawalTrendChart } from "./members/member-charts";
import { WithdrawalReasonChart } from "./members/withdrawals/withdrawal-chart";

const TABS = [
  { key: "signup", label: "가입 추세" },
  { key: "withdrawal", label: "탈퇴 추세" },
  { key: "reason", label: "탈퇴 사유" },
  { key: "reel", label: "콘텐츠 추세" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function DashboardCharts({
  signupTrend,
  withdrawalTrend,
  reelTrend,
  reasonStats,
}: {
  signupTrend: { date: string; count: number }[];
  withdrawalTrend: { date: string; count: number }[];
  reelTrend: { date: string; count: number }[];
  reasonStats: { reason: string; count: number }[];
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("signup");

  return (
    <div className="mb-8">
      <div className="flex gap-1 mb-4 border-b border-gray-800">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm transition-colors cursor-pointer ${
              activeTab === tab.key
                ? "text-purple-400 border-b-2 border-purple-400"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === "signup" && <SignupTrendChart data={signupTrend} />}
      {activeTab === "withdrawal" && <WithdrawalTrendChart data={withdrawalTrend} />}
      {activeTab === "reel" && <ReelTrendChart data={reelTrend} />}
      {activeTab === "reason" && <WithdrawalReasonChart data={reasonStats} />}
    </div>
  );
}
