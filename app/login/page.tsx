//app/login/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";

type Mode = "login" | "signup";

export default function LoginPage() {
  const supabase = createSupabaseClient();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  /** ---------------------------------------------------------
   *  🔥 모든 SNS/Password 로그인 후 이동할 콜백 주소
   * --------------------------------------------------------- */
  const redirectUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback`
      : undefined;

  /** ---------------------------------------------------------
   *  ✉️ 이메일 로그인 & 회원가입
   * --------------------------------------------------------- */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) setError(error.message);
        else setMessage("확인 이메일이 발송되었습니다.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) setError(error.message);
        else router.push("/api/auth/ensure-profile");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /** ---------------------------------------------------------
   *  🔵 Google / 🟡 Kakao OAuth 로그인
   * --------------------------------------------------------- */
  async function handleOAuthLogin(provider: "google" | "kakao") {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl, // 반드시 callback API로!
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  /** ---------------------------------------------------------
   *  🟢 Naver 로그인 (커스텀 API → Supabase)
   * --------------------------------------------------------- */
  function handleNaverLogin() {
    window.location.href = `/api/auth/naver/login?redirect=/api/auth/callback`;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-black/40">
        <h1 className="mb-2 text-xl font-bold text-center">
          {mode === "login" ? "로그인" : "회원가입"}
        </h1>

        <p className="mb-6 text-xs text-center text-slate-400">
          OBOON 분양 플랫폼에{" "}
          {mode === "login" ? "로그인" : "회원 등록"} 해주세요.
        </p>

        {/* ------------------------------------------------------
            로그인 / 회원가입 모드 버튼
        ------------------------------------------------------- */}
        <div className="mb-4 flex justify-center gap-2 text-xs">
          <button
            className={`rounded-full px-3 py-1 border ${
              mode === "login"
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-300"
                : "border-slate-700 text-slate-300"
            }`}
            onClick={() => setMode("login")}
          >
            로그인
          </button>

          <button
            className={`rounded-full px-3 py-1 border ${
              mode === "signup"
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-300"
                : "border-slate-700 text-slate-300"
            }`}
            onClick={() => setMode("signup")}
          >
            회원가입
          </button>
        </div>

        {/* ------------------------------------------------------
            이메일 / 비밀번호 입력폼
        ------------------------------------------------------- */}
        <form onSubmit={handleSubmit} className="space-y-3">
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
              minLength={6}
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
            {loading ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
          </button>
        </form>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        {message && <p className="mt-3 text-xs text-emerald-300">{message}</p>}

        {/* ------------------------------------------------------
            SNS 로그인 버튼들
        ------------------------------------------------------- */}
        <div className="mt-6 border-t border-slate-800 pt-4 text-center space-y-2">
          <p className="text-xs text-slate-400 mb-2">소셜 계정으로 계속하기</p>

          <div className="flex flex-col gap-2">
            {/* Google */}
            <button
              onClick={() => handleOAuthLogin("google")}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 text-xs hover:border-emerald-400"
            >
              🔵 Google로 계속하기
            </button>

            {/* Naver */}
            <button
              onClick={handleNaverLogin}
              className="w-full rounded-lg border border-green-500/30 bg-green-500/10 py-2 text-xs text-green-200 hover:border-green-400"
            >
              🟢 네이버로 계속하기
            </button>

            {/* Kakao */}
            <button
              onClick={() => handleOAuthLogin("kakao")}
              className="w-full rounded-lg border border-yellow-500/60 bg-yellow-500/10 py-2 text-xs text-yellow-100 hover:border-yellow-400"
            >
              🟡 카카오톡으로 계속하기
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}