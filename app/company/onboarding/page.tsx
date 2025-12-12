"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";

export default function CompanyOnboardingPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();

  const [companyName, setCompanyName] = useState("");
  const [managerName, setManagerName] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: any) {
    e.preventDefault();
    setLoading(true);

    // 현재 로그인한 유저 가져오기
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("로그인이 필요합니다.");
      router.replace("/company/login");
      return;
    }

    // profiles 테이블 업데이트
    const { error } = await supabase
      .from("profiles")
      .update({
        name: managerName,
        company_name: companyName,
        business_number: businessNumber,
        phone_number: companyPhone,
        user_type: "company",
      })
      .eq("id", user.id);

    if (error) {
      console.error(error);
      alert("저장 중 오류가 발생했습니다.");
      setLoading(false);
      return;
    }

    // 기업 온보딩 완료 → 기업 대시보드로 이동
    router.push("/company/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md p-6 border border-slate-700 rounded-xl bg-slate-900 space-y-4"
      >
        <h1 className="text-xl font-bold text-center">기업 정보 등록</h1>

        <div>
          <label className="text-sm text-slate-300">회사명</label>
          <input
            type="text"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700"
          />
        </div>

        <div>
          <label className="text-sm text-slate-300">담당자 이름</label>
          <input
            type="text"
            required
            value={managerName}
            onChange={(e) => setManagerName(e.target.value)}
            className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700"
          />
        </div>

        <div>
          <label className="text-sm text-slate-300">사업자 등록번호</label>
          <input
            type="text"
            required
            placeholder="예: 123-45-67890"
            value={businessNumber}
            onChange={(e) => setBusinessNumber(e.target.value)}
            className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700"
          />
        </div>

        <div>
          <label className="text-sm text-slate-300">회사 연락처</label>
          <input
            type="tel"
            required
            placeholder="010-0000-0000"
            value={companyPhone}
            onChange={(e) => setCompanyPhone(e.target.value)}
            className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-500 text-slate-900 font-semibold py-2 rounded"
        >
          {loading ? "저장 중..." : "기업 정보 저장하기"}
        </button>
      </form>
    </main>
  );
}
