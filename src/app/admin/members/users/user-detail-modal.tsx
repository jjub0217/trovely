"use client";

import { useEffect, useState } from "react";
import { X, ExternalLink, Shield, ShieldOff } from "lucide-react";
import { getUserDetail, toggleAdminRole } from "@/lib/admin-actions";

interface ReelItem {
  id: string;
  url: string;
  memo: string | null;
  review: string | null;
  visited: boolean;
  createdAt: Date;
  categories: { category: { name: string } }[];
  tags: { tag: { name: string } }[];
}

interface UserDetailData {
  id: string;
  email: string;
  createdAt: string;
  isAdmin: boolean;
  reels: ReelItem[];
  categories: { id: string; name: string }[];
  tags: { id: string; name: string }[];
}

export function UserDetailModal({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<UserDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    getUserDetail(userId).then((result) => {
      setData(result as UserDetailData | null);
      setLoading(false);
    });
  }, [userId]);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (showConfirm) {
          setShowConfirm(false);
        } else {
          onClose();
        }
      }
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose, showConfirm]);

  async function handleToggleAdmin() {
    if (!data) return;
    setToggling(true);
    const result = await toggleAdminRole(data.id, data.email);
    setData({ ...data, isAdmin: result.isAdmin });
    setToggling(false);
    setShowConfirm(false);
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold">
              {loading ? "로딩 중..." : data?.email || "사용자 상세"}
            </h3>
            {data?.isAdmin && (
              <span className="px-2 py-0.5 bg-purple-600/20 text-purple-400 rounded-full text-xs">관리자</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-700 transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading && (
            <p className="text-gray-400 text-center py-8">로딩 중...</p>
          )}
          {!loading && !data && (
            <p className="text-gray-400 text-center py-8">
              사용자를 찾을 수 없습니다
            </p>
          )}
          {!loading && data && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-900 rounded-lg p-3">
                  <p className="text-2xl font-bold">{data.reels.length}</p>
                  <p className="text-xs text-gray-400 mt-1">콘텐츠</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-3">
                  <p className="text-2xl font-bold">{data.categories.length}</p>
                  <p className="text-xs text-gray-400 mt-1">카테고리</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-3">
                  <p className="text-2xl font-bold">{data.tags.length}</p>
                  <p className="text-xs text-gray-400 mt-1">태그</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-1">가입일</p>
                <p className="text-sm">
                  {new Date(data.createdAt).toLocaleString("ko-KR")}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-3">
                  콘텐츠 목록 (최근 50개)
                </h4>
                {data.reels.length === 0 ? (
                  <p className="text-sm text-gray-500">저장된 콘텐츠가 없습니다</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {data.reels.map((reel) => (
                      <div
                        key={reel.id}
                        className="bg-gray-900 rounded-lg p-3 text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <a
                              href={reel.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-400 hover:text-purple-300 flex items-center gap-1 text-xs break-all"
                            >
                              {reel.url}
                              <ExternalLink size={12} className="shrink-0" />
                            </a>
                            {reel.memo && (
                              <p className="text-gray-300 mt-1">{reel.memo}</p>
                            )}
                            <div className="flex flex-wrap gap-1 mt-3">
                              {reel.categories.map((rc) => (
                                <span
                                  key={rc.category.name}
                                  className="px-1.5 py-0.5 bg-purple-600/20 text-purple-400 rounded text-xs"
                                >
                                  {rc.category.name}
                                </span>
                              ))}
                              {reel.tags.map((rt) => (
                                <span
                                  key={rt.tag.name}
                                  className="px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded text-xs"
                                >
                                  #{rt.tag.name}
                                </span>
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-gray-500 shrink-0">
                            {new Date(reel.createdAt).toLocaleDateString("ko-KR")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && data && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-700">
            <button
              onClick={() => setShowConfirm(true)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                data.isAdmin
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-purple-600 text-white hover:bg-purple-700"
              }`}
            >
              {data.isAdmin ? <ShieldOff size={16} /> : <Shield size={16} />}
              {data.isAdmin ? "관리자 해제" : "관리자 지정"}
            </button>
          </div>
        )}
      </div>

      {/* Admin Role Confirm Modal */}
      {showConfirm && data && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] px-6">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-xs">
            <h3 className="text-base font-semibold mb-2">
              {data.isAdmin ? "관리자 해제" : "관리자 지정"}
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              {data.email}을(를) {data.isAdmin ? "관리자에서 해제" : "관리자로 지정"}하시겠습니까?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 bg-gray-700 py-2.5 rounded-xl text-sm cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleToggleAdmin}
                disabled={toggling}
                className={`flex-1 py-2.5 rounded-xl text-sm disabled:opacity-50 cursor-pointer ${
                  data.isAdmin ? "bg-red-600" : "bg-purple-600"
                }`}
              >
                {toggling ? "처리 중..." : "확인"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
