"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Select from "@/components/ui/Select";
import LtvDsrModal from "@/features/condition-validation/components/LtvDsrModal";
import type { LtvDsrPersistedValues } from "@/features/condition-validation/domain/types";
import { oboonFieldBaseClass } from "@/lib/ui/formFieldStyles";

const EMPLOYMENT_TYPE_OPTIONS = [
  { label: "직장인", value: "employee" },
  { label: "자영업", value: "self_employed" },
  { label: "프리랜서", value: "freelancer" },
  { label: "기타", value: "other" },
] as const;

const HOUSE_OWNERSHIP_OPTIONS = [
  { label: "무주택", value: "none" },
  { label: "1주택", value: "one" },
  { label: "2주택이상", value: "two_or_more" },
] as const;

const PURCHASE_PURPOSE_V2_OPTIONS = [
  { label: "실거주", value: "residence" },
  { label: "투자(임대)", value: "investment_rent" },
  { label: "투자(시세)", value: "investment_capital" },
  { label: "실거주+투자", value: "long_term" },
] as const;

const PURCHASE_TIMING_OPTIONS = [
  { label: "3개월 이내", value: "within_3months" },
  { label: "6개월 이내", value: "within_6months" },
  { label: "1년 이내", value: "within_1year" },
  { label: "1년 이상", value: "over_1year" },
  { label: "현장에 따라", value: "by_property" },
] as const;

const MOVEIN_TIMING_OPTIONS = [
  { label: "즉시입주", value: "immediate" },
  { label: "1년 이내", value: "within_1year" },
  { label: "2년 이내", value: "within_2years" },
  { label: "3년 이내", value: "within_3years" },
  { label: "언제든지", value: "anytime" },
] as const;

type PersonalizationSectionProps = {
  availableCashManwon: string;
  monthlyIncomeManwon: string;
  monthlyExpensesManwon: string;
  employmentType: "employee" | "self_employed" | "freelancer" | "other" | null;
  houseOwnership: "none" | "one" | "two_or_more" | null;
  purchasePurposeV2: "residence" | "investment_rent" | "investment_capital" | "long_term" | null;
  purchaseTiming: "within_3months" | "within_6months" | "within_1year" | "over_1year" | "by_property" | null;
  moveinTiming: "immediate" | "within_1year" | "within_2years" | "within_3years" | "anytime" | null;
  ltvInternalScore: number;
  personalizationEditing: boolean;
  personalizationSaving: boolean;
  personalizationErrors: { availableCashManwon?: string; monthlyIncomeManwon?: string };
  marketingConsent: boolean;
  marketingConsentLoading: boolean;
  onAvailableCashChange: (value: string) => void;
  onMonthlyIncomeChange: (value: string) => void;
  onMonthlyExpensesChange: (value: string) => void;
  onEmploymentTypeChange: (value: "employee" | "self_employed" | "freelancer" | "other") => void;
  onHouseOwnershipChange: (value: "none" | "one" | "two_or_more") => void;
  onPurchasePurposeV2Change: (value: "residence" | "investment_rent" | "investment_capital" | "long_term") => void;
  onPurchaseTimingChange: (value: "within_3months" | "within_6months" | "within_1year" | "over_1year" | "by_property") => void;
  onMoveinTimingChange: (value: "immediate" | "within_1year" | "within_2years" | "within_3years" | "anytime") => void;
  ltvDsrValues: LtvDsrPersistedValues;
  onLtvInternalScoreChange: (value: number) => void;
  onLtvDsrValuesChange: (value: LtvDsrPersistedValues) => void;
  onEditStart: () => void;
  onSave: () => void;
  onCancel: () => void;
  onToggleMarketingConsent: () => void;
};

function formatNumericInput(value: string): string {
  const digitsOnly = value.replace(/[^\d]/g, "");
  if (!digitsOnly) return "";
  return Number(digitsOnly).toLocaleString("ko-KR");
}

