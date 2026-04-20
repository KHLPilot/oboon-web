"use client";

import { SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";

import ConditionBar, { type ConditionChip } from "@/components/ui/ConditionBar";
import type { RecommendationCondition } from "@/features/recommendations/hooks/useRecommendations";
import { formatManwonPreview } from "@/lib/format/currency";

type MobileConditionSheetProps = {
  condition: RecommendationCondition;
  isLoggedIn?: boolean;
};

function buildConditionChips(condition: RecommendationCondition): ConditionChip[] {
  const chips: ConditionChip[] = [];

  if (condition.availableCash > 0) {
    chips.push({
      key: "cash",
      label: "현금",
      value: formatManwonPreview(condition.availableCash),
    });
  }
  if (condition.monthlyIncome > 0) {
    chips.push({
      key: "income",
      label: "소득",
      value: formatManwonPreview(condition.monthlyIncome),
    });
  }
  if (condition.monthlyExpenses > 0) {
    chips.push({
      key: "expenses",
      label: "지출",
      value: formatManwonPreview(condition.monthlyExpenses),
    });
  }
  if (condition.ltvInternalScore > 0) {
    chips.push({
      key: "credit",
      label: "신용",
      value: `${condition.ltvInternalScore}점`,
    });
  }

  const ownershipMap = {
    none: "무주택",
    one: "1주택",
    two_or_more: "2주택+",
  } as const;
  if (condition.houseOwnership) {
    chips.push({
      key: "house",
      label: "",
      value: ownershipMap[condition.houseOwnership],
    });
  }

  const purposeMap: Record<string, string> = {
    residence: "실거주",
    investment_rent: "투자(임대)",
    investment_capital: "투자(시세)",
    long_term: "실거주+투자",
  };
  if (condition.purchasePurposeV2) {
    chips.push({
      key: "purpose",
      label: "",
      value: purposeMap[condition.purchasePurposeV2] ?? condition.purchasePurposeV2,
    });
  }

  const timingMap: Record<string, string> = {
    within_3months: "3개월내",
    within_6months: "6개월내",
    within_1year: "1년내",
    over_1year: "1년이상",
    by_property: "현장따라",
  };
  if (condition.purchaseTiming) {
    chips.push({
      key: "timing",
      label: "",
      value: timingMap[condition.purchaseTiming] ?? condition.purchaseTiming,
    });
  }

  const moveinMap: Record<string, string> = {
    immediate: "즉시입주",
    within_1year: "입주 1년내",
    within_2years: "입주 2년내",
    within_3years: "입주 3년내",
    anytime: "언제든지",
  };
  if (condition.moveinTiming) {
    chips.push({
      key: "movein",
      label: "",
      value: moveinMap[condition.moveinTiming] ?? condition.moveinTiming,
    });
  }

  if (condition.regions.length === 1) {
    chips.push({
      key: "region",
      label: "지역",
      value: condition.regions[0],
    });
  } else if (condition.regions.length > 1) {
    chips.push({
      key: "region",
      label: "지역",
      value: `${condition.regions[0]} 외 ${condition.regions.length - 1}개`,
    });
  }

  return chips;
}

export default function MobileConditionSheet({
  condition,
}: MobileConditionSheetProps) {
  const router = useRouter();
  const conditionChips = buildConditionChips(condition);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => router.push("/recommendations/conditions/step/1")}
        className="flex w-full items-center gap-3 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="ob-typo-body2 text-(--oboon-text-title)">
              추천 조건
            </span>
          </div>
          {conditionChips.length > 0 ? (
            <ConditionBar chips={conditionChips} className="mt-1" />
          ) : (
            <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
              조건을 설정해주세요
            </p>
          )}
        </div>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-page)">
          <SlidersHorizontal className="h-4 w-4 text-(--oboon-text-muted)" />
        </span>
      </button>
    </div>
  );
}
