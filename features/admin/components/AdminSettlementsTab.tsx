"use client";

import { RefreshCw, Scale } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AdminTd, AdminTh } from "@/features/admin/components/AdminTable";
import type { SettlementRow, SettlementSummary } from "@/features/admin/types/dashboard";

type AdminSettlementsTabProps = {
  onRefresh: () => void;
  settlementSummary: SettlementSummary;
  settlementRows: SettlementRow[];
  settlementLoading: boolean;
  reservationStatusLabel: Record<string, string>;
  onSelectSettlement: (row: SettlementRow) => void;
};

function getSettlementStatusBadgeVariant(
  row: SettlementRow,
): "default" | "status" | "success" | "warning" | "danger" {
  if (row.status === "no_show") return "danger";
  if (row.reward_label === "보상 지급 대기" || row.deposit_label === "환급 대기") return "success";
  return "status";
}

function toneClass(tone: "primary" | "success" | "warning" | "danger" | "muted") {
  switch (tone) {
    case "primary":
      return "text-(--oboon-primary)";
    case "success":
      return "text-(--oboon-success)";
    case "warning":
      return "text-(--oboon-warning)";
    case "danger":
      return "text-(--oboon-danger)";
    default:
      return "text-(--oboon-text-muted)";
  }
}

export default function AdminSettlementsTab({
  onRefresh,
  settlementSummary,
  settlementRows,
  settlementLoading,
  reservationStatusLabel,
  onSelectSettlement,
}: AdminSettlementsTabProps) {
  const summaryCards = [
    {
      label: "방문 보상 지급 대기",
      count: settlementSummary.rewardPendingCount,
      icon: <RefreshCw className="h-4 w-4 text-(--oboon-primary)" />,
    },
    {
      label: "고객 예약금 환급 대기",
      count: settlementSummary.refundPendingCount,
      icon: <RefreshCw className="h-4 w-4 text-(--oboon-primary)" />,
    },
    {
      label: "노쇼 판정 필요",
      count: settlementSummary.noShowPendingCount,
      icon: <Scale className="h-4 w-4 text-(--oboon-danger)" />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="ob-typo-h2 text-(--oboon-text-title)">정산 관리</div>
        <Button
          variant="secondary"
          size="sm"
          shape="pill"
          className="h-9 w-9 p-0 rounded-full"
          onClick={onRefresh}
          aria-label="새로고침"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {summaryCards.map((item) => (
          <Card key={item.label} className="p-4 shadow-none">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={[
                    "h-8 w-8 rounded-lg border",
                    "inline-flex items-center justify-center",
                    "bg-(--oboon-bg-subtle) border-(--oboon-border-default)",
                  ].join(" ")}
                >
                  {item.icon}
                </span>
                <span className="ob-typo-h4 text-(--oboon-text-title)">{item.label}</span>
              </div>
              <span className="ob-typo-body text-(--oboon-text-title)">{item.count}건</span>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4 shadow-none">
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full min-w-[720px] ob-typo-body border-collapse">
            <thead>
              <tr>
                <AdminTh>예약 번호</AdminTh>
                <AdminTh>예약 상태</AdminTh>
                <AdminTh>고객 예약금</AdminTh>
                <AdminTh>방문 보상금</AdminTh>
                <AdminTh>사유</AdminTh>
                <AdminTh className="text-right"> </AdminTh>
              </tr>
            </thead>
            <tbody>
              {settlementRows.map((row) => {
                const statusBadgeVariant = getSettlementStatusBadgeVariant(row);
                return (
                  <tr key={`settlement-${row.id}`}>
                    <AdminTd className="text-(--oboon-text-muted)">{row.id.slice(0, 8)}</AdminTd>
                    <AdminTd>
                      <Badge variant={statusBadgeVariant}>
                        {reservationStatusLabel[row.status] || row.status}
                      </Badge>
                    </AdminTd>
                    <AdminTd>
                      <span className={toneClass(row.deposit_tone)}>{row.deposit_label}</span>
                    </AdminTd>
                    <AdminTd>
                      <span className={toneClass(row.reward_tone)}>{row.reward_label}</span>
                    </AdminTd>
                    <AdminTd>{row.reason}</AdminTd>
                    <AdminTd className="text-right">
                      <button
                        type="button"
                        className="ob-typo-body text-(--oboon-text-muted) hover:text-(--oboon-text-title)"
                        onClick={() => onSelectSettlement(row)}
                        aria-label="정산 상세 보기"
                      >
                        &gt;
                      </button>
                    </AdminTd>
                  </tr>
                );
              })}
              {settlementRows.length === 0 && (
                <tr>
                  <AdminTd colSpan={6} className="py-8 text-center">
                    {settlementLoading ? "불러오는 중..." : "정산 데이터가 없습니다."}
                  </AdminTd>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

