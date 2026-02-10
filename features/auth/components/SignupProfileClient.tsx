// app/auth/signup/profile/SignupProfileClient.tsx
"use client";

import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createSupabaseClient } from "@/lib/supabaseClient";
import { trackEvent } from "@/lib/analytics";
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


type FieldKey = "name" | "nickname" | "phone";
type FieldErrors = { name?: string; nickname?: string; phone?: string };

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

export default function SignupProfileClient() {
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

  // 역할 선택: 일반 회원(user) 또는 상담사(agent)
  const [selectedRole, setSelectedRole] = useState<"user" | "agent">("user");

  const [errors, setErrors] = useState<FieldErrors>({});

  // 이용약관 동의
  const [agreements, setAgreements] = useState({
    ageCheck: false,        // 만14세 이상
    terms: false,           // 서비스 이용약관
    privacy: false,         // 개인정보 수집·이용
    privacyThirdParty: false, // 개인정보 제3자 제공
    location: false,        // 위치정보 이용
    marketing: false,       // 마케팅 수신
  });
  const [agreementError, setAgreementError] = useState<string | null>(null);

  // 약관 내용 모달
  const [termModal, setTermModal] = useState<{
    open: boolean;
    title: string;
    content: string;
  }>({ open: false, title: "", content: "" });
  const [termLoading, setTermLoading] = useState(false);

  async function openTermModal(termType: string) {
    setTermLoading(true);
    try {
      const res = await fetch(`/api/terms?type=${termType}`);
      const data = await res.json();
      if (res.ok && data.terms && data.terms.length > 0) {
        const term = data.terms[0];
        setTermModal({
          open: true,
          title: term.title,
          content: term.content,
        });
      }
    } catch (err) {
      console.error("약관 조회 오류:", err);
    } finally {
      setTermLoading(false);
    }
  }

  const agreedAll =
    agreements.ageCheck &&
    agreements.terms &&
    agreements.privacy &&
    agreements.privacyThirdParty &&
    agreements.location &&
    agreements.marketing;

  const requiredAgreed =
    agreements.ageCheck &&
    agreements.terms &&
    agreements.privacy &&
    agreements.privacyThirdParty &&
    agreements.location;

  function handleToggle(key: keyof typeof agreements) {
    setAgreements((prev) => ({ ...prev, [key]: !prev[key] }));
    setAgreementError(null);
  }

  function handleToggleAll() {
    const next = !agreedAll;
    setAgreements({
      ageCheck: next,
      terms: next,
      privacy: next,
      privacyThirdParty: next,
      location: next,
      marketing: next,
    });
    setAgreementError(null);
  }

  // FieldErrorBubble
  const cardWrapRef = useRef<HTMLDivElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const nicknameRef = useRef<HTMLInputElement | null>(null);
  const phoneRef = useRef<HTMLInputElement | null>(null);
  const [fieldError, setFieldError] = useState<FieldErrorState<FieldKey>>(null);

  const clearFieldError = () => setFieldError(null);

  const canSubmit = useMemo(
    () => verified && Boolean(email),
    [verified, email],
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
        const res = await fetch(`/api/auth/check-verification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
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
            "자동 로그인에 실패했습니다. 로그인 후 다시 진행해주세요.",
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

      if (!requiredAgreed) {
        setAgreementError("필수 약관에 모두 동의해주세요.");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setFatalError("세션이 없습니다. 로그인 후 다시 진행해주세요.");
        return;
      }

      const userType = selectedRole === "agent" ? "business" : "personal";

      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          name,
          full_name: name,
          nickname: nickname || null,
          phone_number: phoneNumber,
          user_type: userType,
          agreed_terms: agreements.terms,
          agreed_privacy: agreements.privacy,
          agreed_location: agreements.location,
          agreed_marketing: agreements.marketing,
          agreed_at: new Date().toISOString(),
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
        role: selectedRole,
      });
      if (upsertError) throw upsertError;

      // 약관 동의 기록 저장 (법적 증거용)
      const agreedTermTypes = [
        "signup_age_check",
        "signup_terms",
        "signup_privacy",
        "signup_privacy_third_party",
        "signup_location"
      ];
      if (agreements.marketing) {
        agreedTermTypes.push("signup_marketing");
      }

      try {
        await fetch("/api/term-consents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            termTypes: agreedTermTypes,
            context: "signup",
          }),
        });
      } catch (consentErr) {
        // 동의 기록 실패해도 회원가입은 진행 (나중에 재시도 가능)
        console.error("약관 동의 기록 오류:", consentErr);
      }

      trackEvent("signup_complete", { user_type: userType });

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
                      <Label>이름 (실명) *</Label>
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
                          errors.name ? "border-(--oboon-border-danger)" : "",
                        )}
                        aria-invalid={errors.name ? "true" : undefined}
                        aria-describedby={
                          fieldError?.field === "name" ? bubbleId : undefined
                        }
                      />
                    </div>

                    <div>
                      <Label>닉네임 (선택)</Label>
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
                            : "",
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
                      <Label>휴대폰 번호 *</Label>
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
                          errors.phone ? "border-(--oboon-border-danger)" : "",
                        )}
                        aria-invalid={errors.phone ? "true" : undefined}
                        aria-describedby={
                          fieldError?.field === "phone" ? bubbleId : undefined
                        }
                      />
                    </div>

                    {/* 회원 유형 선택 */}
                    <div className="space-y-2">
                      <Label>회원 유형 *</Label>
                      <div className="flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="role"
                            value="user"
                            checked={selectedRole === "user"}
                            onChange={() => setSelectedRole("user")}
                            disabled={!canSubmit || loading}
                            className="h-4 w-4 accent-(--oboon-primary)"
                          />
                          <span className="ob-typo-body text-(--oboon-text-title)">
                            일반 회원
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="role"
                            value="agent"
                            checked={selectedRole === "agent"}
                            onChange={() => setSelectedRole("agent")}
                            disabled={!canSubmit || loading}
                            className="h-4 w-4 accent-(--oboon-primary)"
                          />
                          <span className="ob-typo-body text-(--oboon-text-title)">
                            분양 상담사
                          </span>
                        </label>
                      </div>
                      {selectedRole === "agent" && (
                        <p className="ob-typo-caption text-(--oboon-text-muted)">
                          상담사로 가입하시면 분양 현장에 소속 신청이 가능합니다.
                        </p>
                      )}
                    </div>

                    {/* 이용약관 동의 */}
                    <div className="space-y-2 pt-1">
                      <Label>이용약관 동의</Label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={agreedAll}
                          onChange={handleToggleAll}
                          disabled={!canSubmit || loading}
                          className="h-4 w-4 rounded border-(--oboon-border-default) accent-(--oboon-primary)"
                        />
                        <span className="ob-typo-body text-(--oboon-text-title) font-medium">
                          전체 동의
                        </span>
                      </label>

                      <div className="ml-6 space-y-1.5">
                        {/* 1. 만14세 이상 확인 */}
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={agreements.ageCheck}
                              onChange={() => handleToggle("ageCheck")}
                              disabled={!canSubmit || loading}
                              className="h-4 w-4 rounded border-(--oboon-border-default) accent-(--oboon-primary)"
                            />
                            <span className="ob-typo-caption text-(--oboon-text-muted)">
                              [필수] 만 14세 이상입니다
                            </span>
                          </label>
                        </div>

                        {/* 2. 서비스 이용약관 */}
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={agreements.terms}
                              onChange={() => handleToggle("terms")}
                              disabled={!canSubmit || loading}
                              className="h-4 w-4 rounded border-(--oboon-border-default) accent-(--oboon-primary)"
                            />
                            <span className="ob-typo-caption text-(--oboon-text-muted)">
                              [필수] 서비스 이용약관 동의
                            </span>
                          </label>
                          <button
                            type="button"
                            onClick={() => openTermModal("signup_terms")}
                            disabled={termLoading}
                            className="ob-typo-caption text-(--oboon-primary) hover:underline"
                          >
                            보기
                          </button>
                        </div>

                        {/* 3. 개인정보 수집·이용 */}
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={agreements.privacy}
                              onChange={() => handleToggle("privacy")}
                              disabled={!canSubmit || loading}
                              className="h-4 w-4 rounded border-(--oboon-border-default) accent-(--oboon-primary)"
                            />
                            <span className="ob-typo-caption text-(--oboon-text-muted)">
                              [필수] 개인정보 수집·이용 동의
                            </span>
                          </label>
                          <button
                            type="button"
                            onClick={() => openTermModal("signup_privacy")}
                            disabled={termLoading}
                            className="ob-typo-caption text-(--oboon-primary) hover:underline"
                          >
                            보기
                          </button>
                        </div>

                        {/* 4. 개인정보 제3자 제공 */}
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={agreements.privacyThirdParty}
                              onChange={() => handleToggle("privacyThirdParty")}
                              disabled={!canSubmit || loading}
                              className="h-4 w-4 rounded border-(--oboon-border-default) accent-(--oboon-primary)"
                            />
                            <span className="ob-typo-caption text-(--oboon-text-muted)">
                              [필수] 개인정보 제3자 제공 동의
                            </span>
                          </label>
                          <button
                            type="button"
                            onClick={() => openTermModal("signup_privacy_third_party")}
                            disabled={termLoading}
                            className="ob-typo-caption text-(--oboon-primary) hover:underline"
                          >
                            보기
                          </button>
                        </div>

                        {/* 5. 위치정보 이용 */}
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={agreements.location}
                              onChange={() => handleToggle("location")}
                              disabled={!canSubmit || loading}
                              className="h-4 w-4 rounded border-(--oboon-border-default) accent-(--oboon-primary)"
                            />
                            <span className="ob-typo-caption text-(--oboon-text-muted)">
                              [필수] 위치정보 이용 동의
                            </span>
                          </label>
                          <button
                            type="button"
                            onClick={() => openTermModal("signup_location")}
                            disabled={termLoading}
                            className="ob-typo-caption text-(--oboon-primary) hover:underline"
                          >
                            보기
                          </button>
                        </div>

                        {/* 6. 마케팅 수신 (선택) */}
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={agreements.marketing}
                              onChange={() => handleToggle("marketing")}
                              disabled={!canSubmit || loading}
                              className="h-4 w-4 rounded border-(--oboon-border-default) accent-(--oboon-primary)"
                            />
                            <span className="ob-typo-caption text-(--oboon-text-muted)">
                              [선택] 마케팅 정보 수신 동의
                            </span>
                          </label>
                          <button
                            type="button"
                            onClick={() => openTermModal("signup_marketing")}
                            disabled={termLoading}
                            className="ob-typo-caption text-(--oboon-primary) hover:underline"
                          >
                            보기
                          </button>
                        </div>
                      </div>

                      {agreementError ? (
                        <p className="ob-typo-caption text-(--oboon-danger)">
                          {agreementError}
                        </p>
                      ) : null}
                    </div>

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

          {/* 약관 내용 모달 */}
          <Modal
            open={termModal.open}
            onClose={() => setTermModal({ open: false, title: "", content: "" })}
          >
            <div className="space-y-3">
              <div className="ob-typo-h3 text-(--oboon-text-title)">
                {termModal.title}
              </div>
              <div
                className="ob-typo-caption text-(--oboon-text-muted) whitespace-pre-wrap max-h-80 overflow-y-auto"
              >
                {termModal.content}
              </div>
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  shape="pill"
                  className="w-full justify-center"
                  onClick={() => setTermModal({ open: false, title: "", content: "" })}
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
