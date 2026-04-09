// /features/offerings/OfferingCard.tsx

"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, FocusEventHandler, MouseEventHandler, ReactNode } from "react";

import type { Offering } from "@/types/index";
import { ROUTES } from "@/types/index";

import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type {
  ConditionCategoryGrades,
} from "@/features/condition-validation/domain/types";
import { getGrade5ToneMeta } from "@/features/condition-validation/lib/grade5Theme";
import { UXCopy } from "@/shared/uxCopy";
import { formatPriceRange } from "@/shared/price";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils/cn";

import OfferingBadge from "./OfferingBadges";
import ScrapButton from "./ScrapButton";
import { Lock, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { grade5DetailLabel } from "@/features/condition-validation/lib/grade5Labels";
import { formatPercent } from "@/lib/format/currency";
import type {
  RecommendationEvalResult,
  RecommendationCategory,
} from "@/features/recommendations/hooks/useRecommendations";

function isLikelyImageUrl(url: string | null | undefined) {
  if (!url) return false;
  if (url.startsWith("data:image/")) return true;
  return /\.(jpg|jpeg|png|webp|gif|avif|svg)(\?.*)?$/i.test(url);
}

// ── evalResult 레이아웃용 유틸 ────────────────────────────────────────────

type GradeToneMeta = {
  badgeLabel: string;
  detailLabel: string;
  badgeClassName: string;
  barClassName: string;
  dotClassName: string;
  textClassName: string;
};

function gradeToneMeta(grade: RecommendationEvalResult["finalGrade"]): GradeToneMeta {
  switch (grade) {
    case "GREEN":
      return {
        badgeLabel: grade5DetailLabel(grade),
        detailLabel: grade5DetailLabel(grade),
        badgeClassName:
          "border-(--oboon-grade-green-border) bg-(--oboon-grade-green-bg) text-(--oboon-grade-green-text)",
        barClassName: "bg-(--oboon-grade-green)",
        dotClassName: "bg-(--oboon-grade-green)",
        textClassName: "text-(--oboon-grade-green-text)",
      };
    case "LIME":
      return {
        badgeLabel: grade5DetailLabel(grade),
        detailLabel: grade5DetailLabel(grade),
        badgeClassName:
          "border-(--oboon-grade-lime-border) bg-(--oboon-grade-lime-bg) text-(--oboon-grade-lime-text)",
        barClassName: "bg-(--oboon-grade-lime)",
        dotClassName: "bg-(--oboon-grade-lime)",
        textClassName: "text-(--oboon-grade-lime-text)",
      };
    case "YELLOW":
      return {
        badgeLabel: grade5DetailLabel(grade),
        detailLabel: grade5DetailLabel(grade),
        badgeClassName:
          "border-(--oboon-grade-yellow-border) bg-(--oboon-grade-yellow-bg) text-(--oboon-grade-yellow-text)",
        barClassName: "bg-(--oboon-grade-yellow)",
        dotClassName: "bg-(--oboon-grade-yellow)",
        textClassName: "text-(--oboon-grade-yellow-text)",
      };
    case "ORANGE":
      return {
        badgeLabel: grade5DetailLabel(grade),
        detailLabel: grade5DetailLabel(grade),
        badgeClassName:
          "border-(--oboon-grade-orange-border) bg-(--oboon-grade-orange-bg) text-(--oboon-grade-orange-text)",
        barClassName: "bg-(--oboon-grade-orange)",
        dotClassName: "bg-(--oboon-grade-orange)",
        textClassName: "text-(--oboon-grade-orange-text)",
      };
    default:
      return {
        badgeLabel: grade5DetailLabel(grade),
        detailLabel: grade5DetailLabel(grade),
        badgeClassName:
          "border-(--oboon-grade-red-border) bg-(--oboon-grade-red-bg) text-(--oboon-grade-red-text)",
        barClassName: "bg-(--oboon-grade-red)",
        dotClassName: "bg-(--oboon-grade-red)",
        textClassName: "text-(--oboon-grade-red-text)",
      };
  }
}

function MetricDot(props: {
  label: string;
  category: RecommendationCategory;
  valueLabel?: string | null;
}) {
  const { label, category, valueLabel } = props;
  const meta = gradeToneMeta(category.grade);

  return (
    <div className="flex flex-col gap-0.5 sm:inline-flex sm:flex-row sm:items-center sm:gap-1.5">
      <div className="flex items-center gap-1">
        <span className={cn("h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0 rounded-full", meta.dotClassName)} />
        <span className="ob-typo-caption text-(--oboon-text-muted)">{label}</span>
      </div>
      <span className={cn("ob-typo-caption", meta.textClassName)}>
        {valueLabel ?? meta.detailLabel}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function gradeBadgeStyle(grade: ConditionCategoryGrades["cash"]["grade"]): CSSProperties {
  const tone = getGrade5ToneMeta(grade);

  return {
    borderColor: tone.borderColor,
    backgroundColor: tone.bgColor,
    color: tone.textColor,
  };
}

// 왼쪽 바 색상 — 100점 기준 5단계 (CSS 토큰 사용)
function matchRateBarColor(totalScore?: number): string {
  const s = totalScore ?? 0;
  if (s >= 80) return "var(--oboon-grade-green)";
  if (s >= 60) return "var(--oboon-grade-lime)";
  if (s >= 40) return "var(--oboon-grade-yellow)";
  if (s >= 20) return "var(--oboon-grade-orange)";
  return "var(--oboon-grade-red)";
}

export default function OfferingCard({
  offering,
  conditionCategories,
  isSelected = false,
  onMouseEnter,
  onFocusCapture,
  interactionMode = "link",
  onCardClick,
  cardAriaLabel,
  disableHover = false,
  compactLayout = false,
  mobileRecommendationLayout = false,
  isConsultable = false,
  initialScrapped = false,
  isLoggedIn = false,
  priority = false,
  onHistoryDelete,
  evalResult,
  flushImageToEdge = false,
  hideImage = false,
  navigateOnClick = true,
  footerSlot,
  recommendationTier = "primary",
}: {
  offering: Offering;
  conditionCategories?: ConditionCategoryGrades | null;
  isSelected?: boolean;
  onMouseEnter?: MouseEventHandler<HTMLElement>;
  onFocusCapture?: FocusEventHandler<HTMLElement>;
  interactionMode?: "link" | "button";
  onCardClick?: () => void;
  cardAriaLabel?: string;
  disableHover?: boolean;
  compactLayout?: boolean;
  mobileRecommendationLayout?: boolean;
  isConsultable?: boolean;
  initialScrapped?: boolean;
  isLoggedIn?: boolean;
  priority?: boolean;
  /** 히스토리 탭 전용: 제공 시 모바일에서 상태 뱃지 자리에 삭제 버튼 렌더링 */
  onHistoryDelete?: () => void;
  evalResult?: RecommendationEvalResult;
  flushImageToEdge?: boolean;
  hideImage?: boolean;
  navigateOnClick?: boolean;
  footerSlot?: ReactNode;
  recommendationTier?: "primary" | "alternative";
}) {
  const priceRange = formatPriceRange(
    offering.priceMin억,
    offering.priceMax억,
    {
      unknownLabel: offering.isPricePrivate
        ? UXCopy.pricePrivate
        : UXCopy.priceRangeShort,
    },
  );

  // next/image src 타입 안정화
  const normalizedImageUrl =
    typeof offering.imageUrl === "string" ? offering.imageUrl : "";
  const hasValidImage = isLikelyImageUrl(normalizedImageUrl);

  // 지역 배지 값: 프로젝트 내 Offering 형태가 섞여있을 수 있어 안전하게 폴백 처리
  const regionBadge =
    offering.regionLabel ?? offering.region ?? UXCopy.regionShort;
  const isConditionMatchedCard = Boolean(conditionCategories);
  const mobileMetaLabel = [regionBadge, offering.status].filter(Boolean).join(" · ");
  const statusBadgeValue = offering.statusValue ?? undefined;
  const subtlePrimaryBadgeClassName = "border-(--oboon-primary)/40";

  // ── evalResult 레이아웃용 파생값 ────────────────────────────────────────
  const router = useRouter();
  const evalFinalMeta = evalResult ? gradeToneMeta(evalResult.finalGrade) : null;
  const evalFinalBadgeLabel = evalResult
    ? (evalResult.gradeLabel ?? evalFinalMeta!.badgeLabel)
    : null;
  const evalTotalScore = evalResult?.totalScore ?? 0;
  const evalMonthlyBurdenLabel =
    evalResult?.metrics.monthlyBurdenPercent !== null
      ? formatPercent(evalResult?.metrics.monthlyBurdenPercent ?? 0)
      : "계산 불가";
  const shouldRenderImage = !hideImage || flushImageToEdge;
  // ─────────────────────────────────────────────────────────────────────────

  // ── evalResult 레이아웃: Card 래퍼 없이 article 직접 렌더 ─────────────────
  if (evalResult && evalFinalMeta) {
    const handleCardPress = () => {
      onCardClick?.();
      if (!navigateOnClick) return;
      trackEvent("property_view", { property_id: offering.id });
      router.push(ROUTES.offerings.detail(offering.id));
    };

    return (
      <article
        role={navigateOnClick ? "link" : "button"}
        tabIndex={0}
        onClick={handleCardPress}
        onMouseEnter={onMouseEnter}
        onFocus={() => {}}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleCardPress();
          }
        }}
        className={cn(
          "group cursor-pointer overflow-hidden rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-(--oboon-shadow-card)",
          recommendationTier === "alternative" &&
            "border-(--oboon-grade-yellow-border) bg-linear-to-br from-(--oboon-grade-yellow-bg)/45 via-(--oboon-bg-surface) to-(--oboon-bg-surface)",
          flushImageToEdge ? "flex items-stretch p-0" : "p-2.5 xs:p-3 lg:p-4",
          isSelected && "lg:shadow-(--oboon-shadow-card)",
          isSelected &&
            recommendationTier === "alternative" &&
            "ring-1 ring-(--oboon-grade-yellow-border)",
        )}
      >
        {flushImageToEdge ? (
          /* ── 가로형 레이아웃 ── */
          <>
            {shouldRenderImage ? (
              <div className="relative w-[132px] shrink-0 self-stretch overflow-hidden rounded-l-2xl bg-(--oboon-bg-subtle) lg:w-[180px]">
                {hasValidImage ? (
                  <Image
                    src={normalizedImageUrl}
                    alt={offering.title}
                    fill
                    sizes="(max-width: 1023px) 132px, 180px"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    priority={priority}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-linear-to-br from-(--oboon-bg-subtle) to-(--oboon-bg-surface)">
                    <span className="ob-typo-caption text-(--oboon-text-muted)">{UXCopy.imagePlaceholder}</span>
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex min-w-0 flex-1 flex-col gap-2 xs:gap-3 p-2.5 xs:p-3 lg:p-4">
              <div className="space-y-2 xs:space-y-3">
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="line-clamp-1 leading-tight sm:line-clamp-2 sm:leading-normal ob-typo-subtitle text-(--oboon-text-title)">
                      {offering.title}
                    </h2>
                    <Badge
                      className={cn("shrink-0 border ob-typo-caption", evalFinalMeta.badgeClassName, "max-xs:!px-2 max-xs:!py-0.5 max-xs:!text-[11px]")}
                    >
                      <span className="sm:hidden">{evalFinalMeta.detailLabel}</span>
                      <span className="hidden sm:inline">{evalFinalBadgeLabel}</span>
                    </Badge>
                  </div>
                  <p className="mt-px sm:mt-1 line-clamp-2 ob-typo-caption text-(--oboon-text-muted)">
                    {regionBadge}
                    {offering.propertyType ? ` · ${offering.propertyType}` : ""}
                    {offering.status ? ` · ${offering.status}` : ""}
                  </p>
                  <div className="mt-1.5 truncate ob-typo-caption xs:ob-typo-body2 text-(--oboon-text-title)">
                    {priceRange}
                  </div>
                </div>

                <div className="h-px bg-(--oboon-border-default)" />

                {evalResult.isMasked ? (
                  <div className="rounded-xl border border-(--oboon-warning-border) bg-(--oboon-warning-bg-subtle) px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-(--oboon-warning-text)" />
                      <p className="ob-typo-caption text-(--oboon-warning-text)">
                        로그인하면 상세 매칭 결과를 확인할 수 있어요.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 xs:space-y-3">
                    <div className="grid grid-cols-3 gap-2 xs:gap-3">
                      <MetricDot label="현금" category={evalResult.categories.cash} />
                      <MetricDot
                        label="부담률"
                        category={evalResult.categories.income}
                        valueLabel={evalMonthlyBurdenLabel}
                      />
                      <MetricDot label="신용" category={evalResult.categories.ltvDsr} />
                    </div>

                    {evalResult.totalScore !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="shrink-0 ob-typo-body2 text-(--oboon-text-title)">매칭률</div>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-(--oboon-bg-subtle)">
                          <div
                            className={cn("h-full rounded-full transition-[width]", evalFinalMeta.barClassName)}
                            style={{ width: `${Math.max(0, Math.min(100, evalTotalScore))}%` }}
                          />
                        </div>
                        <div className="shrink-0 ob-typo-body2 text-(--oboon-text-title)">
                          {Math.round(evalTotalScore)}%
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* ── 세로형 (compact) 레이아웃 ── */
          <div className="space-y-2 xs:space-y-3">
            <div
              className={cn(
                "grid items-start gap-2 xs:gap-3",
                shouldRenderImage ? "grid-cols-[auto_minmax(0,1fr)]" : "grid-cols-1",
              )}
            >
              {shouldRenderImage ? (
                <div className="relative aspect-square w-[56px] xs:w-[72px] shrink-0 overflow-hidden rounded-xl bg-(--oboon-bg-subtle)">
                  {hasValidImage ? (
                    <Image
                      src={normalizedImageUrl}
                      alt={offering.title}
                      fill
                      sizes="(max-width: 479px) 56px, 72px"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      priority={priority}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-linear-to-br from-(--oboon-bg-subtle) to-(--oboon-bg-surface)">
                      <span className="ob-typo-caption text-(--oboon-text-muted)">{UXCopy.imagePlaceholder}</span>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="line-clamp-1 leading-tight ob-typo-subtitle text-(--oboon-text-title)">
                    {offering.title}
                  </h2>
                  <Badge
                    className={cn("shrink-0 self-start border ob-typo-caption", evalFinalMeta.badgeClassName, "max-xs:!px-2 max-xs:!py-0.5 max-xs:!text-[11px]")}
                  >
                    <span className="sm:hidden">{evalFinalMeta.detailLabel}</span>
                    <span className="hidden sm:inline">{evalFinalBadgeLabel}</span>
                  </Badge>
                </div>
                <p className="mt-px line-clamp-2 ob-typo-caption text-(--oboon-text-muted)">
                  {regionBadge}
                  {offering.propertyType ? ` · ${offering.propertyType}` : ""}
                  {offering.status ? ` · ${offering.status}` : ""}
                </p>
                <div className="mt-1.5 truncate ob-typo-caption xs:ob-typo-body2 text-(--oboon-text-title)">
                  {priceRange}
                </div>
              </div>
            </div>

            <div className="h-px bg-(--oboon-border-default)" />

            {evalResult.isMasked ? (
              <div className="rounded-xl border border-(--oboon-warning-border) bg-(--oboon-warning-bg-subtle) px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-(--oboon-warning-text)" />
                  <p className="ob-typo-caption text-(--oboon-warning-text)">
                    로그인하면 상세 매칭 결과를 확인할 수 있어요.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 xs:space-y-3">
                <div className="grid grid-cols-3 gap-2 xs:gap-3">
                  <MetricDot label="현금" category={evalResult.categories.cash} />
                  <MetricDot
                    label="부담률"
                    category={evalResult.categories.income}
                    valueLabel={evalMonthlyBurdenLabel}
                  />
                  <MetricDot label="신용" category={evalResult.categories.ltvDsr} />
                </div>

                {evalResult.totalScore !== null ? (
                  <div className="flex items-center gap-2">
                    <div className="shrink-0 ob-typo-body2 text-(--oboon-text-title)">매칭률</div>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-(--oboon-bg-subtle)">
                      <div
                        className={cn("h-full rounded-full transition-[width]", evalFinalMeta.barClassName)}
                        style={{ width: `${Math.max(0, Math.min(100, evalTotalScore))}%` }}
                      />
                    </div>
                    <div className="shrink-0 ob-typo-body2 text-(--oboon-text-title)">
                      {Math.round(evalTotalScore)}%
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
        {footerSlot ? (
          <div className="border-t border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-3 sm:px-4">
            {footerSlot}
          </div>
        ) : null}
      </article>
    );
  }
  // ─────────────────────────────────────────────────────────────────────────

  const cardContent = (
    <Card
      className={cn(
        "h-full overflow-hidden p-0",
        !disableHover &&
          "transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md",
        isConditionMatchedCard &&
          "border-(--oboon-border-strong) bg-(--oboon-bg-surface)",
        isSelected && "border-(--oboon-primary) ring-1 ring-(--oboon-primary)",
      )}
    >
      <div className={isConditionMatchedCard ? "flex h-full flex-col" : ""}>
        <div
          className={cn(
            "relative w-full bg-(--oboon-bg-subtle) aspect-video",
            mobileRecommendationLayout &&
              !isConditionMatchedCard &&
              "hidden sm:block",
          )}
        >
          {hasValidImage ? (
            <Image
              src={normalizedImageUrl}
              alt={offering.title || "offering"}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className={cn(
                "object-cover",
                !disableHover &&
                  "transition-transform duration-300 group-hover:scale-[1.03]",
              )}
              priority={priority}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute inset-0 bg-linear-to-br from-(--oboon-bg-subtle) to-(--oboon-border-default) opacity-40" />
              <span className="relative ob-typo-caption text-(--oboon-text-muted)">
                {UXCopy.imagePlaceholder}
              </span>
            </div>
          )}

          {isConditionMatchedCard ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/45 via-black/15 to-transparent" />
          ) : null}

          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
            <OfferingBadge
              type="region"
              value={regionBadge}
            />
            <OfferingBadge
              type="status"
              value={offering.statusValue ?? undefined}
            />
            {!isConditionMatchedCard && offering.hasAppraiserComment ? (
              <Badge variant="primary">
                감정 평가
              </Badge>
            ) : null}
          </div>

          <div className="absolute right-3 top-3">
            <ScrapButton
              propertyId={Number(offering.id)}
              initialScrapped={initialScrapped}
              isLoggedIn={isLoggedIn}
              variant="icon"
            />
          </div>
        </div>

        {isConditionMatchedCard && conditionCategories ? (
          <div
            className={cn(
              "flex flex-1 px-3",
              compactLayout ? "gap-3 py-3" : "gap-3.5 py-3.5",
            )}
          >
            <div
              className="w-[3px] shrink-0 rounded-full"
              style={{ backgroundColor: matchRateBarColor(conditionCategories.totalScore) }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-end gap-1.5">
                <span className="ob-typo-subtitle leading-none font-semibold text-(--oboon-text-title)">
                  {Math.round(conditionCategories.totalScore ?? 0)}%
                </span>
                <span className="ob-typo-caption pb-0.5 font-medium text-(--oboon-text-muted)">
                  매칭률
                </span>
              </div>

              <div className={cn(compactLayout ? "mt-2 min-h-[56px]" : "mt-3 min-h-[76px]")}>
                <h3 className="line-clamp-2 ob-typo-h3 text-(--oboon-text-title)">
                  {offering.title}
                </h3>

                <p
                  className={cn(
                    "line-clamp-1 ob-typo-body text-(--oboon-text-muted)",
                    compactLayout ? "mt-0.5" : "mt-1",
                  )}
                >
                  {offering.addressShort}
                </p>
              </div>

              <div
                className={cn(
                  "h-px w-full bg-(--oboon-border-default)",
                  compactLayout ? "mt-2" : "mt-3",
                )}
              />

              <div className={compactLayout ? "mt-2" : "mt-3"}>
                <p className="ob-typo-subtitle text-(--oboon-text-title)">
                  {priceRange}
                </p>
                <p
                  className={cn(
                    "ob-typo-caption text-(--oboon-text-muted)",
                    compactLayout ? "mt-0" : "mt-0.5",
                  )}
                >
                  분양가 기준
                </p>
              </div>

              <div
                className={cn(
                  "flex flex-wrap gap-1.5",
                  compactLayout ? "mt-2" : "mt-3",
                )}
              >
                <span className="rounded-full border px-2 py-0.5 ob-typo-caption" style={gradeBadgeStyle(conditionCategories.cash.grade)}>
                  현금 {getGrade5ToneMeta(conditionCategories.cash.grade).chipLabel}
                </span>
                <span className="rounded-full border px-2 py-0.5 ob-typo-caption" style={gradeBadgeStyle(conditionCategories.burden.grade)}>
                  부담률 {getGrade5ToneMeta(conditionCategories.burden.grade).chipLabel}
                </span>
                <span className="rounded-full border px-2 py-0.5 ob-typo-caption" style={gradeBadgeStyle(conditionCategories.credit.grade)}>
                  신용 {getGrade5ToneMeta(conditionCategories.credit.grade).chipLabel}
                </span>
              </div>
            </div>
          </div>
        ) : mobileRecommendationLayout ? (
          <>
            <div className="space-y-2 xs:space-y-3 p-2.5 xs:p-3 sm:hidden">
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 xs:gap-3">
                <div className="relative aspect-square w-[56px] xs:w-[72px] shrink-0 overflow-hidden rounded-xl bg-(--oboon-bg-subtle)">
                  {hasValidImage ? (
                    <Image
                      src={normalizedImageUrl}
                      alt={offering.title || "offering"}
                      fill
                      sizes="(max-width: 479px) 56px, 72px"
                      className={cn(
                        "object-cover",
                        !disableHover &&
                          "transition-transform duration-300 group-hover:scale-[1.03]",
                      )}
                      priority={priority}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="absolute inset-0 bg-linear-to-br from-(--oboon-bg-subtle) to-(--oboon-border-default) opacity-40" />
                      <span className="relative ob-typo-caption text-(--oboon-text-muted)">
                        {UXCopy.imagePlaceholder}
                      </span>
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="block min-w-0 flex-1 truncate ob-typo-subtitle leading-tight text-(--oboon-text-title)">
                      {offering.title}
                    </h3>
                    {onHistoryDelete ? (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); onHistoryDelete(); }}
                        aria-label="히스토리에서 삭제"
                        className="shrink-0 self-start flex h-6 w-6 items-center justify-center rounded-full bg-(--oboon-bg-subtle) text-(--oboon-text-muted) hover:text-rose-500 transition-colors"
                      >
                        <X size={13} />
                      </button>
                    ) : (
                      <OfferingBadge
                        type="status"
                        value={statusBadgeValue}
                        className="shrink-0 self-start"
                      />
                    )}
                  </div>
                  <p className="mt-px line-clamp-1 ob-typo-caption text-(--oboon-text-muted)">
                    {mobileMetaLabel}
                  </p>
                  <div className="mt-1.5 truncate ob-typo-caption xs:ob-typo-body2 text-(--oboon-text-title)">
                    {priceRange}
                  </div>
                </div>
              </div>

              <div className="h-px bg-(--oboon-border-default)" />

              <div className="flex items-center gap-1.5">
                <div className="flex min-w-0 flex-1 items-center gap-1 xs:gap-1.5 overflow-x-auto scrollbar-none">
                  <OfferingBadge
                    type="region"
                    value={regionBadge}
                    className="shrink-0 max-xs:!px-2 max-xs:!py-0.5 max-xs:!text-[11px]"
                  />
                  {onHistoryDelete ? (
                    <OfferingBadge
                      type="status"
                      value={statusBadgeValue}
                    />
                  ) : null}
                  {offering.propertyType ? (
                    <OfferingBadge
                      type="propertyType"
                      value={offering.propertyType}
                      className="shrink-0 max-xs:!px-2 max-xs:!py-0.5 max-xs:!text-[11px]"
                    />
                  ) : null}
                  {isConsultable ? (
                    <Badge className={cn(subtlePrimaryBadgeClassName, "shrink-0 max-xs:!px-2 max-xs:!py-0.5 max-xs:!text-[11px]")}>
                      상담 가능
                    </Badge>
                  ) : null}
                  {offering.hasAppraiserComment ? (
                    <Badge className={cn(subtlePrimaryBadgeClassName, "shrink-0 max-xs:!px-2 max-xs:!py-0.5 max-xs:!text-[11px]")}>
                      감정 평가
                    </Badge>
                  ) : null}
                </div>
                <div className="shrink-0">
                  <ScrapButton
                    propertyId={Number(offering.id)}
                    initialScrapped={initialScrapped}
                    isLoggedIn={isLoggedIn}
                    variant="icon"
                    className="max-xs:!w-6 max-xs:!h-6"
                  />
                </div>
              </div>
            </div>

            <div className="hidden sm:block">
              <div className="px-4 pt-4 pb-4 sm:px-4 sm:pt-4 sm:pb-4">
                <div className="min-h-[76px]">
                  <h3 className="ob-typo-h3 text-(--oboon-text-title) line-clamp-2">
                    {offering.title}
                  </h3>

                  <p className="mt-0.5 sm:mt-1 line-clamp-1 ob-typo-body text-(--oboon-text-muted)">
                    {offering.addressShort}
                  </p>
                </div>

                <div className="mt-3 sm:mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="ob-typo-subtitle text-(--oboon-text-title)">
                      {priceRange}
                    </p>
                    <p className="mt-0.5 ob-typo-caption text-(--oboon-text-muted)">
                      분양가 기준
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="px-4 pt-4 pb-4 sm:px-4 sm:pt-4 sm:pb-4">
            <div className="min-h-[76px]">
              <h3 className="ob-typo-h3 text-(--oboon-text-title) line-clamp-2">
                {offering.title}
              </h3>

              <p className="mt-0.5 sm:mt-1 line-clamp-1 ob-typo-body text-(--oboon-text-muted)">
                {offering.addressShort}
              </p>
            </div>

            <div className="mt-3 sm:mt-4 flex items-end justify-between gap-3">
              <div>
                <p className="ob-typo-subtitle text-(--oboon-text-title)">
                  {priceRange}
                </p>
                <p className="mt-0.5 ob-typo-caption text-(--oboon-text-muted)">
                  분양가 기준
                </p>
              </div>
            </div>

            {conditionCategories ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded-full border px-2 py-0.5 ob-typo-caption" style={gradeBadgeStyle(conditionCategories.cash.grade)}>
                  현금 {getGrade5ToneMeta(conditionCategories.cash.grade).chipLabel}
                </span>
                <span className="rounded-full border px-2 py-0.5 ob-typo-caption" style={gradeBadgeStyle(conditionCategories.burden.grade)}>
                  부담률 {getGrade5ToneMeta(conditionCategories.burden.grade).chipLabel}
                </span>
                <span className="rounded-full border px-2 py-0.5 ob-typo-caption" style={gradeBadgeStyle(conditionCategories.credit.grade)}>
                  신용 {getGrade5ToneMeta(conditionCategories.credit.grade).chipLabel}
                </span>
              </div>
            ) : null}
          </div>
        )}
      </div>
      {footerSlot ? (
        <div className="border-t border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-3 sm:px-4">
          {footerSlot}
        </div>
      ) : null}
    </Card>
  );

  if (interactionMode === "button") {
    return (
      <div
        role="button"
        tabIndex={0}
        className="group block h-full w-full rounded-2xl border-0 bg-transparent p-0 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--oboon-primary)/35"
        onClick={onCardClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onCardClick?.();
          }
        }}
        onMouseEnter={onMouseEnter}
        onFocusCapture={onFocusCapture}
        aria-label={cardAriaLabel}
        aria-pressed={isSelected}
      >
        {cardContent}
      </div>
    );
  }

  return (
    <Link
      href={ROUTES.offerings.detail(offering.id)}
      className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--oboon-primary)/35"
      onClick={() => {
        trackEvent("property_view", { property_id: offering.id });
        onCardClick?.();
      }}
      onMouseEnter={onMouseEnter}
      onFocusCapture={onFocusCapture}
    >
      {cardContent}
    </Link>
  );
}
