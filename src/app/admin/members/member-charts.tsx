"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function SignupTrendChart({ data }: { data: { date: string; count: number }[] }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
      <h4 className="text-sm font-semibold text-gray-300 mb-4">회원 가입 추세 (최근 30일)</h4>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              tickFormatter={(v) => v.slice(5)}
            />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#9ca3af" }}
              labelFormatter={(v) => v}
            />
            <Area
              type="monotone"
              dataKey="count"
              name="가입자"
              stroke="#a78bfa"
              fill="#a78bfa"
              fillOpacity={0.2}
              animationDuration={500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function WithdrawalTrendChart({ data }: { data: { date: string; count: number }[] }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
      <h4 className="text-sm font-semibold text-gray-300 mb-4">회원 탈퇴 추세 (최근 30일)</h4>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              tickFormatter={(v) => v.slice(5)}
            />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#9ca3af" }}
              labelFormatter={(v) => v}
            />
            <Area
              type="monotone"
              dataKey="count"
              name="탈퇴"
              stroke="#f87171"
              fill="#f87171"
              fillOpacity={0.2}
              animationDuration={500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ReelTrendChart({ data }: { data: { date: string; count: number }[] }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
      <h4 className="text-sm font-semibold text-gray-300 mb-4">콘텐츠 저장 추세 (최근 30일)</h4>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              tickFormatter={(v) => v.slice(5)}
            />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#9ca3af" }}
              labelFormatter={(v) => v}
            />
            <Area
              type="monotone"
              dataKey="count"
              name="콘텐츠"
              stroke="#4ade80"
              fill="#4ade80"
              fillOpacity={0.2}
              animationDuration={500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
