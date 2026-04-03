"use client";

import { useId } from "react";
import { cn } from "@/lib/utils/cn";
import Select from "@/components/ui/Select";
import { formatManwonPreview } from "@/lib/format/currency";
import type { EmploymentType } from "@/features/condition-validation/domain/types";
import type { RecommendationCondition } from "@/features/recommendations/hooks/useRecommendations";

const LABEL = "mb-1.5 block ob-typo-caption text-(--oboon-text-muted)";
const INPUT_CLS = [
  "h-11 w-full rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)",
  "px-3 ob-typo-body text-(--oboon-text-body) outline-none",
  "focus-visible:ring-2 focus-visible:ring-(--oboon-primary)/30",
].join(" ");

const EMPLOYMENT_OPTIONS: Array<{ value: EmploymentType; label: string }> = [
  { value: "employee", label: "직장인" },
  { value: "self_employed", label: "자영업" },
  { value: "freelancer", label: "프리랜서" },
  { value: "other", label: "기타" },
];

const HOUSE_OPTIONS = [
  { value: "none" as const, label: "무주택" },
  { value: "one" as const, label: "1주택" },
  { value: "two_or_more" as const, label: "2주택 이상" },
];

function formatNumeric(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  return digits ? Number(digits).toLocaleString("ko-KR") : "";
}

function NumberField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: number;
  placeholder: string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  const preview = value > 0 ? formatManwonPreview(value) : "";

  return (
    <label htmlFor={id}>
      <span className={LABEL}>{label}</span>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={value > 0 ? value.toLocaleString("ko-KR") : ""}
          placeholder={placeholder}
          onChange={(e) => {
            const fmt = formatNumeric(e.currentTarget.value);
            onChange(fmt ? Number(fmt.replaceAll(",", "")) : 0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
          className={cn(INPUT_CLS, preview ? "pr-[4.5rem]" : "pr-3")}
        />
        {preview && (
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center ob-typo-caption text-(--oboon-text-muted)">
            {preview}
          </div>
        )}
      </div>
    </label>
  );
}

type Props = {
  condition: RecommendationCondition;
  onChange: (patch: Partial<RecommendationCondition>) => void;
  onNext: () => void;
};

export default function ConditionWizardStep1({
  condition,
  onChange,
  onNext,
}: Props) {
  const isReady =
    condition.availableCash > 0 &&
    condition.monthlyIncome > 0 &&
    condition.houseOwnership !== null;

  return (
    <div className="space-y-4">
      <div>
        <p className="ob-typo-subtitle font-semibold text-(--oboon-text-title)">
          재무 정보
        </p>
        <p className="mt-0.5 ob-typo-caption text-(--oboon-text-muted)">
          기본 자금 조건을 입력해주세요
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
        <div>
          <span className={LABEL}>직업</span>
          <Select<EmploymentType>
            value={(condition.employmentType ?? "") as EmploymentType}
            onChange={(employmentType) => onChange({ employmentType })}
            options={EMPLOYMENT_OPTIONS}
          />
        </div>

        <div>
          <span className={LABEL}>보유 주택</span>
          <Select
            value={
              (condition.houseOwnership ?? "") as
                | "none"
                | "one"
                | "two_or_more"
            }
            onChange={(houseOwnership) => onChange({ houseOwnership })}
            options={HOUSE_OPTIONS}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 md:grid-cols-3">
        <div>
          <NumberField
            label="가용 현금"
            value={condition.availableCash}
            placeholder="예: 8,000"
            onChange={(availableCash) => onChange({ availableCash })}
          />
        </div>

        <div>
          <NumberField
            label="월 소득"
            value={condition.monthlyIncome}
            placeholder="예: 400"
            onChange={(monthlyIncome) => onChange({ monthlyIncome })}
          />
        </div>

        <div>
          <NumberField
            label="월 지출"
            value={condition.monthlyExpenses}
            placeholder="예: 150"
            onChange={(monthlyExpenses) => onChange({ monthlyExpenses })}
          />
        </div>
      </div>

      <button
        type="button"
        disabled={!isReady}
        onClick={onNext}
        className="h-10 w-full rounded-full bg-(--oboon-primary) text-white ob-typo-button transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
      >
        다음 단계 →
      </button>
    </div>
  );
}
