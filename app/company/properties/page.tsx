"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { Trash2 } from "lucide-react";

/* --------------------------------------------------
   타입
-------------------------------------------------- */
type RelationRow = { id: number };

type SpecsRow = {
  id: number;
  sale_type?: string | null;
  trust_company?: string | null;
  developer?: string | null;
  builder?: string | null;
  land_use_zone?: string | null;
  site_area?: number | null;
  building_area?: number | null;
  building_coverage_ratio?: number | null;
  floor_area_ratio?: number | null;
  floor_ground?: number | null;
  floor_underground?: number | null;
  building_count?: number | null;
  household_total?: number | null;
  parking_total?: number | null;
  parking_per_household?: number | null;
  heating_type?: string | null;
  amenities?: string | null;
};

type TimelineRow = {
  id: number;
  announcement_date?: string | null;
  application_start?: string | null;
  application_end?: string | null;
  winner_announce?: string | null;
  contract_start?: string | null;
  contract_end?: string | null;
  move_in_date?: string | null;
};

type SectionStatus = "none" | "partial" | "full";

type PropertyRow = {
  id: number;
  name: string;

  property_locations?: RelationRow[] | null;
  property_facilities?: RelationRow[] | null;
  property_specs?: SpecsRow | SpecsRow[] | null;
  property_timeline?: TimelineRow | TimelineRow[] | null;
  property_unit_types?: RelationRow[] | null;
};

/* --------------------------------------------------
   진행상태 계산
-------------------------------------------------- */
function getProgress(row: PropertyRow) {
  const hasMany = (v?: RelationRow[] | null) =>
    Array.isArray(v) && v.length > 0;
  const statusFromValues = (
    vals: (string | number | null | undefined)[]
  ): SectionStatus => {
    const filled = vals.filter(
      (v) => v !== null && v !== undefined && v !== ""
    ).length;
    if (filled === 0) return "none";
    if (filled === vals.length) return "full";
    return "partial";
  };

  const specsRow = Array.isArray(row.property_specs)
    ? row.property_specs[0]
    : row.property_specs ?? null;

  const timelineRow = Array.isArray(row.property_timeline)
    ? row.property_timeline[0]
    : row.property_timeline ?? null;

  const siteLocationStatus: SectionStatus = hasMany(row.property_locations)
    ? "full"
    : "none";
  const facilityStatus: SectionStatus = hasMany(row.property_facilities)
    ? "full"
    : "none";
  const unitStatus: SectionStatus = hasMany(row.property_unit_types)
    ? "full"
    : "none";

  const specsStatus: SectionStatus = specsRow
    ? statusFromValues([
        specsRow.sale_type,
        specsRow.trust_company,
        specsRow.developer,
        specsRow.builder,
        specsRow.land_use_zone,
        specsRow.site_area,
        specsRow.building_area,
        specsRow.building_coverage_ratio,
        specsRow.floor_area_ratio,
        specsRow.floor_ground,
        specsRow.floor_underground,
        specsRow.building_count,
        specsRow.household_total,
        specsRow.parking_total,
        specsRow.parking_per_household,
        specsRow.heating_type,
        specsRow.amenities,
      ])
    : "none";

  const timelineStatus: SectionStatus = timelineRow
    ? statusFromValues([
        timelineRow.announcement_date,
        timelineRow.application_start,
        timelineRow.application_end,
        timelineRow.winner_announce,
        timelineRow.contract_start,
        timelineRow.contract_end,
        timelineRow.move_in_date,
      ])
    : "none";

  const specsRequiredFields = [
    specsRow?.sale_type,
    specsRow?.developer,
    specsRow?.builder,
    specsRow?.land_use_zone,
  ];
  const timelineRequiredFields = [
    timelineRow?.announcement_date,
    timelineRow?.application_start,
    timelineRow?.application_end,
    timelineRow?.contract_start,
  ];
  const specsRequiredMet = specsRequiredFields.every((v) => !!v);
  const timelineRequiredMet = timelineRequiredFields.every((v) => !!v);

  const sections = [
    { label: "현장 위치", status: siteLocationStatus },
    { label: "건물 스펙", status: specsStatus, requiredMet: specsRequiredMet },
    { label: "일정", status: timelineStatus, requiredMet: timelineRequiredMet },
    { label: "평면 타입", status: unitStatus },
    { label: "홍보시설", status: facilityStatus },
  ];

  const shouldCountSection = (status: SectionStatus, requiredMet?: boolean) =>
    status !== "none" && (requiredMet ?? true);

  const inputCount = sections.filter((s) =>
    shouldCountSection(s.status, s.requiredMet)
  ).length;
  const fullCount = sections.filter((s) => s.status === "full").length;
  const totalCount = sections.length;

  const missingLabels = sections
    .filter((s) => !shouldCountSection(s.status, s.requiredMet))
    .map((s) => s.label);

  return {
    siteLocationStatus,
    facilityStatus,
    specsStatus,
    timelineStatus,
    unitStatus,
    specsRequiredMet,
    timelineRequiredMet,
    inputCount,
    fullCount,
    totalCount,
    missingLabels,
    isIncomplete: missingLabels.length > 0,
  };
}

