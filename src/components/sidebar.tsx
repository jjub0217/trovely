"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut, deleteAccount } from "@/lib/actions";
import { Mail, Film, Star, FolderCog, KeyRound, BookmarkCheck, LogOut, Tags, UserX, X } from "lucide-react";

export function Sidebar({
  open,
  onClose,
  email,
  totalReels,
  visitedReels,
}: {
  open: boolean;
  onClose: () => void;
  email: string;
  totalReels: number;
  visitedReels: number;
}) {
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [withdrawalReason, setWithdrawalReason] = useState("");
  const [withdrawalDetail, setWithdrawalDetail] = useState("");

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  async function handleLogout() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleDeleteAccount() {
    if (!withdrawalReason) return;
    setDeleting(true);
    await deleteAccount({
      reason: withdrawalReason,
      detail: withdrawalReason === "OTHER" ? withdrawalDetail : undefined,
    });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-gray-900 border-l border-gray-800 z-50 transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-center px-5 py-4 border-b border-gray-800">
            <span className="text-sm font-semibold text-gray-100">메뉴</span>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
              <X size={20} />
            </button>
          </div>

          {/* Profile */}
          <div className="px-5 py-4 border-b border-gray-800">
            <div className="flex items-center gap-2.5 text-gray-300">
              <Mail size={16} className="text-gray-500" />
              <span className="text-sm truncate">{email}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="px-5 py-4 border-b border-gray-800 flex flex-col gap-3">
            <div className="flex items-center gap-2.5 text-gray-300">
              <Film size={16} className="text-gray-500" />
              <span className="text-sm">내 콘텐츠 {totalReels}개</span>
            </div>
            <div className="flex items-center gap-2.5 text-gray-300">
              <Star size={16} className="text-gray-500" />
              <span className="text-sm">방문 완료 {visitedReels}개</span>
            </div>
          </div>

          {/* Menu */}
          <div className="px-5 py-4 flex-1">
            <Link
              href="/archive"
              onClick={onClose}
              className="flex items-center gap-2.5 text-gray-300 hover:text-gray-100 py-2"
            >
              <BookmarkCheck size={16} className="text-gray-500" />
              <span className="text-sm">기록 보기</span>
            </Link>
            <Link
              href="/categories"
              onClick={onClose}
              className="flex items-center gap-2.5 text-gray-300 hover:text-gray-100 py-2"
            >
              <FolderCog size={16} className="text-gray-500" />
              <span className="text-sm">카테고리 관리</span>
            </Link>
            <Link
              href="/tags"
              onClick={onClose}
              className="flex items-center gap-2.5 text-gray-300 hover:text-gray-100 py-2"
            >
              <Tags size={16} className="text-gray-500" />
              <span className="text-sm">태그 관리</span>
            </Link>
            <Link
              href="/settings/password"
              onClick={onClose}
              className="flex items-center gap-2.5 text-gray-300 hover:text-gray-100 py-2"
            >
              <KeyRound size={16} className="text-gray-500" />
              <span className="text-sm">비밀번호 변경</span>
            </Link>
          </div>

          {/* Logout + Delete Account */}
          <div className="px-5 py-4 border-t border-gray-800 flex flex-col gap-1">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 text-gray-400 hover:text-red-400 w-full py-2"
            >
              <LogOut size={16} />
              <span className="text-sm">로그아웃</span>
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2.5 text-gray-500 hover:text-red-400 w-full py-2"
            >
              <UserX size={16} />
              <span className="text-sm">회원탈퇴</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] px-6">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-xs">
            <h3 className="text-base font-semibold mb-2">회원탈퇴</h3>
            <p className="text-xs text-gray-500 mb-4">저장된 모든 콘텐츠, 카테고리, 태그가 삭제되며 복구할 수 없습니다.</p>
            <p className="text-sm text-gray-400 mb-2">탈퇴 사유를 선택해주세요</p>
            <div className="flex flex-col gap-2 mb-4">
              {[
                { value: "SERVICE_DISSATISFACTION", label: "서비스 불만족" },
                { value: "PRIVACY_CONCERN", label: "개인정보 우려" },
                { value: "LOW_USAGE", label: "사용 빈도 낮음" },
                { value: "COMPETITOR", label: "다른 서비스 이용" },
                { value: "OTHER", label: "기타" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                    withdrawalReason === opt.value
                      ? "bg-red-600/20 text-red-400 border border-red-600/40"
                      : "bg-gray-700 text-gray-300 border border-transparent"
                  }`}
                >
                  <input
                    type="radio"
                    name="withdrawal-reason"
                    value={opt.value}
                    checked={withdrawalReason === opt.value}
                    onChange={(e) => setWithdrawalReason(e.target.value)}
                    className="hidden"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            {withdrawalReason === "OTHER" && (
              <textarea
                value={withdrawalDetail}
                onChange={(e) => setWithdrawalDetail(e.target.value)}
                placeholder="탈퇴 사유를 입력해주세요..."
                rows={2}
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-red-500 resize-none mb-4"
              />
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setWithdrawalReason("");
                  setWithdrawalDetail("");
                }}
                className="flex-1 bg-gray-700 py-2.5 rounded-xl text-sm cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || !withdrawalReason}
                className="flex-1 bg-red-600 py-2.5 rounded-xl text-sm disabled:opacity-50 cursor-pointer"
              >
                {deleting ? "탈퇴 중..." : "탈퇴"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
