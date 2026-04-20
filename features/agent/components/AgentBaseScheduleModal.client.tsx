"use client";

import { useEffect, useMemo, useState } from "react";
import { Sun } from "lucide-react";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Toggle from "@/components/ui/Toggle";
import Select from "@/components/ui/Select";
import OboonDatePicker from "@/components/ui/DatePicker";
import { showAlert } from "@/shared/alert";

type AgentBaseScheduleModalProps = {
  open: boolean;
  onClose: () => void;
  onSave?: () => void;
};

const TIME_OPTIONS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
];

const DEFAULT_START = "10:00";
const DEFAULT_END = "17:00";
const CLOSED_TIME = "00:00";

function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function AgentBaseScheduleModal({
  open,
  onClose,
  onSave,
}: AgentBaseScheduleModalProps) {
  const [weekdayEnabled, setWeekdayEnabled] = useState(true);
  const [weekdayStart, setWeekdayStart] = useState(DEFAULT_START);
  const [weekdayEnd, setWeekdayEnd] = useState(DEFAULT_END);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [holidayDate, setHolidayDate] = useState<Date | null>(null);
  const [holidayDates, setHolidayDates] = useState<string[]>([]);

  const timeOptions = useMemo(
    () => TIME_OPTIONS.map((t) => ({ label: t, value: t })),
    [],
  );

  function handleWeekdayToggle(next: boolean) {
    setWeekdayEnabled(next);
    if (next) {
      if (!weekdayStart || weekdayStart === CLOSED_TIME) {
        setWeekdayStart(DEFAULT_START);
      }
      if (!weekdayEnd || weekdayEnd === CLOSED_TIME) {
        setWeekdayEnd(DEFAULT_END);
      }
    }
  }

  useEffect(() => {
    if (!open) return;
    loadWorkingHours();
    loadHolidays();
     
  }, [open]);

  async function loadWorkingHours() {
    setLoading(true);
    try {
      const res = await fetch("/api/agent/working-hours");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "조회에 실패했습니다");
      }

      const rows: Array<{
        day_of_week: number;
        start_time: string | null;
        end_time: string | null;
        is_enabled?: boolean | null;
      }> = data?.rows ?? [];

      const weekdayRows = rows.filter((r) =>
        [1, 2, 3, 4, 5].includes(r.day_of_week),
      );
      const weekdayRow = weekdayRows[0];

      const rawWeekdayStart = weekdayRow?.start_time?.slice(0, 5);
      const rawWeekdayEnd = weekdayRow?.end_time?.slice(0, 5);
      const weekdayStartTime = rawWeekdayStart ?? DEFAULT_START;
      const weekdayEndTime = rawWeekdayEnd ?? DEFAULT_END;

      const isWeekdayEnabled =
        typeof weekdayRow?.is_enabled === "boolean"
          ? weekdayRow.is_enabled
          : !(
              weekdayStartTime === CLOSED_TIME && weekdayEndTime === CLOSED_TIME
            );

      setWeekdayEnabled(isWeekdayEnabled);
      setWeekdayStart(weekdayStartTime);
      setWeekdayEnd(weekdayEndTime);
    } catch (err: unknown) {
      showAlert(err instanceof Error ? err.message : "조회에 실패했습니다");
    } finally {
      setLoading(false);
    }
  }

  async function loadHolidays() {
    try {
      const res = await fetch("/api/agent/holidays");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "휴무일 조회에 실패했습니다");
      }
      setHolidayDates(Array.isArray(data?.dates) ? data.dates : []);
    } catch (err: unknown) {
      showAlert(err instanceof Error ? err.message : "휴무일 조회에 실패했습니다");
    }
  }

  function addHoliday() {
    if (!holidayDate) return;
    const key = formatDateKey(holidayDate);
    setHolidayDates((prev) =>
      prev.includes(key) ? prev : [...prev, key].sort(),
    );
    setHolidayDate(null);
  }

  function removeHoliday(dateKey: string) {
    setHolidayDates((prev) => prev.filter((d) => d !== dateKey));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/agent/working-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekdayEnabled,
          weekdayStart,
          weekdayEnd,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "저장에 실패했습니다");
      }

      const holidayRes = await fetch("/api/agent/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dates: holidayDates }),
      });
      const holidayData = await holidayRes.json();
      if (!holidayRes.ok) {
        throw new Error(holidayData?.error || "휴무일 저장에 실패했습니다");
      }

      showAlert("저장되었습니다.");
      onSave?.();
      onClose();
    } catch (err: unknown) {
      showAlert(err instanceof Error ? err.message : "저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="space-y-4 sm:space-y-5">
        <div className="ob-typo-h2 text-(--oboon-text-title)">
          기본 운영시간 설정
        </div>

        <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 ob-typo-subtitle text-(--oboon-text-title)">
              <Sun className="h-5 w-5 text-(--oboon-warning)" />
              영업일
            </div>
            <Toggle
              checked={weekdayEnabled}
              onChange={handleWeekdayToggle}
              label="영업일"
            />
          </div>

          {weekdayEnabled && (
            <div className="mt-3 sm:mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-3">
              <div>
                <div className="ob-typo-body text-(--oboon-text-muted) mb-1">
                  시작 시간
                </div>
                <Select
                  value={weekdayStart}
                  onChange={setWeekdayStart}
                  options={timeOptions}
                  disabled={loading}
                />
              </div>
              <div className="pb-2 ob-typo-body text-(--oboon-text-muted)">
                ~
              </div>

              <div>
                <div className="ob-typo-body text-(--oboon-text-muted) mb-1">
                  종료 시간
                </div>
                <Select
                  value={weekdayEnd}
                  onChange={setWeekdayEnd}
                  options={timeOptions}
                  disabled={loading}
                />
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-4 sm:p-5">
          <div className="ob-typo-subtitle text-(--oboon-text-title)">
            휴무일 지정
          </div>
          <div className="mt-1 sm:mt-2 ob-typo-body text-(--oboon-text-muted)">
            지정한 날짜는 예약을 받지 않습니다.
          </div>

          <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1">
              <OboonDatePicker
                selected={holidayDate}
                onChange={(date) => setHolidayDate(date)}
                placeholder="휴무일 선택"
                textFormat="yyyy-MM-dd"
              />
            </div>
            <Button
              size="sm"
              variant="secondary"
              shape="pill"
              onClick={addHoliday}
              disabled={!holidayDate}
            >
              추가
            </Button>
          </div>

          {holidayDates.length > 0 && (
            <div className="mt-2 sm:mt-3 flex flex-wrap gap-2">
              {holidayDates.map((dateKey) => (
                <button
                  key={dateKey}
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-page) px-3 py-1 ob-typo-caption text-(--oboon-text-title)"
                  onClick={() => removeHoliday(dateKey)}
                >
                  {dateKey}
                  <span className="text-(--oboon-text-muted)">×</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="ob-typo-caption text-(--oboon-text-muted)">
          설정하지 않은 시간대에는 기본값(10:00~17:00)이 적용됩니다. 특정 날짜에
          다른 시간을 원하시면 날짜별로 개별 설정할 수 있습니다.
        </p>

        <div className="flex gap-2 sm:gap-3">
          <Button
            size="md"
            variant="secondary"
            shape="pill"
            className="flex-1"
            onClick={onClose}
          >
            취소
          </Button>
          <Button
            size="md"
            variant="primary"
            shape="pill"
            className="flex-1"
            disabled={saving || loading}
            onClick={handleSave}
          >
            {saving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
