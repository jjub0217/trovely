"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

const STORAGE_KEY = "trovely-ai-search-notice-closed";

/** 공개 전 공지 띠. 닫으면 그 기기에서는 다시 보이지 않는다(브라우저 저장소를 못 쓰면 매번 보인다) */
export function AiSearchNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 브라우저 저장소는 화면을 그린 뒤에만 읽을 수 있다
      setShow(localStorage.getItem(STORAGE_KEY) !== "1");
    } catch {
      setShow(true);
    }
  }, []);
  if (!show) return null;
  const close = () => {
    setShow(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // 저장소를 못 쓰면 다음에 다시 보인다
    }
  };
  return (
    <div className="mx-6 mt-3 flex items-start gap-2 rounded-xl bg-purple-500/15 px-4 py-3 text-sm text-purple-100">
      <p className="flex-1">
        AI 검색이 곧 열려요. 개인정보 처리방침이 바뀌어요.{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          자세히 보기
        </Link>
      </p>
      <button type="button" onClick={close} aria-label="공지 닫기" className="text-purple-200">
        <X size={18} />
      </button>
    </div>
  );
}
