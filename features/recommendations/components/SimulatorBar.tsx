"use client";

import { useEffect, useState } from "react";
import Select from "@/components/ui/Select";
import { MultiSelect } from "@/components/ui/MultiSelect";
import Button from "@/components/ui/Button";
import type {
  EmploymentType,
  FullPurchasePurpose,
  MoveinTiming,
  PurchaseTiming,
} from "@/features/condition-validation/domain/types";
import LtvDsrModal from "@/features/condition-validation/components/LtvDsrModal";
import { formatManwonPreview } from "@/lib/format/currency";
import { cn } from "@/lib/utils/cn";
import type { RecommendationCondition } from "@/features/recommendations/hooks/useRecommendations";
import { OFFERING_REGION_TABS } from "@/features/offerings/domain/offering.types";
import type { OfferingRegionTab } from "@/features/offerings/domain/offering.types";

type SimulatorBarProps = {
  condition: RecommendationCondition;
  onEvaluate: (sim: RecommendationCondition) => void | Promise<boolean>;
  isLoading?: boolean;
};

const FIELD_LABEL_CLASSNAME = "mb-2 block ob-typo-caption text-(--oboon-text-muted)";

const RESET_CONDITION: RecommendationCondition = {
  availableCash: 0,
  monthlyIncome: 0,
  ownedHouseCount: 0,
  creditGrade: "good",
  purchasePurpose: "residence",
  employmentType: null,
  monthlyExpenses: 0,
  houseOwnership: null,
  purchasePurposeV2: null,
  purchaseTiming: null,
  moveinTiming: null,
  ltvInternalScore: 0,
  existingLoan: null,
  recentDelinquency: null,
  cardLoanUsage: null,
  loanRejection: null,
  monthlyIncomeRange: null,
  existingMonthlyRepayment: "none",
  regions: [],
};

const EMPLOYMENT_OPTIONS: Array<{ value: EmploymentType; label: string }> = [
  { value: "employee", label: "직장인" },
  { value: "self_employed", label: "자영업" },
  { value: "freelancer", label: "프리랜서" },
  { value: "other", label: "기타" },
];

const HOUSE_OWNERSHIP_OPTIONS: Array<{
  value: "none" | "one" | "two_or_more";
  label: string;
}> = [
  { value: "none", label: "무주택" },
  { value: "one", label: "1주택" },
  { value: "two_or_more", label: "2주택 이상" },
];

const PURPOSE_V2_OPTIONS: Array<{ value: FullPurchasePurpose; label: string }> = [
  { value: "residence", label: "실거주" },
  { value: "investment_rent", label: "투자(임대)" },
  { value: "investment_capital", label: "투자(시세)" },
  { value: "long_term", label: "실거주+투자" },
];

const PURCHASE_TIMING_OPTIONS: Array<{ value: PurchaseTiming; label: string }> = [
  { value: "within_3months", label: "3개월 이내" },
  { value: "within_6months", label: "6개월 이내" },
  { value: "within_1year", label: "1년 이내" },
  { value: "over_1year", label: "1년 이상" },
  { value: "by_property", label: "현장에 따라" },
];

const MOVEIN_TIMING_OPTIONS: Array<{ value: MoveinTiming; label: string }> = [
  { value: "immediate", label: "즉시입주" },
  { value: "within_1year", label: "1년 이내" },
  { value: "within_2years", label: "2년 이내" },
  { value: "within_3years", label: "3년 이내" },
  { value: "anytime", label: "언제든지" },
];

const REGION_OPTIONS = OFFERING_REGION_TABS.filter((r) => r !== "전체").map(
  (r) => ({ value: r as OfferingRegionTab, label: r }),
);

const AVAILABLE_CASH_STEPS = [
  ...Array.from({ length: 11 }, (_, i) => i * 1_000),
  ...Array.from({ length: 9 }, (_, i) => (i + 2) * 10_000),
  ...Array.from({ length: 9 }, (_, i) => (i + 2) * 100_000),
];

const MONTHLY_INCOME_STEPS = [
  ...Array.from({ length: 11 }, (_, i) => i * 100),
  ...Array.from({ length: 8 }, (_, i) => 1_500 + i * 500),
  ...Array.from({ length: 5 }, (_, i) => 6_000 + i * 1_000),
];

const MONTHLY_EXPENSES_STEPS = [
  ...Array.from({ length: 11 }, (_, i) => i * 10),
  ...Array.from({ length: 9 }, (_, i) => 150 + i * 50),
  ...Array.from({ length: 5 }, (_, i) => 600 + i * 100),
];

