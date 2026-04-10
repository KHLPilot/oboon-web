"use client";

import { SlidersHorizontal } from "lucide-react";
import { useMemo } from "react";
import { useRouter } from "next/navigation";

import type { RecommendationCondition } from "@/features/recommendations/hooks/useRecommendations";
import { formatManwonPreview } from "@/lib/format/currency";

type MobileConditionSheetProps = {
  condition: RecommendationCondition;
  isLoggedIn?: boolean;
};

function buildConditionChips(condition: RecommendationCondition): string[] {
  const chips: string[] = [];

  if (condition.availableCash > 0) {
    chips.push(`현금 ${formatManwonPreview(condition.availableCash)}`);
  }
  if (condition.monthlyIncome > 0) {
    chips.push(`소득 ${formatManwonPreview(condition.monthlyIncome)}`);
  }
  if (condition.monthlyExpenses > 0) {
    chips.push(`지출 ${formatManwonPreview(condition.monthlyExpenses)}`);
  }
  if (condition.ltvInternalScore > 0) {
    chips.push(`신용 ${condition.ltvInternalScore}점`);
  }

  const ownershipMap = {
    none: "무주택",
    one: "1주택",
    two_or_more: "2주택+",
  } as const;
  if (condition.houseOwnership) {
    chips.push(ownershipMap[condition.houseOwnership]);
  }

  const purposeMap: Record<string, string> = {
    residence: "실거주",
    investment_rent: "투자(임대)",
    investment_capital: "투자(시세)",
    long_term: "실거주+투자",
  };
  if (condition.purchasePurposeV2) {
    chips.push(
      purposeMap[condition.purchasePurposeV2] ?? condition.purchasePurposeV2,
    );
  }

  const timingMap: Record<string, string> = {
    within_3months: "3개월내",
    within_6months: "6개월내",
    within_1year: "1년내",
    over_1year: "1년이상",
    by_property: "현장따라",
  };
  if (condition.purchaseTiming) {
    chips.push(
      timingMap[condition.purchaseTiming] ?? condition.purchaseTiming,
    );
  }

  const moveinMap: Record<string, string> = {
    immediate: "즉시입주",
    within_1year: "입주 1년내",
    within_2years: "입주 2년내",
    within_3years: "입주 3년내",
    anytime: "언제든지",
  };
  if (condition.moveinTiming) {
    chips.push(moveinMap[condition.moveinTiming] ?? condition.moveinTiming);
  }

  if (condition.regions.length === 1) {
    chips.push(condition.regions[0]);
  } else if (condition.regions.length > 1) {
    chips.push(`${condition.regions[0]} 외 ${condition.regions.length - 1}개`);
  }

  return chips;
}

export default function MobileConditionSheet({
  condition,
}: MobileConditionSheetProps) {
  const router = useRouter();

  const conditionChips = useMemo(
    () => buildConditionChips(condition),
    [
      condition.availableCash,
      condition.monthlyIncome,
      condition.monthlyExpenses,
      condition.ltvInternalScore,
      condition.houseOwnership,
      condition.purchasePurposeV2,
      condition.purchaseTiming,
      condition.moveinTiming,
      condition.regions,
    ],
  );

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
          <p className="mt-1 line-clamp-2 ob-typo-caption text-(--oboon-text-muted)">
            {conditionChips.length > 0
              ? conditionChips.join(" · ")
              : "조건을 설정해주세요"}
          </p>
        </div>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-page)">
          <SlidersHorizontal className="h-4 w-4 text-(--oboon-text-muted)" />
        </span>
      </button>
    </div>
  );
}
