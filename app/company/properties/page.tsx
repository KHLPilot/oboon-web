"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { Trash2 } from "lucide-react";
import {
  getPropertyProgress,
  type PropertyProgressRow,
} from "@/features/property/mappers/propertyProgress";

/* --------------------------------------------------
   타입
-------------------------------------------------- */
type PropertyRow = PropertyProgressRow & {
  id: number;
  name: string;
};

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
    () => rows.filter((r) => getPropertyProgress(r).isIncomplete).length,
    [rows]
  );

  const filteredRows = useMemo(() => {
    if (!showIncompleteOnly) return rows;
    return rows.filter((r) => getPropertyProgress(r).isIncomplete);
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
          const { inputCount, totalCount, missingLabels } =
            getPropertyProgress(row);

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
                "hover:-translate-y-0.5",
                "hover:shadow-(--card-shadow)",
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
