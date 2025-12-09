"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();

  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [phone, setPhone] = useState("");

  async function handleSubmit(e: any) {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("로그인이 필요합니다.");
      router.replace("/login");
      return;
    }

    // 🔥 (1) 중복 계정 검사
    const { data: existing, error: findError } = await supabase
      .from("profiles")
      .select("*")
      .eq("phone_number", phone)
      .maybeSingle();

    if (findError) {
      console.error(findError);
      alert("오류가 발생했습니다. 다시 시도해주세요.");
      return;
    }

    if (existing && existing.id !== user.id) {
      alert("이미 같은 전화번호로 가입된 계정이 있습니다.\n로그인해주세요.");
      router.replace("/login");
      return;
    }

    // 🔥 (2) 프로필 업데이트
    const { error } = await supabase
      .from("profiles")
      .update({
        name,
        region,
        phone_number: phone,
      })
      .eq("id", user.id);

    if (error) {
      alert("저장 중 오류가 발생했습니다.");
      console.error(error);
      return;
    }

    router.replace("/");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 p-6 border border-slate-700 rounded-xl bg-slate-900"
      >
        <h1 className="text-xl font-bold">기본 정보 입력</h1>

        <div>
          <label className="text-sm text-slate-300">이름</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700"
          />
        </div>

        <div>
          <label className="text-sm text-slate-300">지역</label>
          <input
            type="text"
            required
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700"
          />
        </div>

        <div>
          <label className="text-sm text-slate-300">전화번호</label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-emerald-500 text-slate-900 font-semibold py-2 rounded"
        >
          저장하고 시작하기
        </button>
      </form>
    </main>
  );
}