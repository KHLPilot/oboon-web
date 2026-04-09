"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import type {
  RecommendationItem,
  RecommendationUnitTypeCategory,
  RecommendationUnitType,
} from "@/features/recommendations/hooks/useRecommendations";
import { grade5DetailLabel } from "@/features/condition-validation/lib/grade5Labels";
import { getGrade5ToneMeta } from "@/features/condition-validation/lib/grade5Theme";
import { formatManwonWithEok, formatPercent } from "@/lib/format/currency";
import { cn } from "@/lib/utils/cn";

type RecommendationUnitTypePanelProps = {
  item?: RecommendationItem;
  units?: RecommendationUnitType[];
  propertyName?: string | null;
  mobile?: boolean;
  embedded?: boolean;
  maxItems?: number;
  heading?: string;
  showPropertyName?: boolean;
  footerNote?: string | null;
};

const CATEGORY_GRADE_ORDER: Record<RecommendationUnitTypeCategory["grade"], number> = {
  RED: 0,
  ORANGE: 1,
  YELLOW: 2,
  LIME: 3,
  GREEN: 4,
};

function sortCategoriesForSummary(
  categories: RecommendationUnitTypeCategory[],
): RecommendationUnitTypeCategory[] {
  return [...categories].sort((left, right) => {
    const gradeDiff = CATEGORY_GRADE_ORDER[left.grade] - CATEGORY_GRADE_ORDER[right.grade];
    if (gradeDiff !== 0) return gradeDiff;

    const leftScore = left.score ?? Number.POSITIVE_INFINITY;
    const rightScore = right.score ?? Number.POSITIVE_INFINITY;
    return leftScore - rightScore;
  });
}

function buildCategoryStatusSummary(categories: RecommendationUnitTypeCategory[]) {
  const summaryOrder: RecommendationUnitTypeCategory["grade"][] = [
    "GREEN",
    "LIME",
    "YELLOW",
    "ORANGE",
    "RED",
  ];

  return summaryOrder
    .map((grade) => {
      const count = categories.filter((category) => category.grade === grade).length;
      if (count === 0) return null;
      return `${grade5DetailLabel(grade)} ${count}개`;
    })
    .filter((value): value is string => Boolean(value));
}

