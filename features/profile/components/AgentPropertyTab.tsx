"use client";

import Link from "next/link";
import { Clock, Edit2, Plus, User } from "lucide-react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { type PropertyListRow } from "@/features/company/services/property.list";

type AgentPropertyTabProps = {
  active: boolean;
  hasApprovedProperty: boolean;
  latestRegisteredProperty: PropertyListRow | null;
  latestPropertyDisplayName: string;
  latestPropertyRequestedAtLabel: string;
  latestPropertyProgress: number;
  onEditProperty: (propertyId: number) => void;
};

function getPropertyStatusLabel(status: PropertyListRow["request_status"]): string {
  if (status === "pending") return "검토 대기";
  if (status === "approved") return "게시됨";
  if (status === "rejected") return "반려됨";
  return "등록됨";
}

function getPropertyStatusVariant(
  status: PropertyListRow["request_status"],
): "warning" | "success" | "danger" | "status" {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  if (status === "pending") return "warning";
  return "status";
}

export default function AgentPropertyTab({
  active,
  hasApprovedProperty,
  latestRegisteredProperty,
  latestPropertyDisplayName,
  latestPropertyRequestedAtLabel,
  latestPropertyProgress,
  onEditProperty,
}: AgentPropertyTabProps) {
  return (
    <section id="property-register" className={active ? "" : "hidden"}>
      <div className="flex items-center justify-between gap-3">
        <div className="ob-typo-h2 text-(--oboon-text-title)">현장 정보 수정</div>
        <Button asChild variant="primary" size="sm" shape="pill">
          <Link href="/company/properties/new" className="inline-flex items-center gap-1.5">
            <Plus className="h-4 w-4" />
            새 현장 등록
          </Link>
        </Button>
      </div>
      <p className="mt-1 ob-typo-body text-(--oboon-text-muted)">
        {hasApprovedProperty
          ? "담당 현장을 새로 등록하거나 기존 현장 목록에서 현황을 관리할 수 있습니다."
          : "소속 현장이 없어 새 현장을 만들면 자동 소속됩니다."}
      </p>

      <Card className="mt-6 p-5">
        {latestRegisteredProperty ? (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 truncate ob-typo-h2 text-(--oboon-text-title)">
                {latestRegisteredProperty.name}
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <Badge
                  variant={getPropertyStatusVariant(latestRegisteredProperty.request_status)}
                  className="px-3 py-1"
                >
                  {getPropertyStatusLabel(latestRegisteredProperty.request_status)}
                </Badge>
                <Button
                  variant="primary"
                  size="sm"
                  shape="pill"
                  className="h-8 w-8 cursor-pointer p-0 transition-colors hover:bg-(--oboon-bg-subtle)"
                  onClick={() => onEditProperty(latestRegisteredProperty.id)}
                  aria-label="수정"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-2 space-y-1 ob-typo-body text-(--oboon-text-muted)">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{latestPropertyDisplayName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{latestPropertyRequestedAtLabel}</span>
              </div>
            </div>

            <div className="mt-4 border-t border-(--oboon-border-default) pt-4">
              <div className="ob-typo-body text-(--oboon-text-body)">
                입력 진행률 : {latestPropertyProgress}%
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-(--oboon-bg-subtle)">
                <div
                  className="h-2 rounded-full bg-(--oboon-primary)"
                  style={{ width: `${latestPropertyProgress}%` }}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="ob-typo-body text-(--oboon-text-muted)">
              소속 현장이 없어 새 현장을 만들면 자동 소속됩니다.
            </div>
            <Button asChild variant="primary" size="sm" shape="pill">
              <Link href="/company/properties/new" className="inline-flex items-center gap-1.5">
                <Plus className="h-4 w-4" />새 현장 등록
              </Link>
            </Button>
          </div>
        )}
      </Card>
    </section>
  );
}
