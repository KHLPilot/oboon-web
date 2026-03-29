"use client";

import type { ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";
import { grade5DetailLabel } from "@/features/condition-validation/lib/grade5Labels";
import { getGrade5ToneMeta } from "@/features/condition-validation/lib/grade5Theme";
import type {
  RecommendationEvalResult,
  RecommendationProperty,
} from "@/features/recommendations/hooks/useRecommendations";
import { formatManwonWithEok, formatPercent } from "@/lib/format/currency";
import { cn } from "@/lib/utils/cn";

type GaugeOverlayProps = {
  property: RecommendationProperty | null;
  evalResult: RecommendationEvalResult | null;
};

type RecommendationPreviewContentProps = GaugeOverlayProps & {
  compact?: boolean;
  footer?: ReactNode;
  showFinalBadge?: boolean;
  showSummary?: boolean;
};

type GradeMeta = {
  label: string;
  badgeClassName: string;
  barColor: string;
  textColor: string;
};

function badgeLabel(grade: RecommendationEvalResult["finalGrade"]) {
  return grade5DetailLabel(grade);
}

function gradeMeta(grade: RecommendationEvalResult["finalGrade"]): GradeMeta {
  const tone = getGrade5ToneMeta(grade);
  return {
    label: grade5DetailLabel(grade),
    badgeClassName: tone.badgeClassName,
    barColor: tone.color,
    textColor: tone.textColor,
  };
}

function GaugeRow(props: {
  label: string;
  value: number | null;
  max: number;
  grade: RecommendationEvalResult["finalGrade"];
  note?: string | null;
  compact?: boolean;
}) {
  const { label, value, max, grade, note, compact = false } = props;
  const meta = gradeMeta(grade);
  const safeValue = value === null ? 0 : Math.max(0, Math.min(max, value));
  const percent = max === 0 ? 0 : (safeValue / max) * 100;

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div
            className={cn(
              compact ? "ob-typo-caption font-medium" : "ob-typo-body2",
              "text-(--oboon-text-title)",
            )}
          >
            {label}
          </div>
          {note ? (
            <div
              className={cn(
                "mt-0.5 ob-typo-caption text-(--oboon-text-muted)",
                compact && "line-clamp-1",
              )}
            >
              {note}
            </div>
          ) : null}
        </div>

        <span
          className={cn(compact ? "text-[11px] leading-4" : "ob-typo-caption")}
          style={{ color: value === null ? undefined : meta.textColor }}
        >
          {value === null ? "비공개" : `${Math.round(value)} / ${max} · ${meta.label}`}
        </span>
      </div>

      <div
        className={cn(
          compact ? "h-2" : "h-2.5",
          "overflow-hidden rounded-full bg-(--oboon-bg-subtle)",
        )}
      >
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${percent}%`, backgroundColor: meta.barColor }}
        />
      </div>
    </div>
  );
}

export function RecommendationPreviewContent(
  props: RecommendationPreviewContentProps,
) {
  const {
    property,
    evalResult,
    compact = false,
    footer,
    showFinalBadge = true,
  } = props;
  let burdenMetricLabel: string | null = null;
  if (evalResult) {
    burdenMetricLabel =
      evalResult.metrics.monthlyBurdenPercent === null
        ? "계산 불가"
        : formatPercent(evalResult.metrics.monthlyBurdenPercent);
  }
  const riskReasonMessages = evalResult?.reasonMessages.filter((reason) =>
    reason.includes("리스크"),
  ) ?? [];
  const riskNote =
    riskReasonMessages.length > 0
      ? compact
        ? riskReasonMessages[0]
        : riskReasonMessages.join(" · ")
      : "현재 걸린 리스크 없음";

  if (!property || !evalResult) {
    return (
      <div
        className={cn(
          "flex h-full flex-col justify-center",
          compact ? "min-h-[10rem] space-y-1.5" : "min-h-[13rem] space-y-2",
        )}
      >
        <div
          className={cn(
            compact ? "ob-typo-body2" : "ob-typo-h3",
            "text-(--oboon-text-title)",
          )}
        >
          실시간 매칭률 게이지
        </div>
        <p
          className={cn(
            compact ? "ob-typo-caption" : "ob-typo-body",
            "text-(--oboon-text-muted)",
          )}
        >
          현장을 선택하면 매칭률을 확인할 수 있어요.
        </p>
      </div>
    );
  }

  if (evalResult.isMasked) {
    const finalMeta = gradeMeta(evalResult.finalGrade);
    const finalBadgeLabel = evalResult.gradeLabel ?? badgeLabel(evalResult.finalGrade);

    return (
      <div className={compact ? "space-y-2.5" : "space-y-3"}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div
              className={cn(
                compact ? "ob-typo-body2" : "ob-typo-h3",
                "truncate text-(--oboon-text-title)",
              )}
            >
              {property.name}
            </div>
            <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
              {property.regionLabel} · {property.statusLabel}
            </p>
          </div>

          {showFinalBadge ? (
            <Badge className={finalMeta.badgeClassName}>
              {finalBadgeLabel}
            </Badge>
          ) : null}
        </div>

        <div
          className={cn(
            "rounded-xl border border-(--oboon-warning-border) bg-(--oboon-warning-bg-subtle)",
            compact ? "px-3 py-2.5" : "px-3 py-3",
          )}
        >
          <p
            className={cn(
              compact ? "ob-typo-caption" : "ob-typo-body",
              "text-(--oboon-warning-text)",
            )}
          >
            로그인하면 현금 여력, 부담률, 리스크와 매칭률을 자세히 확인할 수 있어요.
          </p>
        </div>

        {footer}
      </div>
    );
  }

  const finalMeta = gradeMeta(evalResult.finalGrade);
  const finalBadgeLabel = evalResult.gradeLabel ?? badgeLabel(evalResult.finalGrade);

  return (
    <div className={compact ? "space-y-2.5" : "space-y-4"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className={cn(
              compact ? "ob-typo-body font-semibold" : "ob-typo-h3",
              "truncate text-(--oboon-text-title)",
            )}
          >
            {property.name}
          </div>
          <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
            {property.regionLabel} · {property.statusLabel}
          </p>
        </div>

        <div className="text-right">
          {showFinalBadge ? (
            <Badge className={finalMeta.badgeClassName}>
              {finalBadgeLabel}
            </Badge>
          ) : null}
          {evalResult.totalScore !== null ? (
            <div
              className={cn(
                compact
                  ? showFinalBadge
                    ? "mt-1 text-[1.35rem] leading-none font-semibold"
                    : "text-[1.35rem] leading-none font-semibold"
                  : showFinalBadge
                    ? "mt-2 ob-typo-h2"
                    : "ob-typo-h2",
                "text-(--oboon-text-title)",
              )}
            >
              {Math.round(evalResult.totalScore)}%
            </div>
          ) : null}
          {evalResult.totalScore !== null ? (
            <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
              매칭률
            </div>
          ) : null}
        </div>
      </div>

      <div className={compact ? "space-y-2" : "space-y-3"}>
        <GaugeRow
          label="현금 여력"
          value={evalResult.categories.cash.score}
          max={30}
          grade={evalResult.categories.cash.grade}
          note={
            evalResult.metrics.recommendedCash !== null
              ? `권장 현금 ${formatManwonWithEok(evalResult.metrics.recommendedCash)}`
              : null
          }
          compact={compact}
        />
        <GaugeRow
          label="월 부담률"
          value={evalResult.categories.income.score}
          max={25}
          grade={evalResult.categories.income.grade}
          note={
            evalResult.metrics.monthlyBurdenPercent !== null
              ? `예상 부담률 ${formatPercent(evalResult.metrics.monthlyBurdenPercent)}`
              : "예상 부담률 계산 불가"
          }
          compact={compact}
        />
        <GaugeRow
          label="리스크"
          value={evalResult.categories.ltvDsr.score}
          max={20}
          grade={evalResult.categories.ltvDsr.grade}
          compact={compact}
          note={riskNote}
        />
      </div>

      {evalResult.showDetailedMetrics ? (
        <div className={cn("grid grid-cols-2", compact ? "gap-1.5" : "gap-2")}>
          <div
            className={cn(
              "rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle)",
              compact ? "px-2.5 py-2" : "px-3 py-2.5",
            )}
          >
            <div className="ob-typo-caption text-(--oboon-text-muted)">최소 현금</div>
            <div
              className={cn(
                compact ? "mt-0.5 ob-typo-caption font-medium" : "mt-1 ob-typo-body2",
                "text-(--oboon-text-title)",
              )}
            >
              {evalResult.metrics.minCash !== null
                ? formatManwonWithEok(evalResult.metrics.minCash)
                : "비공개"}
            </div>
          </div>
          <div
            className={cn(
              "rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle)",
              compact ? "px-2.5 py-2" : "px-3 py-2.5",
            )}
          >
            <div className="ob-typo-caption text-(--oboon-text-muted)">월 부담률</div>
            <div
              className={cn(
                compact ? "mt-0.5 ob-typo-caption font-medium" : "mt-1 ob-typo-body2",
                "text-(--oboon-text-title)",
              )}
            >
              {burdenMetricLabel}
            </div>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle)",
            compact ? "px-2.5 py-2" : "px-3 py-3",
          )}
        >
          <p
            className={cn(
              compact ? "ob-typo-caption" : "ob-typo-body",
              "text-(--oboon-text-muted)",
            )}
          >
            분양가와 상세 지표는 상담 시 안내돼요.
          </p>
        </div>
      )}

      {footer}
    </div>
  );
}

export default function GaugeOverlay(props: GaugeOverlayProps) {
  return (
    <div className="min-h-[15rem] rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
      <RecommendationPreviewContent {...props} />
    </div>
  );
}
