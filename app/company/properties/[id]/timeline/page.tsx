"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";

const supabase = createSupabaseClient();

type TimelineForm = {
  announcement_date: string | null;
  application_start: string | null;
  application_end: string | null;
  winner_announce: string | null;
  contract_start: string | null;
  contract_end: string | null;
  move_in_date: string | null;
};

export default function PropertyTimelinePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const propertyId = Number(params.id);

  const [form, setForm] = useState<TimelineForm>({
    announcement_date: null,
    application_start: null,
    application_end: null,
    winner_announce: null,
    contract_start: null,
    contract_end: null,
    move_in_date: null,
  });

  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* ---------- 데이터 로드 ---------- */
  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data, error } = await supabase
        .from("property_timeline")
        .select("*")
        .eq("properties_id", propertyId)
        .maybeSingle();

      if (data) {
        setForm({
          announcement_date: data.announcement_date,
          application_start: data.application_start,
          application_end: data.application_end,
          winner_announce: data.winner_announce,
          contract_start: data.contract_start,
          contract_end: data.contract_end,
          move_in_date: data.move_in_date,
        });
        setExists(true);
      }

      setLoading(false);
    }

    if (Number.isFinite(propertyId)) load();
  }, [propertyId]);

  /* ---------- 저장 ---------- */
  async function handleSave() {
    setSaving(true);

    if (exists) {
      await supabase
        .from("property_timeline")
        .update(form)
        .eq("properties_id", propertyId);
    } else {
      await supabase.from("property_timeline").insert({
        properties_id: propertyId,
        ...form,
      });
    }

    setSaving(false);
    alert("저장되었습니다");
    router.back();
  }
  //일정 초기화
  async function handleClear() {
    if (!confirm("일정 정보를 모두 삭제할까요?\n(되돌릴 수 없습니다)")) return;

    const { error } = await supabase
      .from("property_timeline")
      .delete()
      .eq("properties_id", propertyId);

    if (error) {
      alert("삭제 실패: " + error.message);
      return;
    }

    alert("일정이 완전히 삭제되었습니다");
    router.refresh(); // 또는 load() 재호출
  }

  if (loading) return <div className="p-6">불러오는 중...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-400 hover:text-white"
        >
          ← 뒤로가기
        </button>
        <h1 className="text-xl font-bold">📅 분양 일정</h1>
      </div>

      {/* 입력 폼 */}
      <div className="space-y-4">
        <DateField
          label="입주자 모집공고일"
          value={form.announcement_date}
          onChange={(v) => setForm((f) => ({ ...f, announcement_date: v }))}
        />
        <DateField
          label="청약 시작일"
          value={form.application_start}
          onChange={(v) => setForm((f) => ({ ...f, application_start: v }))}
        />
        <DateField
          label="청약 종료일"
          value={form.application_end}
          onChange={(v) => setForm((f) => ({ ...f, application_end: v }))}
        />
        <DateField
          label="당첨자 발표일"
          value={form.winner_announce}
          onChange={(v) => setForm((f) => ({ ...f, winner_announce: v }))}
        />
        <DateField
          label="계약 시작일"
          value={form.contract_start}
          onChange={(v) => setForm((f) => ({ ...f, contract_start: v }))}
        />
        <DateField
          label="계약 종료일"
          value={form.contract_end}
          onChange={(v) => setForm((f) => ({ ...f, contract_end: v }))}
        />
        <DateField
          label="입주 예정일"
          value={form.move_in_date}
          onChange={(v) => setForm((f) => ({ ...f, move_in_date: v }))}
        />
      </div>

      {/* 저장 */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary w-full"
      >
        {saving ? "저장 중..." : "저장"}
      </button>
      <button onClick={handleClear} className="btn-secondary w-full">
        일정 초기화
      </button>
    </div>
  );
}

/* ---------- 날짜 필드 ---------- */

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-slate-800 dark:text-slate-200">
        {label}
      </label>
      <input
        type="date"
        className="
          w-full px-4 py-3 rounded-xl bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 "
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      />
    </div>
  );
}
