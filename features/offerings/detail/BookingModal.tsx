"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { CalendarDays, Star, Loader2, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import DatePicker, { registerLocale } from "react-datepicker";
import { ko } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { createSupabaseClient } from "@/lib/supabaseClient";

registerLocale("ko", ko);

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
}

export default function BookingModal({
  isOpen,
  onClose,
  propertyId,
  propertyName
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

  const [selectedDate, setSelectedDate] = useState<Date | null>(dateRange.minDate);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [existingConsultation, setExistingConsultation] = useState<ExistingConsultation | null>(null);

  // 사용자 정보 및 상담사 목록 조회
  useEffect(() => {
    if (!isOpen) return;

    async function fetchData() {
      setLoading(true);
      setError(null);
      setExistingConsultation(null);

      try {
        // 현재 사용자 확인
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);

        // 해당 현장의 승인된 상담사 목록 조회
        if (!propertyId) {
          setError("현장 정보가 없습니다");
          setLoading(false);
          return;
        }

        // 이 현장에 이미 예약한 상담이 있는지 확인
        if (currentUser) {
          const { data: existingData } = await supabase
            .from("consultations")
            .select(`
              id,
              status,
              scheduled_at,
              agent:profiles!consultations_agent_id_fkey(name)
            `)
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
          `
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
          if (agentList.length > 0) {
            setSelectedAgent(agentList[0]);
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
  }, [isOpen, supabase, propertyId]);

  // 슬롯 조회 함수 (폴링에서도 사용)
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialFetch = useRef(true);

  const fetchSlots = useCallback(async (showLoading = true) => {
    if (!selectedDate || !selectedAgent) return;

    if (showLoading) setSlotsLoading(true);
    try {
      const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
      const res = await fetch(`/api/agent/slots?agentId=${selectedAgent.id}&date=${dateStr}`);
      const data = await res.json();

      const newSlots = data.slots || [];
      setAvailableSlots(newSlots);

      // 선택한 시간이 더 이상 예약 불가능하면 선택 해제
      if (selectedTime) {
        const selectedSlot = newSlots.find((s: SlotInfo) => s.time === selectedTime);
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
  }, [selectedDate, selectedAgent, selectedTime]);

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
    if (!user) {
      alert("로그인이 필요합니다");
      router.push("/auth/login");
      return;
    }

    if (!selectedAgent) {
      alert("상담사를 선택해주세요");
      return;
    }

    if (!propertyId) {
      alert("분양 정보가 없습니다");
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
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
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

      const formattedDate = `${selectedDate.getFullYear()}.${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}.${selectedDate.getDate().toString().padStart(2, '0')}`;
      alert(`예약이 완료되었습니다!\n\n예약 일시: ${formattedDate} ${selectedTime}\n상담사: ${selectedAgent.name}`);
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

  const canSubmit = selectedAgent && selectedDate && selectedTime && !submitting;

  return (
    <Modal open={isOpen} onClose={onClose}>
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-(--oboon-bg-subtle)">
            <CalendarDays className="h-4 w-4 text-(--oboon-text-title)" />
          </div>
          <div>
            <div className="text-base font-semibold text-(--oboon-text-title)">
              상담 예약
            </div>
            <div className="text-xs text-(--oboon-text-muted)">
              {propertyName || "상담사와 날짜/시간을 선택해주세요"}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-8 flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-(--oboon-primary)" />
        </div>
      ) : existingConsultation ? (
        /* 이미 예약이 있는 경우 */
        <div className="mt-6">
          <Card className="bg-(--oboon-primary)/5 border-2 border-(--oboon-primary)/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-(--oboon-primary)/10 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-(--oboon-primary)" />
              </div>
              <div>
                <p className="text-sm font-semibold text-(--oboon-text-title)">
                  이미 예약된 상담이 있습니다
                </p>
                <p className="text-xs text-(--oboon-text-muted)">
                  {existingConsultation.agent?.name} 상담사
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-(--oboon-text-muted)">상태</span>
                <Badge variant={existingConsultation.status === "confirmed" ? "success" : "status"}>
                  {existingConsultation.status === "confirmed" ? "확정" : "대기중"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-(--oboon-text-muted)">예약일시</span>
                <span className="text-(--oboon-text-title) font-medium">
                  {new Date(existingConsultation.scheduled_at).toLocaleString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <Button
                className="w-full"
                variant="primary"
                size="lg"
                onClick={() => {
                  onClose();
                  router.push(`/chat/${existingConsultation.id}`);
                }}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                채팅방으로 이동
              </Button>
              <Button
                className="w-full"
                variant="secondary"
                size="lg"
                onClick={() => {
                  onClose();
                  router.push("/my/consultations");
                }}
              >
                내 예약 목록 보기
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        <>
          {/* 상담사 선택 */}
          <div className="mt-4">
            <div className="text-xs font-medium text-(--oboon-text-muted) mb-2">
              상담사 선택
            </div>

            {agents.length === 0 ? (
              <div className="text-center py-4 text-sm text-(--oboon-text-muted)">
                현재 이용 가능한 상담사가 없습니다
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {agents.map((agent) => (
                  <Card
                    key={agent.id}
                    className={`cursor-pointer transition-all ${
                      selectedAgent?.id === agent.id
                        ? "ring-2 ring-(--oboon-primary)"
                        : "hover:bg-(--oboon-bg-subtle)"
                    }`}
                    onClick={() => setSelectedAgent(agent)}
                  >
                    <div className="flex items-center gap-3 p-1">
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-(--oboon-bg-subtle) shrink-0 flex items-center justify-center">
                        <span className="text-sm font-medium text-(--oboon-text-title)">
                          {agent.name?.charAt(0) || "?"}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {selectedAgent?.id === agent.id && (
                            <Badge variant="status">선택됨</Badge>
                          )}
                          <div className="inline-flex items-center gap-1 text-xs text-(--oboon-text-muted)">
                            <Star className="h-3.5 w-3.5" />
                            <span className="font-medium text-(--oboon-text-title)">
                              4.9
                            </span>
                          </div>
                        </div>
                        <div className="mt-1 text-sm font-semibold text-(--oboon-text-title)">
                          {agent.name}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Date/Time */}
          <div className="mt-5">
            <div className="text-xs font-medium text-(--oboon-text-muted) mb-2">
              날짜 선택
            </div>

            <div className="flex justify-center">
              <DatePicker
                selected={selectedDate}
                onChange={(date: Date | null) => setSelectedDate(date)}
                inline
                locale="ko"
                minDate={dateRange.minDate}
                maxDate={dateRange.maxDate}
                calendarClassName="oboon-datepicker"
              />
            </div>

            <div className="mt-4">
              <div className="text-xs font-medium text-(--oboon-text-muted) mb-2">
                시간 선택
              </div>
              {slotsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-(--oboon-primary)" />
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-4 text-sm text-(--oboon-text-muted)">
                  {selectedAgent ? "선택한 날짜에 예약 가능한 시간이 없습니다" : "상담사를 먼저 선택해주세요"}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {availableSlots.map((slot) => {
                    const active = selectedTime === slot.time;
                    const isDisabled = !slot.available;
                    return (
                      <button
                        key={slot.time}
                        className={`
                          py-2 px-3 rounded-lg border text-sm font-medium transition-all
                          ${active
                            ? "bg-(--oboon-primary) text-white border-(--oboon-primary) ring-2 ring-(--oboon-primary) ring-offset-1"
                            : isDisabled
                              ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                              : "bg-(--oboon-primary) text-white border-(--oboon-primary) hover:opacity-90"
                          }
                        `}
                        onClick={() => !isDisabled && setSelectedTime(slot.time)}
                        disabled={isDisabled}
                      >
                        {slot.time}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 로그인 안내 */}
          {!user && (
            <div className="mt-4 rounded-xl border border-(--oboon-warning) bg-(--oboon-warning)/10 px-4 py-3 text-xs text-(--oboon-warning)">
              예약을 하려면 로그인이 필요합니다
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="mt-4 rounded-xl border border-(--oboon-danger) bg-(--oboon-danger)/10 px-4 py-3 text-xs text-(--oboon-danger)">
              {error}
            </div>
          )}

          {/* CTA */}
          <div className="mt-6">
            <Button
              className="w-full"
              variant="primary"
              size="lg"
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  예약 중...
                </span>
              ) : user ? (
                "예약 확정하기"
              ) : (
                "로그인 후 예약하기"
              )}
            </Button>
          </div>

          {/* 선택 정보 */}
          <div className="mt-3 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-4 py-3 text-xs text-(--oboon-text-muted)">
            선택:{" "}
            <span className="font-medium text-(--oboon-text-title)">
              {selectedDate ? `${selectedDate.getFullYear()}.${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}.${selectedDate.getDate().toString().padStart(2, '0')}` : '-'} {selectedTime || '-'}
            </span>
            {selectedAgent && (
              <>
                {" / "}
                <span className="font-medium text-(--oboon-text-title)">
                  {selectedAgent.name} 상담사
                </span>
              </>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