function SliderField(props: {
  label: string;
  valueLabel: string;
  minLabel: string;
  midLabel: string;
  maxLabel: string;
  value: number;
  onChange: (value: number) => void;
  positions?: number[];
  min?: number;
  max?: number;
  step?: number;
}) {
  const {
    label,
    valueLabel,
    minLabel,
    midLabel,
    maxLabel,
    value,
    onChange,
    positions,
    min = 0,
    max = 100,
    step = 1,
  } = props;
  const resolvedPositions = positions ?? null;
  const rangeMin = resolvedPositions ? 0 : min;
  const rangeMax = resolvedPositions ? Math.max(resolvedPositions.length - 1, 0) : max;
  const rangeStep = resolvedPositions ? 1 : step;
  const currentRangeValue = resolvedPositions
    ? Math.max(0, resolvedPositions.indexOf(value))
    : value;
  const percent =
    rangeMax <= rangeMin
      ? 0
      : ((currentRangeValue - rangeMin) / (rangeMax - rangeMin)) * 100;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="ob-typo-caption text-(--oboon-text-muted)">{label}</span>
        <span className="ob-typo-caption font-medium text-(--oboon-text-title)">
          {valueLabel}
        </span>
      </div>
      <div className="relative h-6">
        <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-(--oboon-bg-subtle)" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-(--oboon-primary)"
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
        <input
          type="range"
          min={rangeMin}
          max={rangeMax}
          step={rangeStep}
          value={currentRangeValue}
          onChange={(e) => {
            const next = Number(e.currentTarget.value);
            if (resolvedPositions) {
              onChange(resolvedPositions[next] ?? resolvedPositions[0] ?? 0);
              return;
            }
            onChange(next);
          }}
          className={cn(
            "absolute inset-0 h-full w-full appearance-none bg-transparent",
            "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-(--oboon-bg-surface)",
            "[&::-webkit-slider-thumb]:bg-(--oboon-primary) [&::-webkit-slider-thumb]:shadow-md",
            "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full",
            "[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-(--oboon-bg-surface) [&::-moz-range-thumb]:bg-(--oboon-primary)",
          )}
        />
      </div>
      <div className="grid grid-cols-3 text-xs text-(--oboon-text-muted)">
        <span>{minLabel}</span>
        <span className="text-center">{midLabel}</span>
        <span className="text-right">{maxLabel}</span>
      </div>
    </div>
  );
}

