"use client";

import Image from "next/image";
import Link from "next/link";
import { Building2, Lock } from "lucide-react";
import { useEffect, useState } from "react";

import { ROUTES } from "@/types/index";

import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { grade5DetailLabel } from "@/features/condition-validation/lib/grade5Labels";
import { getGrade5ToneMeta } from "@/features/condition-validation/lib/grade5Theme";
import HomeOfferingCard from "@/features/offerings/components/OfferingCard";
import OfferingBadge from "@/features/offerings/components/OfferingBadges";
import type { RecommendationItem } from "@/features/recommendations/hooks/useRecommendations";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils/cn";

import RecommendationUnitTypePanel from "./RecommendationUnitTypePanel";

type FlippableRecommendationCardProps = {
  item: RecommendationItem;
  isSelected: boolean;
  isFlipped: boolean;
  recommendationTier?: "primary" | "alternative" | "informational";
  size?: "desktop" | "mobile";
  disableFlip?: boolean;
  initialScrapped?: boolean;
  isLoggedIn?: boolean;
  priority?: boolean;
  onFlip: () => void;
  onSelect: () => void;
};

const DESKTOP_CARD_HEIGHT_CLASS = "h-[29rem] xl:h-[29.5rem]";
const MOBILE_CARD_HEIGHT_CLASS = "h-[24.5rem]";

function isLikelyImageUrl(url: string | null | undefined) {
  if (!url) return false;
  if (url.startsWith("data:image/")) return true;
  return /\.(jpg|jpeg|png|webp|gif|avif|svg)(\?.*)?$/i.test(url);
}

function badgeLabel(grade: RecommendationItem["evalResult"]["finalGrade"]) {
  return grade5DetailLabel(grade);
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    update();

    const legacyMediaQuery = mediaQuery as MediaQueryList & {
      addListener?: (listener: () => void) => void;
      removeListener?: (listener: () => void) => void;
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
      return () => {
        mediaQuery.removeEventListener("change", update);
      };
    }

    legacyMediaQuery.addListener?.(update);
    return () => {
      legacyMediaQuery.removeListener?.(update);
    };
  }, []);

  return prefersReducedMotion;
}

function surfaceClassName(
  isSelected: boolean,
  recommendationTier: "primary" | "alternative" | "informational",
) {
  return cn(
    "h-full overflow-hidden p-0 transition-[transform,box-shadow,border-color] duration-200",
    "border-(--oboon-border-strong) bg-(--oboon-bg-surface)",
    recommendationTier === "alternative" &&
      "border-(--oboon-grade-yellow-border) bg-linear-to-br from-(--oboon-grade-yellow-bg)/45 via-(--oboon-bg-surface) to-(--oboon-bg-surface)",
    recommendationTier === "informational" &&
      "border-(--oboon-badge-selected-border) bg-linear-to-br from-(--oboon-badge-selected-bg)/55 via-(--oboon-bg-surface) to-(--oboon-bg-surface)",
    isSelected && "border-(--oboon-primary) ring-1 ring-(--oboon-primary)",
    isSelected &&
      recommendationTier === "alternative" &&
      "border-(--oboon-grade-yellow-border) ring-(--oboon-grade-yellow-border)",
    isSelected &&
      recommendationTier === "informational" &&
      "border-(--oboon-badge-selected-border) ring-(--oboon-badge-selected-border)",
  );
}

