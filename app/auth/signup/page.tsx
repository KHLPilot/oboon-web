"use client";

import { FormEvent, useState, useEffect, useRef } from "react";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { validateName, validateNickname, validatePhone, validatePassword, sanitizeInput } from "@/lib/validators/profileValidation";

export default function SignupPage() {
  const supabase = createSupabaseClient();
  const router = useRouter();

  // 상태 관리
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [userType, setUserType] = useState<"personal" | "company">("personal");

  // 프로세스 제어 상태
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 폴링 관련 상태
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 비밀번호 UI 상태
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState(true);

  // ✅ 검증 에러
  const [errors, setErrors] = useState<{
    name?: string;
    nickname?: string;
    phone?: string;
    password?: string;
  }>({});

  // 비밀번호 일치 확인
  useEffect(() => {
    if (passwordConfirm) {
      setPasswordMatch(password === passwordConfirm);
    } else {
      setPasswordMatch(true);
    }
  }, [password, passwordConfirm]);

  // 페이지 로드 시 세션 체크
  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, phone_number")
          .eq("id", session.user.id)
          .single();

        if (profile && profile.name && profile.phone_number) {
          router.replace("/");
        } else {
          router.replace("/auth/onboarding");
        }
      }
    }
    checkSession();
  }, [supabase, router]);

  // 토큰 기반 폴링
  useEffect(() => {
    if (!isEmailSent || !verificationToken || isVerified) return;

    console.log("🔄 인증 폴링 시작...");

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/auth/check-verification?token=${verificationToken}`);
        const data = await response.json();

        if (data.verified) {
          console.log("✅ 이메일 인증 확인됨! 로그인 시도...");

          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
          });

          if (!signInError) {
            console.log("✅ 로그인 성공! 입력란 활성화");
            setIsVerified(true);
            setIsEmailSent(false);

            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
            }
          }
        }
      } catch (err) {
        console.error("❌ 인증 확인 중 오류:", err);
      }
    }, 3000);

    const timeout = setTimeout(() => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        setError("인증 시간이 초과되었습니다. 다시 시도해주세요.");
        setIsEmailSent(false);
      }
    }, 10 * 60 * 1000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      clearTimeout(timeout);
    };
  }, [isEmailSent, verificationToken, isVerified, supabase, email, password]);

  // ✅ Caps Lock 감지
  function handleKeyEvent(e: React.KeyboardEvent) {
    setCapsLockOn(e.getModifierState("CapsLock"));
  }

  // ✅ 실시간 입력 제한
  const handleNameChange = (value: string) => {
    const sanitized = sanitizeInput(value, "name");
    setName(sanitized);
    if (errors.name) {
      setErrors(prev => ({ ...prev, name: undefined }));
    }
  };

  const handleNicknameChange = (value: string) => {
    const sanitized = sanitizeInput(value, "nickname");
    setNickname(sanitized);
    if (errors.nickname) {
      setErrors(prev => ({ ...prev, nickname: undefined }));
    }
  };

  const handlePhoneChange = (value: string) => {
    const sanitized = sanitizeInput(value, "phone");
    setPhoneNumber(sanitized);
    if (errors.phone) {
      setErrors(prev => ({ ...prev, phone: undefined }));
    }
  };

  // ✅ 이메일 인증 메일 보내기
  async function handleSendVerification() {
    if (!email || !password) {
      alert("이메일과 비밀번호를 먼저 입력해주세요.");
      return;
    }

    // ✅ 비밀번호 검증
    const passwordError = validatePassword(password);
    if (passwordError) {
      setErrors(prev => ({ ...prev, password: passwordError }));
      alert(passwordError);
      return;
    }

    if (!passwordMatch) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 이메일 중복 체크
      const checkResponse = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const { exists, confirmed } = await checkResponse.json();

      if (exists && confirmed) {
        setError("이미 가입된 이메일입니다. 로그인해주세요.");
        setLoading(false);
        setTimeout(() => router.push("/auth/login"), 5000);
        return;
      }

      if (exists && !confirmed) {
        await fetch("/api/auth/cleanup-temp-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
      }

      // 회원가입 시도
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            user_type: userType
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("Email rate limit exceeded")) {
          const match = signUpError.message.match(/(\d+)\s*second/);
          const seconds = match ? match[1] : "60";
          setError(`인증 요청이 너무 많습니다. ${seconds}초 후에 다시 시도해주세요.`);
          return;
        }

        setError("인증 실패: " + signUpError.message);
        return;
      }

      if (data.user) {
        const tokenResponse = await fetch("/api/auth/create-verification-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: data.user.id,
            email: data.user.email
          }),
        });

        const { token } = await tokenResponse.json();
        setVerificationToken(token);
        setIsEmailSent(true);

        alert(
          "인증 메일이 발송되었습니다.\n\n" +
          "📧 메일함을 확인하여 인증 링크를 클릭하세요.\n" +
          "⚠️ 스팸함도 확인해주세요!"
        );
      }
    } catch (err: any) {
      console.error(err);
      setError("오류가 발생했습니다: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleManualCheck() {
    if (!verificationToken) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/auth/check-verification?token=${verificationToken}`);
      const data = await response.json();

      if (data.verified) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (!signInError) {
          setIsVerified(true);
          setIsEmailSent(false);
          alert("✅ 인증이 확인되었습니다!");
        } else {
          alert("로그인 중 오류가 발생했습니다: " + signInError.message);
        }
      } else {
        alert("아직 인증이 완료되지 않았습니다. 메일함을 확인해주세요.");
      }
    } catch (err: any) {
      alert("확인 중 오류가 발생했습니다: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // ✅ 최종 제출 (검증 추가)
  async function handleFinalSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // ✅ 검증
      const newErrors: typeof errors = {};

      const nameError = validateName(name);
      if (nameError) newErrors.name = nameError;

      if (nickname) {
        const nicknameError = validateNickname(nickname);
        if (nicknameError) newErrors.nickname = nicknameError;
      }

      const phoneError = validatePhone(phoneNumber);
      if (phoneError) newErrors.phone = phoneError;

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setLoading(false);
        alert("입력 정보를 확인해주세요.");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("인증 세션이 만료되었습니다. 다시 시도해주세요.");

      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          name: name,
          full_name: name,
          nickname: nickname || null,
          phone_number: phoneNumber,
          user_type: userType
        }
      });
      if (authUpdateError) throw authUpdateError;

      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: user.email,
          name: name,
          nickname: nickname || null,
          phone_number: phoneNumber,
          user_type: userType,
          role: "user",
        });

      if (upsertError) throw upsertError;

      alert("회원가입이 완료되었습니다!");
      router.push("/");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setError("최종 등록 실패: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "var(--oboon-bg-page)" }}>
      <div className="w-full max-w-md rounded-2xl border p-8 shadow-card" style={{ backgroundColor: "var(--oboon-bg-surface)", borderColor: "var(--oboon-border-default)" }}>
        <h1 className="text-2xl font-bold text-center mb-1" style={{ color: "var(--oboon-text-title)" }}>회원가입</h1>
        <p className="text-xs text-center mb-2" style={{ color: "var(--oboon-text-muted)" }}>이메일 인증 후 상세 정보를 입력해주세요</p>

        <div className="text-center mb-6">
          <span className="text-xs" style={{ color: "var(--oboon-text-muted)" }}>이미 계정이 있으신가요? </span>
          <Link href="/auth/login" className="text-xs font-semibold hover:underline" style={{ color: "var(--oboon-primary)" }}>
            로그인
          </Link>
        </div>

        <div className="space-y-6">
          <div className="space-y-3 p-4 rounded-xl border" style={{ backgroundColor: "var(--oboon-bg-subtle)", borderColor: "var(--oboon-border-default)" }}>
            <div className="space-y-1">
              <label className="text-xs ml-1 font-semibold" style={{ color: "var(--oboon-text-body)" }}>이메일 주소</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-lg border px-4 py-2 text-sm outline-none disabled:opacity-50"
                  style={{
                    backgroundColor: "var(--oboon-bg-surface)",
                    borderColor: "var(--oboon-border-default)",
                    color: "var(--oboon-text-body)"
                  }}
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isVerified || isEmailSent}
                />
                <button
                  type="button"
                  onClick={handleSendVerification}
                  disabled={isVerified || isEmailSent || loading}
                  className="px-4 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ob-btn ob-btn-sm ob-btn-round ob-btn-primary"
                >
                  {isVerified ? "인증완료" : isEmailSent ? "인증중..." : "인증하기"}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs ml-1 font-semibold" style={{ color: "var(--oboon-text-body)" }}>비밀번호 설정</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-lg border px-4 py-2 pr-10 text-sm outline-none disabled:opacity-50"
                  style={{
                    backgroundColor: "var(--oboon-bg-surface)",
                    borderColor: "var(--oboon-border-default)",
                    color: "var(--oboon-text-body)"
                  }}
                  placeholder="대소문자+숫자+특수문자 8자 이상"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyEvent}
                  onKeyUp={handleKeyEvent}
                  disabled={isVerified || isEmailSent}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:opacity-70"
                  style={{ color: "var(--oboon-text-muted)" }}
                  disabled={isVerified || isEmailSent}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[10px] ml-1" style={{ color: "var(--oboon-danger)" }}>
                  ❌ {errors.password}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs ml-1 font-semibold" style={{ color: "var(--oboon-text-body)" }}>비밀번호 확인</label>
              <div className="relative">
                <input
                  type={showPasswordConfirm ? "text" : "password"}
                  className="w-full rounded-lg border px-4 py-2 pr-10 text-sm outline-none disabled:opacity-50"
                  style={{
                    backgroundColor: "var(--oboon-bg-surface)",
                    borderColor: passwordMatch ? "var(--oboon-border-default)" : "var(--oboon-danger)",
                    color: "var(--oboon-text-body)"
                  }}
                  placeholder="••••••••"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  onKeyDown={handleKeyEvent}
                  onKeyUp={handleKeyEvent}
                  disabled={isVerified || isEmailSent}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:opacity-70"
                  style={{ color: "var(--oboon-text-muted)" }}
                  disabled={isVerified || isEmailSent}
                >
                  {showPasswordConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {!passwordMatch && passwordConfirm && (
                <p className="text-[10px] ml-1" style={{ color: "var(--oboon-danger)" }}>
                  ❌ 비밀번호가 일치하지 않습니다
                </p>
              )}
              {passwordMatch && passwordConfirm && (
                <p className="text-[10px] ml-1" style={{ color: "var(--oboon-success)" }}>
                  ✅ 비밀번호가 일치합니다
                </p>
              )}
              <div className="h-4 ml-1">
                {capsLockOn && (
                  <p className="text-[10px] flex items-center gap-1" style={{ color: "var(--oboon-warning)" }}>
                    ⚠️ Caps Lock이 켜져 있습니다
                  </p>
                )}
              </div>
            </div>

            {isEmailSent && !isVerified && (
              <div className="space-y-3 mt-3">
                <div className="flex items-center gap-2 text-[11px] animate-pulse" style={{ color: "var(--oboon-primary)" }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--oboon-primary)" }}></span>
                  이메일 인증 대기중... (자동으로 확인됩니다)
                </div>

                <div className="text-[10px] p-3 rounded-lg space-y-1" style={{ backgroundColor: "var(--oboon-bg-surface)", color: "var(--oboon-text-muted)" }}>
                  <div>⚠️ <strong>스팸함도 확인</strong>해주세요!</div>
                </div>

                <button
                  type="button"
                  onClick={handleManualCheck}
                  disabled={loading}
                  className="w-full py-2 text-xs rounded-lg border transition hover:bg-opacity-80"
                  style={{
                    borderColor: "var(--oboon-border-default)",
                    color: "var(--oboon-text-body)",
                    backgroundColor: "var(--oboon-bg-surface)"
                  }}
                >
                  ✅ 인증 완료했는데 안넘어가나요? 여기를 클릭하세요
                </button>
              </div>
            )}
          </div>

          <form
            onSubmit={handleFinalSubmit}
            className={`space-y-4 transition-opacity duration-300 ${!isVerified ? "opacity-30 pointer-events-none" : "opacity-100"}`}
          >
            <div className="space-y-1">
              <label className="text-xs ml-1 font-semibold" style={{ color: "var(--oboon-text-body)" }}>이름 (실명) *</label>
              <input
                className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none"
                style={{
                  backgroundColor: "var(--oboon-bg-subtle)",
                  borderColor: errors.name ? "var(--oboon-danger)" : "var(--oboon-border-default)",
                  color: "var(--oboon-text-body)"
                }}
                placeholder="김오분 (한글/영문 2-20자)"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required={isVerified}
                maxLength={20}
              />
              {errors.name && (
                <p className="text-xs text-red-500 mt-1">{errors.name}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs ml-1 font-semibold" style={{ color: "var(--oboon-text-body)" }}>
                닉네임
              </label>
              <input
                className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none"
                style={{
                  backgroundColor: "var(--oboon-bg-subtle)",
                  borderColor: errors.nickname ? "var(--oboon-danger)" : "var(--oboon-border-default)",
                  color: "var(--oboon-text-body)"
                }}
                placeholder="오분이 (선택, 2-15자)"
                value={nickname}
                onChange={(e) => handleNicknameChange(e.target.value)}
                maxLength={15}
              />
              {errors.nickname && (
                <p className="text-xs text-red-500 mt-1">{errors.nickname}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs ml-1 font-semibold" style={{ color: "var(--oboon-text-body)" }}>휴대폰 번호 *</label>
              <input
                className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none"
                style={{
                  backgroundColor: "var(--oboon-bg-subtle)",
                  borderColor: errors.phone ? "var(--oboon-danger)" : "var(--oboon-border-default)",
                  color: "var(--oboon-text-body)"
                }}
                placeholder="01012345678"
                value={phoneNumber}
                onChange={(e) => handlePhoneChange(e.target.value)}
                required={isVerified}
                maxLength={13}
              />
              {errors.phone && (
                <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs ml-1 font-semibold" style={{ color: "var(--oboon-text-body)" }}>회원 유형</label>
              <select
                className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none"
                style={{
                  backgroundColor: "var(--oboon-bg-subtle)",
                  borderColor: "var(--oboon-border-default)",
                  color: "var(--oboon-text-body)"
                }}
                value={userType}
                onChange={(e) => setUserType(e.target.value as any)}
              >
                <option value="personal">개인 회원</option>
                <option value="company">기업 회원</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={!isVerified || loading}
              className="w-full py-4 font-bold rounded-xl mt-6 transition-all active:scale-95 ob-btn ob-btn-md ob-btn-primary"
              style={{ boxShadow: "var(--oboon-shadow-card)" }}
            >
              {loading ? "가입 처리 중..." : "가입 완료 후 시작하기"}
            </button>
          </form>
        </div>

        {error && (
          <div className="mt-4 ob-alert ob-alert-danger text-center text-xs">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}