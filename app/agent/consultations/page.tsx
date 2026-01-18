"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Clock,
  MapPin,
  MessageCircle,
  User,
  Check,
  X,
  Loader2,
  QrCode,
  Trash2,
} from "lucide-react";
import Link from "next/link";

import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { createSupabaseClient } from "@/lib/supabaseClient";

interface Consultation {
  id: string;
  scheduled_at: string;
  status: string;
  qr_code: string;
  visited_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone_number: string;
  };
  agent: {
    id: string;
    name: string;
    email: string;
    phone_number: string;
  };
  property: {
    id: number;
    name: string;
    image_url: string | null;
  };
}

// 취소된 예약 삭제까지 남은 시간 계산 (3일 후 삭제)
function getTimeUntilDeletion(cancelledAt: string): string {
  const cancelDate = new Date(cancelledAt);
  const deleteDate = new Date(cancelDate);
  deleteDate.setDate(deleteDate.getDate() + 3);
  const now = new Date();
  const diffTime = deleteDate.getTime() - now.getTime();

  if (diffTime <= 0) return "곧 자동 삭제됩니다";

  const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));

  if (diffHours <= 24) {
    return `약 ${diffHours}시간 후 자동 삭제`;
  }

  const diffDays = Math.ceil(diffHours / 24);
  return `약 ${diffDays}일 후 자동 삭제`;
}

const STATUS_LABELS: Record<
  string,
  { label: string; variant: "default" | "status" }
> = {
  pending: { label: "승인 대기", variant: "default" },
  confirmed: { label: "예약 확정", variant: "status" },
  visited: { label: "방문 완료", variant: "status" },
  contracted: { label: "계약 완료", variant: "status" },
  cancelled: { label: "취소됨", variant: "default" },
};

