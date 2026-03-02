"use client";

import Image from "next/image";
import { Building2, CheckCircle, Clock, Loader2, Search, XCircle } from "lucide-react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import {
  type AgentProperty,
  type AgentPropertyRequest,
} from "@/features/agent/services/agent.properties";

type AgentAffiliationTabProps = {
  active: boolean;
  hasApprovedProperty: boolean;
  searchKeyword: string;
  visiblePropertyCount: number;
  filteredAgentProperties: AgentProperty[];
  visibleAgentProperties: AgentProperty[];
  submittingPropertyId: number | null;
  withdrawingRequestId: string | null;
  getRequestStatus: (propertyId: number) => AgentPropertyRequest | null;
  onSearchKeywordChange: (value: string) => void;
  onApply: (propertyId: number) => void;
  onWithdraw: (propertyAgentId: string, propertyName: string) => void;
  onShowMore: () => void;
};

function getStatusBadge(status: AgentPropertyRequest["status"]) {
  if (status === "approved") {
    return (
      <Badge variant="success" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        승인됨
      </Badge>
    );
  }

  if (status === "pending") {
    return (
      <Badge variant="warning" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        승인 대기
      </Badge>
    );
  }

  if (status === "rejected") {
    return (
      <Badge variant="danger" className="flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        거절됨
      </Badge>
    );
  }

  return null;
}

export default function AgentAffiliationTab({
  active,
  hasApprovedProperty,
  searchKeyword,
  visiblePropertyCount,
  filteredAgentProperties,
  visibleAgentProperties,
  submittingPropertyId,
  withdrawingRequestId,
  getRequestStatus,
  onSearchKeywordChange,
  onApply,
  onWithdraw,
  onShowMore,
}: AgentAffiliationTabProps) {
  return (
    <section
      id="affiliation-section"
      className={["space-y-4", active ? "" : "hidden"].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="ob-typo-h2 text-(--oboon-text-title)">소속 등록</div>
      </div>

      {!hasApprovedProperty ? (
        <Card className="p-4">
          <p className="ob-typo-body text-(--oboon-text-muted)">
            현재 소속된 현장이 없습니다. 아래에서 현장을 검색하여 소속 신청하세요.
          </p>
        </Card>
      ) : null}

      <div className="flex items-center gap-2">
        <Input
          value={searchKeyword}
          onChange={(e) => onSearchKeywordChange(e.target.value)}
          placeholder="현장 검색"
        />
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-elevated)">
          <Search className="h-4 w-4 text-(--oboon-text-muted)" />
        </div>
      </div>

      <div
        id="affiliation-property-list"
        className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3"
      >
        {visibleAgentProperties.map((property) => {
          const request = getRequestStatus(property.id);
          const canApply =
            !request || request.status === "rejected" || request.status === "withdrawn";
          const isApproved = request?.status === "approved";
          const isPending = request?.status === "pending";
          const isRejected = request?.status === "rejected";

          return (
            <Card key={property.id} className="p-3">
              <div className="flex items-start gap-3 sm:items-center">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-(--oboon-bg-subtle) sm:h-24 sm:w-24">
                  {property.image_url ? (
                    <Image
                      src={property.image_url}
                      alt={property.name}
                      width={96}
                      height={96}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Building2 className="h-6 w-6 text-(--oboon-text-muted)" />
                    </div>
                  )}
                  {request?.status === "approved" ? (
                    <span className="absolute left-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-(--oboon-primary) bg-(--oboon-primary) text-(--oboon-on-primary) shadow-sm">
                      <CheckCircle className="h-4 w-4" />
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mt-1 truncate ob-typo-h3 text-(--oboon-text-title)">
                    {property.name}
                  </div>
                  <div className="mt-0.5 truncate ob-typo-subtitle text-(--oboon-text-muted)">
                    {property.property_type}
                  </div>
                  <div className="mt-2 flex items-center justify-start sm:justify-end">
                    {isApproved && request ? (
                      <Button
                        variant="danger"
                        size="sm"
                        shape="pill"
                        className="h-8 whitespace-nowrap"
                        disabled={withdrawingRequestId === request.id}
                        loading={withdrawingRequestId === request.id}
                        onClick={() => onWithdraw(request.id, property.name)}
                      >
                        소속 해제
                      </Button>
                    ) : isPending && request ? (
                      getStatusBadge(request.status)
                    ) : isRejected ? (
                      <div className="flex items-center gap-2">
                        {getStatusBadge("rejected")}
                        <Button
                          variant="primary"
                          size="sm"
                          shape="pill"
                          className="h-8 whitespace-nowrap"
                          disabled={submittingPropertyId === property.id}
                          onClick={() => onApply(property.id)}
                        >
                          {submittingPropertyId === property.id ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              신청 중...
                            </span>
                          ) : (
                            "재신청"
                          )}
                        </Button>
                      </div>
                    ) : canApply ? (
                      <Button
                        variant="primary"
                        size="sm"
                        shape="pill"
                        className="h-8 whitespace-nowrap"
                        disabled={submittingPropertyId === property.id}
                        onClick={() => onApply(property.id)}
                      >
                        {submittingPropertyId === property.id ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            신청 중...
                          </span>
                        ) : (
                          "소속 신청"
                        )}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredAgentProperties.length > visiblePropertyCount ? (
        <div className="flex justify-center">
          <Button variant="secondary" size="sm" shape="pill" onClick={onShowMore}>
            더보기
          </Button>
        </div>
      ) : null}
    </section>
  );
}
