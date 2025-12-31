"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";

/* --------------------------------------------------
   타입 (properties 테이블 전용)
-------------------------------------------------- */
type PropertyStatus = "READY" | "ONGOING" | "CLOSED";

type PropertyForm = {
  name: string;
  property_type: string;
  phone_number: string;
  status: PropertyStatus;
  description: string;
};

export default function PropertyCreatePage() {
  const supabase = createSupabaseClient();
  const router = useRouter();

  const [form, setForm] = useState<PropertyForm>({
    name: "",
    property_type: "",
    phone_number: "",
    status: "READY",
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-white text-slate-900 " +
    "border border-slate-300 " +
    "focus:outline-none focus:ring-2 focus:ring-emerald-500";

  // 로그인 유저 확인
  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("로그인이 필요합니다.");
        router.replace("/");
        return;
      }
      setUserId(user.id);
    }
    checkUser();
  }, []);

  async function handleSubmit() {
    if (loading) return;

    setError(null);

    if (!form.name.trim()) {
      setError("현장명은 필수 입력 항목입니다.");
      return;
    }

    if (!userId) {
      setError("사용자 정보를 확인할 수 없습니다. 다시 로그인해주세요.");
      return;
    }

    setLoading(true);

    const payload = {
      name: form.name.trim(),
      property_type: form.property_type.trim() || null,
      phone_number: form.phone_number.trim() || null,
      status: form.status || null,
      description: form.description.trim() || null,
      created_by: userId, // 🔥 이게 핵심!
    };

    const { data, error } = await supabase
      .from("properties")
      .insert(payload)
      .select("id")
      .single();

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (!data?.id) {
      setError("등록은 되었지만 id를 가져오지 못했습니다. 다시 시도해주세요.");
      return;
    }

    router.push(`/company/properties/${data.id}`);
  }

  // 유저 확인 중
  if (userId === null) {
    return <div className="p-6 text-gray-400">불러오는 중...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-6 pt-8 pb-40 bg-slate-50">
      <div className="space-y-6">
        {/* 카드 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h1 className="text-xl font-bold">현장 등록</h1>
          {/* 현장명 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              현장명 <span className="text-red-400">*</span>
            </label>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="예: ○○자이, ○○힐스테이트"
              autoFocus
            />
          </div>

          {/* 분양 유형 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              분양 유형
            </label>
            <input
              className={inputClass}
              value={form.property_type}
              onChange={(e) =>
                setForm({ ...form, property_type: e.target.value })
              }
              placeholder="예: 아파트 / 오피스텔 / 도시형"
            />
          </div>

          {/* 연락처 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              대표 연락처
            </label>
            <input
              className={inputClass}
              value={form.phone_number}
              onChange={(e) =>
                setForm({ ...form, phone_number: e.target.value })
              }
              placeholder="예: 1661-0000"
            />
          </div>

          {/* 상태 (자유입력 → select로 고정) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              상태
            </label>
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as PropertyStatus })
              }
            >
              <option value="READY">분양 예정</option>
              <option value="ONGOING">분양 중</option>
              <option value="CLOSED">분양 종료</option>
            </select>
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              설명
            </label>
            <textarea
              className={`${inputClass} min-h-[120px]`}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="현장에 대한 간단한 설명"
            />
          </div>
          <p className="text-gray-500">
            ※ 대표 이미지는 현장 등록 후 상세 페이지에서 업로드할 수 있습니다.
          </p>
        </div>

        {/* 에러 메시지 */}
        {error && <div className="text-red-400 text-sm">❗ {error}</div>}

        <button
          className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "등록 중..." : "등록하기"}
        </button>

        <button
          type="button"
          className="w-full py-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
          onClick={() => router.push("/company/properties")}
          disabled={loading}
        >
          취소
        </button>
      </div>
    </div>
  );
}