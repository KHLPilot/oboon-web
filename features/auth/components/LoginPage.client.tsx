// app/auth/login/page.tsx
"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { detectInAppBrowser, InAppBrowserInfo } from "@/lib/inAppBrowser";
import { trackEvent } from "@/lib/analytics";

import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import FormInput from "@/components/ui/FormInput";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Modal from "@/components/ui/Modal";
import { validationMessageFor } from "@/shared/validationMessage";
import { AlertCircle, ExternalLink } from "lucide-react";
import { showAlert } from "@/shared/alert";
import { toKoreanErrorMessage } from "@/shared/errorMessage";
import { Copy } from "@/shared/copy";
import RestoreAccountModal from "./RestoreAccountModal";

type LoginField = "email" | "password" | "generic";

function resolveSafeNextPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  return trimmed;
}

export default function LoginPage() {
  const supabase = createSupabaseClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = resolveSafeNextPath(searchParams.get("next"));
  const lastInvalidToastAtRef = useRef(0);
  const errorConfirmButtonRef = useRef<HTMLButtonElement | null>(null);

  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inAppInfo, setInAppInfo] = useState<InAppBrowserInfo | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // 탈퇴 계정 복구 모달 상태
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [deletedAccountInfo, setDeletedAccountInfo] = useState<{
    email: string;
  } | null>(null);

  // 소셜 로그인 banned 시 이메일 입력 모달
  const [bannedEmailModalOpen, setBannedEmailModalOpen] = useState(false);
  const [bannedEmail, setBannedEmail] = useState("");
  const [checkingBanned, setCheckingBanned] = useState(false);

  // 인앱 브라우저 감지
  useEffect(() => {
    setInAppInfo(detectInAppBrowser());
  }, []);

  // URL 파라미터에서 banned 에러 처리 (소셜 로그인 콜백에서 리다이렉트된 경우)
  useEffect(() => {
    const errorParam = searchParams.get("error");

    if (errorParam === "banned") {
      // 소셜 로그인 banned: 이메일 입력 모달 표시
      setBannedEmailModalOpen(true);
      // URL 파라미터 정리
      router.replace("/auth/login");
    }
  }, [searchParams, router]);

  // 소셜 로그인 banned 계정 확인
  async function checkDeletedAccount(
    targetEmail: string,
    options?: { needBanCheck?: boolean },
  ) {
    const res = await fetch("/api/auth/check-deleted-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: targetEmail,
        needBanCheck: options?.needBanCheck === true,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "계정 확인 중 오류가 발생했습니다.");
    }

    return {
      isDeleted: Boolean(data?.isDeleted),
      isBanned: Boolean(data?.isBanned),
      restoreToken:
        typeof data?.restoreToken === "string" ? data.restoreToken : null,
    };
  }

  async function handleCheckBannedAccount() {
    if (!bannedEmail) {
      showAlert("이메일을 입력해주세요.");
      return;
    }

    setCheckingBanned(true);
    try {
      const data = await checkDeletedAccount(bannedEmail, { needBanCheck: true });

      if (data.isDeleted && data.restoreToken) {
        setBannedEmailModalOpen(false);
        setDeletedAccountInfo({ email: bannedEmail });
        setRestoreModalOpen(true);
      } else if (data.isBanned) {
        // banned지만 deleted가 아닌 경우 (관리자 밴)
        setBannedEmailModalOpen(false);
        setError(Copy.auth.error.deactivated);
      } else {
        showAlert("해당 이메일로 탈퇴한 계정이 없습니다.");
      }
    } catch {
      console.error("[login] deleted account check", {
        status: 500,
        message: "deleted account check failed",
      });
      setError("계정 확인 중 오류가 발생했습니다.");
    } finally {
      setCheckingBanned(false);
    }
  }

  const clearAllErrors = () => {
    setEmailError(null);
    setPasswordError(null);
  };

  const isAbortLikeError = (input: unknown) => {
    if (!input) return false;
    const name =
      typeof input === "object" && input !== null && "name" in input
        ? String((input as { name?: unknown }).name ?? "")
        : "";
    const message =
      input instanceof Error
        ? input.message
        : typeof input === "object" && input !== null && "message" in input
          ? String((input as { message?: unknown }).message ?? "")
          : String(input);
    const lowerName = name.toLowerCase();
    const lower = message.toLowerCase();
    return (
      lowerName === "aborterror" ||
      lower.includes("aborterror") ||
      lower.includes("signal is aborted") ||
      lower.includes("operation was aborted")
    );
  };

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    trackEvent("login_click", { method: "email" });
    setLoading(true);
    setError(null);
    clearAllErrors();

    try {
      const passwordValue = passwordInputRef.current?.value ?? "";
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password: passwordValue,
        });

      if (loginError) {
        if (loginError.message === "Invalid login credentials") {
          throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
        } else if (loginError.message.toLowerCase().includes("confirm")) {
          throw new Error("이메일 인증을 완료해주세요.");
        } else if (loginError.message.toLowerCase().includes("banned")) {
          // 탈퇴(ban)된 계정인지 확인
          const checkData = await checkDeletedAccount(email);

          if (checkData.isDeleted && checkData.restoreToken) {
            setDeletedAccountInfo({ email });
            setRestoreModalOpen(true);
            setLoading(false);
            return;
          }
          throw new Error(Copy.auth.error.deactivated);
        } else {
          throw loginError;
        }
      }

      if (!data.session) throw new Error("로그인 세션 생성에 실패했습니다.");

      const fetchProfile = async () =>
        await supabase
          .from("profiles")
          .select("name, phone_number, role, deleted_at")
          .eq("id", data.user.id)
          .single();

      let profileResult = await fetchProfile();
      if (profileResult.error && isAbortLikeError(profileResult.error)) {
        // 네트워크/브라우저 순간 중단에 대비해 1회 재시도
        await new Promise((resolve) => window.setTimeout(resolve, 300));
        profileResult = await fetchProfile();
      }

      const { data: profile, error: profileError } = profileResult;

      if (profileError) {
        if (profileError.code === "PGRST116") {
          router.replace("/auth/onboarding");
        } else if (isAbortLikeError(profileError)) {
          setError("네트워크가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요.");
        } else {
          console.error("[login] profile lookup", {
            status: 500,
            message: "profile lookup failed",
          });
          setError("로그인 정보를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.");
        }
        setLoading(false);
        return;
      }

      // 탈퇴한 계정인지 확인 (deleted_at이 설정된 경우)
      if (profile.deleted_at) {
        const restoreSessionRes = await fetch("/api/auth/create-restore-session", {
          method: "POST",
        });
        await supabase.auth.signOut();

        if (!restoreSessionRes.ok) {
          setLoading(false);
          setError("복구 정보를 확인할 수 없습니다. 다시 로그인해주세요.");
          return;
        }

        router.replace("/auth/restore");
        return;
      }

      setLoading(false);

      if (profile.role === "admin") {
        router.replace("/admin");
        setTimeout(() => router.refresh(), 100);
        return;
      }

      if (profile.role === "agent_pending") {
        router.replace(nextPath ?? "/");
        router.refresh();
        return;
      }

      const isMissingInfo =
        !profile.name || profile.name === "temp" || !profile.phone_number;

      if (isMissingInfo) {
        router.replace("/auth/onboarding");
      } else {
        router.replace(nextPath ?? "/");
        router.refresh();
      }
    } catch (err: unknown) {
      setLoading(false);
      if (isAbortLikeError(err)) {
        setError("네트워크가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요.");
        return;
      }
      setError(toKoreanErrorMessage(err, "로그인 중 오류가 발생했습니다."));
    }
  }

  async function handleOAuthLogin(provider: "google") {
    try {
      setLoading(true);
      setError(null);
      clearAllErrors();
      trackEvent("login_click", { method: provider });
      window.location.assign("/api/auth/google/login");
    } catch (err) {
      if (isAbortLikeError(err)) {
        setError("네트워크가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요.");
        setLoading(false);
        return;
      }
      setError("소셜 로그인 중 오류가 발생했습니다.");
      setLoading(false);
    }
  }

  // MVP: 네이버 로그인 비활성화
  // function handleNaverLogin() {
  //   setLoading(true);
  //   setError(null);
  //   clearAllErrors();
  //   trackEvent("login_click", { method: "naver" });
  //   window.location.href = "/api/auth/naver/login";
  // }

  // 계정 복구 처리
  async function handleRestoreAccount() {
    if (!deletedAccountInfo) return;
    const checkData = await checkDeletedAccount(deletedAccountInfo.email);

    if (!checkData.isDeleted || !checkData.restoreToken) {
      throw new Error("계정 복구 정보를 확인할 수 없습니다.");
    }

    const res = await fetch("/api/auth/restore-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restoreToken: checkData.restoreToken,
        email: deletedAccountInfo.email,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "계정 복구에 실패했습니다.");
    }

    // 복구 성공 - 다시 로그인 시도
    setRestoreModalOpen(false);
    showAlert("계정이 복구되었습니다. 다시 로그인해주세요.");
  }

  // 새로 가입 처리 (기존 계정 삭제)
  async function handleRecreateAccount() {
    if (!deletedAccountInfo) return;
    const checkData = await checkDeletedAccount(deletedAccountInfo.email);

    if (!checkData.isDeleted || !checkData.restoreToken) {
      throw new Error("계정 처리 정보를 확인할 수 없습니다.");
    }

    const res = await fetch("/api/auth/delete-and-recreate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restoreToken: checkData.restoreToken }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "계정 처리에 실패했습니다.");
    }

    // 삭제 성공 - 회원가입 페이지로 이동
    setRestoreModalOpen(false);
    showAlert("새로 가입을 진행해주세요.");
    router.push("/auth/signup");
  }

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

  useEffect(() => {
    if (!error) return;

    errorConfirmButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== "NumpadEnter") return;
      event.preventDefault();
      event.stopPropagation();
      setError(null);
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [error]);

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

          <div className="relative">
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

                  el.focus?.();
                  const msg = validationMessageFor(el, field);

                  if (field === "email") {
                    setEmailError(msg);
                  } else if (field === "password") {
                    setPasswordError(msg);
                  }
                }}
              >
                <FormInput
                  name="email"
                  type="email"
                  autoFocus
                  required
                  label="이메일"
                  error={emailError ?? undefined}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError(null);
                  }}
                  onFocus={() => setEmailError(null)}
                  placeholder={Copy.auth.placeholder.email}
                  autoComplete="email"
                />

                <FormInput
                  ref={passwordInputRef}
                  name="password"
                  type="password"
                  required
                  label="비밀번호"
                  error={passwordError ?? undefined}
                  onChange={() => setPasswordError(null)}
                  onFocus={() => setPasswordError(null)}
                  placeholder={Copy.auth.placeholder.passwordConfirm}
                  autoComplete="current-password"
                />
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

          </div>

          <div className="mt-4 text-center ob-typo-body text-(--oboon-text-muted)">
            아직 오분 회원이 아닌가요?
            <button
              type="button"
              className="
                mx-1
                cursor-pointer
                disabled:cursor-not-allowed
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
                  ref={errorConfirmButtonRef}
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

          {/* 소셜 로그인 banned - 이메일 입력 모달 */}
          <Modal
            open={bannedEmailModalOpen}
            onClose={() => setBannedEmailModalOpen(false)}
          >
            <div className="space-y-3">
              <div className="ob-typo-h2 text-(--oboon-text-title)">
                탈퇴한 계정 복구
              </div>
              <div className="ob-typo-body text-(--oboon-text-muted)">
                소셜 로그인에 사용한 계정이 이전에 탈퇴 처리되었습니다.
                <br />
                계정을 복구하려면 이메일을 입력해주세요.
              </div>
              <div>
                <Label>이메일</Label>
                <Input
                  type="email"
                  value={bannedEmail}
                  onChange={(e) => setBannedEmail(e.target.value)}
                  placeholder={Copy.auth.placeholder.recoveryEmail}
                  autoComplete="email"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="secondary"
                  shape="pill"
                  className="flex-1 justify-center"
                  onClick={() => setBannedEmailModalOpen(false)}
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  shape="pill"
                  className="flex-1 justify-center"
                  onClick={handleCheckBannedAccount}
                  loading={checkingBanned}
                  disabled={checkingBanned}
                >
                  확인
                </Button>
              </div>
            </div>
          </Modal>

          {/* 탈퇴 계정 복구/재가입 모달 */}
          <RestoreAccountModal
            open={restoreModalOpen}
            onClose={() => setRestoreModalOpen(false)}
            email={deletedAccountInfo?.email ?? ""}
            onRestore={handleRestoreAccount}
            onRecreate={handleRecreateAccount}
          />
        </div>
      </PageContainer>
    </main>
  );
}
