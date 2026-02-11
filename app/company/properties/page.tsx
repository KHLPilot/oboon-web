// app/company/properties/page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import {
  deletePropertyById,
  fetchPropertyListData,
  type PropertyListRow,
} from "@/features/company/services/property.list";
import { useRouter } from "next/navigation";
import { Calendar, Edit2, Trash2, User } from "lucide-react";
import Button from "@/components/ui/Button";
import PageContainer from "@/components/shared/PageContainer";
import { showAlert } from "@/shared/alert";
import { getPropertySectionStatus } from "@/features/property/components/propertyProgress";

const ALLOWED_ROLES = ["builder", "developer", "admin", "agent"];

/* --------------------------------------------------
   타입
-------------------------------------------------- */
type ProfileRow = {
  id: string;
  name: string;
  role: string;
};

type PropertyRow = {
  id: PropertyListRow["id"];
  name: PropertyListRow["name"];
  created_by: PropertyListRow["created_by"];
  profiles?: ProfileRow | ProfileRow[] | null;
  property_locations?: PropertyListRow["property_locations"];
  property_facilities?: PropertyListRow["property_facilities"];
  property_specs?: PropertyListRow["property_specs"];
  property_timeline?: PropertyListRow["property_timeline"];
  property_unit_types?: PropertyListRow["property_unit_types"];
  confirmed_comment?: PropertyListRow["confirmed_comment"];
  estimated_comment?: PropertyListRow["estimated_comment"];
  request_status?: "pending" | "approved" | "rejected" | null;
  request_requested_at?: string | null;
  request_rejection_reason?: string | null;
  delete_request_status?: "pending" | "approved" | "rejected" | null;
  delete_request_requested_at?: string | null;
};

/* --------------------------------------------------
   미입력 Pill (Outline)
-------------------------------------------------- */
function MissingPill({ label }: { label: string }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1",
        "border border-(--oboon-border-default)",
        "bg-transparent",
        "text-(--oboon-text-muted)",
        "ob-typo-caption",
      ].join(" ")}
    >
      {label}
      <span className="ml-1">· 미입력</span>
    </span>
  );
}

/* --------------------------------------------------
   요약 Pill: +N
-------------------------------------------------- */
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

/* --------------------------------------------------
   상태 칩
-------------------------------------------------- */
function StatusChip({
  inputCount,
  totalCount,
}: {
  inputCount: number;
  totalCount: number;
}) {
  const isComplete = inputCount === totalCount;

  return (
    <Badge variant="status" className="ob-typo-caption">
      {isComplete ? "입력 완료" : `입력 상태 ${inputCount}/${totalCount}`}
    </Badge>
  );
}

function RequestStatusBadge({
  status,
}: {
  status: PropertyRow["request_status"];
}) {
  if (!status) return null;
  const label =
    status === "pending"
      ? "요청 중"
      : status === "approved"
        ? "게시됨"
        : "반려";
  const variant =
    status === "approved"
      ? "success"
      : status === "rejected"
        ? "danger"
        : "warning";
  return (
    <Badge variant={variant} className="ob-typo-caption">
      {label}
    </Badge>
  );
}

function DeleteRequestStatusBadge({
  status,
}: {
  status: PropertyRow["delete_request_status"];
}) {
  if (!status) return null;
  const label =
    status === "pending"
      ? "삭제 요청 중"
      : status === "approved"
        ? "삭제 완료"
        : "삭제 반려";
  const variant =
    status === "pending"
      ? "danger"
      : status === "approved"
        ? "danger"
        : "warning";
  return (
    <Badge variant={variant} className="ob-typo-caption">
      {label}
    </Badge>
  );
}

function formatKoreanDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const day = dayNames[d.getDay()];
  const hours = d.getHours();
  const period = hours < 12 ? "오전" : "오후";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const minute = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}. ${mm}. ${dd}. (${day}) ${period} ${hour12}:${minute}`;
}

/* --------------------------------------------------
   수정 버튼
-------------------------------------------------- */
function EditButton({ href, disabled }: { href: string; disabled?: boolean }) {
  const router = useRouter();

  return (
    <Button
      variant={disabled ? "secondary" : "primary"}
      size="sm"
      shape="pill"
      className="h-8 w-8 p-0 cursor-pointer transition-colors hover:bg-(--oboon-bg-subtle)"
      disabled={disabled}
      onClick={() => {
        if (!disabled) router.push(href);
      }}
      aria-label={disabled ? "수정 불가" : "수정"}
    >
      <Edit2 className="h-4 w-4" />
    </Button>
  );
}

/* --------------------------------------------------
   페이지
-------------------------------------------------- */
export default function PropertyListPage() {
  const router = useRouter();

  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  // 삭제 처리
  async function handleDelete(id: number, canDelete: boolean) {
    if (!canDelete) {
      showAlert("본인이 작성한 현장만 삭제할 수 있습니다.");
      return;
    }

    if (currentUserRole === "agent") {
      const reason = prompt("삭제 요청 사유를 입력해주세요:");
      if (!reason || !reason.trim()) return;

      const response = await fetch("/api/property-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: id,
          requestType: "delete",
          reason: reason.trim(),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        showAlert(data.error || "삭제 요청에 실패했습니다.");
        return;
      }

      showAlert("삭제 요청이 접수되었습니다. 관리자 승인 후 삭제됩니다.");
      return;
    }

    const ok = window.confirm(
      "이 현장을 삭제할까요? 이 작업은 되돌릴 수 없습니다.",
    );
    if (!ok) return;

    const { error } = await deletePropertyById(id);

    if (error) {
      showAlert("삭제에 실패했습니다.");
      console.error(error);
      return;
    }

    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  useEffect(() => {
    async function load() {
      const data = await fetchPropertyListData();

      if (!data.userId) {
        router.replace("/");
        return;
      }

      setCurrentUserId(data.userId);

      if (!data.role || !ALLOWED_ROLES.includes(data.role)) {
        router.replace("/");
        return;
      }

      setCurrentUserRole(data.role);
      setLoading(true);

      if (data.error) {
        console.error("현장 목록 로드 실패:", data.error);
        setRows([]);
      } else {
        setRows(data.rows);
      }

      setLoading(false);
    }

    load();
  }, [router]);

  /* --------------------------------------------------
     핵심 로직: 진행 상황 체크
  -------------------------------------------------- */
  const getInternalProgress = (row: PropertyRow) => {
    const status = getPropertySectionStatus(row);
    const sections = [
      { label: "현장 위치", status: status.siteLocationStatus },
      { label: "건물 스펙", status: status.specsStatus },
      { label: "일정", status: status.timelineStatus },
      { label: "평면 타입", status: status.unitStatus },
      { label: "홍보시설", status: status.facilityStatus },
      { label: "감정평가사 메모", status: status.commentStatus },
    ];

    const completedCount = sections.filter((s) => s.status === "full").length;
    const partialCount = sections.filter((s) => s.status === "partial").length;
    const totalCount = sections.length;
    const progressPercent = Math.round(
      ((completedCount + partialCount * 0.5) / totalCount) * 100,
    );
    const missingLabels = sections
      .filter((s) => s.status !== "full")
      .map((s) => s.label);

    return {
      inputCount: completedCount,
      totalCount,
      progressPercent,
      missingLabels,
      isIncomplete: missingLabels.length > 0,
    };
  };

  const incompleteCount = useMemo(
    () => rows.filter((r) => getInternalProgress(r).isIncomplete).length,
    [rows],
  );

  const filteredRows = useMemo(() => {
    if (!showIncompleteOnly) return rows;
    return rows.filter((r) => getInternalProgress(r).isIncomplete);
  }, [rows, showIncompleteOnly]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8">
        <div className="ob-typo-body text-(--oboon-text-muted)">
          불러오는 중...
        </div>
      </div>
    );
  }

  return (
    <PageContainer>
      <div>
        {/* 헤더 */}
        <div className="mb-6 flex flex-col gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="ob-typo-h1 text-(--oboon-text-title)">
                현장 목록
              </div>

              <Badge variant="status" className="ob-typo-caption px-2.5 py-1">
                미완 {incompleteCount}건
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowIncompleteOnly((v) => !v)}
                className={[
                  "inline-flex h-10 items-center gap-2 rounded-xl px-4",
                  "bg-transparent text-(--oboon-text-body)",
                  "transition-colors",
                  "ob-typo-button",
                ].join(" ")}
                aria-pressed={showIncompleteOnly}
              >
                <span
                  className={[
                    "inline-flex h-5 w-9 items-center rounded-full border px-0.5",
                    showIncompleteOnly
                      ? "justify-end border-(--oboon-primary) bg-(--oboon-bg-surface)"
                      : "justify-start border-(--oboon-border-default) bg-(--oboon-bg-surface)",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  <span
                    className={[
                      "h-4 w-4 rounded-full",
                      showIncompleteOnly
                        ? "bg-(--oboon-primary)"
                        : "bg-(--oboon-text-muted)",
                    ].join(" ")}
                  />
                </span>
                <span className="ob-typo-body">미완 현장만</span>
              </button>

              <Button
                variant="primary"
                size="md"
                shape="default"
                onClick={() => router.push("/company/properties/new")}
              >
                + 새 현장 등록
              </Button>
            </div>
          </div>
        </div>

        {/* 목록 없음 */}
        {filteredRows.length === 0 && (
          <div
            className={[
              "rounded-2xl border border-(--oboon-border-default)",
              "bg-(--oboon-bg-surface)",
              "p-6",
              "ob-typo-body text-(--oboon-text-muted)",
            ].join(" ")}
          >
            {showIncompleteOnly
              ? "입력 미완 현장이 없습니다."
              : "등록된 현장이 없습니다."}
          </div>
        )}

        {/* 2??洹몃━??*/}
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredRows.map((row) => {
            const { inputCount, totalCount, progressPercent, missingLabels } =
              getInternalProgress(row);

            const canDelete =
              currentUserRole === "admin" || row.created_by === currentUserId;
            const hasPendingDeleteRequest = row.delete_request_status === "pending";
            const canEdit =
              (canDelete || currentUserRole === "agent") && !hasPendingDeleteRequest;

            const profile = row.profiles
              ? Array.isArray(row.profiles)
                ? row.profiles[0]
                : row.profiles
              : null;

            const getDisplayName = (prof: ProfileRow | null) => {
              if (!prof) return "작성자 알 수 없음";

              let roleSuffix = "";
              if (prof.role === "admin") roleSuffix = "오분";
              else if (prof.role === "builder") roleSuffix = "시공사";
              else if (prof.role === "developer") roleSuffix = "시행사";
              else roleSuffix = prof.role;

              return `${prof.name} / ${roleSuffix}`;
            };

            const displayName = getDisplayName(profile);

            const MAX_PILLS = 3;
            const visibleMissing = missingLabels.slice(0, MAX_PILLS);
            const hiddenCount = Math.max(0, missingLabels.length - MAX_PILLS);

            return (
              <div
                key={row.id}
                className={[
                  "h-full flex flex-col",
                  "rounded-2xl border border-(--oboon-border-default)",
                  "bg-(--oboon-bg-surface)",
                  "p-6 shadow-none",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="ob-typo-h3 text-(--oboon-text-title) truncate">
                      {row.name}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <RequestStatusBadge status={row.request_status} />
                    <DeleteRequestStatusBadge status={row.delete_request_status} />
                    <StatusChip inputCount={inputCount} totalCount={totalCount} />
                    <EditButton
                      href={`/company/properties/${row.id}`}
                      disabled={!canEdit}
                    />

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id, canDelete)}
                        aria-label="삭제"
                        className={[
                          "inline-flex h-8 w-8 items-center justify-center rounded-full p-0 cursor-pointer transition-colors",
                          "text-(--oboon-danger)",
                          "hover:bg-(--oboon-danger-bg)",
                          "focus:outline-none focus:ring-2 focus:ring-(--oboon-danger)/30",
                        ].join(" ")}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 ob-typo-body text-(--oboon-text-muted)">
                      <User className="h-4 w-4" />
                      <span>{displayName}</span>
                    </div>
                    <div className="flex items-center gap-2 ob-typo-body text-(--oboon-text-muted)">
                      <Calendar className="h-4 w-4" />
                      <span>{formatKoreanDateTime(row.request_requested_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-(--oboon-border-default)" />

                <div className="mt-4">
                  <div className="ob-typo-body text-(--oboon-text-muted)">
                    입력 진행률 :{" "}
                    <span className="text-(--oboon-text-title)">
                      {progressPercent}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-(--oboon-bg-subtle)">
                    <div
                      className="h-2 rounded-full bg-(--oboon-primary)"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {missingLabels.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {visibleMissing.map((label) => (
                      <MissingPill key={label} label={label} />
                    ))}
                    {hiddenCount > 0 ? <MorePill count={hiddenCount} /> : null}
                  </div>
                ) : null}

                {row.request_status === "rejected" &&
                row.request_rejection_reason ? (
                  <div className="mt-3 ob-typo-caption text-(--oboon-danger)">
                    반려 사유: {row.request_rejection_reason}
                  </div>
                ) : null}

              </div>
            );
          })}
        </div>
      </div>
    </PageContainer>
  );
}