function BackFaceCard(props: {
  item: RecommendationItem;
  isSelected: boolean;
  compact?: boolean;
  onFlip: () => void;
  recommendationTier: "primary" | "alternative" | "informational";
}) {
  const { item, isSelected, compact = false, onFlip, recommendationTier } = props;

  return (
    <Card
      className={surfaceClassName(isSelected, recommendationTier)}
      role="button"
      tabIndex={0}
      onClick={onFlip}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onFlip();
        }
      }}
    >
      <div className="flex h-full flex-col">
        <div
          className={cn(
            "min-h-0 flex flex-1 flex-col text-left",
            compact ? "px-3.5 py-3.5" : "px-5 py-5",
          )}
        >
          <div className="w-full flex-1">
            <RecommendationUnitTypePanel
              item={item}
              mobile={compact}
              embedded
              maxItems={2}
              heading="추천 순 타입별 정보"
              showPropertyName={false}
              footerNote="더 많은 타입은 현장 상세에서 확인"
            />
          </div>
        </div>

        <div
          className={cn(
            "border-t border-(--oboon-border-default) bg-(--oboon-bg-subtle)",
            compact ? "px-3 py-2.5" : "px-4 py-3.5",
          )}
        >
          <Button
            asChild
            variant="primary"
            size="sm"
            shape="pill"
            className="w-full"
          >
            <Link
              href={ROUTES.offerings.detail(item.property.id)}
              onClick={(event) => {
                event.stopPropagation();
                trackEvent("property_view", { property_id: item.property.id });
              }}
            >
              현장 상세 보기
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function MaskedRecommendationCard(props: {
  item: RecommendationItem;
  isSelected: boolean;
  compact?: boolean;
  isLoggedIn?: boolean;
  onSelect: () => void;
  recommendationTier?: "primary" | "alternative" | "informational";
}) {
  const {
    item,
    isSelected,
    compact = false,
    isLoggedIn = false,
    onSelect,
    recommendationTier = "primary",
  } = props;
  const { offering, property, evalResult } = item;
  const hasImage = isLikelyImageUrl(offering.imageUrl);
  const finalTone = getGrade5ToneMeta(evalResult.finalGrade);
  const finalBadgeLabel = evalResult.gradeLabel ?? badgeLabel(evalResult.finalGrade);

  return (
    <div
      className="h-full"
      onClick={onSelect}
      onFocusCapture={onSelect}
    >
      <Card className={surfaceClassName(isSelected, recommendationTier)}>
        <div className="flex h-full flex-col">
          <div className="relative aspect-video w-full bg-(--oboon-bg-subtle)">
            {hasImage && offering.imageUrl ? (
              <Image
                src={offering.imageUrl}
                alt={offering.title || "offering"}
                fill
                sizes={compact ? "280px" : "(max-width: 1023px) 50vw, 33vw"}
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-(--oboon-text-muted)" />
              </div>
            )}

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/45 via-black/15 to-transparent" />

            <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
              <OfferingBadge
                type="region"
                value={offering.regionLabel ?? offering.region}
              />
              <OfferingBadge
                type="status"
                value={offering.statusValue ?? undefined}
              />
            </div>
          </div>

          <div
            className={cn(
              "flex flex-1 flex-col",
              compact ? "gap-2.5 px-3.5 py-3.5" : "gap-3 px-4 py-4",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3
                  className={cn(
                    "line-clamp-2 text-(--oboon-text-title)",
                    compact ? "ob-typo-subtitle leading-tight" : "ob-typo-h3",
                  )}
                >
                  {offering.title}
                </h3>
                <p
                  className={cn(
                    "line-clamp-1 text-(--oboon-text-muted)",
                    compact ? "mt-0.5 ob-typo-caption" : "mt-1 ob-typo-body",
                  )}
                >
                  {offering.addressShort}
                </p>
              </div>

              <Badge className={cn("shrink-0", finalTone.badgeClassName)}>
                {finalBadgeLabel}
              </Badge>
            </div>

            <div>
              <p
                className={cn(
                  "text-(--oboon-text-title)",
                  compact ? "ob-typo-body2" : "ob-typo-subtitle",
                )}
              >
                {property.priceLabel}
              </p>
              <p className="mt-0.5 ob-typo-caption text-(--oboon-text-muted)">
                분양가 기준
              </p>
            </div>

            {!isLoggedIn && (
              <div
                className={cn(
                  "rounded-xl border border-(--oboon-warning-border) bg-(--oboon-warning-bg-subtle)",
                  compact ? "px-3 py-2.5" : "px-3 py-3",
                )}
              >
                <div className="flex items-start gap-2">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-(--oboon-warning-text)" />
                  <p className="ob-typo-caption leading-5 text-(--oboon-warning-text)">
                    로그인하면 현금 여력, 부담률, 리스크와 매칭률을 자세히 확인할 수 있어요.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-auto">
              <Button
                asChild
                variant="secondary"
                size="sm"
                shape="pill"
                className="w-full"
              >
                <Link
                  href={ROUTES.offerings.detail(property.id)}
                  onClick={() =>
                    trackEvent("property_view", { property_id: property.id })
                  }
                >
                  현장 상세 보기
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function FlippableRecommendationCard(
  props: FlippableRecommendationCardProps,
) {
  const {
    item,
    isSelected,
    isFlipped,
    recommendationTier = "primary",
    size = "desktop",
    disableFlip = false,
    initialScrapped = false,
    isLoggedIn = false,
    priority = false,
    onFlip,
    onSelect,
  } = props;
  const prefersReducedMotion = usePrefersReducedMotion();
  const compact = size === "mobile";
  const cardHeightClass = compact ? MOBILE_CARD_HEIGHT_CLASS : DESKTOP_CARD_HEIGHT_CLASS;
  const isFlipDisabled = disableFlip || item.unitTypes.length === 0;

  const frontFace = (
    <HomeOfferingCard
      offering={item.offering}
      conditionCategories={item.conditionCategories}
      recommendationTier={recommendationTier}
      isSelected={isSelected}
      interactionMode="button"
      onCardClick={onFlip}
      cardAriaLabel={`${item.property.name} 타입별 정보 보기`}
      disableHover
      compactLayout={compact}
      initialScrapped={initialScrapped}
      isLoggedIn={isLoggedIn}
      priority={priority}
      onFocusCapture={() => onSelect()}
    />
  );

  if (isFlipDisabled) {
    // disableFlip prop이 명시적으로 true일 때(isMasked)만 MaskedCard 사용
    // unitTypes가 없어서 flip만 막힌 경우엔 앞면(OfferingCard) 그대로 표시
    if (disableFlip) {
      return (
        <div className={cardHeightClass}>
          <MaskedRecommendationCard
            item={item}
            isSelected={isSelected}
            compact={compact}
            isLoggedIn={isLoggedIn}
            onSelect={onSelect}
            recommendationTier={recommendationTier}
          />
        </div>
      );
    }

    return <div className={cardHeightClass}>{frontFace}</div>;
  }

  const backFace = (
    <BackFaceCard
      item={item}
      isSelected={isSelected}
      compact={compact}
      onFlip={onFlip}
      recommendationTier={recommendationTier}
    />
  );

  if (prefersReducedMotion) {
    return (
      <div className={cardHeightClass}>
        {isFlipped ? backFace : frontFace}
      </div>
    );
  }

  return (
    <div
      className={cardHeightClass}
      style={{ perspective: compact ? "1200px" : "1600px" }}
    >
      <div
        className="relative h-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: "hidden" }}
          aria-hidden={isFlipped}
        >
          {frontFace}
        </div>

        <div
          className="absolute inset-0"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
          aria-hidden={!isFlipped}
        >
          {backFace}
        </div>
      </div>
    </div>
  );
}
