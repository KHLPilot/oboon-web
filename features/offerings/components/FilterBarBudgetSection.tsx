"use client";

import Button from "@/components/ui/Button";
import { formatEokPreview, parseEok } from "@/lib/format/currency";
import { cn } from "@/lib/utils/cn";

const BUDGET_SLIDER_POSITION_MIN = 0;
const BUDGET_SLIDER_POSITION_MAX = 37;

function sliderPositionToBudget(position: number) {
  if (position <= 10) return Math.floor(position) / 10;
  if (position <= 19) return position - 9;
  return 10 + (position - 19) * 5;
}

function budgetToSliderPosition(value: number) {
  if (value <= 1) return Math.round(value * 10);
  if (value <= 10) return Math.round(value + 9);
  return Math.round((value - 10) / 5) + 19;
}

function clampBudgetPosition(value: number) {
  return Math.min(
    BUDGET_SLIDER_POSITION_MAX,
    Math.max(BUDGET_SLIDER_POSITION_MIN, value),
  );
}

function clampBudgetValue(value: number) {
  if (value <= 1) {
    return Math.min(1, Math.max(0, Math.round(value * 10) / 10));
  }
  if (value <= 10) return Math.max(1, Math.round(value));
  return Math.min(100, Math.max(10, Math.round(value / 5) * 5));
}

function formatBudgetSummary(min: number | null, max: number | null) {
  if (min == null && max == null) return "전체";
  if (min != null && max == null) return `${formatEokPreview(min)} 이상`;
  if (min == null && max != null) return `${formatEokPreview(max)} 이하`;
  return formatEokPreview(min as number, max as number);
}

export default function FilterBarBudgetSection({
  budgetMin,
  budgetMax,
  budgetMaxUnlimited,
  onBudgetMinChange,
  onBudgetMaxChange,
  onBudgetMaxUnlimitedChange,
  onApply,
  onReset,
}: {
  budgetMin: string;
  budgetMax: string;
  budgetMaxUnlimited: boolean;
  onBudgetMinChange: (next: string) => void;
  onBudgetMaxChange: (next: string) => void;
  onBudgetMaxUnlimitedChange: (next: boolean) => void;
  onApply: () => void;
  onReset: () => void;
}) {
  const minVal = parseEok(budgetMin);
  const maxVal = parseEok(budgetMax);
  const effectiveMaxVal = budgetMaxUnlimited ? null : maxVal;
  const sliderMinPosition = clampBudgetPosition(
    budgetToSliderPosition(minVal ?? 0),
  );
  const sliderMaxPosition = clampBudgetPosition(
    budgetToSliderPosition(
      budgetMaxUnlimited ? 100 : maxVal ?? 100,
    ),
  );
  const sliderProgressStart =
    (sliderMinPosition / BUDGET_SLIDER_POSITION_MAX) * 100;
  const sliderProgressEnd =
    (sliderMaxPosition / BUDGET_SLIDER_POSITION_MAX) * 100;
  const budgetError =
    minVal != null && effectiveMaxVal != null && minVal > effectiveMaxVal
      ? "최소 예산이 최대 예산보다 커요"
      : null;
  const applyDisabled = Boolean(budgetError);

  function applyBudget() {
    if (applyDisabled) return;
    onApply();
  }

  function handleSliderMinChange(nextRaw: string) {
    const nextPosition = clampBudgetPosition(Number(nextRaw));
    const boundedPosition = Math.min(nextPosition, sliderMaxPosition);
    const bounded = clampBudgetValue(sliderPositionToBudget(boundedPosition));
    onBudgetMinChange(String(bounded));
    if (budgetMaxUnlimited) return;
    if (boundedPosition > sliderMaxPosition) {
      onBudgetMaxChange(String(bounded));
    }
  }

  function handleSliderMaxChange(nextRaw: string) {
    const nextPosition = clampBudgetPosition(Number(nextRaw));
    const boundedPosition = Math.max(nextPosition, sliderMinPosition);
    const bounded = clampBudgetValue(sliderPositionToBudget(boundedPosition));
    onBudgetMaxUnlimitedChange(false);
    onBudgetMaxChange(String(bounded));
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="ob-typo-body font-semibold text-(--oboon-text-title)">예산</div>
      <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="ob-typo-body font-semibold text-(--oboon-text-title)">
            {formatBudgetSummary(minVal, effectiveMaxVal)}
          </div>
          <Button
            type="button"
            size="sm"
            shape="pill"
            variant="primary"
            disabled={applyDisabled}
            className={cn(
              "h-7 px-3 ob-typo-caption shrink-0",
              applyDisabled ? "opacity-60 cursor-not-allowed" : "",
            )}
            onClick={applyBudget}
          >
            적용
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex-1 rounded-xl bg-(--oboon-bg-subtle) px-2.5 py-1.5">
            <div className="ob-typo-caption text-(--oboon-text-muted)">최소</div>
            <div className="ob-typo-caption font-semibold text-(--oboon-primary)">
              {minVal != null && minVal > 0 ? formatEokPreview(minVal) : "0"}
            </div>
          </div>
          <span className="ob-typo-caption text-(--oboon-text-muted)">~</span>
          <div className="flex-1 rounded-xl bg-(--oboon-bg-subtle) px-2.5 py-1.5 text-right">
            <div className="ob-typo-caption text-(--oboon-text-muted)">최대</div>
            <div className="ob-typo-caption font-semibold text-(--oboon-primary)">
              {budgetMaxUnlimited || maxVal == null ? "제한 없음" : formatEokPreview(maxVal)}
            </div>
          </div>
        </div>

        <div className="mb-1 mt-1 px-1">
          <div className="relative h-10">
            <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-(--oboon-bg-subtle)" />
            <div
              className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-(--oboon-primary)"
              style={{
                left: `${sliderProgressStart}%`,
                width: `${Math.max(sliderProgressEnd - sliderProgressStart, 0)}%`,
              }}
            />
            <input
              type="range"
              min={BUDGET_SLIDER_POSITION_MIN}
              max={BUDGET_SLIDER_POSITION_MAX}
              step={1}
              value={sliderMinPosition}
              onChange={(e) => handleSliderMinChange(e.target.value)}
              className="pointer-events-none absolute inset-0 h-10 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-(--oboon-bg-surface) [&::-webkit-slider-thumb]:bg-(--oboon-primary) [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-(--oboon-bg-surface) [&::-moz-range-thumb]:bg-(--oboon-primary)"
              aria-label="최소 예산 슬라이더"
            />
            <input
              type="range"
              min={BUDGET_SLIDER_POSITION_MIN}
              max={BUDGET_SLIDER_POSITION_MAX}
              step={1}
              value={sliderMaxPosition}
              onChange={(e) => handleSliderMaxChange(e.target.value)}
              className="pointer-events-none absolute inset-0 h-10 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-(--oboon-bg-surface) [&::-webkit-slider-thumb]:bg-(--oboon-primary) [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-(--oboon-bg-surface) [&::-moz-range-thumb]:bg-(--oboon-primary)"
              aria-label="최대 예산 슬라이더"
            />
          </div>
          <div className="flex items-center justify-between ob-typo-caption text-(--oboon-text-muted)">
            <span>0</span>
            <span>1억</span>
            <span>10억</span>
            <span>100억+</span>
          </div>
        </div>
      </div>

      {budgetError ? (
        <div className="mt-2 ob-typo-caption text-(--oboon-warning-text)">
          {budgetError}
        </div>
      ) : null}

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 ob-typo-button text-(--oboon-text-muted)"
          onClick={onReset}
        >
          초기화
        </Button>
      </div>
    </div>
  );
}
