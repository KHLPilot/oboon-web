import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { CommunityPostCardSkeleton } from "@/features/community/components/CommunityFeed/CommunityPostCardSkeleton";
import { HeroCounselorPreviewSkeleton } from "@/features/home/components/HeroCounselorPreviewSkeleton";
import { FAQListSkeleton } from "@/features/support/components/faq/FAQListSkeleton";
import { QnAListSkeleton } from "@/features/support/components/qna/QnAListSkeleton";
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
            className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 bg-(--oboon-bg-surface)"
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
            className={[
              "flex gap-3 overflow-x-auto overflow-y-visible px-4 py-3 pb-8 md:gap-4 md:px-5",
              "snap-x snap-mandatory",
              "[-webkit-overflow-scrolling:touch]",
              "scrollbar-none",
              "scroll-pl-4 scroll-pr-4 scroll-pb-8 md:scroll-pl-5 md:scroll-pr-5",
            ].join(" ")}
          >
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`latest-tablet-${index}`}
                className="w-[calc((100%-1rem)/2)] shrink-0 snap-start"
              >
                <OfferingCardSkeleton seed={index} />
              </div>
            ))}

            <div className="shrink-0 w-4" />
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

function OfferingListHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-9 w-44 rounded-lg" />
      <Skeleton className="h-4 w-64 rounded-lg" />
    </div>
  );
}

function OfferingFilterSkeleton() {
  return (
    <div className="space-y-4 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4 sm:p-5">
      <div className="hidden sm:flex items-center gap-3">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-10 w-24 rounded-xl" />
        <Skeleton className="h-10 w-20 rounded-xl" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
      <div className="sm:hidden space-y-3">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-7 w-20 rounded-full" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function OfferingsPageSkeleton() {
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer>
        <div className="flex items-center gap-3 mb-1">
          <OfferingListHeaderSkeleton />
        </div>
        <div className="mb-4">
          <Skeleton className="h-4 w-72 max-w-full rounded-lg" />
        </div>
        <div className="space-y-4">
          <OfferingFilterSkeleton />
          <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <OfferingCardSkeleton
                key={`offering-${index}`}
                mobileRecommendationLayout
                seed={index}
              />
            ))}
          </div>
        </div>
      </PageContainer>
    </main>
  );
}

function CommunitySidebarSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Card className="p-4">
      <Skeleton className="h-5 w-24 rounded-lg" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={`sidebar-${index}`} className="space-y-2">
            <Skeleton className="h-4 w-full rounded-lg" />
            <Skeleton className="h-4 w-2/3 rounded-lg" />
          </div>
        ))}
      </div>
    </Card>
  );
}

function CommunityTabsSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton
          key={`tab-${index}`}
          className={[
            "h-9 rounded-full",
            index === 0 ? "w-16" : index % 2 === 0 ? "w-20" : "w-24",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

export function CommunityPageSkeleton() {
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-10">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_260px] lg:grid-cols-[260px_minmax(0,1fr)_260px]">
          <aside className="hidden lg:block lg:sticky lg:top-[calc(var(--oboon-header-offset)+1rem)] lg:self-start">
            <CommunitySidebarSkeleton rows={4} />
          </aside>

          <section className="order-1 min-w-0 lg:order-2">
            <div className="space-y-4">
              <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
                <CommunityTabsSkeleton />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <CommunityPostCardSkeleton key={`community-post-${index}`} />
                ))}
              </div>
            </div>
          </section>

          <aside className="hidden md:block md:sticky md:top-[calc(var(--oboon-header-offset)+1rem)] md:self-start">
            <CommunitySidebarSkeleton rows={4} />
          </aside>
        </div>
      </PageContainer>
    </main>
  );
}

export function CommunityProfilePageSkeleton() {
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className="min-w-0 space-y-3">
            <div className="flex items-start gap-4">
              <Skeleton className="h-16 w-16 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>

            <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
              <CommunityTabsSkeleton />
            </div>

            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <CommunityPostCardSkeleton key={`profile-post-${index}`} />
              ))}
            </div>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-[calc(var(--oboon-header-offset)+1rem)] lg:self-start">
            <CommunitySidebarSkeleton rows={4} />
            <CommunitySidebarSkeleton rows={3} />
          </aside>
        </div>
      </PageContainer>
    </main>
  );
}

export function OtherCommunityProfilePageSkeleton() {
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className="min-w-0 space-y-3">
            <div className="flex items-start gap-4">
              <Skeleton className="h-16 w-16 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>

            <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
              <CommunityTabsSkeleton />
            </div>

            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <CommunityPostCardSkeleton key={`other-profile-post-${index}`} />
              ))}
            </div>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-[calc(var(--oboon-header-offset)+1rem)] lg:self-start">
            <CommunitySidebarSkeleton rows={3} />
            <CommunitySidebarSkeleton rows={3} />
          </aside>
        </div>
      </PageContainer>
    </main>
  );
}

function SupportHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-40 rounded-lg" />
      <Skeleton className="h-4 w-72 rounded-lg" />
    </div>
  );
}

function SupportTabsSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton
          key={`support-tab-${index}`}
          className={[
            "h-9 rounded-full",
            index === 0 ? "w-16" : index % 2 === 0 ? "w-20" : "w-24",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

export function SupportPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <SupportHeaderSkeleton />
        <SupportTabsSkeleton />
      </div>
      <FAQListSkeleton />
    </div>
  );
}

export function SupportQnAListPageSkeleton() {
  return (
    <div className="space-y-6">
      <SupportHeaderSkeleton />
      <QnAListSkeleton />
    </div>
  );
}

export function SupportQnADetailPageSkeleton() {
  return (
    <div className="space-y-6">
      <SupportHeaderSkeleton />
      <QnAListSkeleton count={1} />
    </div>
  );
}
