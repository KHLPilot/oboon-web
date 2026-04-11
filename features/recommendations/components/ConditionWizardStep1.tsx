"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import Select from "@/components/ui/Select";
import { formatManwonPreview } from "@/lib/format/currency";
import type { EmploymentType } from "@/features/condition-validation/domain/types";
import type { RecommendationCondition } from "@/features/recommendations/hooks/useRecommendations";
import { isStep1ReadyByAuth } from "@/features/recommendations/lib/recommendationInputPolicy";

const LABEL = "mb-1.5 block ob-typo-caption text-(--oboon-text-muted)";
const INPUT_CLS = [
  "h-10 sm:h-11 w-full rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)",
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

const FIXED_ACTIONS = [
  "fixed left-4 right-4 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-30",
  "sm:static sm:left-auto sm:right-auto sm:bottom-auto sm:z-auto sm:mt-auto",
].join(" ");

const MOBILE_FIXED_ACTIONS = `${FIXED_ACTIONS} shadow-none`;

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
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-0 right-3 flex items-center ob-typo-caption text-(--oboon-text-muted) transition-opacity",
            preview ? "opacity-100" : "opacity-0",
          )}
        >
          {preview || "\u00A0"}
        </div>
      </div>
    </label>
  );
}

function ProgressiveSlot({
  visible,
  children,
}: {
  visible: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const prevVisible = useRef(visible);

  useEffect(() => {
    if (!prevVisible.current && visible && ref.current) {
      const timer = setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 150);
      return () => clearTimeout(timer);
    }
    prevVisible.current = visible;
  }, [visible]);

  return (
    <div
      ref={ref}
      className={cn(
        "grid transition-all duration-300 ease-out",
        visible
          ? "grid-rows-[1fr] opacity-100 translate-y-0"
          : "grid-rows-[0fr] opacity-0 translate-y-2 pointer-events-none select-none",
      )}
    >
      <div className="overflow-hidden">
        <div className="pb-0.5">{children}</div>
      </div>
    </div>
  );
}

type Props = {
  condition: RecommendationCondition;
  isLoggedIn: boolean;
  hasSavedConditionPreset?: boolean;
  isConditionDirty?: boolean;
  onRestoreDefault?: () => boolean;
  onChange: (patch: Partial<RecommendationCondition>) => void;
  onNext: () => void;
  onReset: () => void;
  progressive?: boolean;
};

