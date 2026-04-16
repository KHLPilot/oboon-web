// features/offerings/components/compare/CompareTable.tsx
import { grade5DetailLabel } from "@/features/condition-validation/lib/grade5Labels";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";
import {
  OFFERING_STATUS_VALUES,
  statusLabelOf,
} from "@/features/offerings/domain/offering.constants";
import type {
  FinalGrade5,
  OfferingCompareConditionCategories,
  OfferingCompareItem,
} from "@/features/offerings/domain/offering.types";
import type { RecommendationUnitType } from "@/features/recommendations/lib/recommendationUnitTypes";
import RecommendationUnitTypePanel from "@/features/recommendations/components/RecommendationUnitTypePanel";
import { getAvailableUnitTypes } from "@/features/recommendations/lib/unitTypeAvailability";

interface CompareTableProps {
  items: Array<OfferingCompareItem | null>;
  mobileVisibleIndices: number[];
  viewerLoggedIn?: boolean;
  viewerHasConditionPreset?: boolean;
}

type GradeMeta = { label: string; color: string; bg: string; border: string };
const STATUS_READY = OFFERING_STATUS_VALUES[0];
const STATUS_OPEN = OFFERING_STATUS_VALUES[1];
const CONDITION_CATEGORY_ROWS: Array<{
  key: keyof OfferingCompareConditionCategories;
  label: string;
}> = [
  { key: "cash", label: "자금력" },
  { key: "income", label: "소득" },
  { key: "ltvDsr", label: "LTV · DSR" },
  { key: "ownership", label: "주택 보유" },
  { key: "purpose", label: "구매 목적" },
  { key: "timing", label: "시점" },
];

function grade5Meta(grade: FinalGrade5): GradeMeta {
  switch (grade) {
    case "GREEN":
      return { label: grade5DetailLabel(grade), color: "var(--oboon-grade-green)", bg: "var(--oboon-grade-green-bg)", border: "var(--oboon-grade-green-border)" };
    case "LIME":
      return { label: grade5DetailLabel(grade), color: "var(--oboon-grade-lime)", bg: "var(--oboon-grade-lime-bg)", border: "var(--oboon-grade-lime-border)" };
    case "YELLOW":
      return { label: grade5DetailLabel(grade), color: "var(--oboon-grade-yellow)", bg: "var(--oboon-grade-yellow-bg)", border: "var(--oboon-grade-yellow-border)" };
    case "ORANGE":
      return { label: grade5DetailLabel(grade), color: "var(--oboon-grade-orange)", bg: "var(--oboon-grade-orange-bg)", border: "var(--oboon-grade-orange-border)" };
    case "RED":
      return { label: grade5DetailLabel(grade), color: "var(--oboon-grade-red)", bg: "var(--oboon-grade-red-bg)", border: "var(--oboon-grade-red-border)" };
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

function FamousZoneBadge({ zone }: { zone: NonNullable<OfferingCompareItem["famousZone"]> }) {
  const style =
    zone.tier === 1
      ? { backgroundColor: "color-mix(in srgb, var(--oboon-warning) 18%, transparent)", color: "var(--oboon-warning)" }
      : zone.tier === 2
        ? { backgroundColor: "color-mix(in srgb, var(--oboon-primary) 14%, transparent)", color: "var(--oboon-primary)" }
        : { backgroundColor: "var(--oboon-bg-subtle)", color: "var(--oboon-text-muted)" };
  return (
    <span
      className="inline-flex w-fit items-center rounded-full px-2 py-0.5 ob-typo-caption font-semibold"
      style={style}
      title={zone.name}
    >
      {zone.shortLabel}
    </span>
  );
}

function ConditionCategoryCard({
  label,
  grade,
  reason,
}: {
  label: string;
  grade: FinalGrade5;
  reason: string;
}) {
  const meta = grade5Meta(grade);

  return (
    <div className="relative overflow-hidden rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)">
      <div
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ backgroundColor: meta.border }}
      />
      <div className="space-y-1.5 px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="ob-typo-caption font-medium text-(--oboon-text-title)">
              {label}
            </div>
          </div>
          <Badge
            className="bg-transparent shrink-0"
            style={{
              borderColor: meta.border,
              color: meta.color,
            }}
          >
            {grade5DetailLabel(grade)}
          </Badge>
        </div>
        <p className="line-clamp-2 ob-typo-caption leading-5 text-(--oboon-text-muted)">
          {reason}
        </p>
      </div>
    </div>
  );
}

