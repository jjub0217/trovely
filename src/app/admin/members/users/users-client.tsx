"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, X, Info } from "lucide-react";
import { UserDetailModal } from "./user-detail-modal";
import { WithdrawalDetailModal } from "./withdrawal-detail-modal";

interface UserRow {
  id: string;
  email: string;
  createdAt: string;
  status: "active" | "withdrawn";
  reelCount: number;
  categoryCount: number;
  tagCount: number;
  isAdmin: boolean;
}

interface UsersData {
  users: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function ColumnHeader({ label, tooltip, align }: { label: string; tooltip: string; align?: "right" }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  function handleEnter() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      let left = rect.left + rect.width / 2;
      if (left > window.innerWidth - 120) {
        left = window.innerWidth - 120;
      }
      setPos({ top: rect.top - 8, left });
    }
    setShow(true);
  }

  return (
    <div className={`inline-flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}>
      {label}
      <button
        ref={btnRef}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShow(false)}
        onClick={() => { handleEnter(); setShow(!show); }}
        className="text-gray-500 hover:text-gray-300"
      >
        <Info size={12} />
      </button>
      {show && (
        <div
          className="fixed z-50 px-3 py-2 bg-gray-700 text-gray-200 text-xs rounded-lg max-w-52 text-left"
          style={{ top: pos.top, left: pos.left, transform: "translate(-50%, -100%)" }}
        >
          <p className="font-semibold">{tooltip.split("—")[0].trim()}</p>
          {tooltip.includes("—") && (
            <p className="text-gray-400 mt-0.5">{tooltip.split("—")[1].trim()}</p>
          )}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-700" />
        </div>
      )}
    </div>
  );
}

export function UsersClient({
  data,
  search,
  status,
  page,
}: {
  data: UsersData;
  search: string;
  status: string;
  page: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(search);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedWithdrawalId, setSelectedWithdrawalId] = useState<string | null>(null);

  function buildUrl(overrides: { search?: string; status?: string; page?: number }) {
    const params = new URLSearchParams();
    const s = overrides.search ?? search;
    const st = overrides.status ?? status;
    const p = overrides.page ?? 1;
    if (s) params.set("search", s);
    if (st) params.set("status", st);
    if (p > 1) params.set("page", String(p));
    return `/admin/members/users?${params.toString()}`;
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    startTransition(() => router.push(buildUrl({ search: searchInput, page: 1 })));
  }

  function handleStatusChange(newStatus: string) {
    startTransition(() => router.push(buildUrl({ status: newStatus, page: 1 })));
  }

  function goToPage(p: number) {
    startTransition(() => router.push(buildUrl({ page: p })));
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">사용자 관리</h2>

      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="이메일 검색..."
            className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          검색
        </button>
        {(search || status) && (
          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              startTransition(() => router.push("/admin/members/users"));
            }}
            className="px-3 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 rounded-lg text-sm transition-colors cursor-pointer"
          >
            초기화
          </button>
        )}
      </form>

      <div className="flex gap-2 mb-6">
        {[
          { value: "", label: "전체" },
          { value: "active", label: "활성" },
          { value: "withdrawn", label: "탈퇴" },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleStatusChange(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs transition-colors cursor-pointer ${
              status === opt.value
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-400 border border-gray-700 hover:text-gray-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">
                  <ColumnHeader label="이메일" tooltip="사용자 식별 정보" />
                </th>
                <th className="text-center px-4 py-3 text-gray-400 font-medium w-20">
                  권한
                </th>
                <th className="text-center px-4 py-3 text-gray-400 font-medium w-20">
                  상태
                </th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium w-32">
                  <ColumnHeader label="가입일" tooltip="사용자 증가 추세 파악" />
                </th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">
                  <ColumnHeader label="콘텐츠" tooltip="활동량 지표 — 많이 저장할수록 활성 사용자" align="right" />
                </th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">
                  <ColumnHeader label="카테고리" tooltip="서비스 활용도 — 분류를 얼마나 세분화했는지" align="right" />
                </th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">
                  <ColumnHeader label="태그" tooltip="서비스 활용도 — 태그를 많이 쓸수록 적극적 사용자" align="right" />
                </th>
              </tr>
            </thead>
            <tbody className={isPending ? "opacity-50" : ""}>
              {data.users.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => {
                    if (user.status === "active") setSelectedUserId(user.id);
                    else setSelectedWithdrawalId(user.id);
                  }}
                  className="border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-gray-100">{user.email}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      user.isAdmin
                        ? "bg-purple-600/20 text-purple-400"
                        : "bg-gray-600/20 text-gray-400"
                    }`}>
                      {user.isAdmin ? "관리자" : "일반"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      user.status === "active"
                        ? "bg-green-600/20 text-green-400"
                        : "bg-gray-600/20 text-gray-400"
                    }`}>
                      {user.status === "active" ? "활성" : "탈퇴"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">
                    {user.reelCount}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">
                    {user.categoryCount}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">
                    {user.tagCount}
                  </td>
                </tr>
              ))}
              {data.users.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    {search
                      ? "검색 결과가 없습니다"
                      : "등록된 사용자가 없습니다"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
            <p className="text-sm text-gray-400">
              총 {data.total}명{data.total > 0 && <> 중 {(page - 1) * data.pageSize + 1}-{Math.min(page * data.pageSize, data.total)}</>}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: data.totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === data.totalPages ||
                    Math.abs(p - page) <= 2
                )
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev !== undefined && p - prev > 1;
                  return (
                    <span key={p}>
                      {showEllipsis && (
                        <span className="px-1 text-gray-500">...</span>
                      )}
                      <button
                        onClick={() => goToPage(p)}
                        className={`w-8 h-8 rounded text-sm transition-colors ${
                          p === page
                            ? "bg-purple-600 text-white"
                            : "hover:bg-gray-700 text-gray-400"
                        }`}
                      >
                        {p}
                      </button>
                    </span>
                  );
                })}
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= data.totalPages}
                className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
      </div>

      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
      {selectedWithdrawalId && (
        <WithdrawalDetailModal
          withdrawalId={selectedWithdrawalId}
          onClose={() => setSelectedWithdrawalId(null)}
        />
      )}
    </div>
  );
}
