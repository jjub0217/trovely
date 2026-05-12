"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GoogleOAuthButton } from "@/components/google-oauth-button";
import { KakaoOAuthButton } from "@/components/kakao-oauth-button";
import { OAuthDivider } from "@/components/oauth-divider";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_RULES = [
  { test: (pw: string) => pw.length >= 8, label: "8자 이상" },
  { test: (pw: string) => /[a-zA-Z]/.test(pw), label: "영문 포함" },
  { test: (pw: string) => /[0-9]/.test(pw), label: "숫자 포함" },
  { test: (pw: string) => /[^a-zA-Z0-9]/.test(pw), label: "특수문자 포함" },
];

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false, confirm: false });

  const emailError = touched.email && email && !EMAIL_REGEX.test(email)
    ? "유효한 이메일 형식을 입력해주세요."
    : "";

  const passwordErrors = touched.password && password
    ? PASSWORD_RULES.filter((rule) => !rule.test(password))
    : [];

  const confirmError = touched.confirm && confirmPassword && password !== confirmPassword
    ? "비밀번호가 일치하지 않습니다."
    : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!EMAIL_REGEX.test(email)) {
      setError("유효한 이메일 형식을 입력해주세요.");
      return;
    }

    const failedRules = PASSWORD_RULES.filter((rule) => !rule.test(password));
    if (failedRules.length > 0) {
      setError(`비밀번호: ${failedRules.map((r) => r.label).join(", ")}`);
      return;
    }

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });

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

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col justify-center min-h-screen px-8">
      <h1 className="text-2xl font-bold text-purple-100 text-center mb-8">ReelBox</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            placeholder="이메일"
            required
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          {emailError && <p className="text-red-400 text-xs mt-1.5 px-1">{emailError}</p>}
        </div>

        <div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            placeholder="비밀번호 (8자 이상, 영문+숫자+특수문자)"
            required
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          {password && (
            <div className="flex gap-2 mt-2 px-1">
              {PASSWORD_RULES.map((rule) => (
                <span
                  key={rule.label}
                  className={`text-[11px] ${rule.test(password) ? "text-green-400" : "text-gray-500"}`}
                >
                  {rule.test(password) ? "✓" : "○"} {rule.label}
                </span>
              ))}
            </div>
          )}
          {passwordErrors.length > 0 && (
            <p className="text-red-400 text-xs mt-1 px-1">
              {passwordErrors.map((r) => r.label).join(", ")}이 필요합니다.
            </p>
          )}
        </div>

        <div>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
            placeholder="비밀번호 확인"
            required
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          {confirmError && <p className="text-red-400 text-xs mt-1.5 px-1">{confirmError}</p>}
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-purple-600 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
        >
          {loading ? "가입 중..." : "회원가입"}
        </button>
      </form>
      <OAuthDivider />
      <div className="flex flex-col gap-2">
        <GoogleOAuthButton />
        <KakaoOAuthButton />
      </div>
      <p className="text-center text-sm text-gray-400 mt-6">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="text-purple-400 hover:underline">
          로그인
        </Link>
      </p>
    </div>
  );
}
