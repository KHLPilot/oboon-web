// app/auth/login/page.tsx
"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { detectInAppBrowser, InAppBrowserInfo } from "@/lib/inAppBrowser";
import { trackEvent } from "@/lib/analytics";

import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Modal from "@/components/ui/Modal";
import FieldErrorBubble, {
  FieldErrorState,
} from "@/components/ui/FieldErrorBubble";
import { validationMessageFor } from "@/shared/validationMessage";
import { AlertCircle, ExternalLink } from "lucide-react";
import { showAlert } from "@/shared/alert";

type LoginField = "email" | "password" | "generic";

export default function LoginPage() {
  const supabase = createSupabaseClient();
  const router = useRouter();
  const lastInvalidToastAtRef = useRef(0);

  const cardWrapRef = useRef<HTMLDivElement | null>(null);
  const [fieldError, setFieldError] =
    useState<FieldErrorState<LoginField>>(null);

  const fieldErrorTimerRef = useRef<number | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inAppInfo, setInAppInfo] = useState<InAppBrowserInfo | null>(null);

  // 인앱 브라우저 감지
  useEffect(() => {
    setInAppInfo(detectInAppBrowser());
  }, []);

  const clearFieldError = () => {
    setFieldError(null);
    if (fieldErrorTimerRef.current) {
      window.clearTimeout(fieldErrorTimerRef.current);
      fieldErrorTimerRef.current = null;
    }
  };

  const showFieldErrorUnder = (
    el: HTMLElement,
    message: string,
    field: LoginField,
  ) => {
    setFieldError({ field, message, anchorEl: el });

    if (fieldErrorTimerRef.current)
      window.clearTimeout(fieldErrorTimerRef.current);
    fieldErrorTimerRef.current = window.setTimeout(() => {
      setFieldError(null);
      fieldErrorTimerRef.current = null;
    }, 2600);
  };

  useEffect(() => {
    return () => {
      if (fieldErrorTimerRef.current) {
        window.clearTimeout(fieldErrorTimerRef.current);
        fieldErrorTimerRef.current = null;
      }
    };
  }, []);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    trackEvent("login_click", { method: "email" });
    setLoading(true);
    setError(null);
    clearFieldError();

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

      if (!data.session) throw new Error("로그인 세션 생성에 실패했습니다.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("name, phone_number, role")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        console.error("Profile Error Detail:", profileError);
        if (profileError.code === "PGRST116") {
          router.replace("/auth/onboarding");
        } else {
          setError(
            `권한 오류: ${profileError.message} (관리자에게 문의하세요)`,
          );
        }
        setLoading(false);
        return;
      }

      setLoading(false);

      if (profile.role === "admin") {
        router.replace("/admin");
        setTimeout(() => router.refresh(), 100);
        return;
      }

      if (profile.role === "agent_pending") {
        router.replace("/");
        router.refresh();
        return;
      }

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
      setError(err?.message || "로그인 중 오류가 발생했습니다.");
    }
  }

  async function handleOAuthLogin(provider: "google") {
    setLoading(true);
    setError(null);
    clearFieldError();
    trackEvent("login_click", { method: provider });

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/api/auth/google/callback`,
      },
    });

    if (error) {
      setError("소셜 로그인 중 오류가 발생했습니다.");
      setLoading(false);
    }
  }

  // MVP: 네이버 로그인 비활성화
  // function handleNaverLogin() {
  //   setLoading(true);
  //   setError(null);
  //   clearFieldError();
  //   trackEvent("login_click", { method: "naver" });
  //   window.location.href = "/api/auth/naver/login";
  // }

  // 외부 브라우저로 열기
  function handleOpenExternal() {
    const currentUrl = window.location.href;

    if (inAppInfo?.isIOS) {
      navigator.clipboard?.writeText(currentUrl);
      showAlert(
        "주소가 복사되었습니다. Safari를 열고 주소창에 붙여넣기 해주세요.",
      );
    } else if (inAppInfo?.isAndroid) {
      const intentUrl = `intent://${currentUrl.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
      window.location.href = intentUrl;
    }
  }

  const bubbleId = "login-field-error";

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
              OBOON 로그인
            </div>
            <p className="mt-0.5 sm:mt-1 ob-typo-h4 leading-[1.6] text-(--oboon-text-muted)">
              이메일이나 소셜 계정으로 로그인할 수 있습니다.
            </p>
          </div>

          {/* Card wrapper: FieldErrorBubble positioning container */}
          <div ref={cardWrapRef} className="relative">
            <Card className="p-6 border border-(--oboon-border-default) relative">
              <form
                onSubmit={handleLogin}
                className="space-y-3"
                onInvalidCapture={(e) => {
                  e.preventDefault();

                  const now = Date.now();
                  if (now - lastInvalidToastAtRef.current < 250) return;
                  lastInvalidToastAtRef.current = now;

                  const el = e.target as
                    | HTMLInputElement
                    | HTMLTextAreaElement
                    | HTMLSelectElement;

                  const field: LoginField =
                    el.name === "email"
                      ? "email"
                      : el.name === "password"
                        ? "password"
                        : "generic";

                  const msg = validationMessageFor(el, field);

                  el.focus?.();
                  showFieldErrorUnder(el, msg, field);
                }}
              >
                <div>
                  <Label>이메일</Label>
                  <Input
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    onFocus={clearFieldError}
                    className="h-11"
                    aria-invalid={
                      fieldError?.field === "email" ? "true" : undefined
                    }
                    aria-describedby={
                      fieldError?.field === "email" ? bubbleId : undefined
                    }
                  />
                </div>

                <div>
                  <Label>비밀번호</Label>
                  <Input
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    onFocus={clearFieldError}
                    className="h-11"
                    aria-invalid={
                      fieldError?.field === "password" ? "true" : undefined
                    }
                    aria-describedby={
                      fieldError?.field === "password" ? bubbleId : undefined
                    }
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  shape="pill"
                  className="mt-5 w-full justify-center"
                  disabled={loading}
                  loading={loading}
                >
                  로그인
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  shape="pill"
                  className="w-full justify-center"
                  onClick={() => {
                    trackEvent("login_click", { method: "guest" });
                    router.push("/");
                  }}
                  disabled={loading}
                >
                  로그인 없이 보기
                </Button>
              </form>

              {/* Divider */}
              <div className="mt-6 mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-(--oboon-border-default)" />
                <div className="ob-typo-body uppercase text-(--oboon-text-muted)">
                  Social
                </div>
                <div className="h-px flex-1 bg-(--oboon-border-default)" />
              </div>

              <div className="flex flex-col gap-2">
                {inAppInfo?.isInApp ? (
                  // 인앱 브라우저: Google OAuth 차단 안내
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-orange-700 font-medium">
                          {inAppInfo.browser || "인앱 브라우저"}에서는 Google
                          로그인이 제한됩니다
                        </p>
                        <p className="text-xs text-orange-600 mt-1">
                          {inAppInfo.isIOS ? "Safari" : "Chrome"}에서 열어주세요
                        </p>
                        <Button
                          type="button"
                          variant="warning"
                          size="sm"
                          className="mt-2 w-full justify-center"
                          onClick={handleOpenExternal}
                        >
                          <ExternalLink className="h-4 w-4" />
                          {inAppInfo.isIOS ? "Safari" : "Chrome"}에서 열기
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    shape="pill"
                    className="w-full justify-center"
                    onClick={() => handleOAuthLogin("google")}
                    disabled={loading}
                  >
                    Google로 로그인
                  </Button>
                )}

                {/* MVP: 네이버 로그인 비활성화
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  shape="pill"
                  className="w-full justify-center"
                  onClick={handleNaverLogin}
                  disabled={loading}
                >
                  네이버로 로그인
                </Button>
                */}
              </div>

              <p className="mt-5 text-center ob-typo-caption text-(--oboon-text-muted)">
                로그인 진행 시 서비스 이용약관 및 개인정보처리방침에 <br />
                동의한 것으로 간주됩니다.
              </p>
            </Card>

            {/* FieldErrorBubble */}
            <FieldErrorBubble
              open={Boolean(fieldError)}
              containerEl={cardWrapRef.current}
              anchorEl={fieldError?.anchorEl ?? null}
              id={bubbleId}
              title="입력 오류"
              message={fieldError?.message ?? ""}
              onClose={clearFieldError}
            />
          </div>

          <div className="mt-4 text-center ob-typo-body text-(--oboon-text-muted)">
            아직 오분 회원이 아닌가요?
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
              onClick={() => router.push("/auth/signup")}
              disabled={loading}
            >
              회원가입 하기
            </button>
          </div>

          <Modal open={Boolean(error)} onClose={() => setError(null)}>
            <div className="space-y-2">
              <div className="ob-typo-h2 text-(--oboon-text-title)">
                로그인 오류
              </div>
              <div className="ob-typo-body text-(--oboon-text-muted)">
                {error}
              </div>
              <div className="mt-5">
                <Button
                  variant="primary"
                  shape="pill"
                  className="w-full justify-center"
                  onClick={() => setError(null)}
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