export default function ConditionWizardStep1({
  condition,
  isLoggedIn,
  hasSavedConditionPreset = false,
  isConditionDirty = false,
  onRestoreDefault,
  onChange,
  onNext,
  onReset,
  progressive = false,
}: Props) {
  const isReady = isStep1ReadyByAuth(condition, isLoggedIn);

  if (progressive) {
    const showIncome = condition.availableCash > 0;
    const showOwnership = condition.monthlyIncome > 0;
    const showExpenses = condition.houseOwnership !== null;
    const showEmployment = condition.monthlyExpenses > 0;

    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="space-y-0.5">
          <div className="flex items-start justify-between gap-3">
            <p className="ob-typo-subtitle font-semibold text-(--oboon-text-title)">
              재무 정보
            </p>
            <button
              type="button"
              onClick={onReset}
              className="shrink-0 ob-typo-caption text-(--oboon-text-muted) transition-colors hover:text-(--oboon-text-body)"
            >
              전체 초기화
            </button>
          </div>
          <p className="ob-typo-caption leading-tight text-(--oboon-text-muted)">
            기본 자금 조건을 입력해주세요
          </p>
        </div>

        <ProgressiveSlot visible={true}>
          <NumberField
            label="가용 현금"
            value={condition.availableCash}
            placeholder="예: 8,000"
            onChange={(availableCash) => onChange({ availableCash })}
          />
        </ProgressiveSlot>

        <ProgressiveSlot visible={showIncome}>
          <NumberField
            label="월 소득"
            value={condition.monthlyIncome}
            placeholder="예: 400"
            onChange={(monthlyIncome) => onChange({ monthlyIncome })}
          />
        </ProgressiveSlot>

        <ProgressiveSlot visible={showOwnership}>
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
              className="h-10"
            />
          </div>
        </ProgressiveSlot>

        {isLoggedIn ? (
          <ProgressiveSlot visible={showExpenses}>
            <NumberField
              label="월 지출"
              value={condition.monthlyExpenses}
              placeholder="예: 150"
              onChange={(monthlyExpenses) => onChange({ monthlyExpenses })}
            />
          </ProgressiveSlot>
        ) : null}

        {isLoggedIn ? (
          <ProgressiveSlot visible={showEmployment}>
            <div>
              <span className={LABEL}>직업</span>
              <Select<EmploymentType>
                value={(condition.employmentType ?? "") as EmploymentType}
                onChange={(employmentType) => onChange({ employmentType })}
                options={EMPLOYMENT_OPTIONS}
                className="h-10"
              />
            </div>
          </ProgressiveSlot>
        ) : null}

        <div className={`${MOBILE_FIXED_ACTIONS} flex flex-col gap-2`}>
          {isLoggedIn && hasSavedConditionPreset && isConditionDirty && onRestoreDefault ? (
            <div className="sm:hidden flex items-center justify-between gap-2 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-2">
              <p className="ob-typo-caption text-(--oboon-text-muted)">
                저장된 기본 조건과 다릅니다.
              </p>
              <button
                type="button"
                onClick={onRestoreDefault}
                className="shrink-0 ob-typo-caption font-medium text-(--oboon-primary) underline underline-offset-4 hover:opacity-70"
              >
                기본 조건으로
              </button>
            </div>
          ) : null}
          <button
            type="button"
            disabled={!isReady}
            onClick={onNext}
            className="h-10 w-full rounded-full bg-(--oboon-primary) text-white ob-typo-button transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            다음 단계 →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="space-y-0.5">
        <div className="flex items-start justify-between gap-3">
          <p className="ob-typo-subtitle font-semibold text-(--oboon-text-title)">
            재무 정보
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
          기본 자금 조건을 입력해주세요
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
        {isLoggedIn ? (
          <div>
            <span className={LABEL}>직업</span>
            <Select<EmploymentType>
              value={(condition.employmentType ?? "") as EmploymentType}
              onChange={(employmentType) => onChange({ employmentType })}
              options={EMPLOYMENT_OPTIONS}
            />
          </div>
        ) : null}

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

      <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
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

        {isLoggedIn ? (
          <div>
            <NumberField
              label="월 지출"
              value={condition.monthlyExpenses}
              placeholder="예: 150"
              onChange={(monthlyExpenses) => onChange({ monthlyExpenses })}
            />
          </div>
        ) : null}
      </div>

      <div className={`${FIXED_ACTIONS} flex flex-col gap-2 rounded-full bg-(--oboon-bg-surface)/95 p-2 backdrop-blur`}>
        {isLoggedIn && hasSavedConditionPreset && isConditionDirty && onRestoreDefault ? (
          <div className="sm:hidden flex items-center justify-between gap-2 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-2">
            <p className="ob-typo-caption text-(--oboon-text-muted)">
              저장된 기본 조건과 다릅니다.
            </p>
            <button
              type="button"
              onClick={onRestoreDefault}
              className="shrink-0 ob-typo-caption font-medium text-(--oboon-primary) underline underline-offset-4 hover:opacity-70"
            >
              기본 조건으로
            </button>
          </div>
        ) : null}
        <button
          type="button"
          disabled={!isReady}
          onClick={onNext}
          className="h-10 w-full rounded-full bg-(--oboon-primary) text-white ob-typo-button transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          다음 단계 →
        </button>
      </div>
    </div>
  );
}
