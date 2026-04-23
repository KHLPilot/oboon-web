import PageContainer from "@/components/shared/PageContainer";
import { Skeleton } from "@/components/ui/Skeleton";
import { BriefingPostCardSkeleton } from "@/features/briefing/components/BriefingLoadingSkeletons";

export default function Loading() {
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20 pt-10">
        <div className="mb-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-40 rounded-lg" />
                <Skeleton className="h-4 w-24 rounded-lg" />
              </div>
            </div>
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
          <Skeleton className="mt-4 h-4 w-full max-w-2xl rounded-lg" />
          <Skeleton className="mt-2 h-4 w-[90%] max-w-2xl rounded-lg" />
          <Skeleton className="mt-4 h-9 w-48 rounded-lg" />
        </div>

        <div className="mb-6 flex gap-4 border-b border-(--oboon-border-default)">
          <Skeleton className="h-9 w-28 rounded-t-lg" />
          <Skeleton className="h-9 w-28 rounded-t-lg" />
        </div>

        <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <BriefingPostCardSkeleton key={index} />
          ))}
        </div>
      </PageContainer>
    </main>
  );
}