function UnitTypeCard(props: {
  unit: RecommendationUnitType;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { unit, isOpen, onToggle } = props;
  const tone = getGrade5ToneMeta(unit.finalGrade);
  const gradeLabel = unit.gradeLabel ?? tone.chipLabel;
  const sortedCategories = sortCategoriesForSummary(unit.categories);
  const summaryCategories = sortedCategories.slice(0, 3);
  const categoryStatusSummary = buildCategoryStatusSummary(unit.categories);
  const remainingCategoryCount = Math.max(unit.categories.length - summaryCategories.length, 0);
  const metricSummary = [
    unit.listPriceManwon !== null ? formatManwonWithEok(unit.listPriceManwon) : unit.priceLabel,
    unit.monthlyBurdenPercent !== null
      ? `월 부담률 ${formatPercent(unit.monthlyBurdenPercent)}`
      : "월 부담률 계산 불가",
  ].join(" · ");

  return (
    <div className="overflow-hidden rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 px-3 py-3 text-left"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="ob-typo-body2 font-semibold text-(--oboon-text-title)">
              {unit.title}
            </h4>
            <Badge className={tone.badgeClassName}>{gradeLabel}</Badge>
          </div>
        </div>

        <div className="shrink-0">
          <div className="flex items-center justify-end gap-1.5">
            <div className="text-right">
              <div className="ob-typo-caption text-(--oboon-text-muted)">매칭률</div>
              <div className="mt-0.5 text-[1.05rem] leading-none font-semibold text-(--oboon-text-title)">
                {unit.totalScore !== null ? `${Math.round(unit.totalScore)}%` : "비공개"}
              </div>
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-(--oboon-text-muted)" />
            ) : (
              <ChevronDown className="h-4 w-4 text-(--oboon-text-muted)" />
            )}
          </div>
        </div>
      </button>

      <div className="border-t border-(--oboon-border-default) px-3 py-2.5">
        {isOpen ? (
          <div className="space-y-1.5">
            <p className="ob-typo-caption text-(--oboon-text-title)">{metricSummary}</p>
            {categoryStatusSummary.length > 0 ? (
              <p className="ob-typo-caption text-(--oboon-text-muted)">
                {categoryStatusSummary.join(", ")}
              </p>
            ) : null}

            {summaryCategories.length > 0 ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {summaryCategories.map((category) => {
                    const categoryTone = getGrade5ToneMeta(category.grade);
                    return (
                      <Badge
                        key={category.key}
                        className={cn(
                          "border px-2 py-1 text-[11px] leading-none",
                          categoryTone.badgeClassName,
                        )}
                      >
                        {category.label}
                      </Badge>
                    );
                  })}

                  {remainingCategoryCount > 0 ? (
                    <span className="ob-typo-caption whitespace-nowrap text-(--oboon-text-muted)">
                      외 {remainingCategoryCount}개
                    </span>
                  ) : null}
                </div>

                {summaryCategories.map((category) => {
                  const categoryTone = getGrade5ToneMeta(category.grade);
                  if (!category.reason) return null;

                  return (
                    <div
                      key={`${category.key}-reason`}
                      className={cn(
                        "rounded-xl border px-3 py-2",
                        categoryTone.badgeClassName,
                      )}
                    >
                      <div className="ob-typo-caption font-medium text-(--oboon-text-title)">
                        {category.label}
                      </div>
                      <p className="mt-1 ob-typo-caption leading-5 text-(--oboon-text-muted)">
                        {category.reason}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="ob-typo-caption text-(--oboon-text-title)">{metricSummary}</p>
        )}
      </div>
    </div>
  );
}

export default function RecommendationUnitTypePanel(
  props: RecommendationUnitTypePanelProps,
) {
  const {
    item,
    units,
    propertyName,
    mobile = false,
    embedded = false,
    maxItems,
    heading = "추천 순 타입별 정보",
    showPropertyName = true,
    footerNote = null,
  } = props;
  const resolvedUnits = item?.unitTypes ?? units ?? [];
  const resolvedPropertyName = item?.property.name ?? propertyName ?? null;
  const [openUnitTypeId, setOpenUnitTypeId] = useState<number | null>(
    resolvedUnits.length === 1 ? resolvedUnits[0]?.unitTypeId ?? null : null,
  );

  if (resolvedUnits.length === 0) return null;
  const visibleUnits =
    typeof maxItems === "number" ? resolvedUnits.slice(0, maxItems) : resolvedUnits;

  return (
    <section
      className={cn(
        embedded
          ? "space-y-2"
          : mobile
          ? "space-y-2"
          : "rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4",
      )}
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <div className={cn(!mobile && "mb-2")}>
        <p className="ob-typo-caption text-(--oboon-text-muted)">
          {heading}
        </p>
        {showPropertyName && resolvedPropertyName ? (
          <h3 className="mt-1 ob-typo-subtitle text-(--oboon-text-title)">
            {resolvedPropertyName}
          </h3>
        ) : null}
      </div>

      <div className="space-y-3">
        {visibleUnits.map((unit) => (
          <UnitTypeCard
            key={unit.unitTypeId}
            unit={unit}
            isOpen={openUnitTypeId === unit.unitTypeId}
            onToggle={() =>
              setOpenUnitTypeId((current) =>
                current === unit.unitTypeId ? null : unit.unitTypeId,
              )
            }
          />
        ))}
      </div>

      {footerNote ? (
        <p className="mt-3 ob-typo-caption text-(--oboon-text-muted)">
          {footerNote}
        </p>
      ) : null}
    </section>
  );
}
