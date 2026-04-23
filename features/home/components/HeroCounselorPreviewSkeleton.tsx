import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils/cn";

export function HeroCounselorPreviewSkeleton() {
  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden rounded-3xl",
        "border border-(--oboon-border-default) bg-(--oboon-bg-surface)",
        "p-4 shadow-(--oboon-shadow-card) sm:p-5",
      )}
    >
      {/* Header */}
      <div className="mb-3 shrink-0 space-y-1.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-5 w-44" />
      </div>

      {/* Featured card skeleton */}
      <div className="my-auto flex flex-col gap-2 sm:gap-3">
        <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-page) p-3 sm:p-4">
          {/* Avatar + Name */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 sm:h-14 sm:w-14 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-36" />
            </div>
          </div>

          {/* Tags */}
          <div className="mt-2 flex gap-1.5">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>

          {/* Action hint */}
          <Skeleton className="mt-2 hidden h-8 w-full rounded-xl sm:block" />
        </div>

        {/* Thumbnail dots */}
        <div className="flex items-center justify-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-6 w-6 rounded-full opacity-50" />
          <Skeleton className="h-6 w-6 rounded-full opacity-50" />
          <Skeleton className="h-6 w-6 rounded-full opacity-50" />
        </div>
      </div>
    </div>
  );
}
