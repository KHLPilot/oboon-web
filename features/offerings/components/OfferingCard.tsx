// /features/offerings/OfferingCard.tsx

"use client";

import Image from "next/image";
import Link from "next/link";

import type { Offering } from "@/types/index";
import { ROUTES } from "@/types/index";

import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { UXCopy } from "@/shared/uxCopy";
import { formatPriceRange } from "@/shared/price";
import { trackEvent } from "@/lib/analytics";

import OfferingBadge from "./OfferingBadges";

type ConditionGrade = "GREEN" | "YELLOW" | "RED";
type ConditionCategoryGrades = {
  cash: ConditionGrade;
  burden: ConditionGrade;
  risk: ConditionGrade;
};

function isLikelyImageUrl(url: string | null | undefined) {
  if (!url) return false;
  if (url.startsWith("data:image/")) return true;
  return /\.(jpg|jpeg|png|webp|gif|avif|svg)(\?.*)?$/i.test(url);
}

function gradeText(grade: ConditionGrade): "안전" | "경계" | "위험" {
  if (grade === "GREEN") return "안전";
  if (grade === "YELLOW") return "경계";
  return "위험";
}

function gradeClass(grade: ConditionGrade): string {
  if (grade === "GREEN") return "border-(--oboon-safe-border) bg-(--oboon-safe-bg) text-(--oboon-safe-text)";
  if (grade === "YELLOW") return "border-(--oboon-warning-border) bg-(--oboon-warning-bg) text-(--oboon-warning-text)";
  return "border-(--oboon-danger-border) bg-(--oboon-danger-bg) text-(--oboon-danger-text)";
}

export default function OfferingCard({
  offering,
  conditionCategories,
}: {
  offering: Offering;
  conditionCategories?: ConditionCategoryGrades | null;
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

  return (
    <Link
      href={ROUTES.offerings.detail(offering.id)}
      className="group block h-full"
      onClick={() => trackEvent("property_view", { property_id: offering.id })}
    >
      {/* hover shadow 책임은 Card로 (정책 일관성) */}
      <Card className="h-full p-0 overflow-hidden transition hover:shadow-md">
        {/* 이미지 영역 */}
        <div className="relative aspect-video w-full bg-(--oboon-bg-subtle)">
          {hasValidImage ? (
            <Image
              src={normalizedImageUrl}
              alt={offering.title || "offering"}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
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

          {/* 좌상단 배지 */}
          <div className="absolute left-3 top-3 flex items-center gap-2">
            {/* 지역 배지 */}
            <OfferingBadge type="region" value={regionBadge} />

            {/* 상태 배지 */}
            <OfferingBadge
              type="status"
              value={offering.statusValue ?? undefined}
            />
            {offering.hasAppraiserComment ? (
              <Badge variant="primary" className="border-(--oboon-primary)">
                감정 평가
              </Badge>
            ) : null}

            {/* type / tag 확장 */}
            {/*
                {offering.type ? (
                  <span className="shrink-0 rounded-full bg-(--oboon-bg-surface)/80 px-2.5 py-1 text-[11px] font-semibold text-(--oboon-text-muted) backdrop-blur">
                    {offering.type}
                  </span>
                ) : null}
                 */}
          </div>
        </div>

        {/* 텍스트/배지 영역 */}
        <div className="px-4 pt-4 pb-4 sm:px-4 sm:pt-4 sm:pb-4">
          <h3 className="ob-typo-h3 text-(--oboon-text-title) line-clamp-2">
            {offering.title}
          </h3>

          <p className="mt-0.5 sm:mt-1 ob-typo-body text-(--oboon-text-muted)">
            {offering.addressShort}
          </p>

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
              <span className={["rounded-full border px-2 py-0.5 ob-typo-caption", gradeClass(conditionCategories.cash)].join(" ")}>
                자금 {gradeText(conditionCategories.cash)}
              </span>
              <span className={["rounded-full border px-2 py-0.5 ob-typo-caption", gradeClass(conditionCategories.burden)].join(" ")}>
                부담 {gradeText(conditionCategories.burden)}
              </span>
              <span className={["rounded-full border px-2 py-0.5 ob-typo-caption", gradeClass(conditionCategories.risk)].join(" ")}>
                위험 {gradeText(conditionCategories.risk)}
              </span>
            </div>
          ) : null}
        </div>
      </Card>
    </Link>
  );
}
