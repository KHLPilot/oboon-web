// app/auth/onboarding/page.tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [phone, setPhone] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const supabase = createSupabaseClient();

    // 1) 사용자 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      alert("로그인이 필요합니다.");
      router.replace("/login");
      return;
    }

    // 2) 전화번호 중복 확인
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone_number", phone)
      .maybeSingle();

    if (existing && existing.id !== user.id) {
      alert("이미 가입된 전화번호입니다.\n로그인해주세요.");
      router.replace("/login");
      return;
    }

    // 3) 프로필 생성 또는 업데이트 (UPSERT)
    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id, // 🔥 auth.users.id와 동일해야 FK 오류 없음
          email: user.email,
          name,
          region,
          phone_number: phone,
          role: "user",
        },
        { onConflict: "id" }
      )
      .select()
      .single();

    if (error) {
      console.error(error);
      alert("저장 중 오류가 발생했습니다.");
      return;
    }

    router.replace("/");
  }

  return (
    <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--oboon-bg-page)" }}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 p-6 border rounded-xl"
        style={{ backgroundColor: "var(--oboon-bg-surface)", borderColor: "var(--oboon-border-default)" }}
      >
        <h1 className="text-xl font-bold" style={{ color: "var(--oboon-text-title)" }}>기본 정보 입력</h1>

        <div>
          <label className="text-sm" style={{ color: "var(--oboon-text-body)" }}>이름</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded border"
            style={{
              backgroundColor: "var(--oboon-bg-subtle)",
              borderColor: "var(--oboon-border-default)",
              color: "var(--oboon-text-body)"
            }}
          />
        </div>

        <div>
          <label className="text-sm" style={{ color: "var(--oboon-text-body)" }}>지역</label>
          <input
            required
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full px-3 py-2 rounded border"
            style={{
              backgroundColor: "var(--oboon-bg-subtle)",
              borderColor: "var(--oboon-border-default)",
              color: "var(--oboon-text-body)"
            }}
          />
        </div>

        <div>
          <label className="text-sm" style={{ color: "var(--oboon-text-body)" }}>전화번호</label>
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 rounded border"
            style={{
              backgroundColor: "var(--oboon-bg-subtle)",
              borderColor: "var(--oboon-border-default)",
              color: "var(--oboon-text-body)"
            }}
          />
        </div>

        <button
          type="submit"
          className="w-full ob-btn ob-btn-md ob-btn-round ob-btn-primary"
        >
          저장하고 시작하기
        </button>
      </form>
    </main>
  );
}