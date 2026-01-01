"use client";

import { FormEvent, useState, useEffect } from "react";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const supabase = createSupabaseClient();
  const router = useRouter();

  // 1. 상태 관리
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [userType, setUserType] = useState<"personal" | "company">("personal");

  // 2. 프로세스 제어 상태
  const [isEmailSent, setIsEmailSent] = useState(false); // 인증 메일 발송 여부
  const [isVerified, setIsVerified] = useState(false);   // 이메일 인증 완료 여부 (기존 창 감지용)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 3. 실시간 인증 감지 (새 창에서 인증 완료 시 기존 창이 이를 인지)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // 메일 링크 클릭 시 SIGNED_IN 이벤트 발생
      if (event === "SIGNED_IN" && session) {
        setIsVerified(true);
        setIsEmailSent(false);
        console.log("인증 완료 감지: 이제 나머지 정보를 입력할 수 있습니다.");
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // 4. [단계 1] 이메일 인증 메일 보내기 (비밀번호와 함께 Auth 유저 생성)
  async function handleSendVerification() {
    if (!email || !password) {
      alert("이메일과 비밀번호를 먼저 입력해주세요.");
      return;
    }
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // 인증 전 임시 데이터를 메타데이터에 저장 (트리거가 profiles에 기본 행을 생성하도록 유도)
        data: { name: "temp", phone_number: "temp", user_type: userType },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (error) {
      setError("인증 실패: " + error.message);
    } else {
      setIsEmailSent(true);
      alert("인증 메일이 발송되었습니다. 메일함의 '인증 완료하기'를 클릭한 뒤 이 화면으로 돌아와주세요.");
    }
  }

  // 5. [단계 2] 최종 가입 완료 (기존 프로필 정보를 실제 입력값으로 업데이트)
  async function handleFinalSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("인증 세션이 만료되었습니다. 다시 시도해주세요.");

      // 1. Supabase Auth 메타데이터 업데이트 (관리자 페이지 display_name 동기화)
      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          name: name,
          full_name: name, // 일부 소셜 로그인 필드와 호환을 위해 추가
          phone_number: phoneNumber,
          user_type: userType
        }
      });
      if (authUpdateError) throw authUpdateError;

      // 2. 내 DB (profiles 테이블) 업데이트 (UPSERT)
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: user.email,
          name: name,
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
        <p className="text-xs text-center mb-8" style={{ color: "var(--oboon-text-muted)" }}>이메일 인증 후 상세 정보를 입력해주세요</p>

        <div className="space-y-6">
          {/* 1. 이메일/비밀번호 섹션 */}
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
              <input
                type="password"
                className="w-full rounded-lg border px-4 py-2 text-sm outline-none disabled:opacity-50"
                style={{
                  backgroundColor: "var(--oboon-bg-surface)",
                  borderColor: "var(--oboon-border-default)",
                  color: "var(--oboon-text-body)"
                }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isVerified || isEmailSent}
              />
            </div>

            {isEmailSent && !isVerified && (
              <div className="flex items-center gap-2 text-[11px] animate-pulse mt-1" style={{ color: "var(--oboon-primary)" }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--oboon-primary)" }}></span>
                메일함에서 인증 버튼을 누르면 아래 입력창이 활성화됩니다.
              </div>
            )}
          </div>

          {/* 2. 추가 정보 입력 섹션 (인증 전까지 비활성화) */}
          <form
            onSubmit={handleFinalSubmit}
            className={`space-y-4 transition-opacity duration-300 ${!isVerified ? "opacity-30 pointer-events-none" : "opacity-100"}`}
          >
            <div className="space-y-1">
              <label className="text-xs ml-1 font-semibold" style={{ color: "var(--oboon-text-body)" }}>이름 (실명)</label>
              <input
                className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none"
                style={{
                  backgroundColor: "var(--oboon-bg-subtle)",
                  borderColor: "var(--oboon-border-default)",
                  color: "var(--oboon-text-body)"
                }}
                placeholder="홍길동"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={isVerified}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs ml-1 font-semibold" style={{ color: "var(--oboon-text-body)" }}>휴대폰 번호</label>
              <input
                className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none"
                style={{
                  backgroundColor: "var(--oboon-bg-subtle)",
                  borderColor: "var(--oboon-border-default)",
                  color: "var(--oboon-text-body)"
                }}
                placeholder="01012345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required={isVerified}
              />
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