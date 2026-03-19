import { Skeleton } from "@/components/ui/Skeleton";

/** QnA 목록 로딩 스켈레톤 */
export function QnAListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="divide-y divide-(--oboon-border-default)">
      {/* 헤더 (데스크톱) */}
      <div className="hidden gap-4 p-3 md:grid md:grid-cols-[1fr_120px_100px_100px]">
        <Skeleton className="h-4 w-8" />
        <Skeleton className="h-4 w-12 mx-auto" />
        <Skeleton className="h-4 w-8 mx-auto" />
        <Skeleton className="h-4 w-12 mx-auto" />
      </div>

      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-3">
          {/* 데스크톱 */}
          <div className="hidden md:grid md:grid-cols-[1fr_120px_100px_100px] gap-4 items-center">
            <Skeleton className="h-4 w-full max-w-xs" />
            <Skeleton className="h-4 w-16 mx-auto" />
            <Skeleton className="h-5 w-12 rounded-full mx-auto" />
            <Skeleton className="h-4 w-14 mx-auto" />
          </div>

          {/* 모바일 */}
          <div className="md:hidden space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 flex-1 max-w-[200px]" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-3.5 w-14" />
              <Skeleton className="h-3.5 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
