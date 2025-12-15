"use client";

import { useState } from "react";
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
  image_url: string;
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
    image_url: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (loading) return; // ✅ 중복 클릭 방지

    setError(null);

    // ✅ 필수값 체크
    if (!form.name.trim()) {
      setError("현장명은 필수 입력 항목입니다.");
      return;
    }

    setLoading(true);

    const payload = {
      name: form.name.trim(),
      property_type: form.property_type.trim() || null,
      phone_number: form.phone_number.trim() || null,
      status: form.status || null,
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,
    };

    // ✅ insert 후 id 받아오기 (중요!)
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

    // ✅ 성공 → 방금 만든 현장 상세로 이동
    router.push(`/company/properties/${data.id}`);
  }

  return (
    <div className="p-6 flex justify-center">
      <div className="w-full max-w-2xl space-y-6">
        <h1 className="text-xl font-bold">현장 등록</h1>

        {/* 카드 */}
        <div className="border border-gray-700 rounded-lg p-5 space-y-4">
          {/* 현장명 */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              현장명 <span className="text-red-400">*</span>
            </label>
            <input
              className="input-basic w-full"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="예: ○○자이, ○○힐스테이트"
              autoFocus
            />
          </div>

          {/* 분양 유형 */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              분양 유형
            </label>
            <input
              className="input-basic w-full"
              value={form.property_type}
              onChange={(e) =>
                setForm({ ...form, property_type: e.target.value })
              }
              placeholder="예: 아파트 / 오피스텔 / 도시형"
            />
          </div>

          {/* 연락처 */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              대표 연락처
            </label>
            <input
              className="input-basic w-full"
              value={form.phone_number}
              onChange={(e) =>
                setForm({ ...form, phone_number: e.target.value })
              }
              placeholder="예: 1661-0000"
            />
          </div>

          {/* 상태 (자유입력 → select로 고정) */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">상태</label>
            <select
              className="input-basic w-full"
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
            <label className="block text-sm text-gray-400 mb-1">설명</label>
            <textarea
              className="input-basic w-full min-h-[100px]"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="현장에 대한 간단한 설명"
            />
          </div>

          {/* 이미지 URL */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              대표 이미지 URL
            </label>
            <input
              className="input-basic w-full"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && <div className="text-red-400 text-sm">❗ {error}</div>}

        <button
          className="btn-primary w-full"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "등록 중..." : "등록하기"}
        </button>

        <button
          type="button"
          className="btn-secondary w-full"
          onClick={() => router.push("/company/properties")}
          disabled={loading}
        >
          취소
        </button>
      </div>
    </div>
  );
}
