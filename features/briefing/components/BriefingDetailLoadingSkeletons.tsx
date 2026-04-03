import PageContainer from "@/components/shared/PageContainer";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  briefingGeneralDetailLoadingConfig,
  briefingOriginalDetailLoadingConfig,
} from "@/shared/briefing-detail-loading";
import { cx, cardShell } from "./briefing.ui";

function DetailHeroSkeleton() {
  return (
    <div className="relative mb-8 h-[320px] overflow-hidden rounded-2xl sm:h-[400px] lg:h-[500px]">
      <Skeleton className="h-full w-full rounded-2xl" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/15 to-transparent" />
      <div className="absolute bottom-8 left-8 right-8">
        <div className="space-y-3">
          <Skeleton className="h-10 w-full max-w-[700px] rounded-xl bg-white/18" animated={false} />
          <Skeleton className="h-10 w-4/5 max-w-[560px] rounded-xl bg-white/14" animated={false} />
        </div>
        <Skeleton className="mt-3 h-4 w-40 rounded-lg bg-white/10" animated={false} />
      </div>
      <div className="absolute bottom-8 right-8 z-10 hidden sm:block">
        <Skeleton className="h-9 w-28 rounded-full bg-white/12" animated={false} />
      </div>
    </div>
  );
}

function DetailBodySkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-3/4 rounded-lg" />
      <Skeleton className="h-4 w-full rounded-lg" />
      <Skeleton className="h-4 w-full rounded-lg" />
      <Skeleton className="h-4 w-5/6 rounded-lg" />
      <div className="py-2" />
      <Skeleton className="h-5 w-2/3 rounded-lg" />
      <Skeleton className="h-4 w-full rounded-lg" />
      <Skeleton className="h-4 w-full rounded-lg" />
      <Skeleton className="h-4 w-4/5 rounded-lg" />
      <div className="py-3" />
      <Skeleton className="h-[220px] w-full rounded-2xl" />
      <div className="pt-2" />
      <Skeleton className="h-4 w-full rounded-lg" />
      <Skeleton className="h-4 w-11/12 rounded-lg" />
      <Skeleton className="h-4 w-3/4 rounded-lg" />
    </div>
  );
}