function UnitTypeResultsCard({
  units,
  emptyText,
}: {
  units: RecommendationUnitType[] | null;
  emptyText: string;
}) {
  if (units === null) {
    return (
      <span className="ob-typo-body text-(--oboon-text-muted)">
        {emptyText}
      </span>
    );
  }

  if (units.length === 0) {
    return (
      <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle)/40 px-3 py-3">
        <p className="ob-typo-caption text-(--oboon-text-muted)">
          가능한 타입 결과가 아직 없습니다.
        </p>
      </div>
    );
  }

  const availableUnits = getAvailableUnitTypes(units);
  const hasAvailableUnits = availableUnits.length > 0;
  const showAllToggle = !hasAvailableUnits || availableUnits.length < units.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="ob-typo-caption text-(--oboon-text-muted)">
          {hasAvailableUnits
            ? `가능한 타입 ${availableUnits.length}개`
            : "가능한 타입 없음"}
        </div>
        <div className="ob-typo-caption text-(--oboon-text-muted)">
          전체 {units.length}개
        </div>
      </div>

      {hasAvailableUnits ? (
        <RecommendationUnitTypePanel
          units={availableUnits}
          embedded
          heading={null}
          showPropertyName={false}
          footerNote={null}
        />
      ) : (
        <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle)/40 px-3 py-3">
          <p className="ob-typo-caption text-(--oboon-text-muted)">
            현재 조건에 맞는 타입이 없습니다. 전체 타입을 펼쳐서 확인할 수 있습니다.
          </p>
        </div>
      )}

      {showAllToggle ? (
        <details className="group rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle)/40 px-3 py-2">
          <summary className="cursor-pointer list-none ob-typo-caption font-medium text-(--oboon-primary)">
            전체 타입 보기
            <span className="ml-1 text-(--oboon-text-muted)">({units.length}개)</span>
          </summary>
          <div className="mt-3">
            <RecommendationUnitTypePanel
              units={units}
              embedded
              heading={null}
              showPropertyName={false}
              footerNote={null}
            />
          </div>
        </details>
      ) : null}
    </div>
  );
}

function mutedDash() {
  return <span className="text-(--oboon-text-muted)">—</span>;
}

function mapCompareValues(
  items: Array<OfferingCompareItem | null>,
  renderValue: (item: OfferingCompareItem) => React.ReactNode,
  emptyValue: React.ReactNode = mutedDash(),
) {
  return items.map((item) => (item ? renderValue(item) : emptyValue));
}

function mapCompareCells(
  items: Array<OfferingCompareItem | null>,
  renderCell: (item: OfferingCompareItem) => { value: React.ReactNode; sub?: string },
) {
  return items.map((item) => (item ? renderCell(item) : { value: mutedDash() }));
}

function SectionRow({ label }: { label: string }) {
  return (
    <div className="col-span-full border-t-2 border-(--oboon-border-default) pt-10 pb-2">
      <h3 className="ob-typo-h2 font-bold text-(--oboon-text-title)">{label}</h3>
    </div>
  );
}

function SpecGroup({
  label,
  values,
  colCount,
  mobileVisibleIndices,
  topBorder = true,
}: {
  label: string;
  values: React.ReactNode[];
  colCount: number;
  mobileVisibleIndices: number[];
  topBorder?: boolean;
}) {
  const dividerCls = topBorder ? "border-t border-(--oboon-border-default)" : "";

  return (
    <>
      <div className={cn("col-span-full pt-4 pb-1 ob-typo-body text-(--oboon-text-muted)", dividerCls)}>
        {label}
      </div>
      {values.map((value, i) => (
        <div
          key={i}
          className={cn(
            "pb-4 ob-typo-subtitle text-(--oboon-text-title)",
            i < colCount - 1 && "border-r border-(--oboon-border-default) pr-6",
            i > 0 && "pl-6",
            !mobileVisibleIndices.includes(i) && "hidden md:block",
          )}
        >
          {value ?? mutedDash()}
        </div>
      ))}
    </>
  );
}

