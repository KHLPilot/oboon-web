import PageContainer from "@/components/shared/PageContainer";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  briefingGeneralArchiveLoadingConfig,
  briefingHomeLoadingConfig,
  briefingOriginalCategoryLoadingConfig,
  briefingOriginalLoadingConfig,
} from "@/shared/briefing-loading";
import { cx, cardShell } from "./briefing.ui";

function BriefingHeroSkeleton() {
  return (
    <div className="relative h-[360px] overflow-hidden rounded-2xl sm:h-[420px] lg:h-[500px]">
      <Skeleton className="h-full w-full rounded-2xl" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-7 sm:px-9 sm:pb-9 lg:pr-[20%]">
        <Skeleton className="h-7 w-28 rounded-full bg-white/18" animated={false} />
        <div className="mt-4 space-y-3">
          <Skeleton className="h-9 w-full max-w-[640px] rounded-xl bg-white/18" animated={false} />
          <Skeleton className="h-9 w-4/5 max-w-[520px] rounded-xl bg-white/14" animated={false} />
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton className="h-4 w-full max-w-[520px] rounded-lg bg-white/12" animated={false} />
          <Skeleton className="h-4 w-3/4 max-w-[420px] rounded-lg bg-white/10" animated={false} />
        </div>
        <div className="mt-6 flex items-center gap-4">
          <Skeleton className="h-10 w-28 rounded-full bg-white/18" animated={false} />
          <Skeleton className="h-4 w-24 rounded-lg bg-white/10" animated={false} />
        </div>
      </div>
    </div>
  );
}

function BriefingSectionLabelSkeleton() {
  return (
    <div>
      <Skeleton className="h-7 w-40 rounded-lg" />
      <Skeleton className="mt-2 h-4 w-32 rounded-lg" />
    </div>
  );
}

