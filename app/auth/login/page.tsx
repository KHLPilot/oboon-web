// app/auth/login/page.tsx

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

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (loginError) {
        if (loginError.message === "Invalid login credentials") {
          throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
        } else if (loginError.message.toLowerCase().includes("confirm")) {
          throw new Error("이메일 인증을 완료해주세요.");
        } else {
          throw loginError;
        }
      }

      if (!data.session)
        throw new Error("로그인 세션 생성에 실패했습니다.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("name, phone_number, role")
        .eq("id", data.user.id)
        .single();

      // 1. 프로필 조회 에러 대응
      if (profileError) {
        console.error("Profile Error Detail:", profileError);
        // 프로필이 진짜 없는 경우(PGRST116)만 온보딩으로
        if (profileError.code === "PGRST116") {
          router.replace("/auth/onboarding");
        } else {
          setError(
            `권한 오류: ${profileError.message} (관리자에게 문의하세요)`
          );
        }
        setLoading(false);
        return;
      }

      setLoading(false);

      // 2. 관리자: 관리자 페이지로 즉시 이동
      if (profile.role === "admin") {
        router.replace("/admin");
        setTimeout(() => router.refresh(), 100);
        return;
      }

      // 3. 대행사 직원 대기 → 홈
      if (profile.role === "agent_pending") {
        router.replace("/");
        router.refresh();
        return;
      }

      // 4. 일반 유저: 필수 정보 누락 체크
      const isMissingInfo =
        !profile.name || profile.name === "temp" || !profile.phone_number;

      if (isMissingInfo) {
        router.replace("/auth/onboarding");
      } else {
        router.replace("/");
        router.refresh();
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || "로그인 중 오류가 발생했습니다.");
    }
  }

  async function handleOAuthLogin(provider: "google") {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/api/auth/google/callback`
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
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--oboon-bg-page)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-8 shadow-card"
        style={{
          backgroundColor: "var(--oboon-bg-surface)",
          borderColor: "var(--oboon-border-default)",
        }}
      >
        <h1
          className="mb-2 text-2xl font-bold text-center"
          style={{ color: "var(--oboon-text-title)" }}
        >
          로그인
        </h1>
        <p
          className="mb-8 text-xs text-center"
          style={{ color: "var(--oboon-text-muted)" }}
        >
          OBOON 분양 플랫폼에 로그인해주세요.
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label
              className="text-xs ml-1"
              style={{ color: "var(--oboon-text-body)" }}
            >
              이메일
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-all"
              style={{
                backgroundColor: "var(--oboon-bg-subtle)",
                borderColor: "var(--oboon-border-default)",
                color: "var(--oboon-text-body)",
              }}
            />
          </div>

          <div className="space-y-1">
            <label
              className="text-xs ml-1"
              style={{ color: "var(--oboon-text-body)" }}
            >
              비밀번호
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-all"
              style={{
                backgroundColor: "var(--oboon-bg-subtle)",
                borderColor: "var(--oboon-border-default)",
                color: "var(--oboon-text-body)",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full ob-btn ob-btn-md ob-btn-round ob-btn-primary mt-2"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 rounded-lg text-center text-xs ob-alert ob-alert-danger">
            {error}
          </div>
        )}

        {/* 구분선 */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div
              className="w-full border-t"
              style={{ borderColor: "var(--oboon-border-default)" }}
            ></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span
              className="px-2"
              style={{
                backgroundColor: "var(--oboon-bg-surface)",
                color: "var(--oboon-text-muted)",
              }}
            >
              Social Login
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => handleOAuthLogin("google")}
            disabled={loading}
            className="w-full rounded-lg border py-2.5 text-xs font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{
              backgroundColor: "var(--oboon-bg-subtle)",
              borderColor: "var(--oboon-border-default)",
              color: "var(--oboon-text-body)",
            }}
          >
            🔵 Google로 계속하기
          </button>

          <button
            onClick={handleNaverLogin}
            disabled={loading}
            className="w-full rounded-lg border border-green-500/30 bg-green-500/10 py-2.5 text-xs font-medium text-green-200 hover:bg-green-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            🟢 네이버로 계속하기
          </button>
        </div>

        <div
          className="mt-8 text-center text-xs space-y-3"
          style={{ color: "var(--oboon-text-muted)" }}
        >
          <p>
            아직 계정이 없으신가요?{" "}
            <button
              onClick={() => router.push("/auth/signup")}
              className="font-bold ml-1 underline-offset-4 hover:underline"
              style={{ color: "var(--oboon-primary)" }}
            >
              회원가입
            </button>
          </p>
          <button
            onClick={() => router.push("/")}
            className="transition-colors"
            style={{ color: "var(--oboon-text-muted)" }}
          >
            ← 홈으로 돌아가기
          </button>
        </div>
      </div>
    </main>
  );
}