export default function SimulatorBar({ condition, onEvaluate, isLoading = false }: SimulatorBarProps) {
  // 로컬 state — 슬라이더 변경이 "직접 입력" 탭에 영향을 주지 않도록 분리
  const [simCondition, setSimCondition] = useState<RecommendationCondition>(condition);
  const [ltvModalOpen, setLtvModalOpen] = useState(false);

  useEffect(() => {
    setSimCondition(condition);
  }, [condition]);

  function patch(update: Partial<RecommendationCondition>) {
    setSimCondition((prev) => ({ ...prev, ...update }));
  }

  const isReadyToEvaluate =
    simCondition.availableCash > 0 &&
    simCondition.monthlyIncome > 0 &&
    simCondition.houseOwnership !== null &&
    simCondition.purchasePurposeV2 !== null &&
    simCondition.ltvInternalScore > 0;

  return (
    <div className="space-y-4">
      {/* 가용 현금 */}
      <SliderField
        label="가용 현금"
        valueLabel={formatManwonPreview(simCondition.availableCash)}
        minLabel="0만"
        midLabel="10억"
        maxLabel="100억"
        value={simCondition.availableCash}
        positions={AVAILABLE_CASH_STEPS}
        onChange={(availableCash) => patch({ availableCash })}
      />

      {/* 월 소득 + 월 고정지출 */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <SliderField
          label="월 소득"
          valueLabel={formatManwonPreview(simCondition.monthlyIncome)}
          minLabel="0만"
          midLabel="5,000만"
          maxLabel="1억"
          value={simCondition.monthlyIncome}
          positions={MONTHLY_INCOME_STEPS}
          onChange={(monthlyIncome) => patch({ monthlyIncome })}
        />
        <SliderField
          label="월 고정지출"
          valueLabel={formatManwonPreview(simCondition.monthlyExpenses)}
          minLabel="0만"
          midLabel="300만"
          maxLabel="1,000만"
          value={simCondition.monthlyExpenses}
          positions={MONTHLY_EXPENSES_STEPS}
          onChange={(monthlyExpenses) => patch({ monthlyExpenses })}
        />
      </div>

      {/* 셀렉트 그리드 */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {/* 직업 */}
        <div>
          <div className={FIELD_LABEL_CLASSNAME}>직업</div>
          <Select<EmploymentType>
            value={(simCondition.employmentType ?? "") as EmploymentType}
            onChange={(employmentType) => patch({ employmentType })}
            options={EMPLOYMENT_OPTIONS}
          />
        </div>

        {/* 보유 주택 */}
        <div>
          <div className={FIELD_LABEL_CLASSNAME}>보유 주택</div>
          <Select<"none" | "one" | "two_or_more">
            value={(simCondition.houseOwnership ?? "") as "none" | "one" | "two_or_more"}
            onChange={(houseOwnership) => patch({ houseOwnership })}
            options={HOUSE_OWNERSHIP_OPTIONS}
          />
        </div>

        {/* 신용 상태 — 2칸 */}
        <div className="col-span-2">
          <div className={FIELD_LABEL_CLASSNAME}>신용 상태 (LTV+DSR)</div>
          <button
            type="button"
            onClick={() => setLtvModalOpen(true)}
            className="flex w-full items-center justify-between rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-3 py-2.5 hover:border-(--oboon-primary) transition-colors"
          >
            <span className="ob-typo-caption text-(--oboon-text-muted)">대출 가능성 평가</span>
            <div className="flex items-center gap-1.5">
              {simCondition.ltvInternalScore > 0 ? (
                <span className="ob-typo-body font-semibold text-(--oboon-primary)">
                  {simCondition.ltvInternalScore}점
                </span>
              ) : (
                <span className="ob-typo-caption text-(--oboon-text-muted)">미평가</span>
              )}
              <span className="ob-typo-caption text-(--oboon-text-muted)">수정 →</span>
            </div>
          </button>
        </div>

        {/* 분양 목적 */}
        <div>
          <div className={FIELD_LABEL_CLASSNAME}>분양 목적</div>
          <Select<FullPurchasePurpose>
            value={(simCondition.purchasePurposeV2 ?? "") as FullPurchasePurpose}
            onChange={(purchasePurposeV2) => patch({ purchasePurposeV2 })}
            options={PURPOSE_V2_OPTIONS}
          />
        </div>

        {/* 분양 시점 */}
        <div>
          <div className={FIELD_LABEL_CLASSNAME}>분양 시점</div>
          <Select<PurchaseTiming>
            value={(simCondition.purchaseTiming ?? "") as PurchaseTiming}
            onChange={(purchaseTiming) => patch({ purchaseTiming })}
            options={PURCHASE_TIMING_OPTIONS}
          />
        </div>

        {/* 희망 입주 */}
        <div>
          <div className={FIELD_LABEL_CLASSNAME}>희망 입주</div>
          <Select<MoveinTiming>
            value={(simCondition.moveinTiming ?? "") as MoveinTiming}
            onChange={(moveinTiming) => patch({ moveinTiming })}
            options={MOVEIN_TIMING_OPTIONS}
          />
        </div>

        {/* 지역 */}
        <div>
          <div className={FIELD_LABEL_CLASSNAME}>지역</div>
          <MultiSelect<OfferingRegionTab>
            values={simCondition.regions}
            onChange={(regions) => patch({ regions })}
            options={REGION_OPTIONS}
            placeholder="전체"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          onClick={() => setSimCondition(RESET_CONDITION)}
          variant="ghost"
          size="sm"
          className="h-8 px-2 ob-typo-button text-(--oboon-text-muted)"
        >
          초기화
        </Button>
        <Button
          variant="primary"
          size="sm"
          shape="pill"
          className="h-8 px-4 shrink-0"
          loading={isLoading}
          disabled={!isReadyToEvaluate}
          onClick={() => void onEvaluate(simCondition)}
        >
          평가하기
        </Button>
      </div>

      <LtvDsrModal
        open={ltvModalOpen}
        onClose={() => setLtvModalOpen(false)}
        onConfirm={({ ltvInternalScore, existingMonthlyRepayment, formValues }) => {
          patch({
            ltvInternalScore,
            existingMonthlyRepayment,
            existingLoan: formValues.existingLoan,
            recentDelinquency: formValues.recentDelinquency,
            cardLoanUsage: formValues.cardLoanUsage,
            loanRejection: formValues.loanRejection,
            monthlyIncomeRange: formValues.monthlyIncomeRange,
          });
        }}
        initialEmploymentType={simCondition.employmentType ?? "employee"}
        initialHouseOwnership={simCondition.houseOwnership ?? "none"}
        initialValues={{
          existingLoan: simCondition.existingLoan,
          recentDelinquency: simCondition.recentDelinquency,
          cardLoanUsage: simCondition.cardLoanUsage,
          loanRejection: simCondition.loanRejection,
          monthlyIncomeRange: simCondition.monthlyIncomeRange,
          existingMonthlyRepayment: simCondition.existingMonthlyRepayment,
        }}
        initialLtvInternalScore={simCondition.ltvInternalScore}
      />
    </div>
  );
}
