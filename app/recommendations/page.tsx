"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import { Check, ChevronDown, Search, SlidersHorizontal } from "lucide-react";

import PageContainer from "@/components/shared/PageContainer";
import IconButton from "@/components/ui/IconButton";
import { EmptyState } from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import OfferingsViewToggle from "@/features/offerings/components/OfferingsViewToggle";
import RecommendationCardSkeleton from "@/features/recommendations/components/RecommendationCardSkeleton";
import RecommendationResultChips from "@/features/recommendations/components/RecommendationResultChips";
import type {
  RecommendationCondition,
  RecommendationItem,
  RecommendationMode,
} from "@/features/recommendations/hooks/useRecommendations";
import {
  useRecommendations,
} from "@/features/recommendations/hooks/useRecommendations";
import {
  shouldShowMatchedRecommendationForPropertyListing,
  classifyRecommendationForPropertyListing,
} from "@/features/recommendations/lib/recommendation-visibility.mjs";
import { cn } from "@/lib/utils/cn";
import { Copy } from "@/shared/copy";
import { Skeleton } from "@/components/ui/Skeleton";

type RecommendationConditionPanelProps = {
  condition: RecommendationCondition;
  mode: RecommendationMode;
  isLoggedIn?: boolean;
  hasSavedConditionPreset?: boolean;
  isConditionDirty?: boolean;
  errorMessage?: string | null;
  isLoading?: boolean;
  isSaving?: boolean;
  onChange: (patch: Partial<RecommendationCondition>) => void;
  onEvaluate: (override?: RecommendationCondition) => void | Promise<boolean>;
  onSave?: () => void | Promise<boolean>;
  onLoginAndSave?: () => void | Promise<void>;
  onRestoreDefault?: () => boolean;
  onModeChange: (mode: RecommendationMode) => void;
};

type MobileConditionSheetProps = {
  condition: RecommendationCondition;
  isLoggedIn?: boolean;
};

type FlippableRecommendationCardProps = {
  item: RecommendationItem;
  recommendationTier?: "primary" | "alternative" | "informational";
  isSelected: boolean;
  isFlipped: boolean;
  disableFlip?: boolean;
  onFlip: () => void;
  onSelect: () => void;
};

type OfferingCardProps = {
  offering: RecommendationItem["offering"];
  evalResult: RecommendationItem["evalResult"];
  recommendationTier?: "primary" | "alternative" | "informational";
  navigateOnClick: boolean;
  isSelected: boolean;
  onCardClick: () => void;
  interactionMode: "link" | "button";
};

type MiniMapProps = {
  items: RecommendationItem[];
  gradeCounts: {
    GREEN: number;
    LIME: number;
    ALTERNATIVE: number;
  };
  selectedId: number | null;
  onSelect: (id: number) => void;
};

type RecommendationUnitTypeSheetProps = {
  item: RecommendationItem | null;
  onClose: () => void;
};

const RecommendationConditionPanel = dynamic(
  () => import("@/features/recommendations/components/RecommendationConditionPanel"),
  {
    ssr: false,
    loading: () => <RecommendationConditionPanelSkeleton />,
  },
) as unknown as ComponentType<RecommendationConditionPanelProps>;

const MobileConditionSheet = dynamic(
  () => import("@/features/recommendations/components/MobileConditionSheet"),
  {
    ssr: false,
    loading: () => <MobileConditionSheetSkeleton />,
  },
) as unknown as ComponentType<MobileConditionSheetProps>;

const FlippableRecommendationCard = dynamic(
  () => import("@/features/recommendations/components/FlippableRecommendationCard"),
  {
    ssr: false,
    loading: () => <RecommendationCardSkeleton size="desktop" />,
  },
) as unknown as ComponentType<FlippableRecommendationCardProps>;

const OfferingCard = dynamic(
  () => import("@/features/offerings/components/OfferingCard"),
  {
    ssr: false,
    loading: () => <RecommendationCardSkeleton size="mobile" />,
  },
) as unknown as ComponentType<OfferingCardProps>;

const MiniMap = dynamic(
  () => import("@/features/recommendations/components/MiniMap"),
  {
    ssr: false,
    loading: () => <MiniMapSkeleton />,
  },
) as unknown as ComponentType<MiniMapProps>;

const RecommendationUnitTypeSheet = dynamic(
  () => import("@/features/recommendations/components/RecommendationUnitTypeSheet"),
  {
    ssr: false,
    loading: () => null,
  },
) as unknown as ComponentType<RecommendationUnitTypeSheetProps>;

