import PageContainer from "@/components/shared/PageContainer";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils/cn";

function CompareSlotGridSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-4">
        {Array.from({ length: 3 }).map((_, index) => {
          const isDesktopOnly = index === 2;
          return (
            <div
              key={index}
              className={cn(isDesktopOnly && "hidden md:block")}
            >
              <div className="flex flex-col overflow-hidden rounded-2xl border-2 border-(--oboon-border-default) bg-(--oboon-bg-surface)">
                <div className="flex items-start gap-2 px-4 pt-4 pb-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4 rounded-lg" />
                    <Skeleton className="h-4 w-1/2 rounded-lg" />
                  </div>
                  <Skeleton className="h-5 w-5 rounded-full" />
                </div>
                <div className="border-t border-(--oboon-border-default) px-4 py-2.5">
                  <Skeleton className="h-4 w-20 rounded-lg" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompareTableSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <Skeleton className="h-8 w-40 rounded-lg" />
      <Skeleton className="mt-2 h-4 w-72 max-w-full rounded-lg" />
    </div>
  );
}

export function ComparePageSkeleton() {
  return (
    <PageContainer>
      <div className="mb-4 space-y-2">
        <Skeleton className="h-9 w-40 rounded-lg" />
        <Skeleton className="h-4 w-[min(100%,36rem)] rounded-lg" />
      </div>

      <div className="sticky top-16 z-20 border-b border-(--oboon-border-default) backdrop-blur-sm">
        <div className="mx-auto w-full max-w-5xl py-3 md:py-4">
          <CompareSlotGridSkeleton />
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl">
        <CompareTableSkeleton />
      </div>
    </PageContainer>
  );
}
