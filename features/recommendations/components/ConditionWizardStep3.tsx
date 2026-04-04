"use client";

import Select from "@/components/ui/Select";
import { MultiSelect } from "@/components/ui/MultiSelect";
import type {
  FullPurchasePurpose,
  MoveinTiming,
  PurchaseTiming,
} from "@/features/condition-validation/domain/types";
import {
  OFFERING_REGION_TABS,
  type OfferingRegionTab,
} from "@/features/offerings/domain/offering.types";
import type { RecommendationCondition } from "@/features/recommendations/hooks/useRecommendations";

const LABEL = "mb-1.5 block ob-typo-caption text-(--oboon-text-muted)";

const PURPOSE_OPTIONS: Array<{ value: FullPurchasePurpose; label: string }> = [
  { value: "residence", label: "실거주" },
  { value: "investment_rent", label: "투자(임대)" },
  { value: "investment_capital", label: "투자(시세)" },
  { value: "long_term", label: "실거주+투자" },
];

const PURCHASE_TIMING_OPTIONS: Array<{
  value: PurchaseTiming;
  label: string;
}> = [
  { value: "within_3months", label: "3개월 이내" },
  { value: "within_6months", label: "6개월 이내" },
  { value: "within_1year", label: "1년 이내" },
  { value: "over_1year", label: "1년 이상" },
  { value: "by_property", label: "현장에 따라" },
];

const MOVEIN_OPTIONS: Array<{ value: MoveinTiming; label: string }> = [
  { value: "immediate", label: "즉시입주" },
  { value: "within_1year", label: "1년 이내" },
  { value: "within_2years", label: "2년 이내" },
  { value: "within_3years", label: "3년 이내" },
  { value: "anytime", label: "언제든지" },
];

const REGION_OPTIONS = OFFERING_REGION_TABS.filter((r) => r !== "전체").map(
  (r) => ({ value: r as OfferingRegionTab, label: r }),
);

type Props = {
  condition: RecommendationCondition;
  onChange: (patch: Partial<RecommendationCondition>) => void;
  onBack: () => void;
  onFinish: () => void;
  onReset: () => void;
  finishLabel?: string;
  saveLabel?: string | null;
  onSave?: () => void;
  isSaving?: boolean;
  isSaveDisabled?: boolean;
  isFinishing?: boolean;
  finishingLabel?: string;
};

export default function ConditionWizardStep3({
  condition,
  onChange,
  onBack,
  onFinish,
  onReset,
  finishLabel = "완료 ✓",
  saveLabel = null,
  onSave,
  isSaving = false,
  isSaveDisabled = false,
  isFinishing = false,
  finishingLabel = "처리 중...",
}: Props) {
  const isReady =
    condition.purchasePurposeV2 !== null &&
    condition.purchaseTiming !== null &&
    condition.moveinTiming !== null;

  return (
    <div className="space-y-4">
      <div className="space-y-0.5">
        <div className="flex items-start justify-between gap-3">
          <p className="ob-typo-subtitle font-semibold text-(--oboon-text-title)">
            라이프스타일
          </p>
          <button
            type="button"
            onClick={onReset}
            className="shrink-0 ob-typo-caption text-(--oboon-text-muted) transition-colors hover:text-(--oboon-text-body)"
          >
            전체 초기화
          </button>
        </div>
        <p className="ob-typo-caption text-(--oboon-text-muted)">
          분양 목적과 희망 조건을 선택해주세요
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
        <div>
          <span className={LABEL}>분양 목적</span>
          <Select<FullPurchasePurpose>
            value={(condition.purchasePurposeV2 ?? "") as FullPurchasePurpose}
            onChange={(purchasePurposeV2) => onChange({ purchasePurposeV2 })}
            options={PURPOSE_OPTIONS}
          />
        </div>

        <div>
          <span className={LABEL}>분양 시점</span>
          <Select<PurchaseTiming>
            value={(condition.purchaseTiming ?? "") as PurchaseTiming}
            onChange={(purchaseTiming) => onChange({ purchaseTiming })}
            options={PURCHASE_TIMING_OPTIONS}
          />
        </div>

        <div>
          <span className={LABEL}>희망 입주</span>
          <Select<MoveinTiming>
            value={(condition.moveinTiming ?? "") as MoveinTiming}
            onChange={(moveinTiming) => onChange({ moveinTiming })}
            options={MOVEIN_OPTIONS}
          />
        </div>

        <div>
          <span className={LABEL}>지역</span>
          <MultiSelect<OfferingRegionTab>
            values={condition.regions}
            onChange={(regions) => onChange({ regions })}
            options={REGION_OPTIONS}
            placeholder="전체"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isFinishing}
          className="h-10 flex-1 rounded-full border border-(--oboon-border-default) ob-typo-button text-(--oboon-text-muted) disabled:cursor-not-allowed disabled:opacity-40"
        >
          이전
        </button>
        {saveLabel && onSave ? (
          <button
            type="button"
            disabled={isSaveDisabled || isSaving}
            onClick={onSave}
            className="h-10 flex-1 rounded-full border border-(--oboon-border-default) ob-typo-button text-(--oboon-text-body) disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSaving ? "저장 중..." : saveLabel}
          </button>
        ) : null}
        <button
          type="button"
          disabled={!isReady || isFinishing}
          onClick={onFinish}
          className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-(--oboon-primary) text-white ob-typo-button disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isFinishing ? (
            <>
              <span
                aria-hidden="true"
                className="inline-block h-4 w-4 rounded-full border-2 border-(--oboon-spinner-ring) border-t-(--oboon-spinner-head) animate-spin"
              />
              <span>{finishingLabel}</span>
            </>
          ) : (
            finishLabel
          )}
        </button>
      </div>
    </div>
  );
}
