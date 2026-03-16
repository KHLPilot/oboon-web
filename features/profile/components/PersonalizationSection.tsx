"use client";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Select from "@/components/ui/Select";
import { oboonFieldBaseClass } from "@/lib/ui/formFieldStyles";

const CREDIT_OPTIONS = [
  { label: "양호", value: "good" },
  { label: "보통", value: "normal" },
  { label: "불안", value: "unstable" },
] as const;

const PURPOSE_OPTIONS = [
  { label: "실거주", value: "residence" },
  { label: "투자", value: "investment" },
  { label: "둘다", value: "both" },
] as const;

type ValidationCreditGrade = "good" | "normal" | "unstable";
type ValidationPurchasePurpose = "residence" | "investment" | "both";

type PersonalizationErrors = {
  availableCashManwon?: string;
  monthlyIncomeManwon?: string;
  ownedHouseCount?: string;
};

type PersonalizationSectionProps = {
  availableCashManwon: string;
  monthlyIncomeManwon: string;
  ownedHouseCount: string;
  personalizationEditing: boolean;
  personalizationSaving: boolean;
  personalCreditGrade: ValidationCreditGrade;
  personalPurchasePurpose: ValidationPurchasePurpose;
  personalizationErrors: PersonalizationErrors;
  marketingConsent: boolean;
  marketingConsentLoading: boolean;
  onAvailableCashChange: (value: string) => void;
  onMonthlyIncomeChange: (value: string) => void;
  onOwnedHouseCountChange: (value: string) => void;
  onCreditGradeChange: (value: ValidationCreditGrade) => void;
  onPurchasePurposeChange: (value: ValidationPurchasePurpose) => void;
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
  ownedHouseCount,
  personalizationEditing,
  personalizationSaving,
  personalCreditGrade,
  personalPurchasePurpose,
  personalizationErrors,
  marketingConsent,
  marketingConsentLoading,
  onAvailableCashChange,
  onMonthlyIncomeChange,
  onOwnedHouseCountChange,
  onCreditGradeChange,
  onPurchasePurposeChange,
  onEditStart,
  onSave,
  onCancel,
  onToggleMarketingConsent,
}: PersonalizationSectionProps) {
  const availableCashPreview = formatManwonPreview(availableCashManwon);
  const monthlyIncomePreview = formatManwonPreview(monthlyIncomeManwon);

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

          <div className="space-y-2">
            <Label>보유 주택 수 *</Label>
            <Input
              value={ownedHouseCount}
              disabled={!personalizationEditing}
              onChange={(e) => onOwnedHouseCountChange(formatNumericInput(e.target.value))}
              inputMode="numeric"
              placeholder="0"
              className={[
                oboonFieldBaseClass,
                personalizationErrors.ownedHouseCount
                  ? "border-(--oboon-danger-border)"
                  : "",
              ].join(" ")}
            />
            {personalizationErrors.ownedHouseCount ? (
              <p className="ob-typo-caption text-(--oboon-danger)">
                {personalizationErrors.ownedHouseCount}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>신용</Label>
            <Select
              value={personalCreditGrade}
              onChange={onCreditGradeChange}
              options={CREDIT_OPTIONS}
              disabled={!personalizationEditing}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>구매 목적</Label>
            <Select
              value={personalPurchasePurpose}
              onChange={onPurchasePurposeChange}
              options={PURPOSE_OPTIONS}
              disabled={!personalizationEditing}
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
