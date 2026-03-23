// /features/offerings/OfferingCard.tsx

"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, FocusEventHandler, MouseEventHandler } from "react";

import type { Offering } from "@/types/index";
import { ROUTES } from "@/types/index";

import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type {
  ConditionCategoryGrades,
  FinalGrade,
} from "@/features/condition-validation/domain/types";
import { UXCopy } from "@/shared/uxCopy";
import { formatPriceRange } from "@/shared/price";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils/cn";

import OfferingBadge from "./OfferingBadges";
import ScrapButton from "./ScrapButton";
import { X } from "lucide-react";

function isLikelyImageUrl(url: string | null | undefined) {
  if (!url) return false;
  if (url.startsWith("data:image/")) return true;
  return /\.(jpg|jpeg|png|webp|gif|avif|svg)(\?.*)?$/i.test(url);
}

function gradeText(grade: FinalGrade): "안전" | "경계" | "위험" {
  if (grade === "GREEN") return "안전";
  if (grade === "YELLOW") return "경계";
  return "위험";
}

function riskGradeText(grade: FinalGrade): "안전" | "경계" | "위험" {
  if (grade === "GREEN") return "안전";
  if (grade === "YELLOW") return "경계";
  return "위험";
}

// 배지 인라인 스타일 (CSS 토큰 사용)
function gradeBadgeStyle(grade: FinalGrade): CSSProperties {
  if (grade === "GREEN") {
    return {
      borderColor: "var(--oboon-grade-green-border)",
      backgroundColor: "var(--oboon-grade-green-bg)",
      color: "var(--oboon-grade-green-text)",
    };
  }
  if (grade === "YELLOW") {
    return {
      borderColor: "var(--oboon-grade-yellow-border)",
      backgroundColor: "var(--oboon-grade-yellow-bg)",
      color: "var(--oboon-grade-yellow-text)",
    };
  }
  return {
    borderColor: "var(--oboon-grade-red-border)",
    backgroundColor: "var(--oboon-grade-red-bg)",
    color: "var(--oboon-grade-red-text)",
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
}) {
  const priceRange = formatPriceRange(
    offering.priceMin억,
    offering.priceMax억,
    {
      unknownLabel: offering.isPricePrivate
        ? UXCopy.pricePrivateShort
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
                  자금 {gradeText(conditionCategories.cash.grade)}
                </span>
                <span className="rounded-full border px-2 py-0.5 ob-typo-caption" style={gradeBadgeStyle(conditionCategories.burden.grade)}>
                  부담 {gradeText(conditionCategories.burden.grade)}
                </span>
                <span className="rounded-full border px-2 py-0.5 ob-typo-caption" style={gradeBadgeStyle(conditionCategories.risk.grade)}>
                  신용 {riskGradeText(conditionCategories.risk.grade)}
                </span>
              </div>
            </div>
          </div>
        ) : mobileRecommendationLayout ? (
          <>
            <div className="space-y-3 p-3 sm:hidden">
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
                <div className="relative aspect-square w-[72px] shrink-0 overflow-hidden rounded-xl bg-(--oboon-bg-subtle)">
                  {hasValidImage ? (
                    <Image
                      src={normalizedImageUrl}
                      alt={offering.title || "offering"}
                      fill
                      sizes="72px"
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
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-1 ob-typo-subtitle leading-tight text-(--oboon-text-title)">
                        {offering.title}
                      </h3>
                      <p className="mt-px line-clamp-1 ob-typo-caption text-(--oboon-text-muted)">
                        {mobileMetaLabel}
                      </p>
                      <div className="mt-2 ob-typo-body2 text-(--oboon-text-title)">
                        {priceRange}
                      </div>
                    </div>

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
                </div>
              </div>

              <div className="h-px bg-(--oboon-border-default)" />

              <div className="flex flex-wrap items-center gap-1.5">
                <OfferingBadge
                  type="region"
                  value={regionBadge}
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
                  />
                ) : null}
                {isConsultable ? (
                  <Badge className={subtlePrimaryBadgeClassName}>
                    상담 가능
                  </Badge>
                ) : null}
                {offering.hasAppraiserComment ? (
                  <Badge className={subtlePrimaryBadgeClassName}>
                    감정 평가
                  </Badge>
                ) : null}
                <div className="ml-auto">
                  <ScrapButton
                    propertyId={Number(offering.id)}
                    initialScrapped={initialScrapped}
                    isLoggedIn={isLoggedIn}
                    variant="icon"
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
                  자금 {gradeText(conditionCategories.cash.grade)}
                </span>
                <span className="rounded-full border px-2 py-0.5 ob-typo-caption" style={gradeBadgeStyle(conditionCategories.burden.grade)}>
                  부담 {gradeText(conditionCategories.burden.grade)}
                </span>
                <span className="rounded-full border px-2 py-0.5 ob-typo-caption" style={gradeBadgeStyle(conditionCategories.risk.grade)}>
                  신용 {riskGradeText(conditionCategories.risk.grade)}
                </span>
              </div>
            ) : null}
          </div>
        )}
      </div>
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
