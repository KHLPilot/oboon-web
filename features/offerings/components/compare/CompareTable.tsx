// features/offerings/components/compare/CompareTable.tsx
import { cn } from "@/lib/utils/cn";
import {
  OFFERING_STATUS_VALUES,
  statusLabelOf,
} from "@/features/offerings/domain/offering.constants";
import type {
  FinalGrade5,
  OfferingCompareItem,
} from "@/features/offerings/domain/offering.types";

interface CompareTableProps {
  items: OfferingCompareItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type GradeMeta = { label: string; color: string; bg: string; border: string };
const STATUS_READY = OFFERING_STATUS_VALUES[0];
const STATUS_OPEN = OFFERING_STATUS_VALUES[1];

function grade5Meta(grade: FinalGrade5): GradeMeta {
  switch (grade) {
    case "GREEN":
      return { label: "계약 가능", color: "var(--oboon-grade-green)", bg: "var(--oboon-grade-green-bg)", border: "var(--oboon-grade-green-border)" };
    case "LIME":
      return { label: "거의 충족", color: "var(--oboon-grade-lime)", bg: "var(--oboon-grade-lime-bg)", border: "var(--oboon-grade-lime-border)" };
    case "YELLOW":
      return { label: "확인 필요", color: "var(--oboon-grade-yellow)", bg: "var(--oboon-grade-yellow-bg)", border: "var(--oboon-grade-yellow-border)" };
    case "ORANGE":
      return { label: "계약 어려울 수 있음", color: "var(--oboon-grade-orange)", bg: "var(--oboon-grade-orange-bg)", border: "var(--oboon-grade-orange-border)" };
    case "RED":
      return { label: "계약 어려움", color: "var(--oboon-grade-red)", bg: "var(--oboon-grade-red-bg)", border: "var(--oboon-grade-red-border)" };
  }
}

function statusMeta(s: OfferingCompareItem["status"]): { label: string; cls: string } {
  if (s === STATUS_OPEN) {
    return { label: statusLabelOf(s), cls: "text-(--oboon-safe)" };
  }
  if (s === STATUS_READY) {
    return { label: statusLabelOf(s), cls: "text-(--oboon-primary)" };
  }
  return { label: statusLabelOf(s), cls: "text-(--oboon-text-muted)" };
}

function schoolCls(g: OfferingCompareItem["schoolGrade"]): string {
  if (g === "우수") return "text-(--oboon-safe)";
  if (g === "보통") return "text-(--oboon-warning)";
  return "text-(--oboon-text-muted)";
}

// ─── Layout primitives ────────────────────────────────────────────────────────

/** 섹션 구분: 전체 너비 큰 제목 + 굵은 상단 선 */
function SectionRow({ label }: { label: string }) {
  return (
    <div className="col-span-full border-t-2 border-(--oboon-border-default) pt-10 pb-2">
      <h3 className="ob-typo-h2 font-bold text-(--oboon-text-title)">{label}</h3>
    </div>
  );
}

/**
 * 스펙 그룹 (Apple 스타일):
 *  1행: 스펙명 — col-span-full, 연한 캡션
 *  2행: 각 제품 값 — N개 열
 */
function SpecGroup({
  label,
  values,
  colCount,
  topBorder = true,
}: {
  label: string;
  values: React.ReactNode[];
  colCount: number;
  topBorder?: boolean;
}) {
  const dividerCls = topBorder ? "border-t border-(--oboon-border-default)" : "";

  return (
    <>
      {/* 스펙명 전체 너비 */}
      <div className={cn("col-span-full pt-4 pb-1 ob-typo-body text-(--oboon-text-muted)", dividerCls)}>
        {label}
      </div>
      {/* 제품별 값 */}
      {values.map((v, i) => (
        <div
          key={i}
          className={cn(
            "pb-4 ob-typo-subtitle text-(--oboon-text-title)",
            i < colCount - 1 && "border-r border-(--oboon-border-default) pr-6",
            i > 0 && "pl-6",
            i >= 2 && "hidden md:block",
          )}
        >
          {v ?? <span className="text-(--oboon-text-muted)">—</span>}
        </div>
      ))}
      {/* 빈 셀 (2개 비교 시 3번째 열) */}
      {Array.from({ length: Math.max(0, colCount - values.length) }).map((_, i) => (
        <div key={`pad-${i}`} className={cn("pb-4 text-(--oboon-text-muted)", (values.length + i) >= 2 && "hidden md:block")}>—</div>
      ))}
    </>
  );
}

/**
 * 한눈에 보기 글랜스 셀 — 큰 값 + 작은 라벨
 * SpecGroup과 동일한 N열 구조 사용 → 폭 일치
 */
function GlanceGroup({
  label,
  cells,
  colCount,
  topBorder = true,
}: {
  label: string;
  cells: { value: React.ReactNode; sub?: string }[];
  colCount: number;
  topBorder?: boolean;
}) {
  const dividerCls = topBorder ? "border-t border-(--oboon-border-default)" : "";

  return (
    <>
      {/* 스펙명 전체 너비 */}
      <div className={cn("col-span-full pt-6 pb-2 ob-typo-caption text-(--oboon-text-muted)", dividerCls)}>
        {label}
      </div>
      {/* 제품별 큰 값 */}
      {cells.map((cell, i) => (
        <div
          key={i}
          className={cn(
            "flex flex-col pb-6",
            i < colCount - 1 && "border-r border-(--oboon-border-default) pr-6",
            i > 0 && "pl-6",
            i >= 2 && "hidden md:flex",
          )}
        >
          <div className="text-2xl font-bold text-(--oboon-text-title) leading-tight md:text-3xl">
            {cell.value}
          </div>
          {cell.sub ? (
            <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">{cell.sub}</div>
          ) : null}
        </div>
      ))}
      {Array.from({ length: Math.max(0, colCount - cells.length) }).map((_, i) => (
        <div key={`gpad-${i}`} className={cn("pb-6", (cells.length + i) >= 2 && "hidden md:block")} />
      ))}
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CompareTable({ items }: CompareTableProps) {
  if (items.length < 2) return null;

  const colCount = items.length; // 2 or 3
  const gridCols = "grid-cols-2 md:grid-cols-3";

  return (
    <div className={cn("grid w-full", gridCols)}>

      {/* ══ 한눈에 보기 ══════════════════════════════════════════════ */}
      <div className="col-span-full border-t-2 border-(--oboon-border-default) pt-10 pb-2">
        <h3 className="ob-typo-h2 font-bold text-(--oboon-text-title)">한눈에 보기</h3>
      </div>

      <GlanceGroup
        label="분양가 범위"
        colCount={colCount}
        topBorder={false}
        cells={items.map((i) => {
          const [min, max] = i.priceRange.split(" ~ ");
          const value = max ? <>{min}<br />~ {max}</> : i.priceRange;
          return { value, sub: i.pricePerPyeong };
        })}
      />

      <GlanceGroup
        label="총 세대수"
        colCount={colCount}
        cells={items.map((i) => ({
          value: i.totalUnits > 0 ? i.totalUnits.toLocaleString("ko-KR") : "—",
          sub: i.totalUnits > 0 ? "세대" : undefined,
        }))}
      />

      <GlanceGroup
        label="분양 상태"
        colCount={colCount}
        cells={items.map((i) => {
          const { label, cls } = statusMeta(i.status);
          return {
            value: <span className={cn("text-2xl font-bold leading-tight md:text-3xl", cls)}>{label}</span>,
          };
        })}
      />

      <GlanceGroup
        label="학군"
        colCount={colCount}
        cells={items.map((i) => ({
          value: (
            <span className={cn("text-2xl font-bold leading-tight md:text-3xl", schoolCls(i.schoolGrade))}>
              {i.schoolGrade}
            </span>
          ),
        }))}
      />

      {/* ══ 분양가 ══════════════════════════════════════════════════ */}
      <SectionRow label="분양가" />
      <SpecGroup label="분양가 범위" colCount={colCount} topBorder={false} values={items.map((i) => {
        const [min, max] = i.priceRange.split(" ~ ");
        return max
          ? <>{min}<br className="md:hidden" /><span className="md:before:content-['_~_'] before:content-['~_']">{max}</span></>
          : i.priceRange;
      })} />
      <SpecGroup label="평당가" colCount={colCount} values={items.map((i) => i.pricePerPyeong)} />

      {/* ══ 규모·시설 ════════════════════════════════════════════════ */}
      <SectionRow label="규모 · 시설" />
      <SpecGroup
        label="총 세대수"
        colCount={colCount}
        topBorder={false}
        values={items.map((i) =>
          i.totalUnits > 0 ? `${i.totalUnits.toLocaleString("ko-KR")}세대` : "미정",
        )}
      />
      <SpecGroup label="평형 구성" colCount={colCount} values={items.map((i) => i.unitTypes)} />
      <SpecGroup label="층수" colCount={colCount} values={items.map((i) => i.floors)} />
      <SpecGroup label="주차" colCount={colCount} values={items.map((i) => i.parking)} />

      {/* ══ 분양 일정 ════════════════════════════════════════════════ */}
      <SectionRow label="분양 일정" />
      <SpecGroup
        label="현재 상태"
        colCount={colCount}
        topBorder={false}
        values={items.map((i) => {
          const { label, cls } = statusMeta(i.status);
          return <span key={i.id} className={cn("font-semibold", cls)}>{label}</span>;
        })}
      />
      <SpecGroup label="청약 접수일" colCount={colCount} values={items.map((i) => i.applicationStart ?? "미정")} />
      <SpecGroup label="입주 예정일" colCount={colCount} values={items.map((i) => i.moveInDate ?? "미정")} />

      {/* ══ 교통·입지 ════════════════════════════════════════════════ */}
      <SectionRow label="교통 · 입지" />
      <SpecGroup label="인근 지하철" colCount={colCount} topBorder={false} values={items.map((i) => i.nearestStation)} />
      <SpecGroup label="CBD 거리" colCount={colCount} values={items.map((i) => i.distanceToCbd)} />
      <SpecGroup
        label="학군"
        colCount={colCount}
        values={items.map((i) => (
          <span key={i.id} className={cn("font-semibold", schoolCls(i.schoolGrade))}>
            {i.schoolGrade}
          </span>
        ))}
      />

      {/* ══ 내 조건 검증 ══════════════════════════════════════════════ */}
      <SectionRow label="내 조건 검증" />
      <SpecGroup
        label="조건 결과"
        colCount={colCount}
        topBorder={false}
        values={items.map((i) => {
          if (!i.conditionResult) {
            return <span key={i.id} className="ob-typo-body text-(--oboon-text-muted)">로그인 후 확인</span>;
          }
          const meta = grade5Meta(i.conditionResult);
          return (
            <span
              key={i.id}
              className="inline-block rounded-full border px-3 py-1 ob-typo-body font-semibold"
              style={{ color: meta.color, borderColor: meta.border, backgroundColor: meta.bg }}
            >
              {meta.label}
            </span>
          );
        })}
      />

      {/* 하단 경계선 */}
      <div className="col-span-full border-t-2 border-(--oboon-border-default)" />

    </div>
  );
}
