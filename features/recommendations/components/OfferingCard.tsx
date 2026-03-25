"use client";

import Image from "next/image";
import { Building2, Lock } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { grade5DetailLabel } from "@/features/condition-validation/lib/grade5Labels";
import type { RecommendationCategory } from "@/features/recommendations/hooks/useRecommendations";
import type { RecommendationItem } from "@/features/recommendations/hooks/useRecommendations";
import { formatPercent } from "@/lib/format/currency";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils/cn";
import { ROUTES } from "@/types/index";

type OfferingCardProps = {
  property: RecommendationItem;
  isSelected: boolean;
  onClick: () => void;
  flushImageToEdge?: boolean;
  hideImage?: boolean;
  navigateOnClick?: boolean;
};

type GradeToneMeta = {
  badgeLabel: string;
  detailLabel: string;
  badgeClassName: string;
  barClassName: string;
  dotClassName: string;
  textClassName: string;
};

function isLikelyImageUrl(url: string | null | undefined) {
  if (!url) return false;
  if (url.startsWith("data:image/")) return true;
  return /\.(jpg|jpeg|png|webp|gif|avif|svg)(\?.*)?$/i.test(url);
}

function gradeToneMeta(
  grade: RecommendationItem["evalResult"]["finalGrade"],
): GradeToneMeta {
  switch (grade) {
    case "GREEN":
      return {
        badgeLabel: "조건 충족",
        detailLabel: grade5DetailLabel(grade),
        badgeClassName:
          "border-(--oboon-grade-green-border) bg-(--oboon-grade-green-bg) text-(--oboon-grade-green-text)",
        barClassName: "bg-(--oboon-grade-green)",
        dotClassName: "bg-(--oboon-grade-green)",
        textClassName: "text-(--oboon-grade-green-text)",
      };
    case "LIME":
      return {
        badgeLabel: "거의 충족",
        detailLabel: grade5DetailLabel(grade),
        badgeClassName:
          "border-(--oboon-grade-lime-border) bg-(--oboon-grade-lime-bg) text-(--oboon-grade-lime-text)",
        barClassName: "bg-(--oboon-grade-lime)",
        dotClassName: "bg-(--oboon-grade-lime)",
        textClassName: "text-(--oboon-grade-lime-text)",
      };
    case "YELLOW":
      return {
        badgeLabel: "검토 필요",
        detailLabel: grade5DetailLabel(grade),
        badgeClassName:
          "border-(--oboon-grade-yellow-border) bg-(--oboon-grade-yellow-bg) text-(--oboon-grade-yellow-text)",
        barClassName: "bg-(--oboon-grade-yellow)",
        dotClassName: "bg-(--oboon-grade-yellow)",
        textClassName: "text-(--oboon-grade-yellow-text)",
      };
    case "ORANGE":
      return {
        badgeLabel: "어려울 수 있음",
        detailLabel: grade5DetailLabel(grade),
        badgeClassName:
          "border-(--oboon-grade-orange-border) bg-(--oboon-grade-orange-bg) text-(--oboon-grade-orange-text)",
        barClassName: "bg-(--oboon-grade-orange)",
        dotClassName: "bg-(--oboon-grade-orange)",
        textClassName: "text-(--oboon-grade-orange-text)",
      };
    default:
      return {
        badgeLabel: "미충족",
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
    <div className="inline-flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", meta.dotClassName)} />
      <span className="ob-typo-caption text-(--oboon-text-muted)">{label}</span>
      <span className={cn("ob-typo-caption", meta.textClassName)}>
        {valueLabel ?? meta.detailLabel}
      </span>
    </div>
  );
}

