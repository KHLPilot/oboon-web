"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Calendar,
  Clock,
  ChevronLeft,
  Pencil,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { OboonInlineDatePicker } from "@/components/ui/DatePicker";
import { fetchAgentAccess } from "@/features/agent/services/agent.auth";
import { showAlert } from "@/shared/alert";

interface SlotInfo {
  time: string;
  available: boolean;
  reason?: string;
  isOpen: boolean;
}

type AgentScheduleSettingsProps = {
  showBackLink?: boolean;
  showTitle?: boolean;
};

export default function AgentScheduleSettings({
  showBackLink = false,
  showTitle = true,
}: AgentScheduleSettingsProps) {
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [originalSlots, setOriginalSlots] = useState<SlotInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // 사용자 확인
  useEffect(() => {
    async function checkUser() {
      const access = await fetchAgentAccess();
      if (!access.userId) {
        router.push("/auth/login");
        return;
      }

      if (access.role !== "agent" && access.role !== "admin") {
        showAlert("상담사만 접근할 수 있습니다");
        router.push("/");
        return;
      }

      setUserId(access.userId);
    }

    checkUser();
  }, [router]);

  // 선택한 날짜의 슬롯 상태 조회
  useEffect(() => {
    if (!userId) return;

    async function fetchSlots() {
      setLoading(true);
      setIsEditMode(false);
      setHasChanges(false);
      try {
        const dateStr = `${selectedDate.getFullYear()}-${String(
          selectedDate.getMonth() + 1,
        ).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

        // API로 슬롯 조회
        const res = await fetch(
          `/api/agent/slots?agentId=${userId}&date=${dateStr}`,
        );
        const data = await res.json();

        if (data.slots) {
          setSlots(data.slots);
          setOriginalSlots(JSON.parse(JSON.stringify(data.slots)));
        }
      } catch (err) {
        console.error("슬롯 조회 오류:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchSlots();
  }, [selectedDate, userId]);

  // 슬롯 토글 (로컬 상태만 변경)
  function toggleSlot(time: string) {
    setSlots((prev) =>
      prev.map((s) =>
        s.time === time && s.reason !== "booked" && s.reason !== "past"
          ? { ...s, isOpen: !s.isOpen }
          : s,
      ),
    );
    setHasChanges(true);
  }

  // 변경사항 저장
  async function saveChanges() {
    if (!userId) return;
    setSaving(true);

    try {
      const dateStr = `${selectedDate.getFullYear()}-${String(
        selectedDate.getMonth() + 1,
      ).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

      // 변경된 슬롯만 저장
      const changedSlots = slots.filter((slot, index) => {
        const original = originalSlots[index];
        return (
          slot.isOpen !== original?.isOpen &&
          slot.reason !== "booked" &&
          slot.reason !== "past"
        );
      });

      // 각 변경사항을 API로 전송
      for (const slot of changedSlots) {
        await fetch("/api/agent/slots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: dateStr,
            time: `${slot.time}:00`,
            is_open: slot.isOpen,
          }),
        });
      }

      setOriginalSlots(JSON.parse(JSON.stringify(slots)));
      setIsEditMode(false);
      setHasChanges(false);
      showAlert("저장되었습니다.");
    } catch (err) {
      console.error("저장 오류:", err);
      showAlert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  // 변경사항 취소
  function cancelChanges() {
    setSlots(JSON.parse(JSON.stringify(originalSlots)));
    setIsEditMode(false);
    setHasChanges(false);
  }

  function getSlotStyle(slot: SlotInfo) {
    if (slot.reason === "booked") {
      return "bg-(--oboon-warning-bg) text-(--oboon-warning-text) border-(--oboon-warning-border) cursor-not-allowed";
    }
    if (slot.reason === "past") {
      return "bg-(--oboon-bg-subtle) text-(--oboon-text-muted) border-(--oboon-border-default) cursor-not-allowed";
    }
    if (!slot.isOpen) {
      return isEditMode
        ? "bg-(--oboon-bg-page) text-(--oboon-text-muted) border-(--oboon-border-default) hover:bg-(--oboon-bg-subtle)/80 cursor-pointer"
        : "bg-(--oboon-bg-page) text-(--oboon-text-muted) border-(--oboon-border-default)";
    }
    return isEditMode
      ? "bg-(--oboon-primary) text-white border-(--oboon-primary) hover:opacity-90 cursor-pointer"
      : "bg-(--oboon-primary) text-white border-(--oboon-primary)";
  }

  function getSlotLabel(slot: SlotInfo) {
    if (slot.reason === "booked") return "예약됨";
    if (slot.reason === "past") return "지남";
    return slot.time;
  }

  return (
    <div className="space-y-6">
      <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-(--oboon-text-muted)" />
            <span className="ob-typo-h3 text-(--oboon-text-title)">
              날짜 선택
            </span>
          </div>
          <div className="flex items-center justify-center">
            <OboonInlineDatePicker
              selected={selectedDate}
              onChange={(date: Date | null) => date && setSelectedDate(date)}
              minDate={new Date()}
              calendarClassName="oboon-datepicker mx-auto"
            />
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-(--oboon-text-muted)" />
              <span className="ob-typo-h3 text-(--oboon-text-title)">
                {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 시간
                슬롯
              </span>
            </div>

            {/* 수정/확인 버튼 */}
            {!isEditMode ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setIsEditMode(true)}
                disabled={loading}
              >
                <Pencil className="h-4 w-4 mr-1" />
                수정
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={cancelChanges}
                  disabled={saving}
                >
                  <X className="h-4 w-4 mr-1" />
                  취소
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={saveChanges}
                  disabled={saving || !hasChanges}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  확인
                </Button>
              </div>
            )}
          </div>

          {/* 범례 */}
          <div className="flex flex-wrap gap-4 mb-2 ob-typo-body">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-(--oboon-primary)"></div>
              <span>열림 (예약 가능)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-(--oboon-bg-page) border border-(--oboon-border-default)"></div>
              <span>닫힘</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-(--oboon-warning-bg) border border-(--oboon-warning-border)"></div>
              <span>예약됨</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-(--oboon-bg-subtle) border border-(--oboon-border-default)"></div>
              <span>지난 시간</span>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-(--oboon-primary)" />
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-8 ob-typo-body text-(--oboon-text-muted)">
              해당 날짜에 설정된 슬롯이 없습니다
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 sm:gap-3 p-1">
              {slots.map((slot) => (
                <button
                  key={slot.time}
                  className={[
                    "py-2 px-2 rounded-xl border ob-typo-subtitle transition-all",
                    getSlotStyle(slot),
                    isEditMode &&
                    slot.reason !== "booked" &&
                    slot.reason !== "past"
                      ? "ring-offset-1 focus:ring-2 focus:ring-(--oboon-primary)"
                      : "",
                  ].join(" ")}
                  disabled={
                    !isEditMode ||
                    slot.reason === "booked" ||
                    slot.reason === "past"
                  }
                  onClick={() => isEditMode && toggleSlot(slot.time)}
                >
                  {getSlotLabel(slot)}
                </button>
              ))}
            </div>
          )}

          <p className="mt-2 ob-typo-body text-(--oboon-text-muted)">
            {isEditMode
              ? "슬롯을 클릭하여 열기/닫기를 전환한 후 '확인' 버튼을 눌러 저장하세요."
              : "'수정' 버튼을 눌러 슬롯 상태를 변경할 수 있습니다."}
          </p>
        </Card>
      </div>
    </div>
  );
}
