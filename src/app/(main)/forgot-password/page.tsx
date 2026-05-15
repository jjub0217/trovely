"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const emailError =
    emailTouched && email && !EMAIL_REGEX.test(email)
      ? "유효한 이메일 형식을 입력해주세요."
      : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!EMAIL_REGEX.test(email)) {
      setError("유효한 이메일 형식을 입력해주세요.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/settings/password`,
    });

    if (error) {
      if (error.message.includes("request this after")) {
        const seconds = error.message.match(/(\d+) seconds/)?.[1] || "";
        setError(`보안을 위해 ${seconds}초 후에 다시 시도해주세요.`);
      } else {
        setError(error.message);
      }
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="flex flex-col justify-center min-h-screen px-8">
        <h1 className="text-2xl font-bold text-purple-100 text-center mb-4">
          Trovely
        </h1>
        <p className="text-center text-sm text-gray-300 mb-2">
          비밀번호 재설정 링크를 이메일로 보냈습니다.
        </p>
        <p className="text-center text-sm text-gray-400 mb-8">
          이메일을 확인해주세요.
        </p>
        <Link
          href="/login"
          className="text-center text-sm text-purple-400 hover:underline"
        >
          로그인으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center min-h-screen px-8">
      <h1 className="text-2xl font-bold text-purple-100 text-center mb-2">
        Trovely
      </h1>
      <p className="text-center text-sm text-gray-400 mb-8">
        가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setEmailTouched(true)}
            placeholder="이메일"
            required
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          {emailError && (
            <p className="text-red-400 text-xs mt-1.5 px-1">{emailError}</p>
          )}
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-purple-600 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
        >
          {loading ? "전송 중..." : "재설정 링크 보내기"}
        </button>
      </form>
      <p className="text-center text-sm text-gray-400 mt-6">
        <Link href="/login" className="text-purple-400 hover:underline">
          로그인으로 돌아가기
        </Link>
      </p>
    </div>
  );
}
