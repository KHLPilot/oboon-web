"use client";

"use client";

import { Lock } from "lucide-react";
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
import { isStep3ReadyByAuth } from "@/features/recommendations/lib/recommendationInputPolicy";

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
  isLoggedIn: boolean;
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
  isLoggedIn,
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
  const isReady = isStep3ReadyByAuth(condition, isLoggedIn);

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

        {isLoggedIn ? (
          <div>
            <span className={LABEL}>분양 시점</span>
            <Select<PurchaseTiming>
              value={(condition.purchaseTiming ?? "") as PurchaseTiming}
              onChange={(purchaseTiming) => onChange({ purchaseTiming })}
              options={PURCHASE_TIMING_OPTIONS}
            />
          </div>
        ) : null}

        {isLoggedIn ? (
          <div>
            <span className={LABEL}>희망 입주</span>
            <Select<MoveinTiming>
              value={(condition.moveinTiming ?? "") as MoveinTiming}
              onChange={(moveinTiming) => onChange({ moveinTiming })}
              options={MOVEIN_OPTIONS}
            />
          </div>
        ) : null}

        {isLoggedIn ? (
          <div>
            <span className={LABEL}>지역</span>
            <MultiSelect<OfferingRegionTab>
              values={condition.regions}
              onChange={(regions) => onChange({ regions })}
              options={REGION_OPTIONS}
              placeholder="전체"
            />
          </div>
        ) : null}
      </div>

      {!isLoggedIn ? (
        <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-elevated)">
              <Lock className="h-4 w-4 text-(--oboon-text-muted)" />
            </div>
            <div>
              <p className="ob-typo-body font-semibold text-(--oboon-text-title)">
                생활 조건 반영
              </p>
              <p className="ob-typo-caption text-(--oboon-text-muted)">
                로그인하면 추천 정확도를 높이는 생활 조건을 더 입력할 수 있어요.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              "월 지출",
              "직업",
              "분양 시점",
              "희망 입주",
              "지역",
            ].map((item) => (
              <div
                key={item}
                className="rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-3 py-2"
              >
                <div className="ob-typo-caption font-medium text-(--oboon-text-title)">
                  {item}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-col items-center gap-2 text-center">
            <p className="ob-typo-caption text-(--oboon-text-muted)">
              입력값이 많을수록 추천 현장 정렬이 더 정확해집니다.
            </p>
            <button
              type="button"
              onClick={onSave}
              className="inline-flex h-10 items-center justify-center rounded-full bg-(--oboon-primary) px-4 text-white ob-typo-button"
            >
              로그인하고 맞춤 조건 더 입력하기
            </button>
          </div>
        </div>
      ) : null}

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
