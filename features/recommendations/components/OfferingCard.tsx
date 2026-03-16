"use client";

import Image from "next/image";
import { Building2, Lock } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
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
  if (grade === "GREEN") {
    return {
      badgeLabel: "조건 충족",
      detailLabel: "충족",
      badgeClassName:
        "border-(--oboon-safe-border) bg-(--oboon-safe-bg) text-(--oboon-safe)",
      barClassName: "bg-(--oboon-safe)",
      dotClassName: "bg-(--oboon-safe)",
      textClassName: "text-(--oboon-safe)",
    };
  }

  if (grade === "YELLOW") {
    return {
      badgeLabel: "검토 필요",
      detailLabel: "검토",
      badgeClassName:
        "border-(--oboon-warning-border) bg-(--oboon-warning-bg) text-(--oboon-warning-text)",
      barClassName: "bg-(--oboon-warning)",
      dotClassName: "bg-(--oboon-warning)",
      textClassName: "text-(--oboon-warning-text)",
    };
  }

  return {
    badgeLabel: "미충족",
    detailLabel: "미충족",
    badgeClassName:
      "border-(--oboon-danger-border) bg-(--oboon-danger-bg) text-(--oboon-danger-text)",
    barClassName: "bg-(--oboon-danger)",
    dotClassName: "bg-(--oboon-danger)",
    textClassName: "text-(--oboon-danger-text)",
  };
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
  } = props;
  const router = useRouter();
  const { property: meta, evalResult } = property;
  const finalMeta = gradeToneMeta(evalResult.finalGrade);
  const hasImage = isLikelyImageUrl(meta.imageUrl);
  const shouldRenderImage = !hideImage || flushImageToEdge;
  const totalScore = evalResult.totalScore ?? 0;
  const monthlyBurdenLabel =
    evalResult.metrics.monthlyBurdenPercent !== null
      ? formatPercent(evalResult.metrics.monthlyBurdenPercent)
      : "계산 불가";

  const handleNavigate = () => {
    onClick();
    trackEvent("property_view", { property_id: meta.id });
    router.push(ROUTES.offerings.detail(meta.id));
  };

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={handleNavigate}
      onMouseEnter={onClick}
      onFocus={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleNavigate();
        }
      }}
      className={cn(
        "group flex cursor-pointer overflow-hidden rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-(--oboon-shadow-card)",
        flushImageToEdge ? "items-stretch p-0" : "items-start p-3 lg:p-4",
        isSelected && "lg:shadow-(--oboon-shadow-card)",
      )}
    >
      {shouldRenderImage ? (
        <div
          className={cn(
            "relative shrink-0 overflow-hidden bg-(--oboon-bg-subtle)",
            flushImageToEdge
              ? "w-[132px] self-stretch rounded-l-2xl lg:w-[180px]"
              : "aspect-[3/4] w-[72px] rounded-xl lg:w-[120px]",
          )}
        >
          {hasImage && meta.imageUrl ? (
            <Image
              src={meta.imageUrl}
              alt={meta.name}
              fill
              sizes={
                flushImageToEdge
                  ? "(max-width: 1023px) 132px, 180px"
                  : "(max-width: 1023px) 72px, 120px"
              }
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-linear-to-br from-(--oboon-bg-subtle) to-(--oboon-bg-surface)">
              <Building2 className="h-7 w-7 text-(--oboon-text-muted)" />
            </div>
          )}
        </div>
      ) : null}

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-3",
          flushImageToEdge ? "p-3 lg:p-4" : "",
        )}
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="line-clamp-2 ob-typo-subtitle text-(--oboon-text-title)">
                {meta.name}
              </h2>
              <p className="mt-1 line-clamp-2 ob-typo-caption text-(--oboon-text-muted)">
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
              {finalMeta.badgeLabel}
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
                  category={evalResult.categories.burden}
                  valueLabel={monthlyBurdenLabel}
                />
                <MetricDot
                  label="리스크"
                  category={evalResult.categories.risk}
                />
              </div>

              {evalResult.totalScore !== null ? (
                <div className="space-y-1.5">
                  <div className="ob-typo-body2 text-(--oboon-text-title)">
                    매칭률
                  </div>
                  <div className="flex items-center gap-2">
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
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
