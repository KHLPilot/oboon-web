"use client";

import { useEffect, useState, useRef, forwardRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";

// DatePicker 관련 임포트
import DatePicker, { registerLocale } from "react-datepicker";
import { ko } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";

// 아이콘
const CalendarIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-5 h-5 text-slate-500 hover:text-emerald-600 transition-colors"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
    />
  </svg>
);

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

// 달력 버튼
const CalendarButton = forwardRef<HTMLButtonElement, any>(
  ({ onClick }, ref) => (
    <button
      type="button"
      ref={ref}
      onClick={onClick}
      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors z-10"
      tabIndex={-1}
    >
      <CalendarIcon />
    </button>
  )
);
CalendarButton.displayName = "CalendarButton";

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exists, setExists] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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

  // 날짜 유효성 검사 로직
  const isValidPartialDate = (raw: string) => {
    if (raw.length >= 6) {
      const monthStr = raw.slice(4, 6);
      const month = parseInt(monthStr, 10);
      if (month === 0 || month > 12) return false;
    }

    if (raw.length >= 8) {
      const year = parseInt(raw.slice(0, 4), 10);
      const month = parseInt(raw.slice(4, 6), 10);
      const day = parseInt(raw.slice(6, 8), 10);
      const lastDayOfMonth = new Date(year, month, 0).getDate();
      if (day === 0 || day > lastDayOfMonth) return false;
    }
    return true;
  };

  // 다음 빈 칸으로 이동
  const moveToNextField = (currentIndex: number) => {
    const nextIndex = currentIndex + 1;
    // 다음 칸이 있고, ref가 연결되어 있다면 포커스 이동
    if (nextIndex < fields.length && inputRefs.current[nextIndex]) {
      inputRefs.current[nextIndex]?.focus();
    }
  };

  const handleRawInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    key: keyof TimelineForm,
    index: number
  ) => {
    let val = e.target.value.replace(/[^0-9]/g, ""); // 숫자만 남김

    if (val.length > 8) val = val.slice(0, 8);

    // 유효하지 않은 날짜면 입력 차단
    if (!isValidPartialDate(val)) {
      return;
    }

    // 포맷팅
    let formatted = val;
    if (val.length > 4) {
      formatted = `${val.slice(0, 4)}-${val.slice(4)}`;
    }
    if (val.length > 6) {
      formatted = `${formatted.slice(0, 7)}-${val.slice(6)}`;
    }

    setForm((prev) => ({ ...prev, [key]: formatted }));

    // ★ 날짜 완성(10자리) 시 자동으로 다음 칸 이동 (setTimeout으로 타이밍 조절)
    if (formatted.length === 10) {
      setTimeout(() => {
        moveToNextField(index);
      }, 0); 
    }
  };

  const handleDateSelect = (
    key: keyof TimelineForm,
    date: Date | null,
    index: number
  ) => {
    if (!date) return;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    setForm((prev) => ({ ...prev, [key]: dateStr }));
    
    // 달력 선택 시에도 다음 칸으로 이동
    setTimeout(() => {
      moveToNextField(index);
    }, 0);
  };

  async function handleSave() {
    setSaving(true);
    const cleanForm = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === "" ? null : v])
    );

    const { error } = exists
      ? await supabase
          .from("property_timeline")
          .update(cleanForm)
          .eq("properties_id", propertyId)
      : await supabase
          .from("property_timeline")
          .insert({ properties_id: propertyId, ...cleanForm });

    setSaving(false);
    if (!error) {
      alert("저장되었습니다");
      router.back();
    }
  }

  async function handleClear() {
    if (!confirm("일정 정보를 모두 삭제할까요?")) return;
    const { error } = await supabase
      .from("property_timeline")
      .delete()
      .eq("properties_id", propertyId);
    if (!error) {
      setForm(EMPTY_FORM);
      alert("삭제되었습니다");
      window.location.reload();
    }
  }

  const getValidDate = (dateStr: string | null) => {
    if (!dateStr || dateStr.length !== 10) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  };

  if (loading) return <div className="p-6">불러오는 중...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 pb-40">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-slate-400 hover:text-slate-200"
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
              <input
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                value={form[field.key] ?? ""}
                onChange={(e) => handleRawInputChange(e, field.key, index)}
                placeholder="YYYY-MM-DD"
                maxLength={10}
                className="
                  w-full px-4 py-3 rounded-xl pr-12
                  bg-white text-slate-900
                  dark:bg-slate-800 dark:text-slate-100
                  border border-slate-300 dark:border-slate-700
                  focus:outline-none focus:ring-2 focus:ring-emerald-500
                "
              />
              <div className="absolute right-0 top-0 h-full flex items-center">
                <DatePicker
                  selected={getValidDate(form[field.key])}
                  // ★ 타입 에러 해결: (date: Date | null) 타입 명시
                  onChange={(date: Date | null) => handleDateSelect(field.key, date, index)}
                  locale="ko"
                  customInput={<CalendarButton />}
                  dateFormat="yyyy-MM-dd"
                  showMonthDropdown
                  showYearDropdown
                  dropdownMode="select"
                  popperPlacement="bottom-end"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 space-y-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
        <button
          onClick={handleClear}
          className="w-full border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          일정 초기화
        </button>
      </div>

      <style jsx global>{`
        .react-datepicker-popper {
          z-index: 50 !important;
        }
        .react-datepicker__header__dropdown {
          display: flex;
          justify-content: center;
          gap: 8px;
          padding: 10px 0;
        }
        .react-datepicker__year-select,
        .react-datepicker__month-select {
          padding: 2px 4px;
          border-radius: 4px;
          border: 1px solid #ccc;
        }
      `}</style>
    </div>
  );
}