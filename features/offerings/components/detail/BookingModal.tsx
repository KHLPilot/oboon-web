"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { CalendarDays, Loader2, MessageCircle, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { OboonInlineDatePicker } from "@/components/ui/DatePicker";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import MyConsultationsModal from "@/features/consultations/components/MyConsultationsModal.client";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { trackEvent } from "@/lib/analytics";

import { showAlert } from "@/shared/alert";

interface Agent {
  id: string;
  name: string;
  email: string;
  phone_number?: string;
}

interface ExistingConsultation {
  id: string;
  status: string;
  scheduled_at: string;
  agent: {
    name: string;
  };
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId?: number;
  propertyName?: string;
  propertyImageUrl?: string;
  defaultAgentId?: string;
}

export default function BookingModal({
  isOpen,
  onClose,
  propertyId,
  propertyName,
  propertyImageUrl,
  defaultAgentId,
}: BookingModalProps) {
  const router = useRouter();
  const supabase = createSupabaseClient();

  // 날짜 범위 설정 (오늘부터 2개월)
  const dateRange = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setMonth(maxDate.getMonth() + 2);
    return { minDate: today, maxDate };
  }, []);

  interface SlotInfo {
    time: string;
    available: boolean;
    reason?: string;
  }

  const [availableSlots, setAvailableSlots] = useState<SlotInfo[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date | null>(
    dateRange.minDate,
  );
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingConsultation, setExistingConsultation] =
    useState<ExistingConsultation | null>(null);
  const [step, setStep] = useState<"agent" | "time" | "confirm">("agent");
  const [isDesktop, setIsDesktop] = useState(false);
  const [showMyConsultationsModal, setShowMyConsultationsModal] =
    useState(false);

  // 사용자 정보 및 상담사 목록 조회
  const buildReservationEventParams = () => {
    const params: Record<string, string | number> = {};
    if (propertyId) params.property_id = propertyId;
    if (selectedAgent?.id) params.agent_id = selectedAgent.id;
    return Object.keys(params).length ? params : undefined;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const handleChange = () => setIsDesktop(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener?.("change", handleChange);
    return () => mediaQuery.removeEventListener?.("change", handleChange);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setShowMyConsultationsModal(false);

    async function fetchData() {
      setLoading(true);
      setError(null);
      setExistingConsultation(null);
      setStep(isDesktop ? "time" : "agent");

      try {
        // 현재 사용자 확인
        // 해당 현장의 승인된 상담사 목록 조회
        if (!propertyId) {
          setError("현장 정보가 없습니다");
          setLoading(false);
          return;
        }

        // 이 현장에 이미 예약한 상담이 있는지 확인
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        if (currentUser) {
          const { data: existingData } = await supabase
            .from("consultations")
            .select(
              `
              id,
              status,
              scheduled_at,
              agent:profiles!consultations_agent_id_fkey(name)
            `,
            )
            .eq("property_id", propertyId)
            .eq("customer_id", currentUser.id)
            .in("status", ["pending", "confirmed"])
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (existingData) {
            setExistingConsultation(existingData as any);
            setLoading(false);
            return;
          }
        }

        const { data: propertyAgents, error: agentError } = await supabase
          .from("property_agents")
          .select(
            `
            profiles:agent_id (
              id,
              name,
              email,
              phone_number
            )
          `,
          )
          .eq("property_id", propertyId)
          .eq("status", "approved");

        if (agentError) {
          console.error("상담사 목록 조회 오류:", agentError);
          setError("상담사 목록을 불러오는데 실패했습니다");
        } else {
          // property_agents에서 profiles 정보만 추출
          const agentList = (propertyAgents || [])
            .map((pa: any) => pa.profiles)
            .filter((profile: any) => profile !== null);

        setAgents(agentList);
        if (defaultAgentId) {
          const preselected = agentList.find(
            (agent) => agent.id === defaultAgentId,
          );
          setSelectedAgent(preselected ?? null);
        } else {
          setSelectedAgent(null);
        }
        }
      } catch (err) {
        console.error("데이터 조회 오류:", err);
        setError("데이터를 불러오는데 실패했습니다");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isOpen, supabase, propertyId, defaultAgentId, isDesktop]);

  useEffect(() => {
    if (!isOpen) return;
    if (isDesktop) {
      setStep("time");
    }
  }, [isDesktop, isOpen]);

  // 슬롯 조회 함수 (폴링에서도 사용)
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialFetch = useRef(true);

  const fetchSlots = useCallback(
    async (showLoading = true) => {
      if (!selectedDate || !selectedAgent) return;

      if (showLoading) setSlotsLoading(true);
      try {
        const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
        const res = await fetch(
          `/api/agent/slots?agentId=${selectedAgent.id}&date=${dateStr}`,
        );
        const data = await res.json();

        const newSlots = data.slots || [];
        setAvailableSlots(newSlots);

        // 선택한 시간이 더 이상 예약 불가능하면 선택 해제
        if (selectedTime) {
          const selectedSlot = newSlots.find(
            (s: SlotInfo) => s.time === selectedTime,
          );
          if (!selectedSlot || !selectedSlot.available) {
            setSelectedTime(null);
          }
        }
      } catch (err) {
        console.error("슬롯 조회 오류:", err);
        if (showLoading) setAvailableSlots([]);
      } finally {
        if (showLoading) setSlotsLoading(false);
      }
    },
    [selectedDate, selectedAgent, selectedTime],
  );

  // 날짜 또는 상담사 변경 시 슬롯 조회 + 폴링 시작
  useEffect(() => {
    if (!selectedDate || !selectedAgent) {
      setAvailableSlots([]);
      setSelectedTime(null);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    // 초기 로딩
    isInitialFetch.current = true;
    fetchSlots(true);
    isInitialFetch.current = false;

    // 5초마다 폴링 (로딩 표시 없이 백그라운드 업데이트)
    pollingRef.current = setInterval(() => {
      fetchSlots(false);
    }, 5000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [selectedDate, selectedAgent, fetchSlots]);

  // 모달 닫힐 때 폴링 정리
  useEffect(() => {
    if (!isOpen && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, [isOpen]);

  // 예약 제출
  async function handleSubmit() {
    trackEvent("reservation_click", buildReservationEventParams());
    if (!selectedAgent) {
      showAlert("상담사를 선택해주세요");
      return;
    }

    if (!propertyId) {
      showAlert("분양 정보가 없습니다");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 예약 일시 생성
      if (!selectedDate) {
        throw new Error("날짜를 선택해주세요");
      }
      // 로컬 날짜를 YYYY-MM-DD 형식으로 추출 (UTC 변환 없이)
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      // 한국 시간 기준으로 ISO 문자열 생성
      const scheduledAtStr = `${dateStr}T${selectedTime}:00+09:00`;

      const response = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: selectedAgent.id,
          property_id: propertyId,
          scheduled_at: scheduledAtStr,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "예약에 실패했습니다");
      }

      const formattedDate = `${selectedDate.getFullYear()}.${(selectedDate.getMonth() + 1).toString().padStart(2, "0")}.${selectedDate.getDate().toString().padStart(2, "0")}`;
      showAlert(
        `예약이 완료되었습니다!\n\n예약 일시: ${formattedDate} ${selectedTime}\n상담사: ${selectedAgent.name}`,
      );
      onClose();

      // 내 예약 페이지로 이동
      router.push("/my/consultations");
    } catch (err: any) {
      console.error("예약 오류:", err);
      setError(err.message || "예약에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    selectedAgent && selectedDate && selectedTime && !submitting;
  const canGoNext = Boolean(selectedAgent && selectedDate && selectedTime);

  const formatBookingDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  };

  return (
    <>
      <Modal open={isOpen} onClose={onClose} size="lg" panelClassName="p-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <div className="ob-typo-h2 text-(--oboon-text-title)">상담 예약</div>
        </div>
      </div>

      {loading ? (
        <div className="mt-8 flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-(--oboon-primary)" />
        </div>
      ) : existingConsultation ? (
        /* 이미 예약이 있는 경우 */
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-(--oboon-primary)/40 bg-(--oboon-primary)/15 px-4 py-2 ob-typo-caption text-(--oboon-text-title)">
            이미 예약된 상담이 있습니다.
          </div>

          <Card className="bg-(--oboon-bg-surface) p-4">
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-xl bg-(--oboon-bg-subtle) overflow-hidden flex items-center justify-center">
                {propertyImageUrl ? (
                  <img
                    src={propertyImageUrl}
                    alt={propertyName || "property"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="h-full w-full bg-(--oboon-bg-subtle)"
                    style={{
                      WebkitMaskImage: "url(/logo.svg)",
                      maskImage: "url(/logo.svg)",
                      WebkitMaskRepeat: "no-repeat",
                      maskRepeat: "no-repeat",
                      WebkitMaskPosition: "center",
                      maskPosition: "center",
                      WebkitMaskSize: isDesktop ? "50%" : "40%",
                      maskSize: isDesktop ? "50%" : "40%",
                      backgroundColor: "var(--oboon-text-muted)",
                    }}
                    aria-hidden="true"
                  />
                )}
              </div>
              <div>
                <div className="ob-typo-h3 text-(--oboon-text-title)">
                  {propertyName || "상담 예약"}
                </div>
                <div className="mt-1 flex items-center gap-2 ob-typo-caption text-(--oboon-text-muted)">
                  <CalendarDays className="h-4 w-4" />
                  {formatBookingDate(existingConsultation.scheduled_at)}
                </div>
                <div className="mt-1 flex items-center gap-2 ob-typo-caption text-(--oboon-text-muted)">
                  <User className="h-4 w-4" />
                  상담사: {existingConsultation.agent?.name}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button
                className="w-full"
                variant="primary"
                size="md"
                shape="pill"
                onClick={() => {
                  onClose();
                  router.push(`/chat/${existingConsultation.id}`);
                }}
              >
                <MessageCircle className="h-4 w-4" />
                채팅방으로 이동
              </Button>
              <Button
                className="w-full"
                variant="secondary"
                size="md"
                shape="pill"
                onClick={() => {
                  onClose();
                  setShowMyConsultationsModal(true);
                }}
              >
                내 예약 보기
              </Button>
            </div>
          </Card>
        </div>
      ) : !isDesktop && step === "agent" ? (
        <>
          <div className="mt-4">
            <div className="ob-typo-subtitle text-(--oboon-text-title) mb-2">
              상담사 선택
            </div>

            {agents.length === 0 ? (
              <div className="text-center py-4 ob-typo-caption text-(--oboon-text-muted)">
                현재 이용 가능한 상담사가 없습니다
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-72 overflow-y-auto">
                {agents.map((agent) => {
                  const isSelected = selectedAgent?.id === agent.id;
                  return (
                    <Card
                      key={agent.id}
                      className={[
                        "cursor-pointer p-4 shadow-none overflow-hidden",
                        isSelected
                          ? "ring-1 ring-inset ring-(--oboon-primary) border-(--oboon-primary)"
                          : "hover:bg-(--oboon-bg-subtle)",
                      ].join(" ")}
                      onClick={() =>
                        setSelectedAgent((prev) =>
                          prev?.id === agent.id ? null : agent,
                        )
                      }
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-(--oboon-bg-subtle) text-(--oboon-text-title) flex items-center justify-center ob-typo-subtitle">
                          {agent.name?.slice(0, 1) || "상"}
                        </div>
                        <div>
                          <div className="ob-typo-caption text-(--oboon-text-muted)">
                            분양상담사
                          </div>
                          <div className="ob-typo-subtitle text-(--oboon-text-title)">
                            {agent.name}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 ob-typo-caption text-(--oboon-text-muted)">
                        상담사 설명 (기타 정보) 란
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mt-4 rounded-xl border border-(--oboon-danger) bg-(--oboon-danger)/10 px-4 py-3 ob-typo-caption text-(--oboon-danger)">
              {error}
            </div>
          )}

          {/* CTA */}
          <div className="mt-6">
            <Button
              className="w-full"
              variant="primary"
              size="lg"
              shape="pill"
              disabled={!selectedAgent}
              onClick={() => setStep("time")}
            >
              다음 단계
            </Button>
          </div>
        </>
      ) : step === "time" ? (
        <>
          {/* 상담사 선택 (데스크탑에서만 표시) */}
          {isDesktop && (
            <div className="mt-4">
              <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 overflow-hidden rounded-full bg-(--oboon-bg-subtle) shrink-0 flex items-center justify-center">
                    <span className="ob-typo-subtitle text-(--oboon-text-title)">
                      {selectedAgent?.name?.charAt(0) || "상"}
                    </span>
                  </div>
                  <div>
                    <div className="ob-typo-caption text-(--oboon-text-muted)">
                      분양상담사
                    </div>
                    <div className="ob-typo-subtitle text-(--oboon-text-title)">
                      {selectedAgent?.name || "상담사 선택"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Date/Time */}
          <div className="mt-5">
            <div className="ob-typo-h3 text-(--oboon-text-title) mb-2">
              예약 일시
            </div>

            <div className="flex justify-center">
              <OboonInlineDatePicker
                selected={selectedDate}
                onChange={(date: Date | null) => setSelectedDate(date)}
                locale="ko"
                minDate={dateRange.minDate}
                maxDate={dateRange.maxDate}
                calendarClassName="oboon-datepicker"
              />
            </div>

            <div className="mt-4">
              {availableSlots.length === 0 && !slotsLoading ? (
                <div className="text-center py-4 ob-typo-caption text-(--oboon-text-muted)">
                  {selectedAgent
                    ? "선택한 날짜에 예약 가능한 시간이 없습니다"
                    : "상담사를 먼저 선택해주세요"}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {availableSlots.map((slot) => {
                    const active = selectedTime === slot.time;
                    const isDisabled = !slot.available;
                    return (
                      <button
                        key={slot.time}
                        className={[
                          "py-2 px-3 rounded-xl border ob-typo-caption transition-colors",
                          active
                            ? "bg-(--oboon-primary) text-(--oboon-on-primary) border-(--oboon-primary"
                            : isDisabled
                              ? "bg-(--oboon-bg-subtle) text-(--oboon-text-muted) border-(--oboon-border-default) cursor-not-allowed"
                              : "bg-(--oboon-bg-surface) text-(--oboon-text-title) border-(--oboon-border-default) hover:bg-(--oboon-bg-subtle)",
                        ].join(" ")}
                        onClick={() => {
                          if (isDisabled) return;
                          setSelectedTime((prev) =>
                            prev === slot.time ? null : slot.time,
                          );
                        }}
                        disabled={isDisabled}
                      >
                        {isDisabled ? "지남" : slot.time}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mt-4 rounded-xl border border-(--oboon-danger) bg-(--oboon-danger)/10 px-4 py-3 ob-typo-caption text-(--oboon-danger)">
              {error}
            </div>
          )}
          
          <div
            className={[
              "mt-3",
              isDesktop ? "" : "grid grid-cols-2 gap-3",
            ].join(" ")}
          >
            {!isDesktop && (
              <Button
                className="w-full"
                variant="secondary"
                size="md"
                shape="pill"
                onClick={() => setStep("agent")}
              >
                이전 단계
              </Button>
            )}
            <Button
              className="w-full"
              variant="primary"
              size="md"
              shape="pill"
              disabled={!canGoNext}
              onClick={() => setStep("confirm")}
            >
              다음 단계
            </Button>
          </div>
        </>
      ) : (
        <>
          <Card className="bg-(--oboon-bg-surface) p-2 sm:p-4 mt-4">
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-xl bg-(--oboon-bg-subtle) overflow-hidden flex items-center justify-center">
                {propertyImageUrl ? (
                  <img
                    src={propertyImageUrl}
                    alt={propertyName || "property"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="h-full w-full bg-(--oboon-bg-subtle)"
                    style={{
                      WebkitMaskImage: "url(/logo.svg)",
                      maskImage: "url(/logo.svg)",
                      WebkitMaskRepeat: "no-repeat",
                      maskRepeat: "no-repeat",
                      WebkitMaskPosition: "center",
                      maskPosition: "center",
                      WebkitMaskSize: isDesktop ? "50%" : "40%",
                      maskSize: isDesktop ? "50%" : "40%",
                      backgroundColor: "var(--oboon-text-muted)",
                    }}
                    aria-hidden="true"
                  />
                )}
              </div>
              <div className="min-w-0">
                <div className="ob-typo-h3 text-(--oboon-text-title) truncate">
                  {propertyName || "상담 예약"}
                </div>
                <div
                  className={[
                    "mt-1 flex items-center gap-2 text-(--oboon-text-muted)",
                    isDesktop ? "ob-typo-body" : "ob-typo-caption",
                  ].join(" ")}
                >
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  <span className="leading-none">
                    {selectedDate && selectedTime
                    ? formatBookingDate(
                        `${selectedDate.getFullYear()}-${String(
                          selectedDate.getMonth() + 1,
                        ).padStart(2, "0")}-${String(
                          selectedDate.getDate(),
                        ).padStart(2, "0")}T${selectedTime}:00+09:00`,
                      )
                    : "-"}
                  </span>
                </div>
                <div
                  className={[
                    "mt-1 flex items-center gap-2 text-(--oboon-text-muted)",
                    isDesktop ? "ob-typo-body" : "ob-typo-caption",
                    ].join(" ")}
                >
                  <User className="h-4 w-4 shrink-0" />
                  <span className="leading-none">
                    상담사: {selectedAgent?.name || "-"}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <div className="mt-6">
            <div className="ob-typo-h3 text-(--oboon-text-title) mb-2">
              예약 안내사항
            </div>
            <div className={[
              "rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-4 py-4 text-(--oboon-text-muted)",
              isDesktop ? "ob-typo-body" : "ob-typo-caption",
            ].join(" ")}
              >
              예약금 관련 설명
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mt-4 rounded-xl border border-(--oboon-danger) bg-(--oboon-danger)/10 px-4 py-3 ob-typo-caption text-(--oboon-danger)">
              {error}
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button
              className="w-full"
              variant="secondary"
              size="md"
              shape="pill"
              onClick={() => setStep("time")}
            >
              이전 단계
            </Button>
            <Button
              className="w-full"
              variant="primary"
              size="md"
              shape="pill"
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  예약 중...
                </span>
              ) : (
                "예약 신청"
              )}
            </Button>
          </div>
        </>
      )}
      </Modal>

      <MyConsultationsModal
        open={showMyConsultationsModal}
        onClose={() => setShowMyConsultationsModal(false)}
      />
    </>
  );
}
