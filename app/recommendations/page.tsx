"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import PageContainer from "@/components/shared/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import OfferingsViewToggle from "@/features/offerings/components/OfferingsViewToggle";
import FlippableRecommendationCard from "@/features/recommendations/components/FlippableRecommendationCard";
import MiniMap from "@/features/recommendations/components/MiniMap";
import MobileConditionSheet from "@/features/recommendations/components/MobileConditionSheet";
import RecommendationOfferingCard from "@/features/recommendations/components/OfferingCard";
import RecommendationConditionPanel from "@/features/recommendations/components/RecommendationConditionPanel";
import type { RecommendationItem } from "@/features/recommendations/hooks/useRecommendations";
import {
  useRecommendations,
} from "@/features/recommendations/hooks/useRecommendations";
import { cn } from "@/lib/utils/cn";

type SortKey = "default" | "burden" | "cash";

const SORT_OPTIONS: Array<{
  value: SortKey;
  label: string;
  mobileLabel: string;
}> = [
  { value: "default", label: "매칭률 높은 순", mobileLabel: "매칭률순" },
  { value: "burden", label: "월 부담률 낮은 순", mobileLabel: "부담률순" },
  { value: "cash", label: "최소 현금 낮은 순", mobileLabel: "현금순" },
];

function compareNullableNumber(
  a: number | null,
  b: number | null,
  direction: "asc" | "desc" = "asc",
) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return direction === "asc" ? a - b : b - a;
}

function compareByDefault(a: RecommendationItem, b: RecommendationItem) {
  return (
    compareNullableNumber(
      a.evalResult.totalScore,
      b.evalResult.totalScore,
      "desc",
    ) ||
    compareNullableNumber(
      a.evalResult.metrics.monthlyBurdenPercent,
      b.evalResult.metrics.monthlyBurdenPercent,
      "asc",
    ) ||
    compareNullableNumber(
      a.evalResult.metrics.minCash,
      b.evalResult.metrics.minCash,
      "asc",
    )
  );
}

function ResultChip(props: {
  label: string;
  count: number;
  tone: "GREEN" | "YELLOW" | "RED";
}) {
  const { label, count, tone } = props;

  const toneClassName =
    tone === "GREEN"
      ? "bg-(--oboon-safe)/15 text-(--oboon-safe)"
      : tone === "YELLOW"
      ? "bg-(--oboon-warning)/15 text-(--oboon-warning)"
      : "bg-(--oboon-danger)/15 text-(--oboon-danger)";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 ob-typo-caption",
        toneClassName,
      )}
    >
      {label} {count}개
    </span>
  );
}

