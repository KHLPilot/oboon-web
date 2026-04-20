// app/auth/signup/page.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import { createSupabaseClient } from "@/lib/supabaseClient";
import { validatePassword } from "@/lib/validators/profileValidation";
import { validateRequiredOrShowModal } from "@/shared/validationMessage";
import { toKoreanErrorMessage } from "@/shared/errorMessage";

import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import FormInput from "@/components/ui/FormInput";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { Copy } from "@/shared/copy";

type VerificationState = {
  isEmailSent: boolean;
};

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

export default function SignupPage() {
  const supabase = createSupabaseClient();
  const router = useRouter();

  // Step1 fields
  const [email, setEmail] = useState("");
  const [passwordConfirmDirty, setPasswordConfirmDirty] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState(true);

  // UI state
  const [loading, setLoading] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  // verification
  const [verification, setVerification] = useState<VerificationState>({
    isEmailSent: false,
  });
  const verificationTokenRef = useRef<string | null>(null);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const passwordConfirmRef = useRef<HTMLInputElement | null>(null);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwConfirmError, setPwConfirmError] = useState<string | null>(null);

  const clearAllErrors = () => {
    setEmailError(null);
    setPwError(null);
    setPwConfirmError(null);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  function handleKeyEvent(e: React.KeyboardEvent) {
    setCapsLockOn(e.getModifierState("CapsLock"));
  }

  function goStep2(token: string) {
    router.replace(
      `/auth/signup/profile?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`,
    );
  }

  // 이미 세션이 있으면 리다이렉트
  useEffect(() => {
    let ignore = false;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (ignore) return;
      if (session) router.replace("/");
    })();

    return () => {
      ignore = true;
    };
  }, [supabase, router]);

  // Polling: "인증 완료 후 Step2로 이동"
  useEffect(() => {
    const token = verificationTokenRef.current;
    if (!verification.isEmailSent || !token) return;

    stopPolling();

    const startedAt = Date.now();
    const timeoutMs = 10 * 60 * 1000;

    pollingIntervalRef.current = setInterval(async () => {
      try {
        if (Date.now() - startedAt > timeoutMs) {
          stopPolling();
          verificationTokenRef.current = null;
          setVerification({ isEmailSent: false });
          setFatalError("인증 시간이 초과되었습니다. 다시 시도해주세요.");
          return;
        }

        const res = await fetch(`/api/auth/check-verification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const json = await res.json();

        if (!json?.verified) return;

        stopPolling();
        goStep2(token);
      } catch {
        // 네트워크 오류는 조용히 계속
      }
    }, 3000);

    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verification.isEmailSent]);

  function validateStep1Inputs(): boolean {
    const passwordValue = passwordRef.current?.value ?? "";
    const passwordConfirmValue = passwordConfirmRef.current?.value ?? "";

    if (!validateRequiredOrShowModal(email, "이메일")) return false;

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("이메일 형식이 올바르지 않습니다.");
      return false;
    }

    if (!validateRequiredOrShowModal(passwordValue, "비밀번호")) return false;

    const pwErr = validatePassword(passwordValue);
    if (pwErr) {
      setPwError(pwErr);
      return false;
    }

    if (!validateRequiredOrShowModal(passwordConfirmValue, "비밀번호 확인"))
      return false;

    if (passwordValue !== passwordConfirmValue) {
      setPwConfirmError("비밀번호가 일치하지 않습니다.");
      return false;
    }

    return true;
  }

  async function handleSendVerification() {
    setFatalError(null);
    clearAllErrors();

    if (!validateStep1Inputs()) return;

    setLoading(true);

    try {
      const passwordValue = passwordRef.current?.value ?? "";
      // 이메일 중복 체크
      const checkResponse = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const { exists, confirmed } = await checkResponse.json();

      if (exists && confirmed) {
        setEmailError("이미 가입된 이메일입니다. 로그인해주세요.");
        setTimeout(() => router.push("/auth/login"), 800);
        return;
      }

      if (exists && !confirmed) {
        // 이 라우트는 현재 서버 전용 비밀키가 필요하므로 브라우저에서는 best-effort로만 시도합니다.
        try {
          await fetch("/api/auth/cleanup-temp-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
        } catch {
          // ignore
        }
      }

      // signUp
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password: passwordValue,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        // Supabase 에러 메시지를 한글로 변환
        let errorMsg = "회원가입에 실패했습니다. 다시 시도해주세요.";
        if (signUpError.message.toLowerCase().includes("invalid email")) {
          errorMsg = "이메일 형식이 올바르지 않습니다.";
        } else if (signUpError.message.toLowerCase().includes("password")) {
          errorMsg = "비밀번호가 요구사항을 충족하지 않습니다.";
        }
        setFatalError(errorMsg);
        return;
      }

      if (!data.user?.id) {
        setFatalError("유저 생성에 실패했습니다. 다시 시도해주세요.");
        return;
      }

      // verification token 생성
      const tokenResponse = await fetch("/api/auth/create-verification-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: data.user.id,
          email: data.user.email,
        }),
      });

      const json = await tokenResponse.json();
      const token: unknown = json?.token;

      if (typeof token !== "string" || token.length === 0) {
        setFatalError("인증 토큰 생성에 실패했습니다. 다시 시도해주세요.");
        return;
      }

      verificationTokenRef.current = token;
      setVerification({ isEmailSent: true });
    } catch (err: unknown) {
      setFatalError(toKoreanErrorMessage(err, "요청 중 오류가 발생했습니다."));
    } finally {
      setLoading(false);
    }
  }

  async function handleManualCheck() {
    const token = verificationTokenRef.current;
    if (!token) return;

    setLoading(true);
    setFatalError(null);
    clearAllErrors();

    try {
      const res = await fetch(`/api/auth/check-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();

      if (!json?.verified) {
        setEmailError("아직 인증이 완료되지 않았습니다. 메일함을 확인해주세요.");
        return;
      }

      stopPolling();
      goStep2(token);
    } catch (err: unknown) {
      setFatalError(toKoreanErrorMessage(err, "확인 중 오류가 발생했습니다."));
    } finally {
      setLoading(false);
    }
  }

  const lockInputs = loading || verification.isEmailSent;

  return (
    <main className="min-h-dvh overflow-x-hidden bg-(--oboon-bg-page) text-(--oboon-text-title)">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_0%,rgba(64,112,255,0.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(800px_500px_at_50%_30%,rgba(0,200,180,0.10),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_700px_at_50%_100%,rgba(255,255,255,0.06),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_40%,rgba(0,0,0,0.55)_100%)]" />
      </div>

      <PageContainer variant="full" className="relative overflow-hidden">
        <div className="w-full max-w-105 -translate-y-4 sm:translate-y-0">
          {/* Header */}
          <div className="mb-4 sm:mb-5 text-center">
            <div className="ob-typo-h1 tracking-[-0.02em] text-(--oboon-text-title)">
              OBOON 회원가입
            </div>
            <p className="mt-0.5 sm:mt-1 ob-typo-h4 leading-[1.6] text-(--oboon-text-muted)">
              이메일 인증 완료 후, 상세 정보를 입력합니다.
            </p>
            <div className="mt-4 text-center ob-typo-body text-(--oboon-text-muted)">
              이미 계정이 있으신가요?
              <button
                type="button"
                className="
                  mx-1
                  text-(--oboon-primary)
                  underline
                  underline-offset-4
                  decoration-(--oboon-primary)
                  hover:decoration-(--oboon-primary-hover)
                  hover:text-(--oboon-primary-hover)
                  transition-colors
                "
                onClick={() => router.push("/auth/login")}
                disabled={loading}
              >
                로그인 하기
              </button>
            </div>
          </div>

          <div>
            <Card className="p-6 border border-(--oboon-border-default)">
              <div className="space-y-3">
                <FormInput
                  ref={emailRef}
                  label="이메일 주소"
                  error={emailError ?? undefined}
                  autoFocus
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError(null);
                  }}
                  onFocus={clearAllErrors}
                  placeholder={Copy.auth.placeholder.emailSignup}
                  autoComplete="email"
                  disabled={lockInputs}
                />

                <div>
                  <label className="ob-typo-label text-(--oboon-text-muted) mb-1 block">
                    비밀번호 설정
                  </label>
                  <div className="relative">
                    <Input
                      ref={passwordRef}
                      type={showPassword ? "text" : "password"}
                      onChange={(e) => {
                        const nextPassword = e.target.value;
                        setPwError(null);
                        const passwordConfirmValue =
                          passwordConfirmRef.current?.value ?? "";
                        setPasswordMatch(
                          !passwordConfirmValue ||
                            nextPassword === passwordConfirmValue,
                        );
                      }}
                      onKeyDown={handleKeyEvent}
                      onKeyUp={handleKeyEvent}
                      onFocus={clearAllErrors}
                      placeholder={Copy.auth.placeholder.password}
                      autoComplete="new-password"
                      disabled={lockInputs}
                      className={cx(
                        "h-11",
                        pwError ? "border-(--oboon-danger)" : "",
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      aria-label={
                        showPassword ? "비밀번호 숨기기" : "비밀번호 보기"
                      }
                      disabled={lockInputs}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {pwError && (
                    <p className="mt-1 text-xs text-(--oboon-danger)">
                      {pwError}
                    </p>
                  )}

                  {capsLockOn ? (
                    <div className="mt-1 flex items-center gap-2 ob-typo-caption leading-4 text-(--oboon-danger)">
                      <span className="h-2 w-2 rounded-full bg-(--oboon-warning)" />
                      <p className="ob-typo-caption leading-4 text-(--oboon-warning)">
                        Caps Lock이 켜져 있습니다.
                      </p>
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className="ob-typo-label text-(--oboon-text-muted) mb-1 block">
                    비밀번호 확인
                  </label>
                  <div className="relative">
                    <Input
                      ref={passwordConfirmRef}
                      type={showPasswordConfirm ? "text" : "password"}
                      onChange={(e) => {
                        setPasswordConfirmDirty(Boolean(e.target.value));
                        setPwConfirmError(null);
                        setPasswordMatch(
                          (passwordRef.current?.value ?? "") === e.target.value,
                        );
                      }}
                      onKeyDown={handleKeyEvent}
                      onKeyUp={handleKeyEvent}
                      onFocus={clearAllErrors}
                      placeholder={Copy.auth.placeholder.passwordConfirm}
                      autoComplete="new-password"
                      disabled={lockInputs}
                      className={cx(
                        "h-11",
                        !passwordMatch && passwordConfirmDirty
                          ? "border-(--oboon-danger)"
                          : "",
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      aria-label={
                        showPasswordConfirm
                          ? "비밀번호 확인 숨기기"
                          : "비밀번호 확인 보기"
                      }
                      disabled={lockInputs}
                    >
                      {showPasswordConfirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {pwConfirmError && (
                    <p className="mt-1 text-xs text-(--oboon-danger)">
                      {pwConfirmError}
                    </p>
                  )}
                  {passwordConfirmDirty && !pwConfirmError ? (
                    <p
                      className={cx(
                        "text-[11px] leading-4",
                        passwordMatch
                          ? "text-(--oboon-success)"
                          : "text-(--oboon-danger)",
                      )}
                    >
                      {passwordMatch
                        ? "비밀번호가 일치합니다."
                        : "비밀번호가 일치하지 않습니다."}
                    </p>
                  ) : null}
                </div>

                {/* CTA */}
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  shape="pill"
                  className="mt-1 w-full justify-center text-[14px]"
                  onClick={handleSendVerification}
                  disabled={loading || verification.isEmailSent}
                  loading={loading}
                >
                  {verification.isEmailSent
                    ? "인증 메일 발송됨"
                    : "이메일 인증하기"}
                </Button>

                {/* Pending */}
                {verification.isEmailSent ? (
                  <div className="mt-3 space-y-3">
                    <p className="text-center ob-typo-caption text-(--oboon-text-muted)">
                      메일 인증 대기중입니다. <br />
                      인증이 완료되면 자동으로 다음 단계로 이동합니다.
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      shape="pill"
                      className="w-full justify-center"
                      onClick={handleManualCheck}
                      disabled={loading}
                    >
                      인증 완료했는데 안 넘어가나요? 확인하기
                    </Button>
                  </div>
                ) : null}
              </div>
            </Card>
          </div>

          <Modal open={Boolean(fatalError)} onClose={() => setFatalError(null)}>
            <div className="space-y-2">
              <div className="ob-typo-h2 text-(--oboon-text-title)">안내</div>
              <div className="ob-typo-body text-(--oboon-text-muted)">
                {fatalError}
              </div>
              <div className="mt-3">
                <Button
                  variant="primary"
                  className="w-full justify-center"
                  onClick={() => setFatalError(null)}
                >
                  확인
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      </PageContainer>
    </main>
  );
}