function GlanceGroup({
  label,
  cells,
  colCount,
  mobileVisibleIndices,
  topBorder = true,
}: {
  label: string;
  cells: { value: React.ReactNode; sub?: string }[];
  colCount: number;
  mobileVisibleIndices: number[];
  topBorder?: boolean;
}) {
  const dividerCls = topBorder ? "border-t border-(--oboon-border-default)" : "";

  return (
    <>
      <div className={cn("col-span-full pt-6 pb-2 ob-typo-caption text-(--oboon-text-muted)", dividerCls)}>
        {label}
      </div>
      {cells.map((cell, i) => (
        <div
          key={i}
          className={cn(
            "flex flex-col pb-6",
            i < colCount - 1 && "border-r border-(--oboon-border-default) pr-6",
            i > 0 && "pl-6",
            !mobileVisibleIndices.includes(i) && "hidden md:flex",
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
    </>
  );
}

export default function CompareTable({
  items,
  mobileVisibleIndices,
  viewerLoggedIn = false,
  viewerHasConditionPreset = false,
}: CompareTableProps) {
  const selectedCount = items.filter(
    (item): item is OfferingCompareItem => item !== null,
  ).length;
  if (selectedCount < 2) return null;

  const colCount = items.length;
  const gridCols = "grid-cols-2 md:grid-cols-3";
  const emptyConditionText = viewerHasConditionPreset
    ? "확인 불가"
    : viewerLoggedIn
      ? "조건 저장 후 확인"
      : "로그인 후 확인";

  return (
    <div className={cn("grid w-full", gridCols)}>
      <div className="col-span-full border-t-2 border-(--oboon-border-default) pt-10 pb-2">
        <h3 className="ob-typo-h2 font-bold text-(--oboon-text-title)">한눈에 보기</h3>
      </div>

      <GlanceGroup
        label="분양가 범위"
        colCount={colCount}
        mobileVisibleIndices={mobileVisibleIndices}
        topBorder={false}
        cells={mapCompareCells(items, (item) => {
          const [min, max] = item.priceRange.split(" ~ ");
          const value = max ? <>{min}<br />~ {max}</> : item.priceRange;
          return { value, sub: item.pricePerPyeong };
        })}
      />

      <GlanceGroup
        label="총 세대수"
        colCount={colCount}
        mobileVisibleIndices={mobileVisibleIndices}
        cells={mapCompareCells(items, (item) => ({
          value: item.totalUnits > 0 ? item.totalUnits.toLocaleString("ko-KR") : "—",
          sub: item.totalUnits > 0 ? "세대" : undefined,
        }))}
      />

      <GlanceGroup
        label="분양 상태"
        colCount={colCount}
        mobileVisibleIndices={mobileVisibleIndices}
        cells={mapCompareCells(items, (item) => {
          const { label, cls } = statusMeta(item.status);
          return {
            value: <span className={cn("text-2xl font-bold leading-tight md:text-3xl", cls)}>{label}</span>,
          };
        })}
      />

      <GlanceGroup
        label="학군"
        colCount={colCount}
        mobileVisibleIndices={mobileVisibleIndices}
        cells={mapCompareCells(items, (item) => ({
          value: (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("text-2xl font-bold leading-tight md:text-3xl", schoolCls(item.schoolGrade))}>
                  {item.schoolGrade}
                </span>
                {item.famousZone && <FamousZoneBadge zone={item.famousZone} />}
              </div>
            </div>
          ),
          sub: item.academyCount != null
            ? `반경 1km 학원 ${item.academyCount.toLocaleString("ko-KR")}개`
            : undefined,
        }))}
      />

      <SectionRow label="분양가" />
      <SpecGroup
        label="분양가 범위"
        colCount={colCount}
        mobileVisibleIndices={mobileVisibleIndices}
        topBorder={false}
        values={mapCompareValues(items, (item) => {
          const [min, max] = item.priceRange.split(" ~ ");
          return max
            ? <>{min}<br className="md:hidden" /><span className="md:before:content-['_~_'] before:content-['~_']">{max}</span></>
            : item.priceRange;
        })}
      />
      <SpecGroup
        label="평당가"
        colCount={colCount}
        mobileVisibleIndices={mobileVisibleIndices}
        values={mapCompareValues(items, (item) => item.pricePerPyeong)}
      />

      <SectionRow label="규모 · 시설" />
      <SpecGroup
        label="총 세대수"
        colCount={colCount}
        mobileVisibleIndices={mobileVisibleIndices}
        topBorder={false}
        values={mapCompareValues(items, (item) =>
          item.totalUnits > 0 ? `${item.totalUnits.toLocaleString("ko-KR")}세대` : "미정",
        )}
      />
      <SpecGroup
        label="평형 구성"
        colCount={colCount}
        mobileVisibleIndices={mobileVisibleIndices}
        values={mapCompareValues(items, (item) => item.unitTypes)}
      />
      <SpecGroup
        label="층수"
        colCount={colCount}
        mobileVisibleIndices={mobileVisibleIndices}
        values={mapCompareValues(items, (item) => item.floors)}
      />
      <SpecGroup
        label="주차"
        colCount={colCount}
        mobileVisibleIndices={mobileVisibleIndices}
        values={mapCompareValues(items, (item) => item.parking)}
      />

      <SectionRow label="분양 일정" />
      <SpecGroup
        label="현재 상태"
        colCount={colCount}
        mobileVisibleIndices={mobileVisibleIndices}
        topBorder={false}
        values={mapCompareValues(items, (item) => {
          const { label, cls } = statusMeta(item.status);
          return <span className={cn("font-semibold", cls)}>{label}</span>;
        })}
      />
      <SpecGroup
        label="청약 접수일"
        colCount={colCount}
        mobileVisibleIndices={mobileVisibleIndices}
        values={mapCompareValues(items, (item) => item.applicationStart ?? "미정")}
      />
      <SpecGroup
        label="입주 예정일"
        colCount={colCount}
        mobileVisibleIndices={mobileVisibleIndices}
        values={mapCompareValues(items, (item) => item.moveInDate ?? "미정")}
      />

      <SectionRow label="교통 · 입지" />
      <SpecGroup
        label="인근 지하철"
        colCount={colCount}
        mobileVisibleIndices={mobileVisibleIndices}
        topBorder={false}
        values={mapCompareValues(items, (item) => item.nearestStation)}
      />
      <SpecGroup
        label="네이버 맵"
        colCount={colCount}
        mobileVisibleIndices={mobileVisibleIndices}
        values={mapCompareValues(items, (item) => (
          <a
            href={`https://map.naver.com/p/search/${encodeURIComponent([item.name, item.location].filter(Boolean).join(" ").trim())}`}
            target="_blank"
            rel="noreferrer"
            className="text-(--oboon-primary) underline-offset-2 hover:underline"
          >
            네이버 맵에서 보기
          </a>
        ))}
      />
      <SpecGroup
        label="학군"
        colCount={colCount}
        mobileVisibleIndices={mobileVisibleIndices}
        values={mapCompareValues(items, (item) => (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("font-semibold", schoolCls(item.schoolGrade))}>
                {item.schoolGrade}
              </span>
              {item.famousZone && <FamousZoneBadge zone={item.famousZone} />}
            </div>
            {item.academyCount != null && (
              <span className="ob-typo-caption text-(--oboon-text-muted)">
                반경 1km 학원 {item.academyCount.toLocaleString("ko-KR")}개
              </span>
            )}
          </div>
        ))}
      />

      <SectionRow label="내 조건 검증" />
      <SpecGroup
        label="종합 결과"
        colCount={colCount}
        mobileVisibleIndices={mobileVisibleIndices}
        topBorder={false}
        values={items.map((item, index) => {
          const resultKey = item?.id ?? `condition-result-${index}`;
          if (!item) {
            return (
              <span
                key={resultKey}
                className="text-(--oboon-text-muted)"
              >
                —
              </span>
            );
          }
          if (!item.conditionResult) {
            return (
              <span
                key={resultKey}
                className="ob-typo-body text-(--oboon-text-muted)"
              >
                {emptyConditionText}
              </span>
            );
          }
          const meta = grade5Meta(item.conditionResult);
          return (
            <span
              key={resultKey}
              className="ob-typo-subtitle font-semibold"
              style={{ color: meta.color }}
            >
              {meta.label}
            </span>
          );
        })}
      />
      <SpecGroup
        label="카테고리별 결과 · 사유"
        colCount={colCount}
        mobileVisibleIndices={mobileVisibleIndices}
        values={items.map((item, index) => {
          const categoryKey = item?.id ?? `condition-category-${index}`;
          if (!item) {
            return (
              <span
                key={categoryKey}
                className="text-(--oboon-text-muted)"
              >
                —
              </span>
            );
          }
          if (!item.conditionCategories) {
            return (
              <span
                key={categoryKey}
                className="ob-typo-body text-(--oboon-text-muted)"
              >
                {emptyConditionText}
              </span>
            );
          }
          return (
            <div key={categoryKey} className="flex flex-col gap-2">
              {CONDITION_CATEGORY_ROWS.map(({ key, label }) => {
                const category = item.conditionCategories?.[key];
                if (!category) return null;
                return (
                  <ConditionCategoryCard
                    key={`${item.id}-${key}`}
                    label={label}
                    grade={category.grade}
                    reason={category.reasonMessage}
                  />
                );
              })}
            </div>
          );
        })}
      />

      <SectionRow label="타입별 검증 결과" />
      <SpecGroup
        label="가능한 타입"
        colCount={colCount}
        mobileVisibleIndices={mobileVisibleIndices}
        topBorder={false}
        values={items.map((item, index) => {
          const unitKey = item?.id ?? `unit-type-${index}`;
          if (!item) {
            return (
              <span
                key={unitKey}
                className="text-(--oboon-text-muted)"
              >
                —
              </span>
            );
          }

          return (
            <UnitTypeResultsCard
              key={unitKey}
              units={item.unitTypeResults}
              emptyText={emptyConditionText}
            />
          );
        })}
      />

      <div className="col-span-full border-t-2 border-(--oboon-border-default)" />
    </div>
  );
}
