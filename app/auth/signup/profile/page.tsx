// app/auth/signup/profile/page.tsx
"use client";

import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createSupabaseClient } from "@/lib/supabaseClient";
import {
  sanitizeInput,
  validateName,
  validateNickname,
  validatePhone,
} from "@/lib/validators/profileValidation";

import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Modal from "@/components/ui/Modal";
import FieldErrorBubble, {
  FieldErrorState,
} from "@/components/ui/FieldErrorBubble";

import { ChevronDown, Check } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/DropdownMenu";

type UserType = "personal" | "company";
type FieldKey = "name" | "nickname" | "phone" | "userType";
type FieldErrors = { name?: string; nickname?: string; phone?: string };

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

export default function SignupProfilePage() {
  const supabase = createSupabaseClient();
  const router = useRouter();
  const sp = useSearchParams();

  const token = sp.get("token");
  const emailFromQuery = sp.get("email");

  const [checking, setChecking] = useState(true);
  const [verified, setVerified] = useState(false);

  const [autoSigningIn, setAutoSigningIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const [email, setEmail] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [userType, setUserType] = useState<UserType>("personal");

  const [errors, setErrors] = useState<FieldErrors>({});

  // FieldErrorBubble
  const cardWrapRef = useRef<HTMLDivElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const nicknameRef = useRef<HTMLInputElement | null>(null);
  const phoneRef = useRef<HTMLInputElement | null>(null);
  const [fieldError, setFieldError] = useState<FieldErrorState<FieldKey>>(null);

  const clearFieldError = () => setFieldError(null);

  const canSubmit = useMemo(
    () => verified && Boolean(email),
    [verified, email]
  );

  const setSanitized =
    (field: "name" | "nickname" | "phone") => (value: string) => {
      const sanitized = sanitizeInput(value, field);
      if (field === "name") setName(sanitized);
      if (field === "nickname") setNickname(sanitized);
      if (field === "phone") setPhoneNumber(sanitized);

      setErrors((prev) => ({
        ...prev,
        [field === "phone" ? "phone" : field]: undefined,
      }));

      setFieldError((prev) => {
        if (!prev) return prev;
        const mapped = field === "phone" ? "phone" : field;
        return prev.field === mapped ? null : prev;
      });
    };

  // 1) token으로 인증 확인
  useEffect(() => {
    let ignore = false;

    (async () => {
      setFatalError(null);

      if (!token) {
        setChecking(false);
        setVerified(false);
        setFatalError("인증 토큰이 없습니다. 회원가입을 다시 진행해주세요.");
        return;
      }

      try {
        const res = await fetch(
          `/api/auth/check-verification?token=${encodeURIComponent(token)}`
        );
        const json = await res.json();

        if (ignore) return;

        const ok = Boolean(json?.verified);
        setVerified(ok);
        if (!ok) setFatalError("아직 이메일 인증이 완료되지 않았습니다.");
      } catch {
        if (!ignore) setFatalError("인증 확인 중 오류가 발생했습니다.");
      } finally {
        if (!ignore) setChecking(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [token]);

  // 2) verified면 Step1에서 저장한 email/pw로 자동 로그인 시도
  useEffect(() => {
    let ignore = false;

    (async () => {
      if (!verified) return;

      let ssEmail: string | null = null;
      let ssPw: string | null = null;

      try {
        ssEmail = sessionStorage.getItem("oboon_signup_email");
        ssPw = sessionStorage.getItem("oboon_signup_pw");
      } catch {
        // ignore
      }

      const effectiveEmail = ssEmail ?? emailFromQuery ?? null;
      setEmail(effectiveEmail);

      // password 없으면 자동 로그인 불가
      if (!effectiveEmail || !ssPw) return;

      setAutoSigningIn(true);

      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: effectiveEmail,
          password: ssPw,
        });

        if (ignore) return;

        if (error) {
          setFatalError(
            "자동 로그인에 실패했습니다. 로그인 후 다시 진행해주세요."
          );
          return;
        }

        // 로그인 성공 즉시 pw 삭제
        try {
          sessionStorage.removeItem("oboon_signup_pw");
        } catch {
          // ignore
        }
      } finally {
        if (!ignore) setAutoSigningIn(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [verified, emailFromQuery, supabase]);

  const bubbleId = "signup-profile-field-error";

  function openFieldError(field: FieldKey, message: string) {
    const anchorEl =
      field === "name"
        ? nameRef.current
        : field === "nickname"
          ? nicknameRef.current
          : field === "phone"
            ? phoneRef.current
            : null;

    if (!anchorEl) return;
    setFieldError({ field, message, anchorEl });
    anchorEl.focus?.();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setFatalError(null);
    clearFieldError();

    try {
      const nextErrors: FieldErrors = {};

      const nameError = validateName(name);
      if (nameError) nextErrors.name = nameError;

      if (nickname) {
        const nicknameError = validateNickname(nickname);
        if (nicknameError) nextErrors.nickname = nicknameError;
      }

      const phoneError = validatePhone(phoneNumber);
      if (phoneError) nextErrors.phone = phoneError;

      if (Object.keys(nextErrors).length) {
        setErrors(nextErrors);

        // UX: 첫 에러 필드 bubble
        if (nextErrors.name) openFieldError("name", nextErrors.name);
        else if (nextErrors.nickname)
          openFieldError("nickname", nextErrors.nickname);
        else if (nextErrors.phone) openFieldError("phone", nextErrors.phone);

        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setFatalError("세션이 없습니다. 로그인 후 다시 진행해주세요.");
        return;
      }

      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          name,
          full_name: name,
          nickname: nickname || null,
          phone_number: phoneNumber,
          user_type: userType,
        },
      });
      if (authUpdateError) throw authUpdateError;

      const { error: upsertError } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
        name,
        nickname: nickname || null,
        phone_number: phoneNumber,
        user_type: userType,
        role: "user",
      });
      if (upsertError) throw upsertError;

      // cleanup
      try {
        sessionStorage.removeItem("oboon_signup_email");
      } catch {
        // ignore
      }

      router.replace("/");
      router.refresh();
    } catch (err: any) {
      setFatalError(err?.message || "처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh overflow-hidden bg-(--oboon-bg-page) text-(--oboon-text-title)">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_0%,rgba(64,112,255,0.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(800px_500px_at_50%_30%,rgba(0,200,180,0.10),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_700px_at_50%_100%,rgba(255,255,255,0.06),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_40%,rgba(0,0,0,0.55)_100%)]" />
      </div>

      <PageContainer className="relative flex min-h-dvh items-center justify-center pt-0 pb-0 overflow-hidden">
        <div className="w-full max-w-105 -translate-y-4 sm:translate-y-0">
          {/* Header */}
          <div className="mb-4 sm:mb-5 text-center">
            <div className="ob-typo-h1 tracking-[-0.02em] text-(--oboon-text-title)">
              상세 정보 입력{" "}
            </div>
            <p className="mt-0.5 sm:mt-1 ob-typo-h4 leading-[1.6] text-(--oboon-text-muted)">
              상세 정보를 입력해 가입을 마무리합니다.
            </p>
            {email ? (
              <p className="mt-4 ob-typo-body text-(--oboon-text-title)">
                {email}
              </p>
            ) : null}
          </div>

          {/* Card wrapper */}
          <div ref={cardWrapRef} className="relative">
            <Card className="p-5 border border-(--oboon-border-default) relative">
              {checking ? (
                <div className="text-center ob-typo-h4 text-(--oboon-text-title)">
                  인증 상태를 확인하는 중입니다...
                </div>
              ) : !verified ? (
                <div className="text-center ob-typo-h4 text-(--oboon-text-title)">
                  이메일 인증이 아직 완료되지 않았습니다.
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      shape="pill"
                      className="w-full justify-center border border-(--oboon-border-default)"
                      onClick={() => router.replace("/auth/signup")}
                    >
                      인증 다시 하기
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {autoSigningIn ? (
                    <div className="text-center ob-typo-h4 text-(--oboon-text-title)">
                      자동 로그인 중...
                    </div>
                  ) : null}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label className="block mb-2">이름 (실명) *</Label>
                      <Input
                        ref={nameRef}
                        value={name}
                        onChange={(e) => setSanitized("name")(e.target.value)}
                        onFocus={clearFieldError}
                        placeholder="김오분"
                        maxLength={20}
                        disabled={!canSubmit || loading}
                        className={cx(
                          "h-11",
                          errors.name ? "border-(--oboon-border-danger)" : ""
                        )}
                        aria-invalid={errors.name ? "true" : undefined}
                        aria-describedby={
                          fieldError?.field === "name" ? bubbleId : undefined
                        }
                      />
                    </div>

                    <div>
                      <Label className="block mb-2">닉네임 (선택)</Label>
                      <Input
                        ref={nicknameRef}
                        value={nickname}
                        onChange={(e) =>
                          setSanitized("nickname")(e.target.value)
                        }
                        onFocus={clearFieldError}
                        placeholder="오분이"
                        maxLength={15}
                        disabled={!canSubmit || loading}
                        className={cx(
                          "h-11",
                          errors.nickname
                            ? "border-(--oboon-border-danger)"
                            : ""
                        )}
                        aria-invalid={errors.nickname ? "true" : undefined}
                        aria-describedby={
                          fieldError?.field === "nickname"
                            ? bubbleId
                            : undefined
                        }
                      />
                    </div>

                    <div>
                      <Label className="block mb-2">휴대폰 번호 *</Label>
                      <Input
                        ref={phoneRef}
                        value={phoneNumber}
                        onChange={(e) => setSanitized("phone")(e.target.value)}
                        onFocus={clearFieldError}
                        placeholder="01012345678"
                        maxLength={13}
                        disabled={!canSubmit || loading}
                        className={cx(
                          "h-11",
                          errors.phone ? "border-(--oboon-border-danger)" : ""
                        )}
                        aria-invalid={errors.phone ? "true" : undefined}
                        aria-describedby={
                          fieldError?.field === "phone" ? bubbleId : undefined
                        }
                      />
                    </div>
                    <Label className="block mb-2">회원 유형</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          disabled={!canSubmit || loading}
                          className={cx(
                            "h-11 w-full rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-3",
                            "flex items-center justify-between",
                            "outline-none",
                            !canSubmit || loading
                              ? "opacity-60"
                              : "hover:bg-(--oboon-bg-subtle)/60"
                          )}
                        >
                          {userType === "personal" ? "개인 회원" : "기업 회원"}
                          <ChevronDown className="h-4 w-4 text-(--oboon-text-muted)" />
                        </button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="start" className="min-w-60">
                        <DropdownMenuItem
                          onClick={() => setUserType("personal")}
                        >
                          <span className="flex w-full items-center justify-between">
                            <span>개인 회원</span>
                            {userType === "personal" ? (
                              <Check className="h-4 w-4" />
                            ) : null}
                          </span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => setUserType("company")}
                        >
                          <span className="flex w-full items-center justify-between">
                            <span>기업 회원</span>
                            {userType === "company" ? (
                              <Check className="h-4 w-4" />
                            ) : null}
                          </span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      shape="pill"
                      className="w-full justify-center"
                      disabled={!canSubmit || loading}
                      loading={loading}
                    >
                      가입 완료
                    </Button>

                    <div className="pt-1 text-center ob-typo-body text-(--oboon-text-muted)">
                      자동 로그인이 되지 않으면 <br />
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
                      >
                        로그인
                      </button>
                      후 다시 진행해주세요.
                    </div>
                  </form>
                </>
              )}
            </Card>

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
