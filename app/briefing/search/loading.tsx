import PageContainer from "@/components/shared/PageContainer";
import { Skeleton } from "@/components/ui/Skeleton";
import { BriefingPostCardSkeleton } from "@/features/briefing/components/BriefingLoadingSkeletons";

export default function Loading() {
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20">
        <div className="mb-6 mt-2 space-y-4">
          <Skeleton className="h-10 w-full max-w-2xl rounded-2xl" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-4 w-32 rounded-lg" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <BriefingPostCardSkeleton key={index} />
          ))}
        </div>

        <div className="mt-8 flex items-center justify-center gap-1">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </PageContainer>
    </main>
  );
}
