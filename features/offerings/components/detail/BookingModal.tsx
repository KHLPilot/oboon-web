"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  MessageCircle,
  User,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { OboonInlineDatePicker } from "@/components/ui/DatePicker";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { trackEvent } from "@/lib/analytics";

import { showAlert } from "@/shared/alert";
import { getAvatarUrlOrDefault } from "@/shared/imageUrl";

interface Agent {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
  phone_number?: string | null;
  agent_bio?: string | null;
}

interface AgentGalleryImage {
  user_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}

interface ExistingConsultation {
  id: string;
  status: string;
  scheduled_at: string;
  agent: {
    name: string;
  };
}

type PropertyAgentRow = { profiles: Agent | Agent[] | null };
type GalleryRow = {
  user_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
};

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
  const [previewAgent, setPreviewAgent] = useState<Agent | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(null);
  const [agentGalleryMap, setAgentGalleryMap] = useState<
    Record<string, AgentGalleryImage[]>
  >({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingConsultation, setExistingConsultation] =
    useState<ExistingConsultation | null>(null);
  const [step, setStep] = useState<"agent" | "time" | "bank" | "confirm">(
    "agent",
  );
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [bankSaving, setBankSaving] = useState(false);

  // 약관 상태
  const [terms, setTerms] = useState<{ title: string; content: string } | null>(
    null
  );
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [termsAccordionOpen, setTermsAccordionOpen] = useState(false);

  function pickFirst<T>(value: T | T[] | null | undefined): T | null {
    if (!value) return null;
    return Array.isArray(value) ? (value[0] ?? null) : value;
  }

  // 사용자 정보 및 상담사 목록 조회
  const buildReservationEventParams = () => {
    const params: Record<string, string | number> = {};
    if (propertyId) params.property_id = propertyId;
    if (selectedAgent?.id) params.agent_id = selectedAgent.id;
    return Object.keys(params).length ? params : undefined;
  };

  const hasBankInfo = useMemo(
    () =>
      bankName.trim().length > 0 &&
      bankAccountNumber.trim().length > 0 &&
      bankAccountHolder.trim().length > 0,
    [bankAccountHolder, bankAccountNumber, bankName],
  );

  useEffect(() => {
    if (!isOpen) return;

    async function fetchData() {
      setLoading(true);
      setError(null);
      setExistingConsultation(null);
      setStep("agent");
      setTermsAccordionOpen(false);

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
          const { data: profile } = await supabase
            .from("profiles")
            .select("bank_name, bank_account_number, bank_account_holder")
            .eq("id", currentUser.id)
            .maybeSingle();
          setBankName(profile?.bank_name ?? "");
          setBankAccountNumber(profile?.bank_account_number ?? "");
          setBankAccountHolder(profile?.bank_account_holder ?? "");

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
            .in("status", ["requested", "pending", "confirmed"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingData) {
            const row = existingData as {
              id: string;
              status: string;
              scheduled_at: string;
              agent: { name: string } | { name: string }[] | null;
            };
            const agent = pickFirst(row.agent);
            if (agent) {
              setExistingConsultation({
                id: row.id,
                status: row.status,
                scheduled_at: row.scheduled_at,
                agent,
              });
            }
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
              avatar_url,
              phone_number,
              agent_bio
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
          const baseAgentList = (propertyAgents || [])
            .map((pa) => pickFirst((pa as PropertyAgentRow).profiles))
            .filter(
              (profile): profile is Agent =>
                profile !== null && profile.id !== currentUser?.id,
            );

          const agentIds = baseAgentList.map((agent) => agent.id);
          let agentList = baseAgentList;

          // 아바타는 profiles 테이블에서 직접 조회해 단일 소스로 사용한다.
          if (agentIds.length > 0) {
            const { data: avatarRows } = await supabase
              .from("profiles")
              .select("id, avatar_url")
              .in("id", agentIds);

            const avatarMap = new Map<string, string | null>(
              (avatarRows || []).map((row) => [
                (row as { id: string; avatar_url: string | null }).id,
                (row as { id: string; avatar_url: string | null }).avatar_url,
              ]),
            );

            agentList = baseAgentList.map((agent) => ({
              ...agent,
              avatar_url: avatarMap.has(agent.id)
                ? (avatarMap.get(agent.id) ?? null)
                : (agent.avatar_url ?? null),
            }));
          }

          setAgents(agentList);
          if (defaultAgentId) {
            const preselected = agentList.find(
              (agent) => agent.id === defaultAgentId,
            );
            setSelectedAgent(preselected ?? null);
          } else {
            setSelectedAgent(null);
          }

          if (agentIds.length > 0) {
            const { data: galleryRows } = await supabase
              .from("profile_gallery_images")
              .select("user_id, image_url, sort_order, created_at")
              .in("user_id", agentIds)
              .order("sort_order", { ascending: true })
              .order("created_at", { ascending: true });

            const grouped: Record<string, AgentGalleryImage[]> = {};
            (galleryRows || []).forEach((row) => {
              const item = row as GalleryRow;
              if (!grouped[item.user_id]) grouped[item.user_id] = [];
              grouped[item.user_id].push(item);
            });
            setAgentGalleryMap(grouped);
          } else {
            setAgentGalleryMap({});
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
  }, [isOpen, supabase, propertyId, defaultAgentId]);

  // confirm 단계 진입 시 약관 로드
  useEffect(() => {
    if (step === "confirm") {
      setAgreedToTerms(false);
      fetch("/api/terms?type=customer_reservation")
        .then((res) => res.json())
        .then((data) => {
          if (data.terms?.[0]) {
            setTerms(data.terms[0]);
          }
        })
        .catch((err) => {
          console.error("약관 로드 오류:", err);
        });
    }
  }, [step]);

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
          agreed_to_terms: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "예약에 실패했습니다");
      }

      const formattedDate = `${selectedDate.getFullYear()}.${(selectedDate.getMonth() + 1).toString().padStart(2, "0")}.${selectedDate.getDate().toString().padStart(2, "0")}`;
      showAlert(
        `예약 요청이 접수되었습니다.\n\n예약 일시: ${formattedDate} ${selectedTime}\n상담사: ${selectedAgent.name}\n\n관리자 승인 후 상담사에게 전달됩니다.`,
      );
      onClose();

      // 마이페이지로 이동 후 "내 상담 예약" 모달 자동 오픈
      router.push("/profile?consultations=1");
    } catch (err: unknown) {
      console.error("예약 오류:", err);
      setError((err instanceof Error ? err.message : "알 수 없는 오류") || "예약에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTimeNext() {
    if (!canGoNext) return;
    if (!hasBankInfo) {
      setStep("bank");
      return;
    }
    setStep("confirm");
  }

  async function handleSaveBankAndNext() {
    const trimmedBankName = bankName.trim();
    const trimmedAccountNumber = bankAccountNumber.trim();
    const trimmedAccountHolder = bankAccountHolder.trim();
    if (!trimmedBankName || !trimmedAccountNumber || !trimmedAccountHolder) {
      showAlert("은행, 계좌번호, 입금자명을 모두 입력해주세요");
      return;
    }

    setBankSaving(true);
    setError(null);
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        throw new Error("로그인이 필요합니다");
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          bank_name: trimmedBankName,
          bank_account_number: trimmedAccountNumber,
          bank_account_holder: trimmedAccountHolder,
        })
        .eq("id", currentUser.id);

      if (updateError) {
        throw new Error("계좌 정보 저장에 실패했습니다");
      }

      setStep("confirm");
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : "알 수 없는 오류") || "계좌 정보 저장에 실패했습니다");
    } finally {
      setBankSaving(false);
    }
  }

  const canSubmit =
    selectedAgent && selectedDate && selectedTime && !submitting && agreedToTerms;
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
        <div className="ob-typo-h2 text-(--oboon-text-title)">
          {step === "confirm" ? "예약금 안내 및 동의" : "상담 예약"}
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
                  <Image
                    src={propertyImageUrl}
                    alt={propertyName || "property"}
                    width={64}
                    height={64}
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
                      WebkitMaskSize: "40%",
                      maskSize: "40%",
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
                  router.push("/profile?consultations=1");
                }}
              >
                내 예약 보기
              </Button>
            </div>
          </Card>
        </div>
      ) : step === "agent" ? (
        <>
          <div className="mt-4">
            <div className="ob-typo-subtitle text-(--oboon-text-title) mb-2">
              상담사 선택
            </div>

            {agents.length === 0 ? (
              <div className="text-center py-4 ob-typo-body text-(--oboon-text-muted)">
                현재 이용 가능한 상담사가 없습니다
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-72 overflow-y-auto">
                {agents.map((agent) => {
                  const isSelected = selectedAgent?.id === agent.id;
                  const avatarUrl = getAvatarUrlOrDefault(agent.avatar_url);
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
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-(--oboon-bg-subtle)">
                          <Image
                            src={avatarUrl}
                            alt={`${agent.name} 아바타`}
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="ob-typo-caption text-(--oboon-text-muted)">
                            분양상담사
                          </div>
                          <div className="ob-typo-subtitle text-(--oboon-text-title) truncate">
                            {agent.name}
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          shape="pill"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewAgent(agent);
                          }}
                        >
                          프로필 보기
                        </Button>
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
                    const slotLabel = isDisabled
                      ? slot.reason === "booked"
                        ? "예약됨"
                        : slot.reason === "closed"
                          ? "마감"
                          : "지남"
                      : slot.time;
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
                        {slotLabel}
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
          
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Button
              className="w-full"
              variant="secondary"
              size="md"
              shape="pill"
              onClick={() => setStep("agent")}
            >
              이전 단계
            </Button>
            <Button
              className="w-full"
              variant="primary"
              size="md"
              shape="pill"
              disabled={!canGoNext}
              onClick={handleTimeNext}
            >
              다음 단계
            </Button>
          </div>
        </>
      ) : step === "bank" ? (
        <>
          <div className="mt-5">
            <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-4 py-3">
              <div className="ob-typo-subtitle text-(--oboon-text-title)">
                환불계좌 입력
              </div>
              <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                방문 보상금 지급 및 환불 처리를 위해 사용됩니다.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="은행명"
                  disabled={bankSaving}
                />
                <Input
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="계좌번호"
                  disabled={bankSaving}
                />
                <Input
                  value={bankAccountHolder}
                  onChange={(e) => setBankAccountHolder(e.target.value)}
                  placeholder="입금자명"
                  disabled={bankSaving}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-(--oboon-danger) bg-(--oboon-danger)/10 px-4 py-3 ob-typo-caption text-(--oboon-danger)">
              {error}
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button
              className="w-full"
              variant="secondary"
              size="md"
              shape="pill"
              onClick={() => setStep("time")}
              disabled={bankSaving}
            >
              이전 단계
            </Button>
            <Button
              className="w-full"
              variant="primary"
              size="md"
              shape="pill"
              disabled={!hasBankInfo || bankSaving}
              onClick={handleSaveBankAndNext}
            >
              {bankSaving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  저장 중...
                </span>
              ) : (
                "저장하고 다음"
              )}
            </Button>
          </div>
        </>
      ) : (
        <>
          <Card className="bg-(--oboon-bg-subtle) p-3 sm:p-4 mt-3 border border-(--oboon-border-default) shadow-none">
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-xl bg-(--oboon-bg-subtle) overflow-hidden flex items-center justify-center">
                {propertyImageUrl ? (
                  <Image
                    src={propertyImageUrl}
                    alt={propertyName || "property"}
                    width={64}
                    height={64}
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
                      WebkitMaskSize: "40%",
                      maskSize: "40%",
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
                    "ob-typo-body",
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
                    "ob-typo-body",
                    ].join(" ")}
                >
                  <User className="h-4 w-4 shrink-0" />
                  <span className="leading-none">
                    상담사 : {selectedAgent?.name || "-"}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <div className="mt-3">
            <div className="mt-3 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-4 py-3">
              <div className="ob-typo-subtitle text-(--oboon-text-title)">
                예약금 입금 안내
              </div>
              <div className="mt-4 ob-typo-h3 text-(--oboon-text-title) text-center">
                토스뱅크 1002-3131-0563
                <br/>
                <span className="mt-2 inline-flex items-center gap-10">
                  <span>OBOON</span>
                  <span>1,000원</span>
                </span>
              </div>
              <ul className="mt-4 list-disc space-y-1 pl-5 ob-typo-body text-(--oboon-text-muted)">
                <li>
                  예약 후 실제 방문이 확인되면, 프로필에 등록된 계좌로 방문{" "}
                  <span className="rounded-md bg-(--oboon-primary)/15 px-1.5 py-0.5 font-semibold text-(--oboon-primary)">
                    보상금 10,000원
                  </span>
                  이 지급됩니다.
                </li>
              </ul>
            </div>

            <div className="mt-3 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-4 py-3">
              <div className="ob-typo-subtitle text-(--oboon-text-title)">
                포인트 예약 안내
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 ob-typo-body text-(--oboon-text-muted)">
                <li>포인트로 예약하면 관리자 승인 없이 즉시 예약이 진행됩니다.</li>
                <li>고객 사유 취소 시 결제된 예약금 1,000원은 1,000P로 전환됩니다.</li>
              </ul>
            </div>

            <div className="mt-3 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-4 py-4">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 text-left"
                onClick={() => setTermsAccordionOpen((prev) => !prev)}
                aria-expanded={termsAccordionOpen}
              >
                <span className="ob-typo-subtitle text-(--oboon-text-title)">
                  약관 전문
                </span>
                <ChevronDown
                  className={[
                    "h-5 w-5 text-(--oboon-text-muted) transition-transform duration-200",
                    termsAccordionOpen ? "rotate-180" : "",
                  ].join(" ")}
                />
              </button>
              {termsAccordionOpen ? (
                <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-3">
                  <p className="ob-typo-caption whitespace-pre-wrap text-(--oboon-text-muted)">
                    {terms?.content || "약관을 불러오는 중..."}
                  </p>
                </div>
              ) : null}
            </div>

            <div
              className={[
                "mt-3 flex items-center gap-2 rounded-xl px-1",
                "text-(--oboon-text-title)",
                "ob-typo-body",
              ].join(" ")}
            >
              <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="w-5 h-5 rounded border-(--oboon-border-default) accent-(--oboon-primary)"
              />
                <span>위 내용을 확인하였으며 동의합니다</span>
              </label>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mt-4 rounded-xl border border-(--oboon-danger) bg-(--oboon-danger)/10 px-4 py-3 ob-typo-caption text-(--oboon-danger)">
              {error}
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-3">
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
                "예약금 입금 완료"
              )}
            </Button>
          </div>
        </>
      )}
      </Modal>

      <Modal
        open={Boolean(previewAgent)}
        onClose={() => setPreviewAgent(null)}
      >
        {previewAgent ? (
          <>
            <div className="ob-typo-h2 text-(--oboon-text-title)">
              상담사 프로필
            </div>

            <div className="mt-5 flex items-center gap-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle) text-(--oboon-text-title) flex items-center justify-center ob-typo-subtitle">
                <Image
                  src={getAvatarUrlOrDefault(previewAgent.avatar_url)}
                  alt={`${previewAgent.name} 아바타`}
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <div className="ob-typo-caption text-(--oboon-text-muted)">
                  분양상담사
                </div>
                <div className="ob-typo-subtitle text-(--oboon-text-title)">
                  {previewAgent.name}
                </div>
              </div>
            </div>

            <div className="mt-6 whitespace-pre-line ob-typo-body text-(--oboon-text-title)">
              {previewAgent.agent_bio?.trim() || "등록된 상담사 소개가 없습니다."}
            </div>

            {(agentGalleryMap[previewAgent.id] || []).length > 0 ? (
              <div className="mt-6">
                <div className="ob-typo-subtitle text-(--oboon-text-title)">
                  추가 사진
                </div>
                <div className="mt-3 -mx-1 overflow-x-auto pb-1">
                  <div className="flex gap-2 px-1">
                    {(agentGalleryMap[previewAgent.id] || []).slice(0, 10).map((image, index) => (
                      <button
                        key={`${image.user_id}-${image.sort_order}-${index}`}
                        type="button"
                        className="h-36 w-36 shrink-0 overflow-hidden rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle)"
                        onClick={() => {
                          const urls = (agentGalleryMap[previewAgent.id] || [])
                            .slice(0, 10)
                            .map((item) => item.image_url);
                          setPreviewImages(urls);
                          setPreviewImageIndex(index);
                        }}
                        aria-label={`${previewAgent.name} 상담사 추가 사진 ${index + 1} 확대 보기`}
                      >
                        <Image
                          src={image.image_url}
                          alt={`${previewAgent.name} 상담사 추가 사진 ${index + 1}`}
                          width={144}
                          height={144}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </Modal>

      <Modal
        open={previewImageIndex !== null}
        onClose={() => {
          setPreviewImageIndex(null);
          setPreviewImages([]);
        }}
        showCloseIcon={false}
        panelClassName="!p-0 !border-0 !bg-transparent !shadow-none w-[min(100%-2rem,920px)] !overflow-visible"
      >
        {previewImageIndex !== null && previewImages[previewImageIndex] ? (
          <div className="flex items-center justify-center">
            <div className="relative inline-block">
              <Image
                src={previewImages[previewImageIndex]}
                alt="상담사 추가 사진 확대 보기"
                width={920}
                height={720}
                className="max-h-[80vh] max-w-[min(100%,920px)] h-auto w-auto rounded-xl"
              />
              <button
                type="button"
                className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"
                onClick={() => {
                  setPreviewImageIndex(null);
                  setPreviewImages([]);
                }}
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white"
                onClick={() =>
                  setPreviewImageIndex((prev) => {
                    if (prev == null) return prev;
                    if (previewImages.length === 0) return prev;
                    return (prev - 1 + previewImages.length) % previewImages.length;
                  })
                }
                aria-label="이전 사진"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white"
                onClick={() =>
                  setPreviewImageIndex((prev) => {
                    if (prev == null) return prev;
                    if (previewImages.length === 0) return prev;
                    return (prev + 1) % previewImages.length;
                  })
                }
                aria-label="다음 사진"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

    </>
  );
}
