"use client";

import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarDays,
  FileText,
  RefreshCw,
  Users,
} from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { type SettlementSummary } from "@/features/admin/types/dashboard";

type UserGrowth = {
  total: number;
  delta: number;
  percent: number;
};

type AdminSummaryTabProps = {
  onRefresh: () => void;
  userGrowth: UserGrowth;
  pendingPropertyRequestCount: number;
  publishedPropertyCount: number;
  todayNewConsultations: number;
  todayVisitConsultations: number;
  todayNewQnaCount: number;
  pendingQnaCount: number;
  settlementSummary: SettlementSummary;
  onGoUsers: () => void;
  onGoProperties: () => void;
  onGoReservations: () => void;
  onGoSettlements: () => void;
  onGoQna: () => void;
};

export default function AdminSummaryTab({
  onRefresh,
  userGrowth,
  pendingPropertyRequestCount,
  publishedPropertyCount,
  todayNewConsultations,
  todayVisitConsultations,
  todayNewQnaCount,
  pendingQnaCount,
  settlementSummary,
  onGoUsers,
  onGoProperties,
  onGoReservations,
  onGoSettlements,
  onGoQna,
}: AdminSummaryTabProps) {
  const settlementSummaryCards = [
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
      icon: <AlertTriangle className="h-4 w-4 text-(--oboon-danger)" />,
    },
  ];

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="ob-typo-h2 text-(--oboon-text-title)">요약</div>
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
      <Card className="p-5">
        <div className="ob-typo-caption text-(--oboon-text-muted)">OVERVIEW</div>
        <div className="mt-1 ob-typo-h3 text-(--oboon-text-title)">오늘의 운영 요약</div>
        <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
          <span suppressHydrationWarning>
            {new Date().toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-(--oboon-text-title)">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-(--oboon-bg-subtle)">
                <Users className="h-4 w-4 text-(--oboon-primary)" />
              </span>
              <span className="ob-typo-subtitle">전체 사용자</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              shape="pill"
              className="h-8 w-8 p-0 rounded-full"
              onClick={onGoUsers}
              aria-label="사용자 관리로 이동"
            >
              <ArrowRight className="h-4 w-4 text-(--oboon-text-muted)" />
            </Button>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <div className="ob-typo-h2 text-(--oboon-text-title)">{userGrowth.total.toLocaleString()}명</div>
            <span className="rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-2 py-0.5 ob-typo-caption text-(--oboon-text-muted)">
              ↗ +{userGrowth.delta}명
            </span>
          </div>
          <div className="mt-2 ob-typo-caption text-(--oboon-text-muted)">어제 대비 {userGrowth.percent}% 증가</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-(--oboon-text-title)">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-(--oboon-bg-subtle)">
                <Building2 className="h-4 w-4 text-(--oboon-primary)" />
              </span>
              <span className="ob-typo-subtitle">현장 등록 현황</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              shape="pill"
              className="h-8 w-8 p-0 rounded-full"
              onClick={onGoProperties}
              aria-label="현장 관리로 이동"
            >
              <ArrowRight className="h-4 w-4 text-(--oboon-text-muted)" />
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div>
              <div className="ob-typo-caption text-(--oboon-text-muted)">승인 대기</div>
              <div className="mt-1 ob-typo-h3 text-(--oboon-text-title)">{pendingPropertyRequestCount}건</div>
            </div>
            <div className="h-10 w-px bg-(--oboon-border-default)" />
            <div>
              <div className="ob-typo-caption text-(--oboon-text-muted)">현재 게시된 현장</div>
              <div className="mt-1 ob-typo-h3 text-(--oboon-text-title)">{publishedPropertyCount}건</div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-(--oboon-text-title)">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-(--oboon-bg-subtle)">
                  <CalendarDays className="h-4 w-4 text-(--oboon-primary)" />
                </span>
                <span className="ob-typo-subtitle">오늘 예약</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                shape="pill"
                className="h-8 w-8 p-0 rounded-full"
                onClick={onGoReservations}
                aria-label="예약 관리로 이동"
              >
                <ArrowRight className="h-4 w-4 text-(--oboon-text-muted)" />
              </Button>
            </div>

            <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div>
                <div className="ob-typo-caption text-(--oboon-text-muted)">신규 예약</div>
                <div className="mt-1 ob-typo-h3 text-(--oboon-text-title)">{todayNewConsultations}건</div>
              </div>
              <div className="h-10 w-px bg-(--oboon-border-default)" />
              <div>
                <div className="ob-typo-caption text-(--oboon-text-muted)">오늘 방문 예정</div>
                <div className="mt-1 ob-typo-h3 text-(--oboon-text-title)">{todayVisitConsultations}건</div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-(--oboon-text-title)">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-(--oboon-bg-subtle)">
                  <FileText className="h-4 w-4 text-(--oboon-primary)" />
                </span>
                <span className="ob-typo-subtitle">1:1 문의</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                shape="pill"
                className="h-8 w-8 p-0 rounded-full"
                onClick={onGoQna}
                aria-label="고객센터로 이동"
              >
                <ArrowRight className="h-4 w-4 text-(--oboon-text-muted)" />
              </Button>
            </div>

            <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div>
                <div className="ob-typo-caption text-(--oboon-text-muted)">오늘 신규 문의</div>
                <div className="mt-1 ob-typo-h3 text-(--oboon-text-title)">{todayNewQnaCount}건</div>
              </div>
              <div className="h-10 w-px bg-(--oboon-border-default)" />
              <div>
                <div className="ob-typo-caption text-(--oboon-text-muted)">답변 대기</div>
                <div className="mt-1 ob-typo-h3 text-(--oboon-text-title)">{pendingQnaCount}건</div>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-4 sm:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-(--oboon-text-title)">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-(--oboon-bg-subtle)">
                <AlertTriangle className="h-4 w-4 text-(--oboon-danger)" />
              </span>
              <span className="ob-typo-subtitle">정산 처리 필요 목록</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              shape="pill"
              className="h-8 w-8 p-0 rounded-full"
              onClick={onGoSettlements}
              aria-label="정산 관리로 이동"
            >
              <ArrowRight className="h-4 w-4 text-(--oboon-text-muted)" />
            </Button>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {settlementSummaryCards.map((item) => (
              <Card key={`summary-${item.label}`} className="p-4 shadow-none">
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
        </Card>
      </div>
    </>
  );
}

