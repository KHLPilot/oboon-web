"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import { createSupabaseClient } from "@/lib/supabaseClient";

type Mode = "login" | "signup";

function cx(...v: (string | false | null | undefined)[]) {
  return v.filter(Boolean).join(" ");
}

export default function LoginPage() {
  const supabase = createSupabaseClient();
  const router = useRouter();
  const sp = useSearchParams();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Header에서 /login?redirect=... 로 보내는 흐름 지원
  const redirect = useMemo(() => sp.get("redirect"), [sp]);

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
        else setMessage("확인 이메일이 발송되었습니다. 이메일을 확인해주세요.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setError(error.message);
        } else {
          // 프로필 보장 API를 사용 중이면 유지
          const next = redirect
            ? `/api/auth/ensure-profile?redirect=${encodeURIComponent(
                redirect
              )}`
            : "/api/auth/ensure-profile";
          router.push(next);
        }
      }
    } catch (err: any) {
      setError(err?.message ?? "로그인 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuthLogin(provider: "google" | "kakao") {
    setLoading(true);
    setError(null);
    setMessage(null);

    const origin = window.location.origin;

    // callback에서 redirect 쿼리를 처리하도록 전달
    const callbackUrl = redirect
      ? `${origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`
      : `${origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  function handleNaverLogin() {
    // naver login API에서도 redirect를 전달할 수 있으면 같이 전달 추천
    const qs = redirect ? `?redirect=${encodeURIComponent(redirect)}` : "";
    window.location.href = `/api/auth/naver/login${qs}`;
  }

  return (
    <main className="bg-(--oboon-bg-page)">
      <div className="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-10">
        <div className="mx-auto w-full max-w-[420px]">
          {/* 헤더 */}
          <div className="mb-5">
            <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-(--oboon-text-title)">
              {mode === "login" ? "로그인" : "회원가입"}
            </h1>
            <p className="mt-1 text-[14px] leading-[1.6] text-(--oboon-text-muted)">
              OBOON 분양 플랫폼에 {mode === "login" ? "로그인" : "회원 등록"}{" "}
              해주세요.
            </p>
          </div>

          {/* 카드 */}
          <div
            className={cx(
              "rounded-[16px] p-5",
              "bg-(--oboon-bg-surface)",
              "border border-(--oboon-border-default)",
              "shadow-[0_10px_20px_rgba(0,0,0,0.04)]"
            )}
          >
            {/* 모드 탭 */}
            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={cx(
                  "h-9 flex-1 rounded-[10px] px-4 text-[13px] font-medium",
                  mode === "login"
                    ? "bg-(--oboon-bg-subtle) text-(--oboon-text-title) border border-(--oboon-border-default)"
                    : "bg-transparent text-(--oboon-text-muted) border border-(--oboon-border-default) hover:bg-(--oboon-bg-subtle)",
                  "transition-colors"
                )}
              >
                로그인
              </button>

              <button
                type="button"
                onClick={() => setMode("signup")}
                className={cx(
                  "h-9 flex-1 rounded-[10px] px-4 text-[13px] font-medium",
                  mode === "signup"
                    ? "bg-(--oboon-bg-subtle) text-(--oboon-text-title) border border-(--oboon-border-default)"
                    : "bg-transparent text-(--oboon-text-muted) border border-(--oboon-border-default) hover:bg-(--oboon-bg-subtle)",
                  "transition-colors"
                )}
              >
                회원가입
              </button>
            </div>

            {/* 폼 */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-(--oboon-text-muted)">
                  이메일
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={cx(
                    "h-11 w-full rounded-[12px] px-3 text-[14px]",
                    "bg-(--oboon-bg-surface) text-(--oboon-text-body)",
                    "border border-(--oboon-border-default)",
                    "outline-none focus:ring-2 focus:ring-(--oboon-primary)/30"
                  )}
                />
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-medium text-(--oboon-text-muted)">
                  비밀번호
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6자 이상"
                  className={cx(
                    "h-11 w-full rounded-[12px] px-3 text-[14px]",
                    "bg-(--oboon-bg-surface) text-(--oboon-text-body)",
                    "border border-(--oboon-border-default)",
                    "outline-none focus:ring-2 focus:ring-(--oboon-primary)/30"
                  )}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                shape="pill"
                loading={loading}
                className="w-full justify-center text-[14px]"
              >
                {mode === "login" ? "로그인" : "회원가입"}
              </Button>
            </form>

            {/* 상태 메시지 */}
            {error ? (
              <div
                className={cx(
                  "mt-4 rounded-[12px] p-3 text-[13px]",
                  "border border-(--oboon-border-default)",
                  "bg-(--oboon-bg-subtle) text-red-400"
                )}
              >
                {error}
              </div>
            ) : null}

            {message ? (
              <div
                className={cx(
                  "mt-4 rounded-[12px] p-3 text-[13px]",
                  "border border-(--oboon-border-default)",
                  "bg-(--oboon-bg-subtle) text-(--oboon-text-body)"
                )}
              >
                {message}
              </div>
            ) : null}

            {/* 소셜 로그인 */}
            <div className="mt-6 border-t border-(--oboon-border-default) pt-4">
              <div className="mb-3 text-center text-[12px] text-(--oboon-text-muted)">
                소셜 계정으로 계속하기
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  shape="pill"
                  disabled={loading}
                  className="w-full justify-center"
                  onClick={() => handleOAuthLogin("google")}
                >
                  Google로 계속하기
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  shape="pill"
                  disabled={loading}
                  className="w-full justify-center"
                  onClick={handleNaverLogin}
                >
                  네이버로 계속하기
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  shape="pill"
                  disabled={loading}
                  className="w-full justify-center"
                  onClick={() => handleOAuthLogin("kakao")}
                >
                  카카오로 계속하기
                </Button>
              </div>
            </div>
          </div>

          {/* 하단 안내 */}
          <div className="mt-3 text-center text-[12px] leading-5 text-(--oboon-text-muted)">
            로그인/회원가입 진행 시 이용약관 및 개인정보처리방침에 동의한 것으로
            간주됩니다.
          </div>
        </div>
      </div>
    </main>
  );
}
