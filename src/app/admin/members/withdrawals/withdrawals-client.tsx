"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface WithdrawalRow {
  id: string;
  reason: string;
  createdAt: string;
}

export function WithdrawalsClient({
  withdrawals,
  total,
  page,
  pageSize,
  totalPages,
}: {
  withdrawals: WithdrawalRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function goToPage(p: number) {
    startTransition(() => {
      const params = new URLSearchParams();
      if (p > 1) params.set("page", String(p));
      router.push(`/admin/members/withdrawals?${params.toString()}`);
    });
  }

  return (
    <>
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left px-4 py-3 text-gray-400 font-medium">탈퇴 사유</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium w-32">탈퇴일</th>
            </tr>
          </thead>
          <tbody className={isPending ? "opacity-50" : ""}>
            {withdrawals.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-gray-500">
                  탈퇴한 회원이 없습니다
                </td>
              </tr>
            ) : (
              withdrawals.map((w) => (
                <tr
                  key={w.id}
                  className="border-b border-gray-700/50"
                >
                  <td className="px-4 py-3 text-gray-300">{w.reason}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(w.createdAt).toLocaleDateString("ko-KR")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
          <p className="text-sm text-gray-400">
            총 {total}명{total > 0 && <> 중 {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)}</>}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === totalPages ||
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
              disabled={page >= totalPages}
              className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

    </>
  );
}
