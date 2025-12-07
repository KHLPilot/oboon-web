// app/login/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";

type Mode = "login" | "signup";

export default function LoginPage() {
  const supabase = createSupabaseClient();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login"); // login / signup 모드
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 이메일/비밀번호 로그인 & 회원가입
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "signup") {
        // 회원가입
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          setError(signUpError.message);
        } else {
          setMessage(
            "회원가입 링크가 이메일로 발송되었을 수 있습니다. 메일함을 확인해주세요."
          );
        }
      } else {
        // 로그인
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (signInError) {
          setError(signInError.message);
        } else {
          // 로그인 성공 → 원하는 페이지로 이동 (예: /offerings 또는 /)
          console.log("로그인 성공:", data);
          router.push("/offerings"); // 아직 /offerings 없으면 "/"로 바꿔도 됨
        }
      }
    } catch (err: any) {
      setError(err.message ?? "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // 🔹 구글/네이버/카카오 소셜 로그인 공통 함수
  async function handleOAuthLogin(provider: "google" | "naver" | "kakao") {
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        // 로그인 후 돌아올 주소 (개발 중에는 localhost, 나중엔 실제 도메인으로 바꾸면 됨)
        options: {
          redirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/offerings`
              : undefined,
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
      }
      // 성공하면 브라우저가 자동으로 리다이렉트되기 때문에
      // 여기서 따로 router.push는 안 해줘도 됨
    } catch (err: any) {
      setError(err.message ?? "소셜 로그인 중 오류가 발생했습니다.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-black/40">
        <h1 className="mb-2 text-xl font-bold text-center">
          {mode === "login" ? "로그인" : "회원가입"}
        </h1>
        <p className="mb-6 text-xs text-center text-slate-400">
          OBOON 분양 플랫폼에 {mode === "login" ? "로그인" : "회원 등록"}{" "}
          해주세요.
        </p>

        {/* 모드 전환 버튼 */}
        <div className="mb-4 flex justify-center gap-2 text-xs">
          <button
            className={
              "rounded-full px-3 py-1 border " +
              (mode === "login"
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-300"
                : "border-slate-700 text-slate-300")
            }
            onClick={() => setMode("login")}
          >
            로그인
          </button>
          <button
            className={
              "rounded-full px-3 py-1 border " +
              (mode === "signup"
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-300"
                : "border-slate-700 text-slate-300")
            }
            onClick={() => setMode("signup")}
          >
            회원가입
          </button>
        </div>

        {/* 이메일/비밀번호 폼 */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-slate-300">이메일</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-emerald-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-300">
              비밀번호
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-emerald-500"
              placeholder="6자 이상 비밀번호"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            {loading ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
          </button>
        </form>

        {error && (
          <p className="mt-3 text-xs text-red-400 whitespace-pre-line">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-3 text-xs text-emerald-300 whitespace-pre-line">
            {message}
          </p>
        )}

        {/* 🔹 소셜 로그인 영역 */}
        <div className="mt-6 border-t border-slate-800 pt-4 text-center space-y-2">
          <p className="text-xs text-slate-400 mb-2">소셜 계정으로 계속하기</p>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => handleOAuthLogin("google")}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 text-xs text-slate-50 hover:border-emerald-400"
              disabled={loading}
            >
              🔵 Google로 계속하기
            </button>

            <button
              type="button"
              onClick={() => (window.location.href = "/api/auth/naver/login")}
              className="w-full rounded-lg ..."
            >
              🟢 네이버로 계속하기
            </button>

            <button
              type="button"
              onClick={() => handleOAuthLogin("kakao")}
              className="w-full rounded-lg border border-yellow-500/60 bg-yellow-500/10 py-2 text-xs text-yellow-100 hover:border-yellow-400"
              disabled={loading}
            >
              🟡 카카오톡으로 계속하기
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
