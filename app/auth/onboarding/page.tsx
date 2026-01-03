"use client";

import { FormEvent, useState, useEffect } from "react";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const supabase = createSupabaseClient();
  const router = useRouter();

  // 상태 관리
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [userType, setUserType] = useState<"personal" | "company">("personal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ 페이지 로드 시 유저 정보 가져오기
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // 로그인 안됨 → 로그인 페이지로
        router.replace("/auth/login");
        return;
      }

      // 이메일 미리 설정
      setEmail(user.email || "");

      // 기존 프로필 확인
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, nickname, phone_number, user_type")
        .eq("id", user.id)
        .single();

      if (profile) {
        // 이미 완성된 프로필 → 홈으로
        if (profile.name && profile.name !== "temp" && profile.phone_number && profile.phone_number !== "temp") {
          router.replace("/");
          return;
        }

        // temp 값이 아닌 것만 미리 채우기
        if (profile.name && profile.name !== "temp") setName(profile.name);
        if (profile.nickname && profile.nickname !== "temp") setNickname(profile.nickname);
        if (profile.phone_number && profile.phone_number !== "temp") setPhoneNumber(profile.phone_number);
        if (profile.user_type) setUserType(profile.user_type);
      }
    }

    loadUser();
  }, [supabase, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("인증 세션이 만료되었습니다. 다시 로그인해주세요.");

      // ✅ Auth 메타데이터 업데이트
      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          name: name,
          full_name: name,
          nickname: nickname || name,
          phone_number: phoneNumber,
          user_type: userType
        }
      });
      if (authUpdateError) throw authUpdateError;

      // ✅ Profiles 테이블 업데이트
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: user.email,
          name: name,
          nickname: nickname || name,
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
            <label className="text-xs ml-1 font-semibold" style={{ color: "var(--oboon-text-body)" }}>이름 (실명)</label>
            <input
              className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none"
              style={{
                backgroundColor: "var(--oboon-bg-subtle)",
                borderColor: "var(--oboon-border-default)",
                color: "var(--oboon-text-body)"
              }}
              placeholder="김오분"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* 닉네임 */}
          <div className="space-y-1">
            <label className="text-xs ml-1 font-semibold" style={{ color: "var(--oboon-text-body)" }}>
              닉네임
            </label>
            <input
              className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none"
              style={{
                backgroundColor: "var(--oboon-bg-subtle)",
                borderColor: "var(--oboon-border-default)",
                color: "var(--oboon-text-body)"
              }}
              placeholder="오분이"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>

          {/* 휴대폰 번호 */}
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
              required
            />
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