function BriefingTopListSkeleton() {
  return (
    <section>
      <BriefingSectionLabelSkeleton />
      <ol className="mt-6">
        {Array.from({ length: briefingHomeLoadingConfig.topListCount }).map((_, index) => (
          <li
            key={`top-${index}`}
            className="flex items-start gap-4 border-b border-(--oboon-border-default) px-3 py-4"
          >
            <Skeleton className="mt-0.5 h-7 w-7 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-full rounded-lg" />
              <Skeleton className="h-5 w-4/5 rounded-lg" />
              <Skeleton className="h-3 w-20 rounded-lg" />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function BriefingEditorPickSkeleton() {
  return (
    <section className="flex h-full flex-col">
      <BriefingSectionLabelSkeleton />
      <div className="mt-6 grid flex-1 grid-rows-3">
        {Array.from({ length: briefingHomeLoadingConfig.editorPickCount }).map((_, index) => (
          <div
            key={`pick-${index}`}
            className="flex h-full items-center gap-4 border-b border-(--oboon-border-default) px-3 py-4"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-full rounded-lg" />
              <Skeleton className="h-5 w-5/6 rounded-lg" />
              <Skeleton className="h-3 w-2/3 rounded-lg" />
              <Skeleton className="h-3 w-1/2 rounded-lg" />
            </div>
            <Skeleton className="aspect-video w-24 shrink-0 rounded-xl sm:w-32" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function BriefingPostCardSkeleton() {
  return (
    <div className="group block">
      <div className="overflow-hidden p-0 shadow-none">
        <div className="aspect-video w-full overflow-hidden rounded-2xl border border-(--oboon-border-default)">
          <Skeleton className="h-full w-full rounded-2xl" />
        </div>

        <div className="px-0.5 pt-3">
          <div className="mb-2 flex items-center gap-2">
            <Skeleton className="h-3 w-16 rounded-lg" />
            <Skeleton className="h-3 w-10 rounded-full" />
            <Skeleton className="h-3 w-20 rounded-lg" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-5 w-full rounded-lg" />
            <Skeleton className="h-5 w-4/5 rounded-lg" />
          </div>

          <div className="mt-2 space-y-2">
            <Skeleton className="h-4 w-full rounded-lg" />
            <Skeleton className="h-4 w-2/3 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

function BriefingOriginalSeriesSkeleton() {
  return (
    <div
      className={cx(
        cardShell,
        "flex flex-row items-center gap-3 p-0",
        "sm:flex-col sm:items-stretch sm:gap-2 sm:p-0",
      )}
    >
      <Skeleton className="h-[88px] w-[88px] shrink-0 rounded-none rounded-l-[15px] sm:h-auto sm:w-full sm:rounded-none sm:rounded-t-[15px] sm:aspect-4/3" />
      <div className="flex min-w-0 flex-1 flex-col justify-center pr-3 sm:p-4">
        <Skeleton className="h-5 w-4/5 rounded-lg" />
        <Skeleton className="mt-2 h-4 w-20 rounded-lg" />
      </div>
    </div>
  );
}

function BriefingOriginalSectionSkeleton() {
  return (
    <section className="bg-(--oboon-bg-inverse)">
      <div className="mx-auto w-full max-w-240 px-4 pb-10 pt-6 sm:px-5 lg:max-w-300">
        <div>
          <Skeleton className="h-8 w-40 rounded-lg bg-white/12" animated={false} />
          <Skeleton className="mt-3 h-5 w-56 rounded-lg bg-white/8" animated={false} />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-4">
          {Array.from({ length: briefingHomeLoadingConfig.originalSeriesCount }).map(
            (_, index) => (
              <BriefingOriginalSeriesSkeleton key={`series-${index}`} />
            ),
          )}
        </div>

        <div className="mt-10 flex justify-center">
          <Skeleton className="h-12 w-36 rounded-full bg-white/10" animated={false} />
        </div>
      </div>
    </section>
  );
}

function BriefingLatestGridSkeleton() {
  return (
    <section>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-36 rounded-lg" />
          <Skeleton className="mt-2 h-4 w-40 rounded-lg" />
        </div>
        <Skeleton className="h-4 w-16 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: briefingHomeLoadingConfig.latestCardCount }).map(
          (_, index) => (
            <BriefingPostCardSkeleton key={`latest-${index}`} />
          ),
        )}
      </div>
    </section>
  );
}

function BriefingCategoryHeroSkeleton() {
  return (
    <div className="relative min-h-[180px] overflow-hidden rounded-2xl px-6 pb-8 pt-10 md:grid md:min-h-[240px] md:grid-cols-[minmax(0,1fr)_minmax(224px,288px)] md:items-center md:gap-6 md:px-10 md:py-4">
      <Skeleton className="absolute inset-0 h-full w-full rounded-2xl" />
      <div className="relative z-10 md:min-w-0">
        <Skeleton className="h-4 w-24 rounded-lg bg-white/10" animated={false} />
        <Skeleton className="mt-3 h-10 w-40 rounded-xl bg-white/14" animated={false} />
        <Skeleton className="mt-3 h-5 w-64 rounded-lg bg-white/10" animated={false} />
      </div>
      <div className="relative z-10 mt-6 hidden aspect-[4/3] w-full overflow-hidden rounded-xl md:block md:max-w-[288px] md:justify-self-end">
        <Skeleton className="h-full w-full rounded-xl bg-white/10" animated={false} />
      </div>
    </div>
  );
}

function BriefingFilterPillsSkeleton() {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {Array.from({ length: briefingOriginalLoadingConfig.filterPillCount }).map(
        (_, index) => (
          <Skeleton
            key={`pill-${index}`}
            className={cx(
              "h-8 rounded-full",
              index === 0 ? "w-16" : index % 3 === 0 ? "w-20" : "w-14",
            )}
          />
        ),
      )}
    </div>
  );
}

function BriefingOriginalGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-4">
      {Array.from({ length: briefingOriginalLoadingConfig.seriesCardCount }).map(
        (_, index) => (
          <BriefingOriginalSeriesSkeleton key={`original-${index}`} />
        ),
      )}
    </div>
  );
}

export function BriefingHomeLoadingSkeleton() {
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-0">
        <BriefingHeroSkeleton />

        <section className="mb-6 mt-14 grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-10">
          <BriefingTopListSkeleton />
          <BriefingEditorPickSkeleton />
        </section>
      </PageContainer>

      <BriefingOriginalSectionSkeleton />

      <PageContainer className="pb-20 pt-14">
        <BriefingLatestGridSkeleton />
      </PageContainer>
    </main>
  );
}

export function BriefingOriginalLoadingSkeleton() {
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20">
        <div className="mb-6">
          <BriefingCategoryHeroSkeleton />
        </div>
        <BriefingFilterPillsSkeleton />
        <BriefingOriginalGridSkeleton />
      </PageContainer>
    </main>
  );
}

function BriefingInfoBannerSkeleton() {
  return (
    <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-4 py-3">
      <div className="min-w-0 flex-1">
        <Skeleton className="h-4 w-24 rounded-lg" />
        <Skeleton className="mt-2 h-4 w-56 rounded-lg" />
      </div>
      <Skeleton className="h-4 w-16 rounded-lg" />
    </div>
  );
}

function BriefingSearchSkeleton() {
  return (
    <div className="mb-8 flex items-center gap-3">
      <Skeleton className="h-10 flex-1 rounded-xl" />
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
    </div>
  );
}

function BriefingArchiveGridSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <BriefingPostCardSkeleton key={`archive-${index}`} />
      ))}
    </div>
  );
}

export function BriefingGeneralArchiveLoadingSkeleton() {
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20">
        <div className="mb-10">
          <BriefingCategoryHeroSkeleton />
        </div>
        <BriefingInfoBannerSkeleton />
        <BriefingSearchSkeleton />
        <BriefingArchiveGridSkeleton
          count={briefingGeneralArchiveLoadingConfig.cardCount}
        />
      </PageContainer>
    </main>
  );
}

export function BriefingOriginalCategoryLoadingSkeleton() {
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20">
        <div className="mb-10">
          <BriefingCategoryHeroSkeleton />
        </div>
        <BriefingArchiveGridSkeleton
          count={briefingOriginalCategoryLoadingConfig.cardCount}
        />
      </PageContainer>
    </main>
  );
}
