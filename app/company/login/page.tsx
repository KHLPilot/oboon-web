"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CompanyLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: any) {
    e.preventDefault();
    setError(null);

    const res = await fetch("/company/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      return;
    }

    // 로그인 성공 → 기업 온보딩 또는 기업 대시보드로 이동
    router.push("/company/onboarding");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md p-6 space-y-4 border border-slate-700 rounded-xl bg-slate-900"
      >
        <h1 className="text-xl font-bold text-center">기업 로그인</h1>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div>
          <label className="text-sm">기업 이메일</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 rounded bg-slate-800 border border-slate-700"
          />
        </div>

        <div>
          <label className="text-sm">비밀번호</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 rounded bg-slate-800 border border-slate-700"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-emerald-500 text-slate-900 font-semibold py-2 rounded"
        >
          로그인
        </button>

        <button
          type="button"
          onClick={() => router.push("/company/onboarding")}
          className="w-full text-xs text-slate-300 underline mt-2"
        >
          기업 회원가입
        </button>
      </form>
    </main>
  );
}
