"use client";

import { useEffect, useState, forwardRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";

// DatePicker 관련 임포트
import DatePicker, { registerLocale } from "react-datepicker";
import { ko } from "date-fns/locale"; // 최신 버전은 중괄호 { ko }를 사용합니다.
import "react-datepicker/dist/react-datepicker.css";

// 한국어 로케일 등록
registerLocale("ko", ko);

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

// 1. 커스텀 입력창 (외부 정의로 렌더링 최적화)
const CustomInput = forwardRef<HTMLInputElement, any>(
  ({ value, onClick, placeholder }, ref) => (
    <input
      ref={ref}
      value={value ?? ""}
      readOnly
      onClick={onClick}
      placeholder={placeholder}
      className="
        w-full px-4 py-3 rounded-xl
        bg-white text-slate-900
        dark:bg-slate-800 dark:text-slate-100
        border border-slate-300 dark:border-slate-700
        cursor-pointer transition-all
        focus:outline-none focus:ring-2 focus:ring-emerald-500
      "
    />
  )
);
CustomInput.displayName = "CustomInput";

export default function PropertyTimelinePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const propertyId = Number(params?.id);

  const EMPTY_FORM: TimelineForm = {
    announcement_date: null,
    application_start: null,
    application_end: null,
    winner_announce: null,
    contract_start: null,
    contract_end: null,
    move_in_date: null,
  };

  const [form, setForm] = useState<TimelineForm>(EMPTY_FORM);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fields = [
    { key: "announcement_date", label: "입주자 모집공고일" },
    { key: "application_start", label: "청약 시작일" },
    { key: "application_end", label: "청약 종료일" },
    { key: "winner_announce", label: "당첨자 발표일" },
    { key: "contract_start", label: "계약 시작일" },
    { key: "contract_end", label: "계약 종료일" },
    { key: "move_in_date", label: "입주 예정일" },
  ] as const;

  useEffect(() => {
    async function load() {
      if (!Number.isFinite(propertyId)) return;
      setLoading(true);
      const { data } = await supabase
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
    load();
  }, [propertyId]);

  // 날짜 변경 로직 (KST 보정 적용)
  const handleDateChange = (
    key: keyof TimelineForm,
    date: Date | null,
    index: number
  ) => {
    let dateStr: string | null = null;

    if (date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      dateStr = `${y}-${m}-${d}`;
    }

    setForm((prev) => {
      const next = { ...prev, [key]: dateStr };

      // 다음 빈 칸 자동 오픈
      const nextIndex = fields.findIndex((f, i) => i > index && !next[f.key]);
      if (nextIndex !== -1 && dateStr) {
        setTimeout(() => setOpenIndex(nextIndex), 10);
      } else {
        setOpenIndex(null);
      }
      return next;
    });
  };

  async function handleSave() {
    setSaving(true);
    const { error } = exists
      ? await supabase
          .from("property_timeline")
          .update(form)
          .eq("properties_id", propertyId)
      : await supabase
          .from("property_timeline")
          .insert({ properties_id: propertyId, ...form });

    setSaving(false);
    if (!error) {
      alert("저장되었습니다");
      router.back();
    }
  }

  async function handleClear() {
    if (!confirm("일정 정보를 모두 삭제할까요?\n(되돌릴 수 없습니다)")) return;
    const { error } = await supabase
      .from("property_timeline")
      .delete()
      .eq("properties_id", propertyId);
    if (!error) {
      setForm(EMPTY_FORM);
      alert("일정이 완전히 삭제되었습니다");
      window.location.reload();
    }
  }

  if (loading) return <div className="p-6">불러오는 중...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 pb-40">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          ← 뒤로가기
        </button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          📅 분양 일정
        </h1>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.key} className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {field.label}
            </label>
            <div className="relative w-full">
              <DatePicker
                locale="ko"
                selected={form[field.key] ? new Date(form[field.key]!) : null}
                open={openIndex === index}
                onInputClick={() => setOpenIndex(index)}
                onClickOutside={() => setOpenIndex(null)}
                dateFormat="yyyy-MM-dd"
                placeholderText="날짜 선택"
                customInput={<CustomInput />}
                // 년도/월 선택 편의 기능
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                onChange={(date: Date | null) =>
                  handleDateChange(field.key, date, index)
                }
              />
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 space-y-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-500 transition-colors disabled:opacity-50"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
        <button
          onClick={handleClear}
          className="w-full border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          일정 초기화
        </button>
      </div>

      <style jsx global>{`
        .react-datepicker-wrapper {
          width: 100% !important;
        }
        .react-datepicker__input-container {
          width: 100% !important;
        }
        /* 드롭다운 스타일 보정 */
        .react-datepicker__header__dropdown {
          padding: 10px 0;
          display: flex;
          justify-content: center;
          gap: 8px;
        }
        .react-datepicker__year-select,
        .react-datepicker__month-select {
          padding: 2px 4px;
          border-radius: 4px;
          border: 1px solid #ccc;
          outline: none;
        }
      `}</style>
    </div>
  );
}
