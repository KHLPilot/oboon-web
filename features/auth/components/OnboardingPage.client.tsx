"use client";

import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseClient } from "@/lib/supabaseClient";
import {
  sanitizeInput,
  validateName,
  validateNickname,
  validatePhone,
} from "@/lib/validators/profileValidation";
import { validateRequiredOrShowModal } from "@/shared/validationMessage";

import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Modal from "@/components/ui/Modal";
import FieldErrorBubble, {
  FieldErrorState,
} from "@/components/ui/FieldErrorBubble";

type FieldKey = "name" | "nickname" | "phone" | "generic";
type FieldErrors = { name?: string; nickname?: string; phone?: string };

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

export default function OnboardingPage() {
  const supabase = createSupabaseClient();
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");

  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedRole, setSelectedRole] = useState<"user" | "agent">("user");

  const [loading, setLoading] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  // 이용약관 동의
  const [agreements, setAgreements] = useState({
    terms: false,
    privacy: false,
    location: false,
    marketing: false,
  });
  const [agreementError, setAgreementError] = useState<string | null>(null);

  const agreedAll =
    agreements.terms &&
    agreements.privacy &&
    agreements.location &&
    agreements.marketing;

  const requiredAgreed =
    agreements.terms && agreements.privacy && agreements.location;

  function handleToggle(key: keyof typeof agreements) {
    setAgreements((prev) => ({ ...prev, [key]: !prev[key] }));
    setAgreementError(null);
  }

  function handleToggleAll() {
    const next = !agreedAll;
    setAgreements({
      terms: next,
      privacy: next,
      location: next,
      marketing: next,
    });
    setAgreementError(null);
  }

  // 닉네임 중복 체크
  const [nicknameChecking, setNicknameChecking] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(
    null,
  );
  const [nicknameFormatError, setNicknameFormatError] = useState<string | null>(
    null,
  );

  // 약관 전문보기 모달
  const [termModal, setTermModal] = useState<{
    title: string;
    content: string;
  } | null>(null);
  const [termLoading, setTermLoading] = useState(false);

  // FieldErrorBubble
  const cardWrapRef = useRef<HTMLDivElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const nicknameRef = useRef<HTMLInputElement | null>(null);
  const phoneRef = useRef<HTMLInputElement | null>(null);
  const [fieldError, setFieldError] = useState<FieldErrorState<FieldKey>>(null);

  const bubbleId = "onboarding-field-error";

  const clearFieldError = () => setFieldError(null);

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

  const setSanitized =
    (field: "name" | "nickname" | "phone") => (value: string) => {
      const sanitized = sanitizeInput(value, field);

      if (field === "name") setName(sanitized);
      if (field === "nickname") {
        setNickname(sanitized);
        setNicknameAvailable(null);
        setNicknameFormatError(null);
      }
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

  // 유저 로드 + 기존 프로필 확인
  useEffect(() => {
    let ignore = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (ignore) return;

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      setUserId(user.id);
      setEmail(user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, nickname, phone_number, user_type")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      // 이미 완성된 프로필 → 홈
      if (profile.name && profile.phone_number) {
        router.replace("/");
        return;
      }

      // NULL이 아닌 값만 미리 채움
      if (profile.name) setName(profile.name);
      if (profile.nickname) setNickname(profile.nickname);
      if (profile.phone_number) setPhoneNumber(profile.phone_number);
    })();

    return () => {
      ignore = true;
    };
  }, [supabase, router]);

  const canSubmit = useMemo(() => Boolean(userId && email), [userId, email]);

  // 다른 계정으로 로그인 (로그아웃)
  async function handleSwitchAccount() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  // 약관 전문보기
  async function openTermDetail(type: string, title: string) {
    setTermLoading(true);
    try {
      const res = await fetch(`/api/terms?type=${type}`);
      const { terms } = await res.json();
      if (terms?.[0]) {
        setTermModal({ title, content: terms[0].content });
      } else {
        setFatalError("약관 내용을 불러올 수 없습니다.");
      }
    } catch {
      setFatalError("약관 내용을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setTermLoading(false);
    }
  }

  // 닉네임 중복 체크
  const checkNickname = async () => {
    clearFieldError();
    setNicknameFormatError(null);

    if (!validateRequiredOrShowModal(nickname, "닉네임")) {
      setNicknameAvailable(null);
      return;
    }

    const nicknameValidationError = validateNickname(nickname);
    if (nicknameValidationError) {
      setNicknameAvailable(null);
      setNicknameFormatError(nicknameValidationError);
      return;
    }

    setNicknameChecking(true);

    try {
      const response = await fetch("/api/profile/check-nickname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, currentUserId: userId }),
      });

      const json = await response.json();
      const available = Boolean(json?.available);

      setNicknameAvailable(available);
    } catch {
      setFatalError("닉네임 중복 확인 중 오류가 발생했습니다.");
    } finally {
      setNicknameChecking(false);
    }
  };

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

      // 닉네임 필수 검증
      if (!nickname) {
        nextErrors.nickname = "닉네임을 입력해주세요.";
      } else {
        const nicknameError = validateNickname(nickname);
        if (nicknameError) nextErrors.nickname = nicknameError;
      }

      const phoneError = validatePhone(phoneNumber);
      if (phoneError) nextErrors.phone = phoneError;

      if (Object.keys(nextErrors).length) {
        setErrors(nextErrors);

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

      // 닉네임 중복확인 필수
      if (nicknameAvailable === null) {
        openFieldError("nickname", "닉네임 중복 확인을 먼저 해주세요.");
        return;
      }
      if (nicknameAvailable === false) {
        openFieldError("nickname", "이미 사용 중인 닉네임입니다.");
        return;
      }
      if (nicknameFormatError) {
        openFieldError("nickname", nicknameFormatError);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setFatalError("인증 세션이 만료되었습니다. 다시 로그인해주세요.");
        return;
      }

      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          name,
          full_name: name,
          nickname: nickname || null,
          phone_number: phoneNumber,
          user_type: selectedRole === "agent" ? "business" : "personal",
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
        user_type: selectedRole === "agent" ? "business" : "personal",
        role: selectedRole,
      });
      if (upsertError) throw upsertError;

      router.replace("/");
      router.refresh();
    } catch (err: any) {
      setFatalError("프로필 저장 실패: " + (err?.message ?? "알 수 없는 오류"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh overflow-x-hidden bg-(--oboon-bg-page) text-(--oboon-text-title)">
      {/* 배경은 signup/profile과 동일 톤 (필요없으면 제거 가능) */}
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
              프로필 완성하기
            </div>
            <p className="mt-0.5 sm:mt-1 ob-typo-h4 leading-[1.6] text-(--oboon-text-muted)">
              서비스 이용을 위해 추가 정보를 입력해주세요
            </p>
            {email ? (
              <div className="mt-4">
                <p className="ob-typo-body text-(--oboon-text-title)">{email}</p>
                <button
                  type="button"
                  className="mt-2 ob-typo-caption text-(--oboon-text-muted) underline underline-offset-4 hover:text-(--oboon-primary) transition-colors"
                  onClick={handleSwitchAccount}
                  disabled={loading}
                >
                  다른 계정으로 로그인
                </button>
              </div>
            ) : null}
          </div>

          {/* Card */}
          <div ref={cardWrapRef} className="relative">
            <Card className="p-5 border border-(--oboon-border-default)">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 이메일 (읽기 전용) */}
                <div>
                  <Label>이메일 주소</Label>
                  <Input
                    value={email}
                    disabled
                    className="bg-(--oboon-bg-subtle) text-(--oboon-text-muted)"
                  />
                </div>

                {/* 이름 */}
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
                      errors.name ? "border-(--oboon-border-danger)" : "",
                    )}
                    aria-invalid={errors.name ? "true" : undefined}
                    aria-describedby={
                      fieldError?.field === "name" ? bubbleId : undefined
                    }
                  />
                </div>

                {/* 닉네임 + 중복확인 */}
                <div>
                  <Label>닉네임 *</Label>

                  <div className="flex gap-2">
                    <Input
                      ref={nicknameRef}
                      value={nickname}
                      onChange={(e) => setSanitized("nickname")(e.target.value)}
                      onFocus={clearFieldError}
                      placeholder="오분이"
                      maxLength={15}
                      disabled={!canSubmit || loading}
                      className={cx(
                        "flex-1",
                        errors.nickname ? "border-(--oboon-border-danger)" : "",
                      )}
                      aria-invalid={errors.nickname ? "true" : undefined}
                      aria-describedby={
                        fieldError?.field === "nickname" ? bubbleId : undefined
                      }
                    />

                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      shape="pill"
                      className="shrink-0 px-4"
                      onClick={checkNickname}
                      disabled={!nickname || nicknameChecking || loading}
                      loading={nicknameChecking}
                    >
                      중복확인
                    </Button>
                  </div>

                  {nickname ? (
                    <div
                      className={cx(
                        "mt-2 ob-typo-caption",
                        nicknameFormatError || nicknameAvailable === false
                          ? "text-(--oboon-danger)"
                          : nicknameAvailable === true
                            ? "text-(--oboon-success)"
                            : "text-(--oboon-text-muted)",
                      )}
                    >
                      {nicknameFormatError
                        ? nicknameFormatError
                        : nicknameAvailable === true
                          ? "사용 가능한 닉네임입니다."
                          : nicknameAvailable === false
                            ? "이미 사용 중인 닉네임입니다."
                            : "닉네임 중복 확인을 진행해주세요."}
                    </div>
                  ) : null}
                </div>

                {/* 휴대폰 */}
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
                        className="ob-typo-caption text-(--oboon-text-muted) underline underline-offset-2 hover:text-(--oboon-primary) transition-colors"
                        onClick={() =>
                          openTermDetail("signup_terms", "서비스 이용약관")
                        }
                        disabled={termLoading}
                      >
                        전문보기
                      </button>
                    </div>

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
                        className="ob-typo-caption text-(--oboon-text-muted) underline underline-offset-2 hover:text-(--oboon-primary) transition-colors"
                        onClick={() =>
                          openTermDetail(
                            "signup_privacy",
                            "개인정보 수집·이용 동의",
                          )
                        }
                        disabled={termLoading}
                      >
                        전문보기
                      </button>
                    </div>

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
                        className="ob-typo-caption text-(--oboon-text-muted) underline underline-offset-2 hover:text-(--oboon-primary) transition-colors"
                        onClick={() =>
                          openTermDetail("signup_location", "위치정보 이용 동의")
                        }
                        disabled={termLoading}
                      >
                        전문보기
                      </button>
                    </div>

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
                        className="ob-typo-caption text-(--oboon-text-muted) underline underline-offset-2 hover:text-(--oboon-primary) transition-colors"
                        onClick={() =>
                          openTermDetail(
                            "signup_marketing",
                            "마케팅 정보 수신 동의",
                          )
                        }
                        disabled={termLoading}
                      >
                        전문보기
                      </button>
                    </div>
                  </div>

                  {agreementError ? (
                    <p className="ob-typo-caption text-(--oboon-danger)">
                      {agreementError}
                    </p>
                  ) : null}
                </div>

                {/* 제출 */}
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  shape="pill"
                  className="w-full justify-center"
                  disabled={!canSubmit || loading}
                  loading={loading}
                >
                  저장하고 시작하기
                </Button>
              </form>
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

          <Modal
            open={Boolean(fatalError)}
            onClose={() => setFatalError(null)}
            size="sm"
          >
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

          {/* 약관 전문보기 모달 */}
          <Modal
            open={Boolean(termModal)}
            onClose={() => setTermModal(null)}
            size="lg"
          >
            <div className="space-y-3">
              <div className="ob-typo-h2 text-(--oboon-text-title)">
                {termModal?.title}
              </div>
              <div
                className="ob-typo-body text-(--oboon-text-muted) max-h-96 overflow-y-auto whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: termModal?.content ?? "" }}
              />
              <div className="mt-3 pt-3 border-t border-(--oboon-border-default)">
                <Button
                  variant="primary"
                  className="w-full justify-center"
                  onClick={() => setTermModal(null)}
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