export default function AgentConsultationsPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [isAgent, setIsAgent] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      try {
        // 로그인 체크
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth/login");
          return;
        }

        // 상담사 권한 체크
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile?.role !== "agent" && profile?.role !== "admin") {
          alert("상담사 권한이 필요합니다");
          router.push("/");
          return;
        }

        setIsAgent(true);

        // 예약 목록 조회
        const url =
          filter === "all"
            ? "/api/consultations?role=agent"
            : `/api/consultations?role=agent&status=${filter}`;

        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
          setConsultations(data.consultations || []);
        } else {
          console.error("예약 목록 조회 실패:", data.error);
        }
      } catch (err) {
        console.error("데이터 조회 오류:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [supabase, router, filter]);

  // 예약 확정
  async function handleConfirm(consultationId: string) {
    try {
      const response = await fetch(`/api/consultations/${consultationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      });

      if (response.ok) {
        setConsultations((prev) =>
          prev.map((c) =>
            c.id === consultationId ? { ...c, status: "confirmed" } : c
          )
        );
        alert("예약이 확정되었습니다");
      } else {
        const data = await response.json();
        alert(data.error || "확정에 실패했습니다");
      }
    } catch (err) {
      console.error("예약 확정 오류:", err);
      alert("확정 중 오류가 발생했습니다");
    }
  }

  // 예약 취소
  async function handleCancel(consultationId: string) {
    if (!confirm("예약을 취소하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/consultations/${consultationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });

      if (response.ok) {
        setConsultations((prev) =>
          prev.map((c) =>
            c.id === consultationId
              ? {
                  ...c,
                  status: "cancelled",
                  cancelled_at: new Date().toISOString(),
                }
              : c
          )
        );
        alert("예약이 취소되었습니다. 3일 후 자동으로 삭제됩니다.");
      } else {
        const data = await response.json();
        alert(data.error || "취소에 실패했습니다");
      }
    } catch (err) {
      console.error("예약 취소 오류:", err);
      alert("취소 중 오류가 발생했습니다");
    }
  }

  // 예약 삭제
  async function handleDelete(consultationId: string) {
    if (!confirm("이 예약을 완전히 삭제하시겠습니까?\n삭제된 예약은 복구할 수 없습니다.")) return;

    try {
      const response = await fetch(`/api/consultations/${consultationId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setConsultations((prev) => prev.filter((c) => c.id !== consultationId));
        alert("예약이 삭제되었습니다.");
      } else {
        const data = await response.json();
        alert(data.error || "삭제에 실패했습니다");
      }
    } catch (err) {
      console.error("예약 삭제 오류:", err);
      alert("삭제 중 오류가 발생했습니다");
    }
  }

  // 날짜 포맷
  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const dayName = dayNames[date.getDay()];
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${month}월 ${day}일 (${dayName}) ${hours}:${minutes}`;
  }

  if (!isAgent && !loading) {
    return null;
  }

  return (
    <PageContainer className="py-8">
      <div className="max-w-3xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-(--oboon-text-title)">
            예약 관리
          </h1>
          <p className="mt-1 text-sm text-(--oboon-text-muted)">
            고객 상담 예약을 확인하고 관리할 수 있습니다
          </p>
        </div>

        {/* 필터 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { key: "all", label: "전체" },
            { key: "pending", label: "승인 대기" },
            { key: "confirmed", label: "확정" },
            { key: "visited", label: "방문완료" },
            { key: "contracted", label: "계약완료" },
          ].map((f) => (
            <Button
              key={f.key}
              size="sm"
              shape="pill"
              variant={filter === f.key ? "primary" : "secondary"}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* 로딩 */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-(--oboon-primary)" />
          </div>
        ) : consultations.length === 0 ? (
          /* 빈 상태 */
          <Card className="text-center py-12">
            <CalendarDays className="h-12 w-12 mx-auto text-(--oboon-text-muted) mb-4" />
            <p className="text-(--oboon-text-muted)">
              {filter === "all"
                ? "예약 내역이 없습니다"
                : "해당 상태의 예약이 없습니다"}
            </p>
          </Card>
        ) : (
          /* 예약 목록 */
          <div className="space-y-4">
            {consultations.map((consultation) => (
              <Card key={consultation.id} className="overflow-hidden">
                {/* 상태 바 */}
                <div className="px-4 py-2 bg-(--oboon-bg-subtle) border-b border-(--oboon-border-default)">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={
                        STATUS_LABELS[consultation.status]?.variant || "default"
                      }
                    >
                      {STATUS_LABELS[consultation.status]?.label ||
                        consultation.status}
                    </Badge>
                    <span className="text-xs text-(--oboon-text-muted)">
                      {formatDate(consultation.scheduled_at)}
                    </span>
                  </div>
                  {/* 취소된 예약: 삭제 예정 안내 */}
                  {consultation.status === "cancelled" && consultation.cancelled_at && (
                    <p className="text-xs text-red-500 mt-1">
                      {getTimeUntilDeletion(consultation.cancelled_at)}
                    </p>
                  )}
                </div>

                <div className="p-4">
                  {/* 고객 정보 */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="h-12 w-12 rounded-full bg-(--oboon-bg-subtle) flex items-center justify-center shrink-0">
                      <User className="h-6 w-6 text-(--oboon-text-muted)" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-(--oboon-text-title)">
                        {consultation.customer.name}
                      </p>
                    </div>
                  </div>

                  {/* 분양 정보 */}
                  <Link
                    href={`/offerings/${consultation.property.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-(--oboon-bg-subtle) hover:bg-(--oboon-bg-subtle)/80 transition-colors"
                  >
                    <div className="h-12 w-12 rounded-lg bg-(--oboon-bg-page) overflow-hidden shrink-0">
                      {consultation.property.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={consultation.property.image_url}
                          alt={consultation.property.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <MapPin className="h-5 w-5 text-(--oboon-text-muted)" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-(--oboon-text-title) truncate">
                        {consultation.property.name}
                      </p>
                    </div>
                  </Link>

                  {/* 액션 버튼 */}
                  <div className="flex gap-2 mt-4">
                    {consultation.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          className="flex-1"
                          onClick={() => handleConfirm(consultation.id)}
                        >
                          <Check className="h-4 w-4" />
                          승인
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1"
                          onClick={() => handleCancel(consultation.id)}
                        >
                          <X className="h-4 w-4" />
                          거절
                        </Button>
                      </>
                    )}

                    {consultation.status === "confirmed" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1"
                        onClick={() => router.push(`/agent/scan`)}
                      >
                        <QrCode className="h-4 w-4" />
                        QR 보기
                      </Button>
                    )}

                    {/* 취소된 예약: 삭제 버튼 */}
                    {consultation.status === "cancelled" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleDelete(consultation.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        삭제
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => router.push(`/chat/${consultation.id}`)}
                    >
                      <MessageCircle className="h-4 w-4" />
                      채팅
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
