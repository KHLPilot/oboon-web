"use client";

import { RefreshCw } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import OboonDatePicker from "@/components/ui/DatePicker";
import { AdminTd, AdminTh } from "@/features/admin/components/AdminTable";
import AdminAvatar from "@/features/admin/components/AdminAvatar";
import type { ReservationRow } from "@/features/admin/types/dashboard";

const RESERVATION_STATUS_OPTIONS = [
  { value: "all", label: "모든 상태" },
  { value: "requested", label: "승인 요청" },
  { value: "pending", label: "예약 대기" },
  { value: "confirmed", label: "예약 확정" },
  { value: "visited", label: "방문 완료" },
  { value: "contracted", label: "계약 완료" },
  { value: "cancelled", label: "취소됨" },
];

type AdminReservationsTabProps = {
  onRefresh: () => void;
  reservationsLoading: boolean;
  reservationStatus: string;
  reservationStatusLabel: Record<string, string>;
  onSelectStatus: (status: string) => void;
  reservationDate: Date | null;
  onChangeReservationDate: (date: Date | null) => void;
  reservationAgentQuery: string;
  onChangeReservationAgentQuery: (value: string) => void;
  reservationSlice: ReservationRow[];
  reservationTotal: number;
  reservationStart: number;
  reservationEnd: number;
  reservationPageSafe: number;
  reservationPageCount: number;
  onSetReservationPage: (page: number) => void;
  onSelectReservation: (row: ReservationRow) => void;
};

function getReservationStatusBadgeVariant(
  status: string,
): "default" | "status" | "success" | "warning" | "danger" {
  if (status === "requested") return "success";
  return "status";
}

export default function AdminReservationsTab({
  onRefresh,
  reservationsLoading,
  reservationStatus,
  reservationStatusLabel,
  onSelectStatus,
  reservationDate,
  onChangeReservationDate,
  reservationAgentQuery,
  onChangeReservationAgentQuery,
  reservationSlice,
  reservationTotal,
  reservationStart,
  reservationEnd,
  reservationPageSafe,
  reservationPageCount,
  onSetReservationPage,
  onSelectReservation,
}: AdminReservationsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="ob-typo-h2 text-(--oboon-text-title)">예약 관리</div>
        <Button
          variant="secondary"
          size="sm"
          shape="pill"
          className="h-9 w-9 p-0 rounded-full"
          onClick={onRefresh}
          disabled={reservationsLoading}
          aria-label="새로고침"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-3">
        <Select
          value={reservationStatus}
          onChange={onSelectStatus}
          options={RESERVATION_STATUS_OPTIONS}
        />

        <OboonDatePicker
          selected={reservationDate}
          onChange={onChangeReservationDate}
          dateFormat="yyyy-MM-dd"
          textFormat="yyyy-MM-dd"
          placeholder="예약일"
          inputClassName={[
            "h-11 w-full rounded-xl bg-(--oboon-bg-surface)",
            "border border-(--oboon-border-default)",
            "px-4 py-2 text-sm text-(--oboon-text-title)",
            "placeholder:text-(--oboon-text-muted)",
          ].join(" ")}
        />

        <Input
          placeholder="상담사명 검색"
          value={reservationAgentQuery}
          onChange={(event) => onChangeReservationAgentQuery(event.target.value)}
          className="w-full py-2"
        />
      </div>

      <Card className="p-4 shadow-none">
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full min-w-[720px] ob-typo-body border-collapse">
            <thead>
              <tr>
                <AdminTh>예약 번호</AdminTh>
                <AdminTh>상태</AdminTh>
                <AdminTh>고객 정보</AdminTh>
                <AdminTh>상담사</AdminTh>
                <AdminTh>방문 일시</AdminTh>
                <AdminTh className="text-right"> </AdminTh>
              </tr>
            </thead>
            <tbody>
              {reservationSlice.map((row) => (
                <tr key={row.id}>
                  <AdminTd className="text-(--oboon-text-muted)">{row.id.slice(0, 8)}</AdminTd>
                  <AdminTd>
                    <Badge variant={getReservationStatusBadgeVariant(row.status)}>
                      {reservationStatusLabel[row.status] || row.status}
                    </Badge>
                  </AdminTd>
                  <AdminTd>
                    <div className="flex items-center gap-2">
                      <AdminAvatar name={row.customer?.name} url={row.customer_avatar_url} />
                      <span>{row.customer?.name ?? "-"}</span>
                    </div>
                  </AdminTd>
                  <AdminTd>
                    <div className="flex items-center gap-2">
                      <AdminAvatar name={row.agent?.name} url={row.agent_avatar_url} />
                      <span>{row.agent?.name ?? "-"}</span>
                    </div>
                  </AdminTd>
                  <AdminTd className="text-(--oboon-text-muted)">
                    {new Date(row.scheduled_at).toLocaleString("ko-KR", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      weekday: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </AdminTd>
                  <AdminTd className="text-right">
                    <button
                      type="button"
                      className="ob-typo-body text-(--oboon-text-muted) hover:text-(--oboon-text-title)"
                      onClick={() => onSelectReservation(row)}
                      aria-label="예약 상세 보기"
                    >
                      &gt;
                    </button>
                  </AdminTd>
                </tr>
              ))}
              {reservationSlice.length === 0 && (
                <tr>
                  <AdminTd colSpan={6} className="py-8 text-center">
                    {reservationsLoading ? "불러오는 중..." : "예약이 없습니다."}
                  </AdminTd>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="ob-typo-caption text-(--oboon-text-muted)">
            총 {reservationTotal}개의 예약 중{" "}
            {reservationTotal === 0
              ? "0"
              : `${reservationStart + 1}-${Math.min(reservationEnd, reservationTotal)}`}{" "}
            표시
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              shape="pill"
              disabled={reservationPageSafe <= 1}
              onClick={() => onSetReservationPage(Math.max(1, reservationPageSafe - 1))}
            >
              ‹
            </Button>
            {Array.from({ length: Math.min(5, reservationPageCount) }, (_, i) => i + 1).map(
              (page) => (
                <Button
                  key={`reservation-page-${page}`}
                  variant={page === reservationPageSafe ? "primary" : "secondary"}
                  size="sm"
                  shape="pill"
                  onClick={() => onSetReservationPage(page)}
                >
                  {page}
                </Button>
              ),
            )}
            <Button
              variant="secondary"
              size="sm"
              shape="pill"
              disabled={reservationPageSafe >= reservationPageCount}
              onClick={() =>
                onSetReservationPage(Math.min(reservationPageSafe + 1, reservationPageCount))
              }
            >
              ›
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

