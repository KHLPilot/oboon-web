"use client";

import { useMemo, useState, useEffect } from "react";
import { CalendarDays, Star, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { createSupabaseClient } from "@/lib/supabaseClient";

interface Agent {
  id: string;
  name: string;
  email: string;
  phone_number?: string;
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

  // 날짜 옵션 생성 (오늘 포함 7일)
  const DATES = useMemo(() => {
    const dates = [];
    const today = new Date();
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const dayName = dayNames[date.getDay()];
      dates.push({
        label: `${month}.${day.toString().padStart(2, '0')} (${dayName})`,
        value: date.toISOString().split('T')[0],
      });
    }
    return dates;
  }, []);

  const TIMES = useMemo(() => ["10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"], []);

  const [selectedDate, setSelectedDate] = useState(DATES[0]?.value || "");
  const [selectedTime, setSelectedTime] = useState(TIMES[2] || TIMES[0]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // 사용자 정보 및 상담사 목록 조회
  useEffect(() => {
    if (!isOpen) return;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        // 현재 사용자 확인
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);

        // 상담사 목록 조회 (role이 agent인 사용자)
        const { data: agentList, error: agentError } = await supabase
          .from("profiles")
          .select("id, name, email, phone_number")
          .eq("role", "agent")
          .is("deleted_at", null);

        if (agentError) {
          console.error("상담사 목록 조회 오류:", agentError);
          setError("상담사 목록을 불러오는데 실패했습니다");
        } else {
          setAgents(agentList || []);
          if (agentList && agentList.length > 0) {
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
  }, [isOpen, supabase]);

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
      const scheduledAt = new Date(`${selectedDate}T${selectedTime}:00`);

      const response = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: selectedAgent.id,
          property_id: propertyId,
          scheduled_at: scheduledAt.toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "예약에 실패했습니다");
      }

      alert(`예약이 완료되었습니다!\n\n예약 일시: ${selectedDate} ${selectedTime}\n상담사: ${selectedAgent.name}`);
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

            <div className="flex gap-2 overflow-x-auto pb-2">
              {DATES.slice(0, 5).map((d) => {
                const active = selectedDate === d.value;
                return (
                  <Button
                    key={d.value}
                    size="sm"
                    shape="pill"
                    variant={active ? "primary" : "secondary"}
                    className="shrink-0"
                    onClick={() => setSelectedDate(d.value)}
                  >
                    {d.label}
                  </Button>
                );
              })}
            </div>

            <div className="mt-4">
              <div className="text-xs font-medium text-(--oboon-text-muted) mb-2">
                시간 선택
              </div>
              <div className="grid grid-cols-4 gap-2">
                {TIMES.map((t) => {
                  const active = selectedTime === t;
                  return (
                    <Button
                      key={t}
                      size="sm"
                      shape="pill"
                      variant={active ? "primary" : "secondary"}
                      className="w-full"
                      onClick={() => setSelectedTime(t)}
                    >
                      {t}
                    </Button>
                  );
                })}
              </div>
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
              {DATES.find(d => d.value === selectedDate)?.label} {selectedTime}
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
