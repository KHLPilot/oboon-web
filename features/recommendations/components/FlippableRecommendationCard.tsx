"use client";

import Image from "next/image";
import Link from "next/link";
import { Building2, Lock } from "lucide-react";
import { useEffect, useState } from "react";

import { ROUTES } from "@/types/index";

import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import HomeOfferingCard from "@/features/offerings/components/OfferingCard";
import OfferingBadge from "@/features/offerings/components/OfferingBadges";
import type { RecommendationItem } from "@/features/recommendations/hooks/useRecommendations";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils/cn";

import { RecommendationPreviewContent } from "./GaugeOverlay";

type FlippableRecommendationCardProps = {
  item: RecommendationItem;
  isSelected: boolean;
  isFlipped: boolean;
  disableFlip?: boolean;
  onFlip: () => void;
  onSelect: () => void;
};

const DESKTOP_CARD_HEIGHT_CLASS = "h-[29rem] xl:h-[29.5rem]";

function isLikelyImageUrl(url: string | null | undefined) {
  if (!url) return false;
  if (url.startsWith("data:image/")) return true;
  return /\.(jpg|jpeg|png|webp|gif|avif|svg)(\?.*)?$/i.test(url);
}

function badgeVariant(grade: RecommendationItem["evalResult"]["finalGrade"]) {
  if (grade === "GREEN") return "success" as const;
  if (grade === "YELLOW") return "warning" as const;
  return "danger" as const;
}

function badgeLabel(grade: RecommendationItem["evalResult"]["finalGrade"]) {
  if (grade === "GREEN") return "조건 충족";
  if (grade === "YELLOW") return "검토 필요";
  return "미충족";
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

function surfaceClassName(isSelected: boolean) {
  return cn(
    "h-full overflow-hidden p-0 transition-[transform,box-shadow,border-color] duration-200",
    "border-(--oboon-border-strong) bg-(--oboon-bg-surface)",
    isSelected && "border-(--oboon-primary) ring-1 ring-(--oboon-primary)",
  );
}

function BackFaceCard(props: {
  item: RecommendationItem;
  isSelected: boolean;
  onFlip: () => void;
}) {
  const { item, isSelected, onFlip } = props;

  return (
    <Card className={surfaceClassName(isSelected)}>
      <div className="flex h-full flex-col">
        <button
          type="button"
          className="min-h-0 flex flex-1 items-center px-5 py-5 text-left focus-visible:outline-none"
          onClick={onFlip}
          aria-label={`${item.property.name} 앞면 보기`}
        >
          <div className="max-h-full w-full overflow-y-auto">
            <RecommendationPreviewContent
              property={item.property}
              evalResult={item.evalResult}
              showFinalBadge={false}
              showSummary={false}
            />
          </div>
        </button>

        <div className="border-t border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-4 py-3.5">
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

function DesktopMaskedRecommendationCard(props: {
  item: RecommendationItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { item, isSelected, onSelect } = props;
  const { offering, property, evalResult } = item;
  const hasImage = isLikelyImageUrl(offering.imageUrl);

  return (
    <div
      className="h-full"
      onClick={onSelect}
      onFocusCapture={onSelect}
    >
      <Card className={surfaceClassName(isSelected)}>
        <div className="flex h-full flex-col">
          <div className="relative aspect-video w-full bg-(--oboon-bg-subtle)">
            {hasImage && offering.imageUrl ? (
              <Image
                src={offering.imageUrl}
                alt={offering.title || "offering"}
                fill
                sizes="(max-width: 1023px) 50vw, 33vw"
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

          <div className="flex flex-1 flex-col gap-3 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="line-clamp-2 ob-typo-h3 text-(--oboon-text-title)">
                  {offering.title}
                </h3>
                <p className="mt-1 line-clamp-1 ob-typo-body text-(--oboon-text-muted)">
                  {offering.addressShort}
                </p>
              </div>

              <Badge variant={badgeVariant(evalResult.finalGrade)}>
                {badgeLabel(evalResult.finalGrade)}
              </Badge>
            </div>

            <div>
              <p className="ob-typo-subtitle text-(--oboon-text-title)">
                {property.priceLabel}
              </p>
              <p className="mt-0.5 ob-typo-caption text-(--oboon-text-muted)">
                분양가 기준
              </p>
            </div>

            <div className="rounded-xl border border-(--oboon-warning-border) bg-(--oboon-warning-bg-subtle) px-3 py-3">
              <div className="flex items-start gap-2">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-(--oboon-warning-text)" />
                <p className="ob-typo-caption leading-5 text-(--oboon-warning-text)">
                  로그인하면 현금 여력, 부담률, 리스크와 매칭률을 자세히 확인할 수 있어요.
                </p>
              </div>
            </div>

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
    disableFlip = false,
    onFlip,
    onSelect,
  } = props;
  const prefersReducedMotion = usePrefersReducedMotion();

  if (disableFlip) {
    return (
      <div className={DESKTOP_CARD_HEIGHT_CLASS}>
        <DesktopMaskedRecommendationCard
          item={item}
          isSelected={isSelected}
          onSelect={onSelect}
        />
      </div>
    );
  }

  const frontFace = (
    <HomeOfferingCard
      offering={item.offering}
      conditionCategories={item.conditionCategories}
      isSelected={isSelected}
      interactionMode="button"
      onCardClick={onFlip}
      cardAriaLabel={`${item.property.name} 카드 뒤집기`}
      disableHover
      onFocusCapture={() => onSelect()}
    />
  );

  const backFace = (
    <BackFaceCard
      item={item}
      isSelected={isSelected}
      onFlip={onFlip}
    />
  );

  if (prefersReducedMotion) {
    return (
      <div
        className={DESKTOP_CARD_HEIGHT_CLASS}
      >
        {isFlipped ? backFace : frontFace}
      </div>
    );
  }

  return (
    <div
      className={DESKTOP_CARD_HEIGHT_CLASS}
      style={{ perspective: "1600px" }}
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
