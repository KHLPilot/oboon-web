"use client";

import { useState, useId } from "react"; // useState: ltvModalOpen용
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import Button from "@/components/ui/Button";
import Select, { type SelectOption } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { MultiSelect } from "@/components/ui/MultiSelect";
import type {
  CreditGrade,
  EmploymentType,
  FullPurchasePurpose,
  MoveinTiming,
  PurchaseTiming,
} from "@/features/condition-validation/domain/types";
import LtvDsrModal from "@/features/condition-validation/components/LtvDsrModal";
import { formatManwonPreview } from "@/lib/format/currency";
import type { RecommendationCondition } from "@/features/recommendations/hooks/useRecommendations";
import { OFFERING_REGION_TABS, type OfferingRegionTab } from "@/features/offerings/domain/offering.types";

type ConditionBarProps = {
  condition: RecommendationCondition;
  isLoggedIn?: boolean;
  hasSavedConditionPreset?: boolean;
  isConditionDirty?: boolean;
  onChange: (patch: Partial<RecommendationCondition>) => void;
  onEvaluate: (override?: RecommendationCondition) => void | Promise<boolean>;
  onSave?: () => void | Promise<boolean>;
  onLoginAndSave?: () => void | Promise<void>;
  isLoading?: boolean;
  isSaving?: boolean;
};

const FIELD_LABEL_CLASSNAME =
  "mb-1.5 block ob-typo-caption text-(--oboon-text-muted)";
const INPUT_CLASSNAME = [
  "h-11 w-full rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)",
  "px-3 ob-typo-body text-(--oboon-text-body) outline-none",
  "focus-visible:ring-2 focus-visible:ring-(--oboon-primary)/30",
].join(" ");

// 초기화: 모든 입력을 "선택" 상태로 리셋
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
  { value: "two_or_more", label: "2주택이상" },
];

const PURPOSE_V2_OPTIONS: Array<{ value: FullPurchasePurpose; label: string }> = [
  { value: "residence", label: "실거주" },
  { value: "investment_rent", label: "투자(임대)" },
  { value: "investment_capital", label: "투자(시세)" },
  { value: "long_term", label: "실거주+투자" },
];

const PURCHASE_TIMING_OPTIONS: Array<SelectOption<PurchaseTiming>> = [
  { value: "within_3months", label: "3개월 이내" },
  { value: "within_6months", label: "6개월 이내" },
  { value: "within_1year", label: "1년 이내" },
  { value: "over_1year", label: "1년 이상" },
  { value: "by_property", label: "현장에 따라" },
];

const MOVEIN_TIMING_OPTIONS: Array<SelectOption<MoveinTiming>> = [
  { value: "immediate", label: "즉시입주" },
  { value: "within_1year", label: "1년 이내" },
  { value: "within_2years", label: "2년 이내" },
  { value: "within_3years", label: "3년 이내" },
  { value: "anytime", label: "언제든지" },
];

const REGION_OPTIONS = OFFERING_REGION_TABS.filter((r) => r !== "전체").map(
  (r) => ({ value: r as OfferingRegionTab, label: r }),
);

const CREDIT_GRADE_OPTIONS: Array<{ value: CreditGrade; label: string }> = [
  { value: "good", label: "양호" },
  { value: "normal", label: "보통" },
  { value: "unstable", label: "불안정" },
];

