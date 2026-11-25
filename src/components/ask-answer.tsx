"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { askReels, type AskResult } from "@/lib/search/ask-actions";
import type { AskChip } from "@/lib/search/ask";
import {
  ASK_AI_BUTTON,
  ASK_ANSWER_TITLE,
  ASK_CHIPS_LABEL,
  ASK_FOOTNOTE,
  ASK_LOADING,
  ASK_NOT_FOUND,
  ASK_SOURCES_LABEL,
} from "@/lib/search/labels";
import { ReelCard } from "./reel-card";

type State = { status: "idle" } | { status: "loading" } | { status: "done"; result: AskResult } | { status: "error"; message: string };

/** 검색어 아래 "AI에게 물어보기"(관리자만). 검색어나 필터가 바뀌면 부모가 key로 새로 그린다. */
export function AskAnswer({
  question,
  categoryId,
  source,
}: {
  question: string;
  categoryId?: string;
  source?: "instagram" | "youtube";
}) {
  const [state, setState] = useState<State>({ status: "idle" });

  async function run(chips?: AskChip[]) {
    setState({ status: "loading" });
    const r = await askReels({ question, chips, categoryId, source });
    setState("error" in r ? { status: "error", message: r.error } : { status: "done", result: r });
  }

  function removeChip(chip: AskChip) {
    if (state.status !== "done") return;
    run(state.result.chips.filter((c) => !(c.kind === chip.kind && c.label === chip.label)));
  }

  return (
    <div className="px-6 pb-4 space-y-3">
      {state.status === "idle" && (
        <button
          type="button"
          onClick={() => run()}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-purple-500/50 py-2.5 text-sm text-purple-300"
        >
          <Sparkles size={15} aria-hidden /> {ASK_AI_BUTTON}
        </button>
      )}

      {state.status === "loading" && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-700 py-3 text-sm text-gray-400" role="status">
          <Loader2 size={15} className="animate-spin" aria-hidden /> {ASK_LOADING}
        </div>
      )}

      {state.status === "error" && (
        <div className="space-y-2 rounded-xl border border-gray-700 p-3 text-sm text-gray-300">
          <p>{state.message}</p>
          <button type="button" onClick={() => run()} className="text-xs text-purple-300 underline">
            다시 물어보기
          </button>
        </div>
      )}

      {state.status === "done" && (
        <>
          {state.result.chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-gray-500">{ASK_CHIPS_LABEL}</span>
              {state.result.chips.map((c) => (
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
              {"notFound" in state.result.answer ? ASK_NOT_FOUND : state.result.answer.text}
            </p>
            <p className="mt-3 text-[10px] text-gray-500">{ASK_FOOTNOTE}</p>
          </div>
          {state.result.sources.length > 0 && (
            <div>
              <p className="mb-2 text-xs text-gray-500">{ASK_SOURCES_LABEL}</p>
              <div className="grid grid-cols-2 gap-3.5">
                {state.result.sources.map((reel) => (
                  <ReelCard key={reel.id} reel={reel} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
