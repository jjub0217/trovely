"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp, Bot, Loader2, Sparkles, X } from "lucide-react";
import { askReels, type AskResult } from "@/lib/search/ask-actions";
import type { AskChip } from "@/lib/search/ask";
import {
  ASK_AI_BUTTON,
  ASK_ANSWER_TITLE,
  ASK_CHIPS_LABEL,
  ASK_FOOTNOTE,
  ASK_INPUT_PLACEHOLDER,
  ASK_LOADING,
  ASK_NOT_FOUND,
  ASK_SOURCES_LABEL,
} from "@/lib/search/labels";
import { ReelCard } from "./reel-card";

type Answer =
  | { status: "idle" }
  | { status: "loading"; question: string }
  | { status: "done"; question: string; result: AskResult }
  | { status: "error"; question: string; message: string };

/**
 * AI에게 물어보기: 홈 화면 오른쪽 아래 봇 버튼 → 아래에서 올라오는 창(관리자만).
 * 앱 전체 틀(레이아웃)에 두어서, 창을 닫거나 상세 화면에 다녀와도 마지막 답이 남고
 * 답을 만드는 중에 창을 닫아도 요청은 계속된다. 새 질문을 보내면 앞의 답은 지운다(대화 이어 가기 없음).
 */
export function AskShell({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState<Answer>({ status: "idle" });
  const onHome = pathname === "/";
  const visible = enabled && open && onHome;

  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  async function ask(question: string, chips?: AskChip[]) {
    setAnswer({ status: "loading", question });
    const r = await askReels({ question, chips });
    setAnswer("error" in r ? { status: "error", question, message: r.error } : { status: "done", question, result: r });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || answer.status === "loading") return;
    setInput("");
    ask(q);
  }

  function removeChip(chip: AskChip) {
    if (answer.status !== "done") return;
    ask(answer.question, answer.result.chips.filter((c) => !(c.kind === chip.kind && c.label === chip.label)));
  }

  return (
    <>
      {children}

      {enabled && onHome && !open && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[420px]">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={ASK_AI_BUTTON}
            className="pointer-events-auto absolute bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-purple-600 text-white shadow-lg shadow-black/40"
          >
            <Bot size={24} aria-hidden />
          </button>
        </div>
      )}

      {visible && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <section
            role="dialog"
            aria-modal="true"
            aria-label={ASK_AI_BUTTON}
            className="absolute inset-x-0 bottom-0 mx-auto flex h-[85vh] max-w-[420px] flex-col rounded-t-2xl border-t border-gray-800 bg-gray-900"
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <h2 className="text-base font-semibold text-gray-100">{ASK_AI_BUTTON}</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="닫기" className="text-gray-400 hover:text-gray-200">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-5 pb-4">
              {answer.status !== "idle" && (
                <p className="rounded-xl bg-gray-800 px-4 py-3 text-sm text-gray-100">{answer.question}</p>
              )}

              {answer.status === "loading" && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400" role="status">
                  <Loader2 size={15} className="animate-spin" aria-hidden /> {ASK_LOADING}
                </div>
              )}

              {answer.status === "error" && (
                <div className="space-y-2 rounded-xl border border-gray-700 p-3 text-sm text-gray-300">
                  <p>{answer.message}</p>
                  <button type="button" onClick={() => ask(answer.question)} className="text-xs text-purple-300 underline">
                    다시 물어보기
                  </button>
                </div>
              )}

              {answer.status === "done" && (
                <>
                  {answer.result.chips.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="text-gray-500">{ASK_CHIPS_LABEL}</span>
                      {answer.result.chips.map((c) => (
                        <button
                          key={`${c.kind}:${c.label}`}
                          type="button"
                          onClick={() => removeChip(c)}
                          aria-label={`${c.label} 조건 빼기`}
                          className="flex items-center gap-1 rounded-full border border-gray-600 bg-gray-800 px-2 py-0.5 text-gray-200"
                        >
                          {c.label} <span className="text-gray-500">×</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="rounded-xl border border-purple-500/40 bg-purple-500/10 p-4">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-purple-300">
                      <Sparkles size={14} aria-hidden /> {ASK_ANSWER_TITLE}
                    </div>
                    <p className="text-sm leading-relaxed text-gray-100">
                      {"notFound" in answer.result.answer ? ASK_NOT_FOUND : answer.result.answer.text}
                    </p>
                    {answer.result.chips.length > 0 && <p className="mt-3 text-[10px] text-gray-500">{ASK_FOOTNOTE}</p>}
                  </div>
                  {answer.result.sources.length > 0 && (
                    <>
                      <hr className="border-gray-800" />
                      <div className="grid grid-cols-2 gap-3.5" role="group" aria-label={ASK_SOURCES_LABEL}>
                        {answer.result.sources.map((reel) => (
                          <ReelCard key={reel.id} reel={reel} />
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            <form onSubmit={submit} className="flex items-center gap-2 border-t border-gray-800 px-5 py-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                enterKeyHint="send"
                placeholder={ASK_INPUT_PLACEHOLDER}
                aria-label={ASK_INPUT_PLACEHOLDER}
                className="flex-1 rounded-xl border border-gray-600 bg-gray-800 px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || answer.status === "loading"}
                aria-label="보내기"
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-600 text-white disabled:opacity-40"
              >
                <ArrowUp size={18} aria-hidden />
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
