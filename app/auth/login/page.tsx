"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";

export default function LoginPage() {
  const supabase = createSupabaseClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError || !data.session) {
      setLoading(false);
      if (loginError?.message === "Invalid login credentials") {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      } else if (
        loginError?.message?.toLowerCase().includes("email not confirmed")
      ) {
        setError("이메일 인증을 완료해주세요.");
      } else {
        setError("로그인 중 오류가 발생했습니다.");
      }
      return;
    }

    // 로그인 성공 → 프로필 확인/생성
    const res = await fetch("/api/auth/ensure-profile", {
      method: "POST",
    });

    if (!res.ok) {
      setLoading(false);
      setError("프로필 확인 중 오류가 발생했습니다.");
      return;
    }

    const result: { needOnboarding: boolean } = await res.json();

    setLoading(false);

    if (result.needOnboarding) {
      router.replace("/auth/onboarding");
    } else {
      router.replace("/");
    }
  }

  async function handleOAuthLogin(provider: "google" | "kakao") {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError("소셜 로그인 중 오류가 발생했습니다.");
      setLoading(false);
    }
  }

  function handleNaverLogin() {
    window.location.href = "/api/auth/naver/login";
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-black/40">
        <h1 className="mb-2 text-xl font-bold text-center">로그인</h1>

        <p className="mb-6 text-xs text-center text-slate-400">
          OBOON 분양 플랫폼에 로그인해주세요.
        </p>

        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="text-xs text-slate-300">이메일</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-slate-300">비밀번호</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-slate-950"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <div className="mt-6 border-t border-slate-800 pt-4 text-center space-y-2">
          <p className="text-xs text-slate-400 mb-2">소셜 계정으로 계속하기</p>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleOAuthLogin("google")}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 text-xs hover:border-emerald-400"
            >
              🔵 Google로 계속하기
            </button>

            <button
              onClick={handleNaverLogin}
              className="w-full rounded-lg border border-green-500/30 bg-green-500/10 py-2 text-xs text-green-200 hover:border-green-400"
            >
              🟢 네이버로 계속하기
            </button>

            <button
              onClick={() => handleOAuthLogin("kakao")}
              className="w-full rounded-lg border border-yellow-500/60 bg-yellow-500/10 py-2 text-xs text-yellow-100 hover:border-yellow-400"
            >
              🟡 카카오톡으로 계속하기
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400 space-y-2">
          <div>
            아직 계정이 없으신가요?{" "}
            <button
              onClick={() => router.push("/auth/signup")}
              className="text-emerald-400 hover:underline"
            >
              회원가입
            </button>
          </div>

          <button onClick={() => router.push("/")} className="hover:underline">
            ← 홈으로 돌아가기
          </button>
        </div>
      </div>
    </main>
  );
}
