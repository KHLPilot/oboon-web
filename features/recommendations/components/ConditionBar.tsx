"use client";

import Button from "@/components/ui/Button";
import Select, { type SelectOption } from "@/components/ui/Select";
import type {
  CreditGrade,
  PurchasePurpose,
} from "@/features/condition-validation/domain/types";
import { formatManwonPreview } from "@/lib/format/currency";
import type {
  OwnedHouseCount,
  RecommendationCondition,
} from "@/features/recommendations/hooks/useRecommendations";

type ConditionBarProps = {
  condition: RecommendationCondition;
  onChange: (patch: Partial<RecommendationCondition>) => void;
  onEvaluate: () => void | Promise<boolean>;
  isLoading?: boolean;
};

const FIELD_LABEL_CLASSNAME =
  "mb-2 block ob-typo-caption text-(--oboon-text-muted)";
const INPUT_CLASSNAME = [
  "h-11 w-full rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-page)",
  "px-3 pr-36 ob-typo-body text-(--oboon-text-body) outline-none",
  "focus-visible:ring-2 focus-visible:ring-(--oboon-primary)/30",
].join(" ");

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

function formatNumericInput(value: string): string {
  const digitsOnly = value.replace(/[^\d]/g, "");
  if (!digitsOnly) return "";
  return Number(digitsOnly).toLocaleString("ko-KR");
}

function NumberField(props: {
  label: string;
  value: number;
  placeholder: string;
  onChange: (value: number) => void;
}) {
  const { label, value, placeholder, onChange } = props;
  const previewLabel = formatManwonPreview(value);
  const displayValue = value.toLocaleString("ko-KR");

  return (
    <label className="space-y-0">
      <span className={FIELD_LABEL_CLASSNAME}>{label}</span>
      <div className="relative">
        <input
          type="text"
          value={displayValue}
          inputMode="numeric"
          placeholder={placeholder}
          onChange={(event) => {
            const formattedValue = formatNumericInput(event.currentTarget.value);
            if (!formattedValue) return;

            const nextValue = Number(formattedValue.replaceAll(",", ""));
            onChange(nextValue);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
          className={INPUT_CLASSNAME}
        />
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center ob-typo-caption text-(--oboon-text-muted)">
          {previewLabel}
        </div>
      </div>
    </label>
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

export default function ConditionBar(props: ConditionBarProps) {
  const { condition, onChange, onEvaluate, isLoading = false } = props;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <NumberField
          label="가용 현금"
          value={condition.availableCash}
          placeholder="8,000"
          onChange={(availableCash) => onChange({ availableCash })}
        />

        <NumberField
          label="월 소득"
          value={condition.monthlyIncome}
          placeholder="400"
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

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          onClick={() => onChange(DEFAULT_CONDITION)}
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
          onClick={onEvaluate}
        >
          평가하기
        </Button>
      </div>
    </div>
  );
}