function SortDropdown(props: {
  value: SortKey;
  onChange: (value: SortKey) => void;
}) {
  const { value, onChange } = props;
  const selectedOption =
    SORT_OPTIONS.find((option) => option.value === value) ?? null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-[7.5rem] items-center justify-between gap-1.5 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-page) px-3 text-left",
            "text-[13px] leading-none font-medium text-(--oboon-text-title) sm:h-10 sm:w-auto sm:gap-2 sm:px-4 sm:text-sm sm:leading-normal",
          )}
          aria-label="정렬 선택"
        >
          <span className="truncate sm:hidden">
            {selectedOption?.mobileLabel ?? "정렬"}
          </span>
          <span className="hidden truncate sm:inline">
            {selectedOption?.label ?? "정렬"}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-(--oboon-text-muted) sm:h-4 sm:w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" matchTriggerWidth>
        {SORT_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            className={cn(
              "flex items-center justify-between gap-2 whitespace-nowrap",
              option.value === value ? "bg-(--oboon-bg-subtle)" : "",
            )}
            onClick={() => onChange(option.value)}
          >
            <span className="sm:hidden">{option.mobileLabel}</span>
            <span className="hidden sm:inline">{option.label}</span>
            {option.value === value ? (
              <Check className="h-4 w-4 text-(--oboon-primary)" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Skeleton className="aspect-square w-[72px] shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-7 w-20 shrink-0 rounded-full" />
      </div>

      <div className="mt-3 h-px w-full bg-(--oboon-border-default)" />

      <div className="mt-3 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-4" />
          <Skeleton className="h-4" />
          <Skeleton className="h-4" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-14" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-2 flex-1 rounded-full" />
            <Skeleton className="h-4 w-10" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopSkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
        <Skeleton className="h-12 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-3" />
          <Skeleton className="h-3" />
          <Skeleton className="h-3" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
        </div>
        <Skeleton className="h-9 rounded-full" />
      </div>
    </div>
  );
}

export default function RecommendationsPage() {
  const cardRefs = useRef(new Map<number, HTMLDivElement>());
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [desktopView, setDesktopView] = useState<"list" | "map">("list");
  const [flipState, setFlipState] = useState<{
    id: number | null;
    scope: string;
  }>({
    id: null,
    scope: "",
  });

  const {
    condition,
    mode,
    results,
    selectedId,
    selectedItem,
    isBootstrapping,
    isEvaluating,
    catalogError,
    requestError,
    validationError,
    changeMode,
    updateCondition,
    evaluate,
    setSelectedId,
  } = useRecommendations();

  useEffect(() => {
    document.title = "맞춤 현장 | OBOON";
  }, []);

  const registerCardRef = useCallback(
    (id: number, node: HTMLDivElement | null) => {
      if (node) {
        cardRefs.current.set(id, node);
        return;
      }
      cardRefs.current.delete(id);
    },
    [],
  );

  const scrollToCard = useCallback((id: number) => {
    const node = cardRefs.current.get(id);
    if (!node) return;

    node.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, []);

  const handleSelectFromCard = useCallback(
    (id: number) => {
      setSelectedId(id);
    },
    [setSelectedId],
  );

  const handleSelectFromMap = useCallback(
    (id: number) => {
      setSelectedId(id);
      requestAnimationFrame(() => {
        scrollToCard(id);
      });
    },
    [scrollToCard, setSelectedId],
  );

  const sortedResults = useMemo(() => {
    const next = [...results];

    if (sortKey === "burden") {
      return next.sort(
        (a, b) =>
          compareNullableNumber(
            a.evalResult.metrics.monthlyBurdenPercent,
            b.evalResult.metrics.monthlyBurdenPercent,
            "asc",
          ) ||
          compareNullableNumber(
            a.evalResult.totalScore,
            b.evalResult.totalScore,
            "desc",
          ) ||
          compareNullableNumber(
            a.evalResult.metrics.minCash,
            b.evalResult.metrics.minCash,
            "asc",
          ),
      );
    }

    if (sortKey === "cash") {
      return next.sort(
        (a, b) =>
          compareNullableNumber(
            a.evalResult.metrics.minCash,
            b.evalResult.metrics.minCash,
            "asc",
          ) ||
          compareNullableNumber(
            a.evalResult.totalScore,
            b.evalResult.totalScore,
            "desc",
          ) ||
          compareNullableNumber(
            a.evalResult.metrics.monthlyBurdenPercent,
            b.evalResult.metrics.monthlyBurdenPercent,
            "asc",
          ),
      );
    }

    return next.sort(compareByDefault);
  }, [results, sortKey]);

  const gradeCounts = useMemo(
    () =>
      sortedResults.reduce(
        (acc, item) => {
          if (item.evalResult.finalGrade === "GREEN") acc.GREEN += 1;
          else if (item.evalResult.finalGrade === "YELLOW") acc.YELLOW += 1;
          else acc.RED += 1;
          return acc;
        },
        { GREEN: 0, YELLOW: 0, RED: 0 },
      ),
    [sortedResults],
  );
  const flipScope = useMemo(
    () =>
      `${desktopView}:${sortKey}:${sortedResults.map((item) => item.property.id).join(",")}`,
    [desktopView, sortKey, sortedResults],
  );
  const flippedId = flipState.scope === flipScope ? flipState.id : null;

  const handleFlipFromCard = useCallback(
    (id: number) => {
      setSelectedId(id);
      setFlipState((prev) => ({
        id: prev.scope === flipScope && prev.id === id ? null : id,
        scope: flipScope,
      }));
    },
    [flipScope, setSelectedId],
  );

  const activeError = validationError ?? requestError;
  const showSkeleton = isBootstrapping || (isEvaluating && results.length === 0);
  const shouldShowEmpty =
    !showSkeleton && !activeError && !catalogError && results.length === 0;
  const showResultToolbar = sortedResults.length > 0;

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pt-3 sm:pt-4 md:pt-4 pb-10">
        <div className="space-y-4">
          <div>
            <div className="ob-typo-h1 text-(--oboon-text-title)">
              맞춤 현장
            </div>
            <p className="mt-1 mb-4 ob-typo-body text-(--oboon-text-muted)">
              보유 현금, 월 소득, 주택 수, 신용 상태와 구매 목적을 기준으로
              지금 조건에 맞는 분양 현장을 빠르게 비교해보세요.
            </p>
          </div>

          <MobileConditionSheet
            condition={condition}
            mode={mode}
            errorMessage={activeError}
            isLoading={isEvaluating}
            onChange={updateCondition}
            onEvaluate={evaluate}
            onModeChange={changeMode}
          />

          <div className="hidden rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-5 sm:block">
            <RecommendationConditionPanel
              condition={condition}
              mode={mode}
              isLoading={isEvaluating}
              onChange={updateCondition}
              onEvaluate={() => void evaluate()}
              onModeChange={changeMode}
            />
          </div>

          {showResultToolbar ? (
            <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:mb-5">
              <div className="flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap">
                <ResultChip
                  label="충족"
                  count={gradeCounts.GREEN}
                  tone="GREEN"
                />
                <ResultChip
                  label="검토"
                  count={gradeCounts.YELLOW}
                  tone="YELLOW"
                />
              </div>

              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <SortDropdown
                  value={sortKey}
                  onChange={(nextSortKey) => {
                    setSortKey(nextSortKey);
                    setFlipState({ id: null, scope: "" });
                  }}
                />
                <div>
                  <OfferingsViewToggle
                    value={desktopView}
                    onChange={(nextView) => {
                      setDesktopView(nextView);
                      setFlipState({ id: null, scope: "" });
                    }}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {activeError ? (
            <div className="rounded-2xl border border-(--oboon-danger-border) bg-(--oboon-danger-bg) px-4 py-3">
              <p className="ob-typo-body text-(--oboon-danger-text)">{activeError}</p>
            </div>
          ) : null}

          {catalogError ? (
            <div className="rounded-2xl border border-(--oboon-warning-border) bg-(--oboon-warning-bg-subtle) px-4 py-3">
              <p className="ob-typo-body text-(--oboon-warning-text)">
                {catalogError}
              </p>
            </div>
          ) : null}

          {desktopView === "list" ? (
            <section>
              <div className="space-y-3">
                {showSkeleton ? (
                  <>
                    <p className="text-center ob-typo-caption text-(--oboon-text-muted)">
                      조건을 입력하고 평가하면 맞춤 현장이 나타납니다.
                    </p>
                    <div className="space-y-3 sm:hidden">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <SkeletonCard key={index} />
                      ))}
                    </div>
                    <div className="hidden grid-cols-2 gap-4 sm:grid lg:grid-cols-3">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <DesktopSkeletonCard key={index} />
                      ))}
                    </div>
                  </>
                ) : null}

                {shouldShowEmpty ? (
                  <EmptyState
                    icon={
                      <svg viewBox="0 0 56 56" fill="none" aria-hidden="true" className="h-14 w-14">
                        <circle cx="28" cy="22" r="10" stroke="currentColor" strokeWidth="2.5" />
                        <path d="M14 44c0-7.732 6.268-14 14-14s14 6.268 14 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="22" y1="22" x2="34" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    }
                    title="맞춤 현장을 찾지 못했어요"
                    description="조건을 조정하고 다시 평가해보세요."
                  />
                ) : null}

                {!showSkeleton && sortedResults.length > 0
                  ? (
                    <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0 lg:grid-cols-3">
                      {sortedResults.map((item) => (
                        <div
                          key={item.property.id}
                          ref={(node) => registerCardRef(item.property.id, node)}
                          className="min-w-0"
                        >
                          <div className="sm:hidden">
                            <RecommendationOfferingCard
                              property={item}
                              isSelected={selectedId === item.property.id}
                              onClick={() => handleSelectFromCard(item.property.id)}
                            />
                          </div>
                          <div className="hidden sm:block">
                            <FlippableRecommendationCard
                              item={item}
                              isSelected={selectedId === item.property.id}
                              isFlipped={flippedId === item.property.id}
                              disableFlip={item.evalResult.isMasked}
                              onFlip={() => handleFlipFromCard(item.property.id)}
                              onSelect={() => handleSelectFromCard(item.property.id)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                  : null}
              </div>
            </section>
          ) : (
            <aside className="h-[420px] sm:h-[520px] md:h-[620px]">
              <div className="relative h-full">
                <MiniMap
                  items={sortedResults}
                  selectedId={selectedId}
                  onSelect={handleSelectFromMap}
                />

                {selectedItem ? (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-4">
                    <div className="pointer-events-auto mx-auto w-full max-w-2xl">
                      <RecommendationOfferingCard
                        property={selectedItem}
                        isSelected
                        onClick={() => handleSelectFromCard(selectedItem.property.id)}
                        flushImageToEdge
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </aside>
          )}
        </div>
      </PageContainer>
    </main>
  );
}
