// app/company/properties/page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import PageContainer from "@/components/shared/PageContainer";

const ALLOWED_ROLES = ["builder", "developer", "admin"];

/* --------------------------------------------------
   타입
-------------------------------------------------- */
type ProfileRow = {
  id: string;
  name: string;
  role: string;
};

type PropertyRow = {
  id: number;
  name: string;
  created_by: string;
  profiles?: ProfileRow | ProfileRow[] | null;
  property_locations?: any;
  property_facilities?: any;
  property_specs?: any;
  property_timeline?: any;
  property_unit_types?: any;
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
      disabled={disabled}
      onClick={() => {
        if (!disabled) router.push(href);
      }}
    >
      {disabled ? "수정 불가" : "수정"}
    </Button>
  );
}

/* --------------------------------------------------
   페이지
-------------------------------------------------- */
export default function PropertyListPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();

  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  // 삭제 처리
  async function handleDelete(id: number, canEdit: boolean) {
    if (!canEdit) {
      alert("본인이 작성한 현장만 삭제할 수 있습니다.");
      return;
    }

    const ok = window.confirm(
      "이 현장을 삭제할까요? 이 작업은 되돌릴 수 없습니다.",
    );
    if (!ok) return;

    const { error } = await supabase.from("properties").delete().eq("id", id);

    if (error) {
      alert("삭제에 실패했습니다.");
      console.error(error);
      return;
    }

    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  useEffect(() => {
    async function load() {
      // 1. 로그인 체크
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/");
        return;
      }

      setCurrentUserId(user.id);

      // 2. 권한 체크
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
        router.replace("/");
        return;
      }

      setCurrentUserRole(profile.role);

      // 3. 데이터 로드
      setLoading(true);

      const { data, error } = await supabase
        .from("properties")
        .select(
          `
          id,
          name,
          created_by,
          profiles (id, name, role),
          property_locations(id),
          property_facilities(id),
          property_specs(
            id,
            sale_type,
            trust_company,
            developer,
            builder,
            site_area,
            building_area,
            building_coverage_ratio,
            floor_area_ratio,
            floor_ground,
            floor_underground,
            building_count,
            household_total,
            parking_total,
            parking_per_household,
            heating_type,
            amenities
          ),
          property_timeline(
            id,
            announcement_date,
            application_start,
            application_end,
            winner_announce,
            contract_start,
            contract_end,
            move_in_date
          ),
          property_unit_types(id)
        `,
        )
        .order("id", { ascending: false });

      if (error) {
        console.error("현장 목록 로드 실패:", error);
        setRows([]);
      } else {
        setRows((data ?? []) as PropertyRow[]);
      }

      setLoading(false);
    }

    load();
  }, [router, supabase]);

  /* --------------------------------------------------
     핵심 로직: 진행 상황 체크
  -------------------------------------------------- */
  const getInternalProgress = (row: PropertyRow) => {
    const hasData = (v: any) => {
      if (!v) return false;
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === "object") return Object.keys(v).length > 0;
      return false;
    };

    const steps = [
      { label: "현장 위치", done: hasData(row.property_locations) },
      { label: "홍보시설", done: hasData(row.property_facilities) },
      { label: "건물 스펙", done: hasData(row.property_specs) },
      { label: "일정", done: hasData(row.property_timeline) },
      { label: "평면 타입", done: hasData(row.property_unit_types) },
    ];

    const inputCount = steps.filter((s) => s.done).length;
    const totalCount = steps.length;
    const missingLabels = steps.filter((s) => !s.done).map((s) => s.label);
    const isIncomplete = inputCount < totalCount;

    return { inputCount, totalCount, missingLabels, isIncomplete };
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
    <PageContainer noHeaderOffset>
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

        {/* 2열 그리드 */}
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredRows.map((row) => {
            const { inputCount, totalCount, missingLabels } =
              getInternalProgress(row);

            const canEdit =
              currentUserRole === "admin" || row.created_by === currentUserId;

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
                {/* 상단: 제목 + 상태 배지 */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="ob-typo-h3 text-(--oboon-text-title) truncate">
                      {row.name}
                    </div>
                    <p className="ob-typo-caption text-(--oboon-text-muted) mt-1">
                      작성자: {displayName}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <StatusChip
                      inputCount={inputCount}
                      totalCount={totalCount}
                    />

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id, canEdit)}
                        aria-label="삭제"
                        className={[
                          "rounded-full p-1",
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

                {/* 중단: 미입력 칩 */}
                {missingLabels.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {visibleMissing.map((label) => (
                      <MissingPill key={label} label={label} />
                    ))}
                    {hiddenCount > 0 && <MorePill count={hiddenCount} />}
                  </div>
                ) : (
                  <div className="mt-4">
                    <span className="ob-typo-caption text-(--oboon-primary)">
                      모든 데이터가 입력되었습니다.
                    </span>
                  </div>
                )}

                {/* 하단: 수정 버튼 */}
                <div className="mt-auto pt-5 flex items-center justify-end gap-2">
                  <EditButton
                    href={`/company/properties/${row.id}`}
                    disabled={!canEdit}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PageContainer>
  );
}
