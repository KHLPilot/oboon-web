"use client";

import { FormEvent, useState } from "react";
import { createSupabaseClient } from "@/lib/supabaseClient";

export default function SignupPage() {
  const supabase = createSupabaseClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [userType, setUserType] = useState<"personal" | "company">("personal");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  /*테스트*/
  async function handleResendEmail() {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) {
      console.error("❌ resend error:", error.message);
      alert("재전송 실패: " + error.message);
    } else {
      console.log("✅ resend success");
      alert("인증 메일 재전송 시도 완료 (콘솔 확인)");
    }
  }
  /*여기까지*/

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone_number: phoneNumber,
          user_type: userType,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("이메일 인증 링크를 확인해주세요.");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
      <div
        className="w-full max-w-md rounded-2xl
        border border-slate-700
        bg-slate-900
        p-6
        shadow-xl shadow-black/40"
      >
        <h1 className="text-xl font-bold text-center mb-1">회원가입</h1>
        <p className="text-xs text-center text-slate-400 mb-6">
          이메일 인증 후 회원가입이 완료됩니다
        </p>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {/* 이메일 */}
          <div className="col-span-2 space-y-1">
            <label className="input-label">이메일</label>
            <input
              className="input-basic"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* 비밀번호 */}
          <div className="space-y-1">
            <label className="input-label">비밀번호</label>
            <input
              className="input-basic"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* 비밀번호 확인 */}
          <div className="space-y-1">
            <label className="input-label">비밀번호 확인</label>

            <input
              className={`input-basic ${
                passwordConfirm && password !== passwordConfirm
                  ? "border-red-500 focus:ring-red-500"
                  : ""
              }`}
              type="password"
              value={passwordConfirm}
              onChange={(e) => {
                const value = e.target.value;
                setPasswordConfirm(value);

                if (password && value !== password) {
                  setPasswordError("비밀번호가 일치하지 않습니다.");
                } else {
                  setPasswordError(null);
                }
              }}
            />

            {passwordError && (
              <p className="text-xs text-red-400">{passwordError}</p>
            )}
          </div>

          {/* 이름 */}
          <div className="space-y-1">
            <label className="input-label">이름</label>
            <input
              className="input-basic"
              placeholder="홍길동"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* 휴대폰 */}
          <div className="space-y-1">
            <label className="input-label">휴대폰 번호</label>
            <input
              className="input-basic"
              placeholder="010-1234-5678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
          </div>

          {/* 회원 유형 */}
          <div className="col-span-2 space-y-1">
            <label className="input-label">회원 유형</label>
            <select
              className="input-basic"
              value={userType}
              onChange={(e) => setUserType(e.target.value as any)}
            >
              <option value="personal">개인</option>
              <option value="company">기업</option>
            </select>
          </div>

          {/* 버튼 */}
          <button
            disabled={loading}
            className="col-span-2 w-full rounded-lg
              bg-emerald-500 py-3 text-sm font-semibold
              text-slate-950
              hover:bg-emerald-400
              transition
              disabled:opacity-50"
          >
            {loading ? "처리 중..." : "회원가입"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleResendEmail}
          className="mt-2 w-full rounded-lg
    border border-slate-600
    py-2 text-xs text-slate-300
    hover:bg-slate-800"
        >
          인증 메일 다시 보내기 (테스트)
        </button>

        {message && (
          <p className="mt-4 text-xs text-emerald-400 text-center">{message}</p>
        )}
        {error && (
          <p className="mt-4 text-xs text-red-400 text-center">{error}</p>
        )}
      </div>
    </main>
  );
}
