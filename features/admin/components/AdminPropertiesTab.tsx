"use client";

import { Calendar, RefreshCw, Trash2, User } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { AdminPropertyCard } from "@/features/admin/services/admin.dashboard";

type PropertyAgentAction = {
  id: string;
  action: "approve" | "reject";
  loading: boolean;
} | null;

type AdminPropertiesTabProps = {
  visiblePropertyCount: number;
  propertyStatusFilter: "all" | "incomplete";
  onChangePropertyStatusFilter: (value: "all" | "incomplete") => void;
  onRefresh: () => void;
  onCreateProperty: () => void;
  propertyCards: AdminPropertyCard[];
  propertyDeleteLoadingId: number | null;
  onDeleteProperty: (propertyId: number) => void;
  onOpenProperty: (propertyId: number) => void;
  resolvedPropertyRequests: Record<string, boolean>;
  propertyAgentAction: PropertyAgentAction;
  onApprovePropertyRequest: (propertyAgentId: string, requestType: "publish" | "delete") => void;
  onRejectPropertyRequest: (propertyAgentId: string, requestType: "publish" | "delete") => void;
};

function MissingPill({ label }: { label: string }) {
  return (
    <Badge variant="warning" className="ob-typo-caption px-2.5 py-1">
      {label}
    </Badge>
  );
}

function MorePill({ count }: { count: number }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1",
        "border border-(--oboon-border-default)",
        "bg-(--oboon-bg-subtle)",
        "text-(--oboon-text-body)",
        "ob-typo-caption",
      ].join(" ")}
    >
      +{count}
    </span>
  );
}

function propertyProgress(status: AdminPropertyCard["status"]) {
  switch (status) {
    case "pending":
      return 40;
    case "rejected":
      return 40;
    case "approved":
      return 100;
    default:
      return 0;
  }
}

function getCardProgress(card: AdminPropertyCard) {
  return card.progressPercent ?? propertyProgress(card.status);
}

function requesterRoleLabel(role?: string | null) {
  switch (role) {
    case "admin":
      return "관리자";
    case "agent":
      return "분양상담사";
    case "builder":
      return "시공사";
    case "developer":
      return "시행사";
    default:
      return role ?? "-";
  }
}

export default function AdminPropertiesTab({
  visiblePropertyCount,
  propertyStatusFilter,
  onChangePropertyStatusFilter,
  onRefresh,
  onCreateProperty,
  propertyCards,
  propertyDeleteLoadingId,
  onDeleteProperty,
  onOpenProperty,
  resolvedPropertyRequests,
  propertyAgentAction,
  onApprovePropertyRequest,
  onRejectPropertyRequest,
}: AdminPropertiesTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="ob-typo-h2 text-(--oboon-text-title)">현장 관리</div>
          <Badge variant="status">{visiblePropertyCount}건</Badge>
        </div>
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

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {[
            { id: "all", label: "전체" },
            { id: "incomplete", label: "미완성" },
          ].map((tab) => {
            const isActive = propertyStatusFilter === tab.id;
            return (
              <Button
                key={tab.id}
                onClick={() => onChangePropertyStatusFilter(tab.id as "all" | "incomplete")}
                variant={isActive ? "primary" : "secondary"}
                size="sm"
                shape="pill"
                className="text-xs"
              >
                {tab.label}
              </Button>
            );
          })}
        </div>
        <Button variant="primary" size="sm" shape="pill" onClick={onCreateProperty}>
          + 새 현장 등록
        </Button>
      </div>

      {propertyCards.length === 0 ? (
        <Card className="p-5 shadow-none">
          <div className="ob-typo-body text-(--oboon-text-muted)">표시할 현장이 없습니다.</div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {propertyCards.map((card) => {
            const maxPills = 3;
            const visibleMissing = card.missingLabels.slice(0, maxPills);
            const hiddenCount = Math.max(0, card.missingLabels.length - maxPills);

            return (
              <Card
                key={card.propertyId}
                className="p-4 shadow-none cursor-pointer transition-colors hover:bg-(--oboon-bg-subtle)"
                onClick={() => onOpenProperty(card.propertyId)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="mt-1 min-w-0 flex-1 ob-typo-h3 text-(--oboon-text-title)">
                    <span className="block truncate whitespace-nowrap">{card.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteProperty(card.propertyId);
                    }}
                    disabled={propertyDeleteLoadingId === card.propertyId}
                    aria-label="삭제"
                    className={[
                      "inline-flex h-8 w-8 items-center justify-center rounded-full p-0 cursor-pointer transition-colors shrink-0",
                      "text-(--oboon-danger)",
                      "hover:bg-(--oboon-danger-bg)",
                      "focus:outline-none focus:ring-2 focus:ring-(--oboon-danger)/30",
                      propertyDeleteLoadingId === card.propertyId ? "opacity-50 cursor-not-allowed" : "",
                    ].join(" ")}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="mt-2 space-y-1 ob-typo-body text-(--oboon-text-muted)">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-(--oboon-text-muted)" />
                    <span>
                      {card.agent} / {requesterRoleLabel(card.agentRole)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-(--oboon-text-muted)" />
                    <span>
                      {new Date(card.createdAt).toLocaleString("ko-KR", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        weekday: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {card.status === "rejected" && card.rejectionReason ? (
                    <div className="text-(--oboon-danger) ob-typo-body">반려 사유: {card.rejectionReason}</div>
                  ) : null}
                </div>

                <div className="mt-3 border-t border-(--oboon-border-default) pt-3">
                  <div className="ob-typo-body text-(--oboon-text-muted)">입력 진행률 · {getCardProgress(card)}%</div>
                  <div className="mt-2 h-2 w-full rounded-full bg-(--oboon-bg-subtle)">
                    <div
                      className="h-2 rounded-full bg-(--oboon-primary)"
                      style={{ width: `${getCardProgress(card)}%` }}
                    />
                  </div>
                  {card.missingLabels.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {visibleMissing.map((label) => (
                        <MissingPill key={label} label={label} />
                      ))}
                      {hiddenCount > 0 ? <MorePill count={hiddenCount} /> : null}
                    </div>
                  ) : null}

                  {card.status === "pending" &&
                  card.latestRequestId &&
                  !resolvedPropertyRequests[card.latestRequestId] ? (
                    <div className="mt-3 flex items-center justify-between gap-3">
                      {card.requestType === "delete" && card.reason ? (
                        <div className="ob-typo-body text-(--oboon-danger) truncate">삭제 사유: {card.reason}</div>
                      ) : (
                        <span />
                      )}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          shape="pill"
                          variant="primary"
                          disabled={
                            propertyAgentAction?.id === card.latestRequestId && propertyAgentAction?.loading
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            const requestId = card.latestRequestId;
                            const requestType = card.requestType;
                            if (!requestId || !requestType) return;
                            onApprovePropertyRequest(requestId, requestType);
                          }}
                        >
                          승인
                        </Button>
                        <Button
                          size="sm"
                          shape="pill"
                          variant="secondary"
                          disabled={
                            propertyAgentAction?.id === card.latestRequestId && propertyAgentAction?.loading
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            const requestId = card.latestRequestId;
                            const requestType = card.requestType;
                            if (!requestId || !requestType) return;
                            onRejectPropertyRequest(requestId, requestType);
                          }}
                        >
                          반려
                        </Button>
                      </div>
                    </div>
                  ) : card.requestType === "delete" && card.reason ? (
                    <div className="mt-3 ob-typo-body text-(--oboon-danger)">삭제 사유: {card.reason}</div>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