function DetailSidebarSkeleton() {
  return (
    <div className="space-y-4">
      <div className={cx(cardShell, "p-5 shadow-none")}>
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-28 rounded-lg" />
            <Skeleton className="h-4 w-16 rounded-lg" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton className="h-4 w-full rounded-lg" />
          <Skeleton className="h-4 w-5/6 rounded-lg" />
          <Skeleton className="h-4 w-2/3 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function LikeShareBarSkeleton() {
  return (
    <div className="mt-4 flex items-center gap-2">
      <Skeleton className="h-9 w-9 rounded-full" />
      <Skeleton className="h-9 w-9 rounded-full" />
      <Skeleton className="h-9 w-9 rounded-full" />
    </div>
  );
}

function CommentSectionSkeleton({ count }: { count: number }) {
  return (
    <div id="briefing-comments" className="mt-16">
      <Skeleton className="mb-4 h-7 w-16 rounded-lg" />
      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-40 rounded-2xl" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <Skeleton className="min-h-[84px] w-full rounded-2xl" />
        <div className="flex justify-end">
          <Skeleton className="h-9 w-20 rounded-full" />
        </div>
      </div>

      <div className="space-y-3">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={`comment-${index}`}
            className="flex items-start gap-2 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4"
          >
            <Skeleton className="h-7 w-7 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-24 rounded-lg" />
              <Skeleton className="h-4 w-full rounded-lg" />
              <Skeleton className="h-4 w-4/5 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RelatedPostListSkeleton({ count }: { count: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`related-${index}`}
          className={cx(
            cardShell,
            "overflow-hidden p-0 shadow-none bg-(--oboon-bg-surface)",
          )}
        >
          <div className="flex min-h-[104px] items-stretch">
            <Skeleton className="w-28 shrink-0 rounded-none" />
            <div className="min-w-0 flex-1 p-3 md:p-4">
              <Skeleton className="h-5 w-full rounded-lg" />
              <Skeleton className="mt-2 h-4 w-5/6 rounded-lg" />
              <Skeleton className="mt-2 h-4 w-2/3 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RelatedPanelSkeleton({
  titleWidthClass,
  descriptionLines = 2,
  relatedPostCount,
}: {
  titleWidthClass: string;
  descriptionLines?: number;
  relatedPostCount: number;
}) {
  return (
    <div className={cx(cardShell, "mt-16 overflow-hidden p-0 shadow-none sm:mt-24 lg:mt-40")}>
      <div className="grid h-auto grid-cols-1 lg:h-[380px] lg:grid-cols-2">
        <div className="bg-(--oboon-bg-subtle)">
          <div className="relative overflow-hidden rounded-2xl">
            <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
            <div className="relative flex min-h-[380px] flex-col justify-between p-5 md:p-6 lg:p-8">
              <div className="flex justify-end">
                <Skeleton className="h-9 w-24 rounded-full bg-white/12" animated={false} />
              </div>
              <div>
                <Skeleton className={cx("h-10 rounded-xl bg-white/14", titleWidthClass)} animated={false} />
                <div className="mt-3 space-y-2">
                  {Array.from({ length: descriptionLines }).map((_, index) => (
                    <Skeleton
                      key={`desc-${index}`}
                      className={cx(
                        "h-4 rounded-lg bg-white/10",
                        index === descriptionLines - 1 ? "w-4/5" : "w-full",
                      )}
                      animated={false}
                    />
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Skeleton className="h-7 w-16 rounded-full bg-white/10" animated={false} />
                  <Skeleton className="h-7 w-14 rounded-full bg-white/10" animated={false} />
                  <Skeleton className="h-7 w-20 rounded-full bg-white/10" animated={false} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-(--oboon-bg-subtle)">
          <div className="h-full bg-(--oboon-bg-subtle) p-3 md:p-4 lg:p-5">
            <RelatedPostListSkeleton count={relatedPostCount} />
          </div>
        </div>
      </div>
    </div>
  );
}

function OriginalSeriesCardSkeleton() {
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

function RecommendedSeriesSkeleton({ count }: { count: number }) {
  return (
    <div className="mt-16">
      <Skeleton className="mb-4 h-7 w-40 rounded-lg" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, index) => (
          <OriginalSeriesCardSkeleton key={`series-${index}`} />
        ))}
      </div>
    </div>
  );
}

function DetailScaffold({
  relatedTitleWidthClass,
  relatedDescriptionLines,
  relatedPostCount,
  commentPreviewCount,
  recommendationCount = 0,
}: {
  relatedTitleWidthClass: string;
  relatedDescriptionLines?: number;
  relatedPostCount: number;
  commentPreviewCount: number;
  recommendationCount?: number;
}) {
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20">
        <DetailHeroSkeleton />

        <div className="mt-15 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_440px]">
          <div className="min-w-0">
            <DetailBodySkeleton />
          </div>
          <DetailSidebarSkeleton />
        </div>

        <LikeShareBarSkeleton />
        <CommentSectionSkeleton count={commentPreviewCount} />
        <RelatedPanelSkeleton
          titleWidthClass={relatedTitleWidthClass}
          descriptionLines={relatedDescriptionLines}
          relatedPostCount={relatedPostCount}
        />
        {recommendationCount > 0 ? (
          <RecommendedSeriesSkeleton count={recommendationCount} />
        ) : null}
      </PageContainer>
    </main>
  );
}

export function BriefingGeneralDetailLoadingSkeleton() {
  return (
    <DetailScaffold
      relatedTitleWidthClass="w-40"
      relatedDescriptionLines={2}
      relatedPostCount={briefingGeneralDetailLoadingConfig.relatedPostCount}
      commentPreviewCount={briefingGeneralDetailLoadingConfig.commentPreviewCount}
    />
  );
}

export function BriefingOriginalDetailLoadingSkeleton() {
  return (
    <DetailScaffold
      relatedTitleWidthClass="w-56"
      relatedDescriptionLines={3}
      relatedPostCount={briefingOriginalDetailLoadingConfig.relatedPostCount}
      commentPreviewCount={briefingOriginalDetailLoadingConfig.commentPreviewCount}
      recommendationCount={
        briefingOriginalDetailLoadingConfig.recommendedSeriesCount
      }
    />
  );
}
