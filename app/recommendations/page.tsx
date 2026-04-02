"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, SlidersHorizontal } from "lucide-react";

import PageContainer from "@/components/shared/PageContainer";
import Button from "@/components/ui/Button";
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
import Link from "next/link";
import FlippableRecommendationCard from "@/features/recommendations/components/FlippableRecommendationCard";
import MiniMap from "@/features/recommendations/components/MiniMap";
import MobileConditionSheet from "@/features/recommendations/components/MobileConditionSheet";
import RecommendationOfferingCard from "@/features/recommendations/components/OfferingCard";
import RecommendationCardSkeleton from "@/features/recommendations/components/RecommendationCardSkeleton";
import RecommendationConditionPanel from "@/features/recommendations/components/RecommendationConditionPanel";
import { RecommendationPreviewContent } from "@/features/recommendations/components/GaugeOverlay";
import { grade5DetailLabel } from "@/features/condition-validation/lib/grade5Labels";
import type {
  RecommendationCondition,
  RecommendationItem,
} from "@/features/recommendations/hooks/useRecommendations";
import { ROUTES } from "@/types/index";
import {
  useRecommendations,
} from "@/features/recommendations/hooks/useRecommendations";
import { cn } from "@/lib/utils/cn";
import { Copy } from "@/shared/copy";

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