function guestCreditGradeToScore(grade: CreditGrade): number {
  if (grade === "good") return 80;
  if (grade === "normal") return 55;
  return 20;
}

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
  const id = useId();
  const isEmpty = value === 0;
  const previewLabel = isEmpty ? "" : formatManwonPreview(value);
  const displayValue = isEmpty ? "" : value.toLocaleString("ko-KR");

  return (
    <label htmlFor={id} className="space-y-0">
      <span className={FIELD_LABEL_CLASSNAME}>{label}</span>
      <div className="relative">
        <input
          id={id}
          type="text"
          value={displayValue}
          inputMode="numeric"
          placeholder={placeholder}
          onChange={(event) => {
            const formattedValue = formatNumericInput(event.currentTarget.value);
            if (!formattedValue) {
              onChange(0);
              return;
            }
            const nextValue = Number(formattedValue.replaceAll(",", ""));
            onChange(nextValue);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
          className={cn(INPUT_CLASSNAME, previewLabel ? "pr-[4.5rem]" : "pr-3")}
        />
        {previewLabel && (
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center ob-typo-caption text-(--oboon-text-muted)">
            {previewLabel}
          </div>
        )}
      </div>
    </label>
  );
}

export default function ConditionBar(props: ConditionBarProps) {
  const {
    condition,
    isLoggedIn = true,
    hasSavedConditionPreset = false,
    isConditionDirty = false,
    onChange,
    onEvaluate,
    onSave,
    onLoginAndSave,
    isLoading = false,
    isSaving = false,
  } = props;
  const [guestCreditGrade, setGuestCreditGrade] = useState<CreditGrade>("good");
  const [ltvModalOpen, setLtvModalOpen] = useState(false);
  const toast = useToast();

  const handleSave = async () => {
    if (!onSave) return;
    const ok = await onSave();
    if (ok) {
      toast.success("조건이 저장되었습니다.");
    } else {
      toast.error("저장에 실패했습니다. 다시 시도해주세요.");
    }
  };

  const isReadyToEvaluate =
    condition.availableCash > 0 &&
    condition.monthlyIncome > 0 &&
    condition.houseOwnership !== null &&
    condition.purchasePurposeV2 !== null &&
    (isLoggedIn !== false ? condition.ltvInternalScore > 0 : true);

  return (
    <div className="space-y-4">
      {isLoggedIn !== false ? (
        // ── 로그인 사용자: 전체 필드 그리드 ────────────────────────────────────
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:grid-cols-4">
          {/* 직업 */}
          <div>
            <div className={FIELD_LABEL_CLASSNAME}>직업</div>
            <Select<EmploymentType>
              value={(condition.employmentType ?? "") as EmploymentType}
              onChange={(employmentType) => onChange({ employmentType })}
              options={EMPLOYMENT_OPTIONS}
            />
          </div>

          {/* 가용 현금 */}
          <div>
            <NumberField
              label="가용 현금"
              value={condition.availableCash}
              placeholder="예: 8,000"
              onChange={(availableCash) => onChange({ availableCash })}
            />
          </div>

          {/* 월 소득 */}
          <div>
            <NumberField
              label="월 소득"
              value={condition.monthlyIncome}
              placeholder="예: 400"
              onChange={(monthlyIncome) => onChange({ monthlyIncome })}
            />
          </div>

          {/* 월 고정지출 */}
          <div>
            <NumberField
              label="월 지출"
              value={condition.monthlyExpenses}
              placeholder="예: 150"
              onChange={(monthlyExpenses) => onChange({ monthlyExpenses })}
            />
          </div>

          {/* 신용 상태 — 2칸 */}
          <div className="col-span-2">
            <div className={FIELD_LABEL_CLASSNAME}>신용 상태</div>
            <button
              type="button"
              onClick={() => setLtvModalOpen(true)}
              className="flex w-full items-center justify-between rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-3 py-2.5 hover:border-(--oboon-primary) transition-colors"
            >
              <span className="ob-typo-caption text-(--oboon-text-muted)">대출 가능성 평가</span>
              <div className="flex items-center gap-1.5">
                {condition.ltvInternalScore > 0 ? (
                  <span className="ob-typo-body font-semibold text-(--oboon-primary)">
                    {condition.ltvInternalScore}점
                  </span>
                ) : (
                  <span className="ob-typo-caption text-(--oboon-text-muted)">미평가</span>
                )}
                <span className="ob-typo-caption text-(--oboon-text-muted)">수정 →</span>
              </div>
            </button>
          </div>

          {/* 보유 주택 */}
          <div>
            <div className={FIELD_LABEL_CLASSNAME}>보유 주택</div>
            <Select<"none" | "one" | "two_or_more">
              value={(condition.houseOwnership ?? "") as "none" | "one" | "two_or_more"}
              onChange={(houseOwnership) => onChange({ houseOwnership })}
              options={HOUSE_OWNERSHIP_OPTIONS}
            />
          </div>

          {/* 분양 목적 */}
          <div>
            <div className={FIELD_LABEL_CLASSNAME}>분양 목적</div>
            <Select<FullPurchasePurpose>
              value={(condition.purchasePurposeV2 ?? "") as FullPurchasePurpose}
              onChange={(purchasePurposeV2) => onChange({ purchasePurposeV2 })}
              options={PURPOSE_V2_OPTIONS}
            />
          </div>

          {/* 분양 시점 */}
          <div>
            <div className={FIELD_LABEL_CLASSNAME}>분양 시점</div>
            <Select<PurchaseTiming>
              value={(condition.purchaseTiming ?? "") as PurchaseTiming}
              onChange={(purchaseTiming) => onChange({ purchaseTiming })}
              options={PURCHASE_TIMING_OPTIONS}
            />
          </div>

          {/* 희망 입주 */}
          <div>
            <div className={FIELD_LABEL_CLASSNAME}>희망 입주</div>
            <Select<MoveinTiming>
              value={(condition.moveinTiming ?? "") as MoveinTiming}
              onChange={(moveinTiming) => onChange({ moveinTiming })}
              options={MOVEIN_TIMING_OPTIONS}
            />
          </div>

          {/* 지역 */}
          <div className="col-span-2 lg:col-span-1">
            <div className={FIELD_LABEL_CLASSNAME}>지역</div>
            <MultiSelect<OfferingRegionTab>
              values={condition.regions}
              onChange={(regions) => onChange({ regions })}
              options={REGION_OPTIONS}
              placeholder="전체"
            />
          </div>
        </div>
      ) : (
        // ── 비로그인: 기본 5개 + soft gate ──────────────────────────────────
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              <div className={FIELD_LABEL_CLASSNAME}>신용 상태</div>
              <Select<CreditGrade>
                value={guestCreditGrade}
                onChange={setGuestCreditGrade}
                options={CREDIT_GRADE_OPTIONS}
              />
            </div>

            <div>
              <div className={FIELD_LABEL_CLASSNAME}>보유 주택</div>
              <Select<"none" | "one" | "two_or_more">
                value={(condition.houseOwnership ?? "") as "none" | "one" | "two_or_more"}
                onChange={(houseOwnership) => onChange({ houseOwnership })}
                options={HOUSE_OWNERSHIP_OPTIONS}
              />
            </div>
            <div>
              <div className={FIELD_LABEL_CLASSNAME}>분양 목적</div>
              <Select<FullPurchasePurpose>
                value={(condition.purchasePurposeV2 ?? "") as FullPurchasePurpose}
                onChange={(purchasePurposeV2) => onChange({ purchasePurposeV2 })}
                options={PURPOSE_V2_OPTIONS}
              />
            </div>
          </div>

          {/* Soft gate: 로그인 전용 상세 필드 */}
          <div className="relative overflow-hidden rounded-xl border border-(--oboon-border-default)">
            <div className="pointer-events-none select-none blur-sm opacity-50 grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className={FIELD_LABEL_CLASSNAME}>직업</div>
                <div className="h-11 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)" />
              </div>
              <div>
                <div className={FIELD_LABEL_CLASSNAME}>월 지출</div>
                <div className="h-11 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)" />
              </div>
              <div className="sm:col-span-2 lg:col-span-2">
                <div className={FIELD_LABEL_CLASSNAME}>신용 상태 (LTV+DSR)</div>
                <div className="h-11 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)" />
              </div>
              <div>
                <div className={FIELD_LABEL_CLASSNAME}>분양 시점</div>
                <div className="h-11 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)" />
              </div>
              <div>
                <div className={FIELD_LABEL_CLASSNAME}>희망 입주</div>
                <div className="h-11 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)" />
              </div>
              <div className="sm:col-span-2 lg:col-span-2">
                <div className={FIELD_LABEL_CLASSNAME}>지역</div>
                <div className="h-11 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)" />
              </div>
            </div>

            <button
              type="button"
              onClick={() => void onLoginAndSave?.()}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-(--oboon-bg-surface)/80 backdrop-blur-[1px] transition-colors hover:bg-(--oboon-bg-subtle)/80"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-(--oboon-bg-elevated) border border-(--oboon-border-default) shadow-sm">
                <Lock className="h-4 w-4 text-(--oboon-text-muted)" />
              </div>
              <div className="text-center px-4">
                <p className="ob-typo-caption font-semibold text-(--oboon-text-title)">
                  로그인하면 더 자세한 조건으로 평가할 수 있습니다
                </p>
                <p className="mt-0.5 ob-typo-caption text-(--oboon-text-muted)">
                  직업 · 지출 · 신용 상세 · 분양·입주 시점 · 지역 추가 입력
                </p>
              </div>
            </button>
          </div>
        </>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          onClick={() => onChange(RESET_CONDITION)}
          variant="ghost"
          size="sm"
          className="h-8 px-2 ob-typo-button text-(--oboon-text-muted)"
        >
          초기화
        </Button>
        {isLoggedIn === false && onLoginAndSave ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            shape="pill"
            className="h-8 px-4 shrink-0"
            onClick={() => void onLoginAndSave()}
          >
            로그인하고 조건 저장하기
          </Button>
        ) : isLoggedIn && !hasSavedConditionPreset && onSave ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            shape="pill"
            className="h-8 px-4 shrink-0"
            loading={isSaving}
            disabled={!isReadyToEvaluate}
            onClick={() => void handleSave()}
          >
            조건 저장하기
          </Button>
        ) : isLoggedIn && hasSavedConditionPreset && isConditionDirty && onSave ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            shape="pill"
            className="h-8 px-4 shrink-0"
            loading={isSaving}
            disabled={!isReadyToEvaluate}
            onClick={() => void handleSave()}
          >
            조건 업데이트
          </Button>
        ) : null}
        <Button
          variant="primary"
          size="sm"
          shape="pill"
          className="h-8 px-4 shrink-0"
          loading={isLoading}
          disabled={!isReadyToEvaluate}
          onClick={
            isLoggedIn !== false
              ? () => void onEvaluate()
              : () =>
                  void onEvaluate({
                    ...condition,
                    ltvInternalScore: guestCreditGradeToScore(guestCreditGrade),
                  })
          }
        >
          평가하기
        </Button>
      </div>

      <LtvDsrModal
        open={ltvModalOpen}
        onClose={() => setLtvModalOpen(false)}
        onConfirm={({ ltvInternalScore, existingMonthlyRepayment, formValues }) => {
          onChange({
            ltvInternalScore,
            existingMonthlyRepayment,
            existingLoan: formValues.existingLoan,
            recentDelinquency: formValues.recentDelinquency,
            cardLoanUsage: formValues.cardLoanUsage,
            loanRejection: formValues.loanRejection,
            monthlyIncomeRange: formValues.monthlyIncomeRange,
          });
        }}
        initialEmploymentType={condition.employmentType ?? "employee"}
        initialHouseOwnership={condition.houseOwnership ?? "none"}
        initialValues={{
          existingLoan: condition.existingLoan,
          recentDelinquency: condition.recentDelinquency,
          cardLoanUsage: condition.cardLoanUsage,
          loanRejection: condition.loanRejection,
          monthlyIncomeRange: condition.monthlyIncomeRange,
          existingMonthlyRepayment: condition.existingMonthlyRepayment,
        }}
        initialLtvInternalScore={condition.ltvInternalScore}
      />
    </div>
  );
}