export default function OfferingCard(props: OfferingCardProps) {
  const {
    property,
    isSelected,
    onClick,
    flushImageToEdge = false,
    hideImage = false,
    navigateOnClick = true,
  } = props;
  const router = useRouter();
  const { property: meta, evalResult } = property;
  const finalMeta = gradeToneMeta(evalResult.finalGrade);
  const finalBadgeLabel = evalResult.gradeLabel ?? finalMeta.badgeLabel;
  const hasImage = isLikelyImageUrl(meta.imageUrl);
  const shouldRenderImage = !hideImage || flushImageToEdge;
  const totalScore = evalResult.totalScore ?? 0;
  const monthlyBurdenLabel =
    evalResult.metrics.monthlyBurdenPercent !== null
      ? formatPercent(evalResult.metrics.monthlyBurdenPercent)
      : "계산 불가";

  const handleCardPress = () => {
    onClick();
    if (!navigateOnClick) return;

    trackEvent("property_view", { property_id: meta.id });
    router.push(ROUTES.offerings.detail(meta.id));
  };

  return (
    <article
      role={navigateOnClick ? "link" : "button"}
      tabIndex={0}
      onClick={handleCardPress}
      onMouseEnter={onClick}
      onFocus={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleCardPress();
        }
      }}
      className={cn(
        "group cursor-pointer overflow-hidden rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-(--oboon-shadow-card)",
        flushImageToEdge ? "flex items-stretch p-0" : "p-3 lg:p-4",
        isSelected && "lg:shadow-(--oboon-shadow-card)",
      )}
    >
      {flushImageToEdge ? (
        <>
          {shouldRenderImage ? (
            <div className="relative w-[132px] shrink-0 self-stretch overflow-hidden rounded-l-2xl bg-(--oboon-bg-subtle) lg:w-[180px]">
              {hasImage && meta.imageUrl ? (
                <Image
                  src={meta.imageUrl}
                  alt={meta.name}
                  fill
                  sizes="(max-width: 1023px) 132px, 180px"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-linear-to-br from-(--oboon-bg-subtle) to-(--oboon-bg-surface)">
                  <Building2 className="h-7 w-7 text-(--oboon-text-muted)" />
                </div>
              )}
            </div>
          ) : null}

          <div className="flex min-w-0 flex-1 flex-col gap-3 p-3 lg:p-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="line-clamp-1 leading-tight sm:line-clamp-2 sm:leading-normal ob-typo-subtitle text-(--oboon-text-title)">
                    {meta.name}
                  </h2>
                  <p className="mt-px sm:mt-1 line-clamp-2 ob-typo-caption text-(--oboon-text-muted)">
                    {meta.regionLabel}
                    {meta.propertyType ? ` · ${meta.propertyType}` : ""}
                    {` · ${meta.statusLabel}`}
                  </p>
                  <div className="mt-2 ob-typo-body2 text-(--oboon-text-title)">
                    {meta.priceLabel}
                  </div>
                </div>

                <Badge
                  className={cn("shrink-0 border ob-typo-caption", finalMeta.badgeClassName)}
                >
                  <span className="sm:hidden">{finalMeta.detailLabel}</span>
                  <span className="hidden sm:inline">{finalBadgeLabel}</span>
                </Badge>
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
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <MetricDot
                      label="현금"
                      category={evalResult.categories.cash}
                    />
                    <MetricDot
                      label="부담률"
                      category={evalResult.categories.income}
                      valueLabel={monthlyBurdenLabel}
                    />
                    <MetricDot
                      label="신용"
                      category={evalResult.categories.ltvDsr}
                    />
                  </div>

                  {evalResult.totalScore !== null ? (
                    <div className="flex items-center gap-2">
                      <div className="shrink-0 ob-typo-body2 text-(--oboon-text-title)">
                        매칭률
                      </div>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-(--oboon-bg-subtle)">
                        <div
                          className={cn(
                            "h-full rounded-full transition-[width]",
                            finalMeta.barClassName,
                          )}
                          style={{
                            width: `${Math.max(0, Math.min(100, totalScore))}%`,
                          }}
                        />
                      </div>
                      <div className="shrink-0 ob-typo-body2 text-(--oboon-text-title)">
                        {Math.round(totalScore)}%
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <div
            className={cn(
              "grid items-start gap-3",
              shouldRenderImage ? "grid-cols-[auto_minmax(0,1fr)]" : "grid-cols-1",
            )}
          >
            {shouldRenderImage ? (
              <div className="relative aspect-square w-[72px] shrink-0 overflow-hidden rounded-xl bg-(--oboon-bg-subtle)">
                {hasImage && meta.imageUrl ? (
                  <Image
                    src={meta.imageUrl}
                    alt={meta.name}
                    fill
                    sizes="72px"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-linear-to-br from-(--oboon-bg-subtle) to-(--oboon-bg-surface)">
                    <Building2 className="h-7 w-7 text-(--oboon-text-muted)" />
                  </div>
                )}
              </div>
            ) : null}

            <div className="min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h2 className="line-clamp-1 leading-tight sm:line-clamp-2 sm:leading-normal ob-typo-subtitle text-(--oboon-text-title)">
                    {meta.name}
                  </h2>
                  <p className="mt-px sm:mt-1 line-clamp-2 ob-typo-caption text-(--oboon-text-muted)">
                    {meta.regionLabel}
                    {meta.propertyType ? ` · ${meta.propertyType}` : ""}
                    {` · ${meta.statusLabel}`}
                  </p>
                  <div className="mt-2 ob-typo-body2 text-(--oboon-text-title)">
                    {meta.priceLabel}
                  </div>
                </div>

                <Badge
                  className={cn(
                    "shrink-0 self-start border ob-typo-caption",
                    finalMeta.badgeClassName,
                  )}
                >
                  <span className="sm:hidden">{finalMeta.detailLabel}</span>
                  <span className="hidden sm:inline">{finalBadgeLabel}</span>
                </Badge>
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
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <MetricDot
                  label="현금"
                  category={evalResult.categories.cash}
                />
                <MetricDot
                  label="부담률"
                  category={evalResult.categories.income}
                  valueLabel={monthlyBurdenLabel}
                />
                <MetricDot
                  label="신용"
                  category={evalResult.categories.ltvDsr}
                />
              </div>

              {evalResult.totalScore !== null ? (
                <div className="flex items-center gap-2">
                  <div className="shrink-0 ob-typo-body2 text-(--oboon-text-title)">
                    매칭률
                  </div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-(--oboon-bg-subtle)">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width]",
                        finalMeta.barClassName,
                      )}
                      style={{
                        width: `${Math.max(0, Math.min(100, totalScore))}%`,
                      }}
                    />
                  </div>
                  <div className="shrink-0 ob-typo-body2 text-(--oboon-text-title)">
                    {Math.round(totalScore)}%
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