function MobileCardDetailSheet(props: {
  item: RecommendationItem | null;
  onClose: () => void;
}) {
  const { item, onClose } = props;
  if (!item) return null;

  return (
    <div className="sm:hidden">
      <div
        className="fixed inset-0 z-(--oboon-z-modal) bg-(--oboon-overlay) backdrop-blur-sm"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
        aria-hidden="true"
      />
      <div className="fixed inset-x-0 bottom-0 z-(--oboon-z-modal) flex max-h-[88dvh] flex-col rounded-t-xl border border-b-0 border-(--oboon-border-default) bg-(--oboon-bg-surface) shadow-(--oboon-shadow-card)">

        {/* 콘텐츠 (스크롤) */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <RecommendationPreviewContent
            property={item.property}
            evalResult={item.evalResult}
            showFinalBadge
            showSummary
          />
        </div>

        {/* CTA (고정) */}
        <div className="shrink-0 border-t border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-5 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          <Button asChild variant="primary" shape="pill" className="w-full">
            <Link href={ROUTES.offerings.detail(item.property.id)}>
              현장 상세 보기
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function ResultChip(props: {
  label: string;
  count: number;
  tone: "GREEN" | "LIME" | "YELLOW";
}) {
  const { label, count, tone } = props;

  const toneClassName =
    tone === "GREEN"
      ? "bg-(--oboon-grade-green-bg) text-(--oboon-grade-green-text)"
      : tone === "LIME"
      ? "bg-(--oboon-grade-lime-bg) text-(--oboon-grade-lime-text)"
      : "bg-(--oboon-grade-yellow-bg) text-(--oboon-grade-yellow-text)";

  const dotColor =
    tone === "GREEN"
      ? "bg-(--oboon-grade-green)"
      : tone === "LIME"
      ? "bg-(--oboon-grade-lime)"
      : "bg-(--oboon-grade-yellow)";

  if (count === 0) return null;

  return (
    <>
      {/* 모바일: 컬러 점 + 숫자 */}
      <span className="inline-flex items-center gap-1.5 ob-typo-body text-(--oboon-text-muted) sm:hidden">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", dotColor)} />
        {count}개
      </span>

      {/* 데스크탑: 기존 필 배지 */}
      <span
        className={cn(
          "hidden sm:inline-flex items-center gap-1 rounded-full px-2.5 py-1 ob-typo-caption",
          toneClassName,
        )}
      >
        {label} {count}개
      </span>
    </>
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
  const cardRefs = useRef(new Map<number, HTMLDivElement>());
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [desktopView, setDesktopView] = useState<"list" | "map">("map");
  const [desktopFilterOpen, setDesktopFilterOpen] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [flipState, setFlipState] = useState<{
    id: number | null;
    scope: string;
  }>({
    id: null,
    scope: "",
  });
  const [mobileDetailItem, setMobileDetailItem] = useState<RecommendationItem | null>(null);

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
    isSavingCondition,
    hasSavedConditionPreset,
    isConditionDirty,
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

  const gradeCounts = useMemo(
    () =>
      sortedResults.reduce(
        (acc, item) => {
          const grade = item.evalResult.finalGrade;
          if (grade === "GREEN") acc.GREEN += 1;
          else if (grade === "LIME") acc.LIME += 1;
          else if (grade === "YELLOW" || grade === "ORANGE") acc.YELLOW += 1;
          return acc;
        },
        { GREEN: 0, LIME: 0, YELLOW: 0 },
      ),
    [sortedResults],
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

              <Button
                type="button"
                variant="secondary"
                shape="pill"
                size="md"
                className="h-10 w-10 rounded-full p-0"
                onClick={applySearchQuery}
                aria-label="검색"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <MobileConditionSheet
              condition={condition}
              mode={mode}
              isLoggedIn={isLoggedIn}
              hasSavedConditionPreset={hasSavedConditionPreset}
              isConditionDirty={isConditionDirty}
              errorMessage={activeError}
              isLoading={isEvaluating}
              isSaving={isSavingCondition}
              onChange={updateCondition}
              onEvaluate={handleEvaluate}
              onSave={saveCondition}
              onLoginAndSave={loginAndSaveCondition}
              onModeChange={changeMode}
            />

            {showResultToolbar ? (
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="flex min-w-0 items-center gap-3 sm:gap-2 overflow-hidden whitespace-nowrap">
                  <ResultChip label={grade5DetailLabel("GREEN")} count={gradeCounts.GREEN} tone="GREEN" />
                  <ResultChip label={grade5DetailLabel("LIME")} count={gradeCounts.LIME} tone="LIME" />
                  <ResultChip label={grade5DetailLabel("YELLOW")} count={gradeCounts.YELLOW} tone="YELLOW" />
                </div>
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
                    onChange={(nextView) => {
                      setDesktopView(nextView);
                      setFlipState({ id: null, scope: "" });
                    }}
                  />
                </div>
              </div>
            ) : results.length > 0 ? (
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

              <Button
                type="button"
                variant="secondary"
                shape="pill"
                size="md"
                className="h-10 w-10 rounded-full p-0"
                onClick={applySearchQuery}
                aria-label="검색"
              >
                <Search className="h-4 w-4" />
              </Button>

              <SortDropdown
                value={sortKey}
                onChange={(nextSortKey) => {
                  setSortKey(nextSortKey);
                  setFlipState({ id: null, scope: "" });
                }}
              />

              <OfferingsViewToggle
                value={desktopView}
                onChange={(nextView) => {
                  setDesktopView(nextView);
                  setFlipState({ id: null, scope: "" });
                }}
              />

              <Button
                type="button"
                variant={desktopFilterOpen ? "primary" : "secondary"}
                shape="pill"
                size="md"
                className="h-10 w-10 rounded-full p-0"
                onClick={() => setDesktopFilterOpen((prev) => !prev)}
                aria-expanded={desktopFilterOpen}
                aria-label="필터"
              >
                <SlidersHorizontal
                  className={cn(
                    "h-4 w-4 transition-colors",
                    desktopFilterOpen
                      ? "text-(--oboon-on-primary)"
                      : "text-(--oboon-text-muted)",
                  )}
                />
              </Button>
            </div>

            {desktopFilterOpen ? (
              <div className="mt-4 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-5">
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
                  onModeChange={changeMode}
                />
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
                              isSelected={visibleSelectedId === item.property.id}
                              onClick={() => {
                                handleSelectFromCard(item.property.id);
                                setMobileDetailItem(item);
                              }}
                            />
                          </div>
                          <div className="hidden sm:block">
                            <FlippableRecommendationCard
                              item={item}
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
                  )
                  : null}
              </div>
            </section>
          ) : (
            <aside className="h-[500px] sm:h-[520px] md:h-[620px]">
              <div className="relative h-full">
                <MiniMap
                  items={sortedResults}
                  selectedId={visibleSelectedId}
                  onSelect={handleSelectFromMap}
                />
              </div>
            </aside>
          )}
        </div>
      </PageContainer>

      <MobileCardDetailSheet
        item={mobileDetailItem}
        onClose={() => setMobileDetailItem(null)}
      />
    </main>
  );
}
