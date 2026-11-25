"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp, Bot, Loader2, X } from "lucide-react";
import { answerQuestion, readQuestion, type AskResult } from "@/lib/search/ask-actions";
import type { AskChip } from "@/lib/search/ask";
import {
  ASK_AI_BUTTON,
  ASK_CHIPS_LABEL,
  ASK_EMPTY_TITLE,
  ASK_EXAMPLE_QUESTION,
  ASK_INPUT_PLACEHOLDER,
  ASK_LOADING,
  ASK_NOT_FOUND,
  ASK_SOURCES_LABEL,
} from "@/lib/search/labels";
import { ReelCard } from "./reel-card";

type Answer =
  | { status: "idle" }
  | { status: "reading"; question: string }
  | { status: "answering"; question: string; chips: AskChip[] }
  | { status: "done"; question: string; result: AskResult }
  | { status: "error"; question: string; chips?: AskChip[]; message: string };

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

  // 늦게 도착한 예전 응답이 새 질문의 화면을 덮어쓰지 않게
  const requestRef = useRef(0);
  const loading = answer.status === "reading" || answer.status === "answering";

  // 질문 읽기(조건 표시가 먼저 보임) → 찾기와 답 쓰기. chips를 주면(× 뒤) 질문 읽기를 건너뛴다.
  async function ask(question: string, chips?: AskChip[]) {
    const id = ++requestRef.current;
    let finalChips = chips;
    if (!finalChips) {
      setAnswer({ status: "reading", question });
      const read = await readQuestion(question);
      if (id !== requestRef.current) return;
      if ("error" in read) {
        setAnswer({ status: "error", question, message: read.error });
        return;
      }
      finalChips = read.chips;
    }
    setAnswer({ status: "answering", question, chips: finalChips });
    const r = await answerQuestion({ question, chips: finalChips });
    if (id !== requestRef.current) return;
    setAnswer("error" in r ? { status: "error", question, chips: finalChips, message: r.error } : { status: "done", question, result: r });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    ask(q);
  }

  function removeChip(chips: AskChip[], chip: AskChip) {
    if (answer.status === "idle" || loading) return;
    ask(answer.question, chips.filter((c) => !(c.kind === chip.kind && c.label === chip.label)));
  }

  const chips = answer.status === "answering" ? answer.chips : answer.status === "done" ? answer.result.chips : answer.status === "error" ? answer.chips : undefined;

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
            className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[85vh] max-w-[420px] flex-col rounded-t-3xl bg-gray-800"
          >
            <div className="flex justify-center pt-3" aria-hidden>
              <span className="h-1 w-10 rounded-full bg-gray-600" />
            </div>
            <div className="flex items-center justify-between px-6 pt-4 pb-2">
              <h2 className="text-lg font-semibold text-gray-100">{ASK_AI_BUTTON}</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="닫기" className="text-gray-400 hover:text-gray-200">
                <X size={22} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
              {answer.status === "idle" ? (
                <div className="flex flex-col items-center justify-center gap-4 pt-10 pb-0 text-center">
                  <Bot size={36} className="text-purple-300" aria-hidden />
                  <p className="text-base text-gray-100">{ASK_EMPTY_TITLE}</p>
                  <button type="button" onClick={() => setInput(ASK_EXAMPLE_QUESTION)} className="text-sm text-gray-400 hover:text-gray-300">
                    {ASK_EXAMPLE_QUESTION}
                  </button>
                </div>
              ) : (
                <div className="space-y-5 pt-2">
                  <p className="text-lg font-semibold leading-snug text-gray-100">{answer.question}</p>

                  {chips && chips.length > 0 && (
                    <div className="flex flex-wrap gap-2" role="group" aria-label={ASK_CHIPS_LABEL}>
                      {chips.map((c) => (
                        <button
                          key={`${c.kind}:${c.label}`}
                          type="button"
                          disabled={loading}
                          onClick={() => removeChip(chips, c)}
                          aria-label={`${c.label} 조건 빼기`}
                          className="flex items-center gap-1.5 rounded-full bg-purple-500/25 px-3.5 py-1.5 text-sm text-purple-100 disabled:opacity-60"
                        >
                          {c.label} <span aria-hidden>×</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {(chips?.length ?? 0) > 0 && <hr className="border-gray-700" />}

                  {loading && (
                    <div className="space-y-4" role="status">
                      <p className="flex items-center gap-2.5 text-sm text-gray-200">
                        <Loader2 size={20} className="animate-spin text-purple-300" aria-hidden /> {ASK_LOADING}
                      </p>
                      <div className="space-y-3" aria-hidden>
                        {["w-[95%]", "w-[85%]", "w-[90%]", "w-[55%]"].map((w) => (
                          <div key={w} className={`h-4 animate-pulse rounded-full bg-gray-700 ${w}`} />
                        ))}
                      </div>
                    </div>
                  )}

                  {answer.status === "error" && (
                    <div className="space-y-2 text-sm text-gray-300">
                      <p>{answer.message}</p>
                      <button type="button" onClick={() => ask(answer.question, answer.chips)} className="text-purple-300 underline">
                        다시 물어보기
                      </button>
                    </div>
                  )}

                  {answer.status === "done" && (
                    <>
                      <p className="whitespace-pre-line text-[15px] leading-relaxed text-gray-100">
                        {"notFound" in answer.result.answer ? ASK_NOT_FOUND : answer.result.answer.text}
                      </p>
                      {answer.result.sources.length > 0 && (
                        <>
                          <hr className="border-gray-700" />
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
              )}
            </div>

            <form onSubmit={submit} className="px-6 pb-6 pt-2">
              <div className="flex items-center rounded-2xl border border-gray-600 bg-gray-700/40 pl-4 pr-2 focus-within:border-purple-500">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  enterKeyHint="send"
                  placeholder={ASK_INPUT_PLACEHOLDER}
                  aria-label={ASK_INPUT_PLACEHOLDER}
                  className="flex-1 bg-transparent py-4 text-sm text-gray-100 placeholder-gray-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  aria-label="보내기"
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-300 disabled:opacity-40"
                >
                  <ArrowUp size={18} aria-hidden />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
