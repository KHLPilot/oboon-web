"use client";

import Select, { type SelectOption } from "@/components/ui/Select";
import type {
  CreditGrade,
  PurchasePurpose,
} from "@/features/condition-validation/domain/types";
import { formatManwon } from "@/lib/format/currency";
import { cn } from "@/lib/utils/cn";
import type {
  OwnedHouseCount,
  RecommendationCondition,
} from "@/features/recommendations/hooks/useRecommendations";

type SimulatorBarProps = {
  condition: RecommendationCondition;
  onChange: (patch: Partial<RecommendationCondition>) => void;
};

const FIELD_LABEL_CLASSNAME =
  "mb-2 block ob-typo-caption text-(--oboon-text-muted)";

const DEFAULT_CONDITION: RecommendationCondition = {
  availableCash: 8_000,
  monthlyIncome: 400,
  ownedHouseCount: 0,
  creditGrade: "good",
  purchasePurpose: "residence",
};

const HOUSE_OPTIONS: Array<SelectOption<OwnedHouseCount>> = [
  { value: 0, label: "무주택" },
  { value: 1, label: "1채" },
  { value: 2, label: "2채 이상" },
];

const CREDIT_OPTIONS: Array<SelectOption<CreditGrade>> = [
  { value: "good", label: "우수" },
  { value: "normal", label: "보통" },
  { value: "unstable", label: "불안정" },
];

const PURPOSE_OPTIONS: Array<SelectOption<PurchasePurpose>> = [
  { value: "residence", label: "실거주" },
  { value: "investment", label: "투자" },
  { value: "both", label: "실거주 + 투자" },
];

function SliderField(props: {
  label: string;
  valueLabel: string;
  minLabel: string;
  midLabel: string;
  maxLabel: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  const {
    label,
    valueLabel,
    minLabel,
    midLabel,
    maxLabel,
    min,
    max,
    step,
    value,
    onChange,
  } = props;
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-0">
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
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.currentTarget.value))}
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

function SelectField<T extends string | number>(props: {
  label: string;
  value: T;
  options: Array<{ label: string; value: T }>;
  onChange: (value: T) => void;
}) {
  const { label, value, options, onChange } = props;

  return (
    <div className="space-y-0">
      <div className={FIELD_LABEL_CLASSNAME}>{label}</div>
      <Select value={value} onChange={onChange} options={options} />
    </div>
  );
}

export default function SimulatorBar(props: SimulatorBarProps) {
  const { condition, onChange } = props;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SliderField
          label="가용 현금"
          valueLabel={formatManwon(condition.availableCash)}
          minLabel="0만"
          midLabel="1억"
          maxLabel="3억+"
          min={0}
          max={30000}
          step={500}
          value={condition.availableCash}
          onChange={(availableCash) => onChange({ availableCash })}
        />

        <SliderField
          label="월 소득"
          valueLabel={formatManwon(condition.monthlyIncome)}
          minLabel="0만"
          midLabel="1,000만"
          maxLabel="2,000만"
          min={0}
          max={2000}
          step={50}
          value={condition.monthlyIncome}
          onChange={(monthlyIncome) => onChange({ monthlyIncome })}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SelectField
          label="보유 주택"
          value={condition.ownedHouseCount}
          options={HOUSE_OPTIONS}
          onChange={(ownedHouseCount) => onChange({ ownedHouseCount })}
        />

        <SelectField
          label="신용 등급"
          value={condition.creditGrade}
          options={CREDIT_OPTIONS}
          onChange={(creditGrade) => onChange({ creditGrade })}
        />

        <SelectField
          label="구매 목적"
          value={condition.purchasePurpose}
          options={PURPOSE_OPTIONS}
          onChange={(purchasePurpose) => onChange({ purchasePurpose })}
        />
      </div>

      <div className="flex items-center justify-end pt-2">
        <button
          type="button"
          onClick={() => onChange(DEFAULT_CONDITION)}
          className="ob-typo-caption text-(--oboon-text-muted) transition-colors hover:text-(--oboon-text-body)"
        >
          초기화
        </button>
      </div>
    </div>
  );
}
