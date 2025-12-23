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
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <h1 className="text-xl font-bold text-center mb-1">회원가입</h1>
        <p className="text-xs text-center text-slate-400 mb-6">
          이메일 인증 후 회원가입이 완료됩니다
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="input"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="비밀번호 확인"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
          />
          <input
            className="input"
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="input"
            placeholder="휴대폰 번호"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
          />

          <select
            className="input"
            value={userType}
            onChange={(e) => setUserType(e.target.value as any)}
          >
            <option value="personal">개인</option>
            <option value="company">기업</option>
          </select>

          <button
            disabled={loading}
            className="w-full rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-slate-950"
          >
            {loading ? "처리 중..." : "회원가입"}
          </button>
        </form>

        {message && <p className="mt-3 text-xs text-emerald-400">{message}</p>}
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      </div>
    </main>
  );
}