function parseNullableNumericInput(value: string): number | null {
  const normalized = value.replaceAll(",", "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function formatManwonPreview(value: string): string {
  const parsed = parseNullableNumericInput(value);
  if (parsed === null) return "";

  const manwon = Math.round(parsed);
  if (manwon < 10000) return `${manwon.toLocaleString("ko-KR")}만원`;

  const eok = Math.floor(manwon / 10000);
  const restManwon = manwon % 10000;
  if (restManwon === 0) return `${eok.toLocaleString("ko-KR")}억원`;
  if (restManwon % 1000 === 0) {
    return `${eok.toLocaleString("ko-KR")}억 ${restManwon / 1000}천만원`;
  }
  return `${eok.toLocaleString("ko-KR")}억 ${restManwon.toLocaleString("ko-KR")}만원`;
}

export default function PersonalizationSection({
  availableCashManwon,
  monthlyIncomeManwon,
  monthlyExpensesManwon,
  employmentType,
  houseOwnership,
  purchasePurposeV2,
  purchaseTiming,
  moveinTiming,
  ltvInternalScore,
  personalizationEditing,
  personalizationSaving,
  personalizationErrors,
  marketingConsent,
  marketingConsentLoading,
  onAvailableCashChange,
  onMonthlyIncomeChange,
  onMonthlyExpensesChange,
  onEmploymentTypeChange,
  onHouseOwnershipChange,
  onPurchasePurposeV2Change,
  onPurchaseTimingChange,
  onMoveinTimingChange,
  ltvDsrValues,
  onLtvInternalScoreChange,
  onLtvDsrValuesChange,
  onEditStart,
  onSave,
  onCancel,
  onToggleMarketingConsent,
}: PersonalizationSectionProps) {
  const [ltvModalOpen, setLtvModalOpen] = useState(false);

  const availableCashPreview = formatManwonPreview(availableCashManwon);
  const monthlyIncomePreview = formatManwonPreview(monthlyIncomeManwon);
  const monthlyExpensesPreview = formatManwonPreview(monthlyExpensesManwon);

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="ob-typo-h3 text-(--oboon-text-title)">조건 검증 맞춤 정보</div>
            <p className="mt-1 ob-typo-body text-(--oboon-text-muted)">
              여기서 입력한 값은 현장 상세의 조건 검증에 자동 적용됩니다.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* 가용 현금 */}
          <div className="space-y-2">
            <Label>가용 현금 (만원) *</Label>
            <div className="relative">
              <Input
                value={availableCashManwon}
                disabled={!personalizationEditing}
                onChange={(e) => onAvailableCashChange(formatNumericInput(e.target.value))}
                inputMode="numeric"
                placeholder="예: 8,000"
                className={[
                  oboonFieldBaseClass,
                  availableCashPreview ? "pr-28" : "",
                  personalizationErrors.availableCashManwon
                    ? "border-(--oboon-danger-border)"
                    : "",
                ].join(" ")}
              />
              {availableCashPreview ? (
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center ob-typo-caption text-(--oboon-text-muted)">
                  {availableCashPreview}
                </div>
              ) : null}
            </div>
            {personalizationErrors.availableCashManwon ? (
              <p className="ob-typo-caption text-(--oboon-danger)">
                {personalizationErrors.availableCashManwon}
              </p>
            ) : null}
          </div>

          {/* 월 소득 */}
          <div className="space-y-2">
            <Label>월 소득 (만원) *</Label>
            <div className="relative">
              <Input
                value={monthlyIncomeManwon}
                disabled={!personalizationEditing}
                onChange={(e) => onMonthlyIncomeChange(formatNumericInput(e.target.value))}
                inputMode="numeric"
                placeholder="예: 400"
                className={[
                  oboonFieldBaseClass,
                  monthlyIncomePreview ? "pr-28" : "",
                  personalizationErrors.monthlyIncomeManwon
                    ? "border-(--oboon-danger-border)"
                    : "",
                ].join(" ")}
              />
              {monthlyIncomePreview ? (
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center ob-typo-caption text-(--oboon-text-muted)">
                  {monthlyIncomePreview}
                </div>
              ) : null}
            </div>
            {personalizationErrors.monthlyIncomeManwon ? (
              <p className="ob-typo-caption text-(--oboon-danger)">
                {personalizationErrors.monthlyIncomeManwon}
              </p>
            ) : null}
          </div>

          {/* 월 고정지출 */}
          <div className="space-y-2">
            <Label>월 고정지출 (만원)</Label>
            <div className="relative">
              <Input
                value={monthlyExpensesManwon}
                disabled={!personalizationEditing}
                onChange={(e) => onMonthlyExpensesChange(formatNumericInput(e.target.value))}
                inputMode="numeric"
                placeholder="예: 100"
                className={[
                  oboonFieldBaseClass,
                  monthlyExpensesPreview ? "pr-28" : "",
                ].join(" ")}
              />
              {monthlyExpensesPreview ? (
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center ob-typo-caption text-(--oboon-text-muted)">
                  {monthlyExpensesPreview}
                </div>
              ) : null}
            </div>
          </div>

          {/* 직업 */}
          <div className="space-y-2">
            <Label>직업</Label>
            <Select
              value={employmentType ?? ""}
              onChange={(v) => onEmploymentTypeChange(v as "employee" | "self_employed" | "freelancer" | "other")}
              options={EMPLOYMENT_TYPE_OPTIONS}
              disabled={!personalizationEditing}
              placeholder="선택"
            />
          </div>

          {/* 보유주택 */}
          <div className="space-y-2">
            <Label>보유주택</Label>
            <Select
              value={houseOwnership ?? ""}
              onChange={(v) => onHouseOwnershipChange(v as "none" | "one" | "two_or_more")}
              options={HOUSE_OWNERSHIP_OPTIONS}
              disabled={!personalizationEditing}
              placeholder="선택"
            />
          </div>

          {/* 신용 상태 */}
          <div className="space-y-2">
            <Label>신용 상태 점수 (0-100)</Label>
            {personalizationEditing ? (
              <button
                type="button"
                onClick={() => setLtvModalOpen(true)}
                className={`w-full text-left ${oboonFieldBaseClass} flex items-center justify-between px-3 py-2 ob-typo-body hover:border-(--oboon-primary) transition-colors`}
              >
                <span className={ltvInternalScore > 0 ? "text-(--oboon-text-body)" : "text-(--oboon-text-muted)"}>
                  {ltvInternalScore > 0 ? `${ltvInternalScore}점` : "탭하여 신용 상태 입력"}
                </span>
                <span className="ob-typo-caption text-(--oboon-primary)">수정</span>
              </button>
            ) : (
              <div className={`${oboonFieldBaseClass} flex items-center px-3 py-2 ob-typo-body text-(--oboon-text-muted) bg-(--oboon-bg-subtle)`}>
                {ltvInternalScore > 0 ? `${ltvInternalScore}점` : "평가 전"}
              </div>
            )}
          </div>

          {/* 분양목적 */}
          <div className="space-y-2 sm:col-span-2">
            <Label>분양목적</Label>
            <Select
              value={purchasePurposeV2 ?? ""}
              onChange={(v) => onPurchasePurposeV2Change(v as "residence" | "investment_rent" | "investment_capital" | "long_term")}
              options={PURCHASE_PURPOSE_V2_OPTIONS}
              disabled={!personalizationEditing}
              placeholder="선택"
            />
          </div>

          {/* 분양시점 */}
          <div className="space-y-2">
            <Label>분양시점</Label>
            <Select
              value={purchaseTiming ?? ""}
              onChange={(v) => onPurchaseTimingChange(v as "within_3months" | "within_6months" | "within_1year" | "over_1year" | "by_property")}
              options={PURCHASE_TIMING_OPTIONS}
              disabled={!personalizationEditing}
              placeholder="선택"
            />
          </div>

          {/* 희망입주 */}
          <div className="space-y-2">
            <Label>희망입주</Label>
            <Select
              value={moveinTiming ?? ""}
              onChange={(v) => onMoveinTimingChange(v as "immediate" | "within_1year" | "within_2years" | "within_3years" | "anytime")}
              options={MOVEIN_TIMING_OPTIONS}
              disabled={!personalizationEditing}
              placeholder="선택"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {!personalizationEditing ? (
            <Button variant="secondary" size="sm" onClick={onEditStart}>
              정보 수정
            </Button>
          ) : (
            <>
              <Button variant="primary" size="sm" loading={personalizationSaving} onClick={onSave}>
                저장
              </Button>
              <Button variant="secondary" size="sm" onClick={onCancel}>
                취소
              </Button>
            </>
          )}
        </div>
      </Card>

      <LtvDsrModal
        open={ltvModalOpen}
        onClose={() => setLtvModalOpen(false)}
        onConfirm={({ ltvInternalScore: score, formValues }) => {
          onLtvInternalScoreChange(score);
          onLtvDsrValuesChange(formValues);
          setLtvModalOpen(false);
        }}
        initialEmploymentType={employmentType ?? "employee"}
        initialHouseOwnership={houseOwnership ?? "none"}
        initialValues={ltvDsrValues}
        initialLtvInternalScore={ltvInternalScore}
      />

      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="ob-typo-h3 text-(--oboon-text-title)">마케팅 수신 동의</div>
            <p className="ob-typo-caption text-(--oboon-text-muted) mt-1">
              이벤트, 프로모션 등 마케팅 정보를 받아보실 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleMarketingConsent}
            disabled={marketingConsentLoading}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-(--oboon-primary) focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
              marketingConsent ? "bg-(--oboon-primary)" : "bg-(--oboon-border-default)"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                marketingConsent ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </Card>
    </div>
  );
}
