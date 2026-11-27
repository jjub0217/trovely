"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { enableAiSearchAction } from "@/lib/ai-search/actions";
import { AI_SEARCH_POLICY_VERSION } from "@/lib/ai-search/limits";

const TITLE = "AI 검색 사용하기";

/** AI 검색 동의 창(아래에서 올라오는 창, AI에게 물어보기 창과 같은 모양). 문구는 설계 문서 7번 그대로 */
export function AiConsentSheet({ open, onClose, onEnabled }: { open: boolean; onClose(): void; onEnabled(): void }) {
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      setError(null);
      const r = await enableAiSearchAction({ adultConfirmed: checked, policyVersion: AI_SEARCH_POLICY_VERSION });
      if ("error" in r) setError(r.error);
      else {
        setChecked(false);
        onEnabled();
      }
    });

  return (
    <div className={`fixed inset-0 z-40 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open} inert={!open}>
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={TITLE}
        className={`absolute inset-x-0 bottom-0 mx-auto flex max-h-[85vh] max-w-[420px] flex-col rounded-t-3xl bg-gray-800 transition-transform duration-300 ease-out motion-reduce:transition-none ${open ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="flex justify-center pt-3" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-gray-600" />
        </div>
        <div className="flex items-center justify-between px-6 pt-4 pb-2">
          <h2 className="text-lg font-semibold text-gray-100">{TITLE}</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-gray-400 hover:text-gray-200">
            <X size={22} />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 pb-4 text-sm leading-relaxed text-gray-300">
          <p className="text-gray-100">검색어와 의미가 비슷한 게시물도 찾아보세요.</p>
          <p>
            AI 검색을 위해 게시물의 카테고리, 태그, 캡션과 검색어를 Google Gemini API로 전달해요. 직접 작성한 메모와 후기, 이메일, 로그인 정보는
            전달하지 않아요.
          </p>
          <p>
            Google은 전달받은 내용을 AI 학습에 쓰지 않지만, 남용 방지를 위해 최대 55일 동안 보관할 수 있어요. 처리 과정에서 해외에 있는 Google
            시설을 거칠 수 있어요.
          </p>
          <p>AI 검색은 선택 기능이에요. 동의하지 않아도 기존 기능을 그대로 쓸 수 있어요.</p>
          <p>
            AI 검색 설정에서 언제든 사용을 중단할 수 있어요. 중단하면 Trovely에 저장된 AI 검색용 데이터는 바로 삭제돼요. 이미 Google에 전달된
            내용은 위 보관 기간에 따라 처리돼요.
          </p>
          <Link href="/privacy" className="inline-block text-purple-300 underline underline-offset-2">
            개인정보 처리방침 보기
          </Link>
          <label className="flex items-start gap-2.5 rounded-xl bg-gray-700/40 p-3 text-gray-100">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-purple-500"
            />
            <span>만 18세 이상이며, AI 검색을 위한 정보 처리 안내를 확인하고 동의합니다.</span>
          </label>
          {error && <p className="text-red-400">{error}</p>}
        </div>
        <div className="flex gap-2 px-6 pb-6">
          <button type="button" onClick={onClose} className="h-12 flex-1 rounded-xl border border-gray-600 text-sm text-gray-300">
            나중에 할게요
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!checked || pending}
            className="h-12 flex-1 rounded-xl bg-purple-600 text-sm text-white disabled:bg-gray-700 disabled:text-gray-400"
          >
            동의하고 사용하기
          </button>
        </div>
      </section>
    </div>
  );
}