function MiniMapSkeleton() {
  return (
    <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-[500px] w-full rounded-2xl sm:h-[520px] md:h-[620px]" />
      </div>
    </div>
  );
}

function RecommendationConditionPanelSkeleton() {
  return (
    <div className="space-y-4 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
      <div className="flex gap-1 rounded-full bg-(--oboon-bg-subtle) p-1">
        <Skeleton className="h-9 flex-1 rounded-full" />
        <Skeleton className="h-9 flex-1 rounded-full" />
      </div>
      <Skeleton className="h-px w-full" />
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    </div>
  );
}

function MobileConditionSheetSkeleton() {
  return (
    <div className="sm:hidden">
      <Skeleton className="h-[72px] w-full rounded-2xl" />
    </div>
  );
}

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
            "flex h-9 w-[6rem] items-center justify-between gap-1.5 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-3 text-left",
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

export default function RecommendationsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const cardRefs = useRef(new Map<number, HTMLDivElement>());
  const viewParam = searchParams.get("view");
  const resolvedDesktopView = viewParam === "list" ? "list" : "map";
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [desktopView, setDesktopView] = useState<"list" | "map">(resolvedDesktopView);
  const [desktopFilterOpen, setDesktopFilterOpen] = useState(true);
  const [deferredPanelsReady, setDeferredPanelsReady] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [flipState, setFlipState] = useState<{
    id: number | null;
    scope: string;
  }>({
    id: null,
    scope: "",
  });
  const [mobileUnitSheetItem, setMobileUnitSheetItem] =
    useState<RecommendationItem | null>(null);

  const {
    condition,
    mode,
    results,
    selectedId,
    isBootstrapping,
    isEvaluating,
    isLoggedIn,
    catalogError,
    requestError,
    validationError,
    changeMode,
    updateCondition,
    evaluate,
    saveCondition,
    loginAndSaveCondition,
    restoreSavedCondition,
    isSavingCondition,
    hasSavedConditionPreset,
    hasEvaluatedOnce,
    isConditionDirty,
    setSelectedId,
  } = useRecommendations();

  useEffect(() => {
    document.title = "맞춤 현장 | OBOON";
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDeferredPanelsReady(true);
    }, 350);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    setDesktopView(resolvedDesktopView);
  }, [resolvedDesktopView]);

  useLayoutEffect(() => {
    if (!hasEvaluatedOnce || isBootstrapping || isEvaluating) return;
    setDesktopFilterOpen(false);
  }, [hasEvaluatedOnce, isBootstrapping, isEvaluating]);

  const updateDesktopView = useCallback(
    (nextView: "list" | "map") => {
      setDesktopView(nextView);
      setFlipState({ id: null, scope: "" });

      const nextSearchParams = new URLSearchParams(searchParams.toString());
      if (nextView === "map") {
        nextSearchParams.delete("view");
      } else {
        nextSearchParams.set("view", nextView);
      }

      const nextQuery = nextSearchParams.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

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
      if (selectedId === id) {
        router.push(`/offerings/${id}`);
        return;
      }

      const nextSelectedId = id > 0 ? id : null;
      setSelectedId(nextSelectedId);
      if (nextSelectedId !== null) {
        requestAnimationFrame(() => {
          scrollToCard(nextSelectedId);
        });
      }
    },
    [router, scrollToCard, selectedId, setSelectedId],
  );

  const applySearchQuery = useCallback(() => {
    setSearchQuery(searchInput);
  }, [searchInput]);

  const handleEvaluate = useCallback(async (override?: RecommendationCondition) => {
    const ok = await evaluate(override);
    if (ok) {
      setDesktopFilterOpen(false);
    }
    return ok;
  }, [evaluate]);

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const searchedResults = useMemo(() => {
    if (!normalizedSearchQuery) return results;

    return results.filter((item) =>
      [
        item.property.name,
        item.property.addressShort,
        item.property.regionLabel,
        item.property.propertyType ?? "",
        item.property.statusLabel,
      ].some((value) => value.toLowerCase().includes(normalizedSearchQuery)),
    );
  }, [normalizedSearchQuery, results]);

  const sortedResults = useMemo(() => {
    const next = [...searchedResults];

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
  }, [searchedResults, sortKey]);

  const { primaryItems, alternativeItems } = useMemo(() => {
    const primary: RecommendationItem[] = [];
    const alternative: RecommendationItem[] = [];
    for (const item of sortedResults) {
      const isMatched = shouldShowMatchedRecommendationForPropertyListing({
        cash: item.evalResult.categories.cash.grade,
        income: item.evalResult.categories.income.grade,
        ltvDsr: item.evalResult.categories.ltvDsr?.grade,
        ownership: item.evalResult.categories.ownership.grade,
        purpose: item.evalResult.categories.purpose.grade,
        timing: item.evalResult.categories.timing?.grade,
      });
      const isAlternative = classifyRecommendationForPropertyListing({
        cash: item.evalResult.categories.cash.grade,
        income: item.evalResult.categories.income.grade,
        ltvDsr: item.evalResult.categories.ltvDsr?.grade,
        ownership: item.evalResult.categories.ownership.grade,
        timing: item.evalResult.categories.timing?.grade,
      });
      if (isMatched) primary.push(item);
      else if (isAlternative === "primary" || isAlternative === "alternative") {
        alternative.push(item);
      }
    }
    return { primaryItems: primary, alternativeItems: alternative };
  }, [sortedResults]);

  const visibleRecommendationIds = useMemo(
    () =>
      new Set(
        [...primaryItems, ...alternativeItems].map((item) => item.property.id),
      ),
    [alternativeItems, primaryItems],
  );

  const typeAvailableItems = useMemo(
    () =>
      sortedResults.filter(
        (item) =>
          !visibleRecommendationIds.has(item.property.id) &&
          item.unitTypes.some((unitType) => unitType.passesCategoryVisibility),
      ),
    [sortedResults, visibleRecommendationIds],
  );

  const gradeCounts = useMemo(
    () => ({
      GREEN: primaryItems.filter((i) => i.evalResult.finalGrade === "GREEN").length,
      LIME: primaryItems.filter((i) => i.evalResult.finalGrade === "LIME").length,
      ALTERNATIVE: alternativeItems.length,
    }),
    [primaryItems, alternativeItems],
  );
  const flipScope = useMemo(
    () =>
      `${desktopView}:${sortKey}:${sortedResults.map((item) => item.property.id).join(",")}`,
    [desktopView, sortKey, sortedResults],
  );
  const flippedId = flipState.scope === flipScope ? flipState.id : null;
  const visibleSelectedId = sortedResults.some(
    (item) => item.property.id === selectedId,
  )
    ? selectedId
    : null;

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
  const shouldShowSearchEmpty =
    !showSkeleton &&
    !activeError &&
    !catalogError &&
    results.length > 0 &&
    sortedResults.length === 0;
  const showResultToolbar = sortedResults.length > 0;

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer>
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

          <div className="space-y-3 sm:hidden">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label className="sr-only" htmlFor="recommendation-search-mobile">
                  검색
                </Label>
                <Input
                  id="recommendation-search-mobile"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder={Copy.offerings.search.placeholder}
                  className={cn(
                    "h-10 w-full rounded-xl px-5 ob-typo-body",
                    "outline-none focus:ring-2 focus:ring-(--oboon-primary)/30",
                  )}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      applySearchQuery();
                    }
                  }}
                  aria-label="맞춤 현장 검색"
                />
              </div>

              <IconButton
                icon={<Search className="h-4 w-4" />}
                aria-label="검색"
                variant="fill"
                size="md"
                shape="circle"
                onClick={applySearchQuery}
              />
            </div>

            {deferredPanelsReady ? (
              <MobileConditionSheet
                condition={condition}
                isLoggedIn={isLoggedIn}
              />
            ) : (
              <MobileConditionSheetSkeleton />
            )}

            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              {showResultToolbar ? (
                <RecommendationResultChips counts={gradeCounts} />
              ) : (
                <div />
              )}
              <div className="flex shrink-0 items-center gap-2">
                <SortDropdown
                  value={sortKey}
                  onChange={(nextSortKey) => {
                    setSortKey(nextSortKey);
                    setFlipState({ id: null, scope: "" });
                  }}
                />
                <OfferingsViewToggle
                  value={desktopView}
                  onChange={updateDesktopView}
                />
              </div>
            </div>

            {!showResultToolbar && results.length > 0 ? (
              <p className="ob-typo-caption text-(--oboon-text-muted)">
                검색 조건에 맞는 현장을 찾지 못했어요.
              </p>
            ) : null}
          </div>

          <div className="hidden sm:block">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label className="sr-only" htmlFor="recommendation-search">
                  검색
                </Label>
                <Input
                  id="recommendation-search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder={Copy.offerings.search.placeholder}
                  className={cn(
                    "h-10 w-full rounded-xl px-5 ob-typo-body",
                    "outline-none focus:ring-2 focus:ring-(--oboon-primary)/30",
                  )}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      applySearchQuery();
                    }
                  }}
                  aria-label="맞춤 현장 검색"
                />
              </div>

              <IconButton
                icon={<Search className="h-4 w-4" />}
                aria-label="검색"
                variant="fill"
                size="md"
                shape="circle"
                onClick={applySearchQuery}
              />

              <SortDropdown
                value={sortKey}
                onChange={(nextSortKey) => {
                  setSortKey(nextSortKey);
                  setFlipState({ id: null, scope: "" });
                }}
              />

              <OfferingsViewToggle
                value={desktopView}
                onChange={updateDesktopView}
              />

              <IconButton
                icon={
                  <SlidersHorizontal
                    className={cn(
                      "h-5 w-5 transition-colors",
                      desktopFilterOpen
                        ? "text-(--oboon-on-primary)"
                        : "text-(--oboon-text-muted)",
                    )}
                  />
                }
                aria-label="필터"
                variant="fill"
                size="md"
                shape="circle"
                aria-expanded={desktopFilterOpen}
                onClick={() => setDesktopFilterOpen((prev) => !prev)}
              />
            </div>

            {desktopFilterOpen ? (
              <div className="mt-4 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-5">
                {!deferredPanelsReady ? (
                  <RecommendationConditionPanelSkeleton />
                ) : (
                  <RecommendationConditionPanel
                    condition={condition}
                    mode={mode}
                    isLoggedIn={isLoggedIn}
                    hasSavedConditionPreset={hasSavedConditionPreset}
                    isConditionDirty={isConditionDirty}
                    isLoading={isEvaluating}
                    isSaving={isSavingCondition}
                    onChange={updateCondition}
                    onEvaluate={handleEvaluate}
                    onSave={saveCondition}
                    onLoginAndSave={loginAndSaveCondition}
                    onRestoreDefault={restoreSavedCondition}
                    onModeChange={changeMode}
                  />
                )}
              </div>
            ) : null}

            {results.length > 0 && !showResultToolbar ? (
              <p className="mt-3 ob-typo-caption text-(--oboon-text-muted)">
                검색 조건에 맞는 현장을 찾지 못했어요.
              </p>
            ) : null}
          </div>

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
                        <RecommendationCardSkeleton key={index} size="mobile" seed={index} />
                      ))}
                    </div>
                    <div className="hidden grid-cols-2 gap-4 sm:grid lg:grid-cols-3">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <RecommendationCardSkeleton key={index} size="desktop" seed={index} />
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

                {shouldShowSearchEmpty ? (
                  <EmptyState
                    icon={
                      <svg viewBox="0 0 56 56" fill="none" aria-hidden="true" className="h-14 w-14">
                        <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="2.5" />
                        <line x1="34.8" y1="34.8" x2="48" y2="48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    }
                    title="검색 결과가 없어요"
                    description="다른 검색어로 다시 찾아보세요."
                  />
                ) : null}

                {!showSkeleton && primaryItems.length > 0 ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-(--oboon-grade-green-border) bg-linear-to-r from-(--oboon-grade-green-bg)/55 to-transparent px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-(--oboon-grade-green)" />
                        <p className="ob-typo-body2 font-semibold text-(--oboon-text-title)">추천 현장</p>
                        <span className="ob-typo-caption text-(--oboon-text-muted)">{primaryItems.length}개</span>
                      </div>
                      <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                        현재 조건에서 우선 검토해볼 현장입니다.
                      </p>
                    </div>
                    <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0 lg:grid-cols-3">
                      {primaryItems.map((item) => (
                        <div
                          key={item.property.id}
                          ref={(node) => registerCardRef(item.property.id, node)}
                          className="min-w-0 space-y-3"
                        >
                          <div className="sm:hidden">
                            <OfferingCard
                              offering={item.offering}
                              evalResult={item.evalResult}
                              recommendationTier="primary"
                              navigateOnClick={false}
                              isSelected={visibleSelectedId === Number(item.offering.id)}
                              onCardClick={() => {
                                handleSelectFromCard(Number(item.offering.id));
                                setMobileUnitSheetItem(item);
                              }}
                              interactionMode="button"
                            />
                          </div>
                          <div className="hidden sm:block">
                            <FlippableRecommendationCard
                              item={item}
                              recommendationTier="primary"
                              isSelected={visibleSelectedId === item.property.id}
                              isFlipped={flippedId === item.property.id}
                              disableFlip={item.evalResult.isMasked}
                              onFlip={() => handleFlipFromCard(item.property.id)}
                              onSelect={() => handleSelectFromCard(item.property.id)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {!showSkeleton && alternativeItems.length > 0 ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-(--oboon-grade-yellow-border) bg-linear-to-r from-(--oboon-grade-yellow-bg)/55 to-transparent px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-(--oboon-grade-yellow)" />
                        <p className="ob-typo-body2 font-semibold text-(--oboon-text-title)">대안 현장</p>
                        <span className="ob-typo-caption text-(--oboon-text-muted)">{alternativeItems.length}개</span>
                      </div>
                      <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                        한두 항목이 아쉽지만 조건 조정이나 비교 후보로 볼 수 있습니다.
                      </p>
                    </div>
                    <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0 lg:grid-cols-3">
                      {alternativeItems.map((item) => (
                        <div
                          key={item.property.id}
                          ref={(node) => registerCardRef(item.property.id, node)}
                          className="min-w-0 space-y-3"
                        >
                          <div className="sm:hidden">
                            <OfferingCard
                              offering={item.offering}
                              evalResult={item.evalResult}
                              recommendationTier="informational"
                              navigateOnClick={false}
                              isSelected={visibleSelectedId === Number(item.offering.id)}
                              onCardClick={() => {
                                handleSelectFromCard(Number(item.offering.id));
                                setMobileUnitSheetItem(item);
                              }}
                              interactionMode="button"
                            />
                          </div>
                          <div className="hidden sm:block">
                            <FlippableRecommendationCard
                              item={item}
                              recommendationTier="informational"
                              isSelected={visibleSelectedId === item.property.id}
                              isFlipped={flippedId === item.property.id}
                              disableFlip={item.evalResult.isMasked}
                              onFlip={() => handleFlipFromCard(item.property.id)}
                              onSelect={() => handleSelectFromCard(item.property.id)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {!showSkeleton && typeAvailableItems.length > 0 ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-(--oboon-badge-selected-border) bg-linear-to-r from-(--oboon-badge-selected-bg) to-transparent px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-(--oboon-primary)" />
                        <p className="ob-typo-body2 font-semibold text-(--oboon-text-title)">타입 가능 현장</p>
                        <span className="ob-typo-caption text-(--oboon-text-muted)">{typeAvailableItems.length}개</span>
                      </div>
                      <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                        현장 전체 조건은 아쉽지만, 일부 타입은 조건상 확인할 수 있는 현장입니다.
                      </p>
                    </div>
                    <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0 lg:grid-cols-3">
                      {typeAvailableItems.map((item) => (
                        <div
                          key={item.property.id}
                          ref={(node) => registerCardRef(item.property.id, node)}
                          className="min-w-0 space-y-3"
                        >
                          <div className="sm:hidden">
                            <OfferingCard
                              offering={item.offering}
                              evalResult={item.evalResult}
                              recommendationTier="alternative"
                              navigateOnClick={false}
                              isSelected={visibleSelectedId === Number(item.offering.id)}
                              onCardClick={() => {
                                handleSelectFromCard(Number(item.offering.id));
                                setMobileUnitSheetItem(item);
                              }}
                              interactionMode="button"
                            />
                          </div>
                          <div className="hidden sm:block">
                            <FlippableRecommendationCard
                              item={item}
                              recommendationTier="informational"
                              isSelected={visibleSelectedId === item.property.id}
                              isFlipped={flippedId === item.property.id}
                              disableFlip={item.evalResult.isMasked}
                              onFlip={() => handleFlipFromCard(item.property.id)}
                              onSelect={() => handleSelectFromCard(item.property.id)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          ) : (
            <aside className="h-[500px] sm:h-[520px] md:h-[620px]">
              <div className="relative h-full">
                {!deferredPanelsReady ? (
                  <MiniMapSkeleton />
                ) : (
                  <MiniMap
                    items={[...primaryItems, ...alternativeItems]}
                    gradeCounts={gradeCounts}
                    selectedId={visibleSelectedId}
                    onSelect={handleSelectFromMap}
                  />
                )}
              </div>
            </aside>
          )}
        </div>
      </PageContainer>

      <RecommendationUnitTypeSheet
        item={mobileUnitSheetItem}
        onClose={() => setMobileUnitSheetItem(null)}
      />
    </main>
  );
}
