"use client";

import { useState } from "react";

export function KakaoOAuthButton() {
  const [loading, setLoading] = useState(false);

  function handleClick() {
    setLoading(true);
    window.location.href = "/auth/kakao/start";
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 bg-[#FEE500] text-[#181600] py-3 rounded-xl text-sm font-semibold disabled:opacity-50 hover:brightness-95 transition"
    >
      <KakaoIcon />
      {loading ? "이동 중..." : "카카오로 계속하기"}
    </button>
  );
}

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M9 1.2C4.582 1.2 1 4.06 1 7.6c0 2.265 1.466 4.252 3.668 5.401l-.846 3.087c-.075.274.226.49.466.328l3.696-2.444c.336.034.677.052 1.016.052 4.418 0 8-2.86 8-6.424S13.418 1.2 9 1.2z"
        fill="#181600"
      />
    </svg>
  );
}