/* --------------------------------------------------
   미입력 Pill (Outline)
-------------------------------------------------- */
function MissingPill({ label }: { label: string }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        "border border-(--oboon-border-default)",
        "bg-transparent",
        "text-(--oboon-text-muted)",
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
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        "border border-(--oboon-border-default)",
        "bg-(--oboon-bg-subtle)",
        "text-(--oboon-text-body)",
      ].join(" ")}
    >
      +{count}
    </span>
  );
}

/* --------------------------------------------------
   하단 액션 2분리
   - 좌: 상태 표시(배지/버튼)
   - 우: 수정 버튼
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
    <Badge variant="status" className="text-[13px]">
      {isComplete ? "입력 완료" : `입력 상태 ${inputCount}/${totalCount}`}
    </Badge>
  );
}

function EditButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex h-9 items-center justify-center rounded-xl px-3",
        "text-[13px] font-semibold",
        "bg-(--oboon-primary) text-white",
        "hover:bg-(--oboon-primary-hover)",
        "transition-colors",
      ].join(" ")}
    >
      수정
    </Link>
  );
}

/* --------------------------------------------------
   페이지
-------------------------------------------------- */
export default function PropertyListPage() {
  const supabase = createSupabaseClient();

  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);

  {
    /* 삭제 처리 */
  }
  async function handleDelete(id: number) {
    const ok = window.confirm(
      "이 현장을 삭제할까요? 이 작업은 되돌릴 수 없습니다."
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
      setLoading(true);

      const { data, error } = await supabase
        .from("properties")
        .select(
          `
          id,
          name,
          property_locations(id),
          property_facilities(id),
          property_specs(
            id,
            sale_type,
            trust_company,
            developer,
            builder,
            land_use_zone,
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
        `
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
  }, [supabase]);

  const incompleteCount = useMemo(
    () => rows.filter((r) => getProgress(r).isIncomplete).length,
    [rows]
  );

  const filteredRows = useMemo(() => {
    if (!showIncompleteOnly) return rows;
    return rows.filter((r) => getProgress(r).isIncomplete);
  }, [rows, showIncompleteOnly]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8">
        <div className="text-sm text-(--oboon-text-muted)">불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8">
      {/* 헤더 */}
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-(--oboon-text-title)">
              현장 목록
            </h1>
            <Badge variant="status" className="text-xs px-2.5 py-1">
              미완 {incompleteCount}건
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            {/* 미완만 보기 토글 */}
            <button
              type="button"
              onClick={() => setShowIncompleteOnly((v) => !v)}
              className={[
                "inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold",
                "bg-transparent",
                "text-(--oboon-text-body)",
                "transition-colors",
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
              <span>미완 현장만</span>
            </button>

            {/* 새 현장 등록 */}
            <Link
              href="/company/properties/new"
              className={[
                "inline-flex h-10 items-center justify-center rounded-xl px-4",
                "text-sm font-semibold text-white",
                "bg-(--oboon-primary) hover:bg-(--oboon-primary-hover)",
                "transition-colors",
              ].join(" ")}
            >
              + 새 현장 등록
            </Link>
          </div>
        </div>
      </div>

      {/* 목록 없음 */}
      {filteredRows.length === 0 && (
        <div
          className={[
            "rounded-2xl border border-(--oboon-border-default)",
            "bg-(--oboon-bg-surface)",
            "p-6 text-sm text-(--oboon-text-muted)",
          ].join(" ")}
        >
          {showIncompleteOnly
            ? "입력 미완 현장이 없습니다."
            : "등록된 현장이 없습니다."}
        </div>
      )}

      {/* 1 → 2열 그리드 */}
      <div className="grid gap-4 sm:grid-cols-2">
        {filteredRows.map((row) => {
          const { inputCount, fullCount, totalCount, missingLabels } =
            getProgress(row);

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
                "p-6 shadow-none md:shadow-sm",
                "transition-transform transition-shadow",
                "hover:-translate-y-[2px]",
                "hover:shadow-[var(--card-shadow)]",
              ].join(" ")}
            >
              {/* 상단: 제목 + 상태 배지 */}
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-[18px] font-semibold text-(--oboon-text-title) truncate">
                  {row.name}
                </h2>

                <div className="flex items-center gap-2 shrink-0">
                  <StatusChip inputCount={inputCount} totalCount={totalCount} />

                  <button
                    type="button"
                    onClick={() => handleDelete(row.id)}
                    aria-label="삭제"
                    className="rounded-full p-1 text-red-500 hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* 중단: 미입력 칩 */}
              {missingLabels.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {visibleMissing.map((label) => (
                    <MissingPill key={label} label={label} />
                  ))}
                  {hiddenCount > 0 && <MorePill count={hiddenCount} />}
                </div>
              )}

              {/* ✅ 하단 고정: mt-auto */}
              <div className="mt-auto pt-5 flex items-center justify-end gap-2">
                <EditButton href={`/company/properties/${row.id}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
