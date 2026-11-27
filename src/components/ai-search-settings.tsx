"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { revokeAiSearchAction } from "@/lib/ai-search/actions";
import { AiConsentSheet } from "./ai-consent-sheet";

/**
 * AI 검색 설정: 켜기와 끄기만. 게시물 준비 상태는 보여 주지 않는다(사용자는 켜졌는지만 알면 된다, 2026-11-27 사용자 결정).
 * 처음 켤 때 일부 게시물이 실패해도 처음 보는 검색어로 검색할 때 자동으로 이어서 만든다.
 */
export function AiSearchSettings({ enabled, admin }: { enabled: boolean; admin: boolean }) {
  const router = useRouter();
  const [consentOpen, setConsentOpen] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok: true } | { error: string }>, done?: string) =>
    startTransition(async () => {
      setMessage(null);
      const r = await action();
      if ("error" in r) setMessage(r.error);
      else {
        if (done) setMessage(done);
        router.refresh();
      }
    });

  return (
    <div className="px-6 py-4">
      <div className="mb-6 flex items-center gap-2">
        <Link href="/" aria-label="뒤로" className="text-gray-400 hover:text-gray-200">
          <ChevronLeft size={22} />
        </Link>
        <h1 className="text-lg font-semibold text-gray-100">AI 검색 설정</h1>
      </div>

      {admin ? (
        <p className="text-sm text-gray-400">관리자 계정은 동의 없이 AI 검색을 써요.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-gray-800 p-4">
            <div>
              <p className="text-sm text-gray-100">AI 검색 사용</p>
              <p className="mt-1 text-xs text-gray-400">검색어와 의미가 비슷한 게시물도 찾아요.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label="AI 검색 사용"
              disabled={busy}
              onClick={() => (enabled ? setConfirmOff(true) : setConsentOpen(true))}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${enabled ? "bg-purple-600" : "bg-gray-600"} disabled:opacity-60`}
            >
              <span className={`absolute left-0 top-1 h-5 w-5 rounded-full bg-white transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {confirmOff && (
            <div className="rounded-xl border border-gray-700 p-4 text-sm text-gray-300">
              <p>AI 검색을 끄면 Trovely에 저장된 AI 검색용 데이터가 바로 삭제돼요.</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setConfirmOff(false)} className="h-10 flex-1 rounded-lg border border-gray-600">
                  취소
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setConfirmOff(false);
                    run(revokeAiSearchAction, "AI 검색을 껐어요. AI 검색용 데이터를 삭제했어요.");
                  }}
                  className="h-10 flex-1 rounded-lg bg-red-600 text-white disabled:opacity-60"
                >
                  끄기
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {message && <p className="mt-4 text-sm text-gray-300">{message}</p>}

      <Link href="/privacy" className="mt-6 inline-block text-sm text-purple-300 underline underline-offset-2">
        개인정보 처리방침 보기
      </Link>

      <AiConsentSheet
        open={consentOpen}
        onClose={() => setConsentOpen(false)}
        onEnabled={() => {
          setConsentOpen(false);
          setMessage(null);
          router.refresh();
        }}
      />
    </div>
  );
}
