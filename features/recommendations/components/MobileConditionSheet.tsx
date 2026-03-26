"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import RecommendationConditionPanel from "@/features/recommendations/components/RecommendationConditionPanel";
import type {
  RecommendationCondition,
  RecommendationMode,
} from "@/features/recommendations/hooks/useRecommendations";
import { formatManwonPreview } from "@/lib/format/currency";

type MobileConditionSheetProps = {
  condition: RecommendationCondition;
  mode: RecommendationMode;
  isLoggedIn?: boolean;
  hasSavedConditionPreset?: boolean;
  isConditionDirty?: boolean;
  errorMessage?: string | null;
  isLoading?: boolean;
  isSaving?: boolean;
  onChange: (patch: Partial<RecommendationCondition>) => void;
  onEvaluate: (override?: RecommendationCondition) => Promise<boolean>;
  onSave?: () => void | Promise<boolean>;
  onLoginAndSave?: () => void | Promise<void>;
  onModeChange: (mode: RecommendationMode) => void;
};

function modeLabel(value: RecommendationMode) {
  return value === "input" ? "직접 입력" : "시뮬레이터";
}

function buildConditionChips(condition: RecommendationCondition): string[] {
  const chips: string[] = [];

  if (condition.availableCash > 0)
    chips.push(`현금 ${formatManwonPreview(condition.availableCash)}`);
  if (condition.monthlyIncome > 0)
    chips.push(`소득 ${formatManwonPreview(condition.monthlyIncome)}`);
  if (condition.monthlyExpenses > 0)
    chips.push(`지출 ${formatManwonPreview(condition.monthlyExpenses)}`);
  if (condition.ltvInternalScore > 0)
    chips.push(`신용 ${condition.ltvInternalScore}점`);

  const ownershipMap = { none: "무주택", one: "1주택", two_or_more: "2주택+" };
  if (condition.houseOwnership)
    chips.push(ownershipMap[condition.houseOwnership]);

  const purposeMap: Record<string, string> = {
    residence: "실거주",
    investment_rent: "투자(임대)",
    investment_capital: "투자(시세)",
    long_term: "실거주+투자",
  };
  if (condition.purchasePurposeV2)
    chips.push(purposeMap[condition.purchasePurposeV2] ?? condition.purchasePurposeV2);

  const timingMap: Record<string, string> = {
    within_3months: "3개월내",
    within_6months: "6개월내",
    within_1year: "1년내",
    over_1year: "1년이상",
    by_property: "현장따라",
  };
  if (condition.purchaseTiming)
    chips.push(timingMap[condition.purchaseTiming] ?? condition.purchaseTiming);

  const moveinMap: Record<string, string> = {
    immediate: "즉시입주",
    within_1year: "입주 1년내",
    within_2years: "입주 2년내",
    within_3years: "입주 3년내",
    anytime: "언제든지",
  };
  if (condition.moveinTiming)
    chips.push(moveinMap[condition.moveinTiming] ?? condition.moveinTiming);

  if (condition.regions.length === 1) chips.push(condition.regions[0]);
  else if (condition.regions.length > 1)
    chips.push(`${condition.regions[0]} 외 ${condition.regions.length - 1}개`);

  return chips;
}

export default function MobileConditionSheet(props: MobileConditionSheetProps) {
  const {
    condition,
    mode,
    isLoggedIn = true,
    hasSavedConditionPreset = false,
    isConditionDirty = false,
    errorMessage = null,
    isLoading = false,
    isSaving = false,
    onChange,
    onEvaluate,
    onSave,
    onLoginAndSave,
    onModeChange,
  } = props;
  const [open, setOpen] = useState(false);

  const conditionChips = useMemo(
    () => buildConditionChips(condition),
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    if (!open) return;

    const mediaQuery = window.matchMedia("(min-width: 640px)");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleViewportChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setOpen(false);
      }
    };

    mediaQuery.addEventListener?.("change", handleViewportChange);

    return () => {
      document.body.style.overflow = previousOverflow;
      mediaQuery.removeEventListener?.("change", handleViewportChange);
    };
  }, [open]);

  async function handleEvaluate(override?: RecommendationCondition) {
    const ok = await onEvaluate(override);
    if (ok) {
      setOpen(false);
    }
    return ok;
  }

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="ob-typo-body2 text-(--oboon-text-title)">
              추천 조건
            </span>
            <span className="rounded-full bg-(--oboon-bg-subtle) px-2 py-0.5 ob-typo-caption text-(--oboon-text-muted)">
              {modeLabel(mode)}
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

      {open ? (
        <div className="sm:hidden">
          <div
            className="fixed inset-0 z-(--oboon-z-modal) bg-(--oboon-overlay) backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-x-0 bottom-0 z-(--oboon-z-modal) max-h-[88dvh] overflow-y-auto rounded-t-xl border border-b-0 border-(--oboon-border-default) bg-(--oboon-bg-surface) p-5 shadow-(--oboon-shadow-card) pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
            <div className="mb-4 flex items-center justify-between">
              <div className="ob-typo-h3 text-(--oboon-text-title)">조건 설정</div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-page)"
                aria-label="조건 설정 닫기"
              >
                <X className="h-4 w-4 text-(--oboon-text-muted)" />
              </button>
            </div>

            <RecommendationConditionPanel
              condition={condition}
              mode={mode}
              isLoggedIn={isLoggedIn}
              hasSavedConditionPreset={hasSavedConditionPreset}
              isConditionDirty={isConditionDirty}
              errorMessage={errorMessage}
              isLoading={isLoading}
              isSaving={isSaving}
              onChange={onChange}
              onEvaluate={handleEvaluate}
              onSave={onSave}
              onLoginAndSave={onLoginAndSave}
              onModeChange={onModeChange}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
