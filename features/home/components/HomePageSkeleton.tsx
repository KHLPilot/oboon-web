import PageContainer from "@/components/shared/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils/cn";
import { HeroCounselorPreviewSkeleton } from "@/features/home/components/HeroCounselorPreviewSkeleton";
import { OfferingCardSkeleton } from "@/features/offerings/components/OfferingCardSkeleton";

function HomeHeroSkeleton() {
  return (
    <section className="relative isolate min-h-[580px] overflow-hidden rounded-3xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-4 py-7 sm:min-h-[540px] sm:px-6 sm:py-8 md:min-h-[460px] lg:min-h-[400px] lg:px-8 lg:py-7">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] backdrop-blur-md"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(132deg, color-mix(in srgb, var(--oboon-primary) 18%, transparent) 0%, color-mix(in srgb, var(--oboon-bg-subtle) 48%, transparent) 38%, transparent 64%, color-mix(in srgb, var(--oboon-primary) 12%, transparent) 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -left-12 h-52 w-52 rounded-full blur-3xl"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--oboon-primary) 34%, transparent)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 bottom-0 h-56 w-56 rounded-full blur-3xl"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--oboon-primary) 22%, transparent)",
        }}
      />

      <div className="relative grid grid-cols-1 gap-6 md:grid-cols-2 md:items-center md:gap-8">
        <div className="lg:pr-4">
          <Badge
            variant="status"
            className="mb-4 inline-flex items-center gap-2 bg-(--oboon-bg-surface) px-3 py-1.5"
          >
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-24 rounded-lg" />
          </Badge>

          <div className="space-y-3">
            <Skeleton className="h-11 w-[78%] rounded-2xl" />
            <Skeleton className="h-11 w-[92%] rounded-2xl" />
            <Skeleton className="h-11 w-[60%] rounded-2xl" />
          </div>

          <div className="mt-2 space-y-2">
            <Skeleton className="h-4 w-full max-w-[40rem] rounded-lg" />
            <Skeleton className="h-4 w-4/5 max-w-[32rem] rounded-lg" />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:flex md:flex-wrap">
            <Skeleton className="h-11 w-full rounded-full sm:w-auto sm:min-w-40" />
            <Skeleton className="h-11 w-full rounded-full sm:w-auto sm:min-w-40" />
          </div>

          <div className="mt-5 flex min-h-9 items-center">
            <Skeleton className="h-7 w-36 rounded-full" />
          </div>
        </div>

        <div className="h-full">
          <HeroCounselorPreviewSkeleton />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-3 flex justify-center sm:bottom-4 lg:bottom-3">
        <div className="flex items-center justify-center gap-2">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-3 rounded-full opacity-60" />
          <Skeleton className="h-3 w-3 rounded-full opacity-60" />
        </div>
      </div>
    </section>
  );
}

function HomeDiscoverySectionSkeleton() {
  return (
    <section className="mt-14 grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-10">
      <div className="space-y-4">
        <Skeleton className="h-7 w-36 rounded-lg" />
        <Skeleton className="h-4 w-48 rounded-lg" />
        <div className="divide-y divide-(--oboon-border-default) rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={`home-top-${index}`}
              className="flex items-start gap-4 px-4 py-4"
            >
              <Skeleton className="mt-0.5 h-7 w-7 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-full rounded-lg" />
                <Skeleton className="h-5 w-4/5 rounded-lg" />
                <Skeleton className="h-3 w-20 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <Skeleton className="h-7 w-40 rounded-lg" />
        <Skeleton className="h-4 w-56 rounded-lg" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`home-pick-${index}`}
              className="flex items-center gap-4 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-[88%] rounded-lg" />
                <Skeleton className="h-5 w-[72%] rounded-lg" />
                <Skeleton className="h-3 w-24 rounded-lg" />
                <Skeleton className="h-3 w-32 rounded-lg" />
              </div>
              <Skeleton className="aspect-video w-28 shrink-0 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomeOriginalSectionSkeleton() {
  return (
    <section className="bg-(--oboon-bg-inverse)">
      <div className="mx-auto w-full max-w-240 px-4 pb-10 pt-6 sm:px-5 lg:max-w-300">
        <div className="space-y-3">
          <Skeleton className="h-8 w-40 rounded-lg bg-white/12" animated={false} />
          <Skeleton className="h-5 w-56 rounded-lg bg-white/8" animated={false} />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`home-original-${index}`}
              className="overflow-hidden rounded-[16px] border border-white/10 bg-white/5"
            >
              <Skeleton
                className="aspect-[4/3] w-full rounded-none bg-white/10"
                animated={false}
              />
              <div className="space-y-2 p-4">
                <Skeleton className="h-5 w-4/5 rounded-lg bg-white/10" animated={false} />
                <Skeleton className="h-4 w-16 rounded-lg bg-white/8" animated={false} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Skeleton className="h-12 w-36 rounded-full bg-white/10" animated={false} />
        </div>
      </div>
    </section>
  );
}

function HomeLatestSectionSkeleton() {
  return (
    <section className="pt-14">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36 rounded-lg" />
          <Skeleton className="h-4 w-44 rounded-lg" />
        </div>
        <Skeleton className="h-4 w-16 rounded-lg" />
      </div>

      <div className="md:hidden">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <OfferingCardSkeleton key={`latest-mobile-${index}`} mobileRecommendationLayout seed={index} />
          ))}
        </div>
      </div>

      <div className="hidden md:block lg:hidden">
        <div className="-mx-4 overflow-visible md:-mx-5">
          <div
            className={cn(
              "scrollbar-none flex gap-3 overflow-x-auto overflow-y-visible px-4 py-3 pb-8 md:gap-4 md:px-5",
              "snap-x snap-mandatory",
              "[-webkit-overflow-scrolling:touch]",
              "scroll-pl-4 scroll-pr-4 scroll-pb-8 md:scroll-pl-5 md:scroll-pr-5",
            )}
          >
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`latest-tablet-${index}`}
                className="w-[calc((100%-1rem)/2)] shrink-0 snap-start"
              >
                <OfferingCardSkeleton seed={index} />
              </div>
            ))}

            <div className="w-4 shrink-0" />
          </div>
        </div>
      </div>

      <div className="hidden lg:block">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <OfferingCardSkeleton key={`latest-desktop-${index}`} seed={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomePageSkeleton() {
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer>
        <div className="flex flex-col gap-5">
          <HomeHeroSkeleton />
          <HomeDiscoverySectionSkeleton />
        </div>
      </PageContainer>

      <HomeOriginalSectionSkeleton />

      <PageContainer className="pb-20 pt-14">
        <HomeLatestSectionSkeleton />
      </PageContainer>
    </main>
  );
}
