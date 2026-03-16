// /features/offerings/OfferingCard.tsx

"use client";

import Image from "next/image";
import Link from "next/link";
import type { FocusEventHandler, MouseEventHandler } from "react";

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

function gradeClass(grade: FinalGrade): string {
  if (grade === "GREEN") return "border-(--oboon-safe-border) bg-(--oboon-safe-bg) text-(--oboon-safe-text)";
  if (grade === "YELLOW") return "border-(--oboon-warning-border) bg-(--oboon-warning-bg) text-(--oboon-warning-text)";
  return "border-(--oboon-danger-border) bg-(--oboon-danger-bg) text-(--oboon-danger-text)";
}

function matchRateBarClass(totalScore?: number): string {
  if ((totalScore ?? 0) >= 80) return "bg-(--oboon-safe)";
  if ((totalScore ?? 0) >= 50) return "bg-(--oboon-warning)";
  return "bg-(--oboon-danger)";
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
          className={[
            "relative w-full bg-(--oboon-bg-subtle)",
            "aspect-video",
          ].join(" ")}
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
              priority={false}
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
              <Badge variant="primary" className="border-(--oboon-primary)">
                감정 평가
              </Badge>
            ) : null}
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
              className={[
                "w-[3px] shrink-0 rounded-full",
                matchRateBarClass(conditionCategories.totalScore),
              ].join(" ")}
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
                <span className={["rounded-full border px-2 py-0.5 ob-typo-caption", gradeClass(conditionCategories.cash.grade)].join(" ")}>
                  자금 {gradeText(conditionCategories.cash.grade)}
                </span>
                <span className={["rounded-full border px-2 py-0.5 ob-typo-caption", gradeClass(conditionCategories.burden.grade)].join(" ")}>
                  부담 {gradeText(conditionCategories.burden.grade)}
                </span>
                <span className={["rounded-full border px-2 py-0.5 ob-typo-caption", gradeClass(conditionCategories.risk.grade)].join(" ")}>
                  리스크 {riskGradeText(conditionCategories.risk.grade)}
                </span>
              </div>
            </div>
          </div>
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
                <span className={["rounded-full border px-2 py-0.5 ob-typo-caption", gradeClass(conditionCategories.cash.grade)].join(" ")}>
                  자금 {gradeText(conditionCategories.cash.grade)}
                </span>
                <span className={["rounded-full border px-2 py-0.5 ob-typo-caption", gradeClass(conditionCategories.burden.grade)].join(" ")}>
                  부담 {gradeText(conditionCategories.burden.grade)}
                </span>
                <span className={["rounded-full border px-2 py-0.5 ob-typo-caption", gradeClass(conditionCategories.risk.grade)].join(" ")}>
                  리스크 {riskGradeText(conditionCategories.risk.grade)}
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
      <button
        type="button"
        className="group block h-full w-full rounded-2xl border-0 bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--oboon-primary)/35"
        onClick={onCardClick}
        onMouseEnter={onMouseEnter}
        onFocusCapture={onFocusCapture}
        aria-label={cardAriaLabel}
        aria-pressed={isSelected}
      >
        {cardContent}
      </button>
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
