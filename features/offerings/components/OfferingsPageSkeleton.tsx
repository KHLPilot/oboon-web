import PageContainer from "@/components/shared/PageContainer";
import { Skeleton } from "@/components/ui/Skeleton";
import { OfferingCardSkeleton } from "@/features/offerings/components/OfferingCardSkeleton";

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
      <div className="hidden items-center gap-3 sm:flex">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
      <div className="space-y-3 sm:hidden">
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
        <div className="mb-1 flex items-center gap-3">
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
