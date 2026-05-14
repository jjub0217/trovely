"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GoogleOAuthButton } from "@/components/google-oauth-button";
import { KakaoOAuthButton } from "@/components/kakao-oauth-button";
import { OAuthDivider } from "@/components/oauth-divider";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const emailError = emailTouched && email && !EMAIL_REGEX.test(email)
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message.includes("request this after")) {
        const seconds = error.message.match(/(\d+) seconds/)?.[1] || "";
        setError(`보안을 위해 ${seconds}초 후에 다시 시도해주세요.`);
      } else {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      }
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col justify-center min-h-screen px-8">
      <h1 className="text-2xl font-bold text-purple-100 text-center mb-8">Trove</h1>
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
          {emailError && <p className="text-red-400 text-xs mt-1.5 px-1">{emailError}</p>}
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          required
          className="bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-purple-600 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>
      <OAuthDivider />
      <div className="flex flex-col gap-2">
        <GoogleOAuthButton />
        <KakaoOAuthButton />
      </div>
      <p className="text-center text-sm text-gray-400 mt-4">
        <Link href="/forgot-password" className="text-gray-400 hover:underline">
          비밀번호를 잊으셨나요?
        </Link>
      </p>
      <p className="text-center text-sm text-gray-400 mt-3">
        계정이 없으신가요?{" "}
        <Link href="/signup" className="text-purple-400 hover:underline">
          회원가입
        </Link>
      </p>
    </div>
  );
}
