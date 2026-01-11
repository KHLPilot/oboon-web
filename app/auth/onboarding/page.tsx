"use client";

import { FormEvent, useState, useEffect } from "react";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { validateName, validateNickname, validatePhone, sanitizeInput } from "@/lib/validators/profileValidation";

export default function OnboardingPage() {
  const supabase = createSupabaseClient();
  const router = useRouter();

  // 상태 관리
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [userType, setUserType] = useState<"personal" | "company">("personal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ 검증 에러
  const [errors, setErrors] = useState<{
    name?: string;
    nickname?: string;
    phone?: string;
  }>({});

  // ✅ 닉네임 중복 체크
  const [nicknameChecking, setNicknameChecking] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);

  // ✅ 페이지 로드 시 유저 정보 가져오기
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      setUserId(user.id);
      setEmail(user.email || "");

      // 기존 프로필 확인
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, nickname, phone_number, user_type")
        .eq("id", user.id)
        .single();

      if (profile) {
        // 이미 완성된 프로필 → 홈으로
        if (profile.name && profile.phone_number) {
          router.replace("/");
          return;
        }

        // NULL이 아닌 값만 미리 채우기
        if (profile.name) setName(profile.name);
        if (profile.nickname) setNickname(profile.nickname);
        if (profile.phone_number) setPhoneNumber(profile.phone_number);
        if (profile.user_type) setUserType(profile.user_type);
      }
    }

    loadUser();
  }, [supabase, router]);

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
    setNicknameAvailable(null);
  };

  const handlePhoneChange = (value: string) => {
    const sanitized = sanitizeInput(value, "phone");
    setPhoneNumber(sanitized);
    if (errors.phone) {
      setErrors(prev => ({ ...prev, phone: undefined }));
    }
  };

  // ✅ 닉네임 중복 체크
  const checkNickname = async () => {
    if (!nickname || nickname.trim() === "") {
      setNicknameAvailable(null);
      return;
    }

    // 먼저 형식 검증
    const nicknameError = validateNickname(nickname);
    if (nicknameError) {
      setErrors(prev => ({ ...prev, nickname: nicknameError }));
      return;
    }

    setNicknameChecking(true);

    try {
      const response = await fetch("/api/profile/check-nickname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, currentUserId: userId }),
      });

      const { available } = await response.json();
      setNicknameAvailable(available);

      if (!available) {
        setErrors(prev => ({ ...prev, nickname: "이미 사용 중인 닉네임입니다." }));
      }
    } catch (err) {
      console.error("닉네임 체크 오류:", err);
    } finally {
      setNicknameChecking(false);
    }
  };

  // ✅ 제출 (검증 추가)
  async function handleSubmit(e: FormEvent) {
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

      // ✅ 닉네임 중복 체크
      if (nickname && nicknameAvailable === null) {
        alert("닉네임 중복 확인을 먼저 해주세요.");
        setLoading(false);
        return;
      }

      if (nickname && nicknameAvailable === false) {
        alert("이미 사용 중인 닉네임입니다.");
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("인증 세션이 만료되었습니다. 다시 로그인해주세요.");

      // Auth 메타데이터 업데이트
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

      // Profiles 테이블 업데이트
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

      alert("프로필 설정이 완료되었습니다!");
      router.push("/");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setError("프로필 저장 실패: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "var(--oboon-bg-page)" }}>
      <div className="w-full max-w-md rounded-2xl border p-8 shadow-card" style={{ backgroundColor: "var(--oboon-bg-surface)", borderColor: "var(--oboon-border-default)" }}>
        <h1 className="text-2xl font-bold text-center mb-1" style={{ color: "var(--oboon-text-title)" }}>프로필 완성하기</h1>
        <p className="text-xs text-center mb-8" style={{ color: "var(--oboon-text-muted)" }}>
          서비스 이용을 위해 추가 정보를 입력해주세요
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 이메일 (읽기 전용) */}
          <div className="space-y-1">
            <label className="text-xs ml-1 font-semibold" style={{ color: "var(--oboon-text-body)" }}>이메일 주소</label>
            <input
              type="email"
              className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none"
              style={{
                backgroundColor: "var(--oboon-bg-subtle)",
                borderColor: "var(--oboon-border-default)",
                color: "var(--oboon-text-muted)"
              }}
              value={email}
              disabled
            />
          </div>

          {/* 이름 */}
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
              required
              maxLength={20}
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* 닉네임 */}
          <div className="space-y-1">
            <label className="text-xs ml-1 font-semibold" style={{ color: "var(--oboon-text-body)" }}>
              닉네임
            </label>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border px-4 py-2.5 text-sm outline-none"
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
              {nickname && (
                <button
                  type="button"
                  onClick={checkNickname}
                  disabled={nicknameChecking}
                  className="px-4 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ob-btn ob-btn-sm ob-btn-secondary"
                >
                  {nicknameChecking ? "확인중..." : "중복확인"}
                </button>
              )}
            </div>
            {errors.nickname && (
              <p className="text-xs text-red-500 mt-1">{errors.nickname}</p>
            )}
            {nicknameAvailable === true && (
              <p className="text-xs text-green-500 mt-1">✅ 사용 가능한 닉네임입니다.</p>
            )}
          </div>

          {/* 휴대폰 번호 */}
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
              required
              maxLength={13}
            />
            {errors.phone && (
              <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
            )}
          </div>

          {/* 회원 유형 */}
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

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 font-bold rounded-xl mt-6 transition-all active:scale-95 ob-btn ob-btn-md ob-btn-primary"
            style={{ boxShadow: "var(--oboon-shadow-card)" }}
          >
            {loading ? "저장 중..." : "저장하고 시작하기"}
          </button>
        </form>

        {error && (
          <div className="mt-4 ob-alert ob-alert-danger text-center text-xs">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}