import { Skeleton } from "@/components/ui/Skeleton";

/** QnA 상세 로딩 스켈레톤 */
export function QnADetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* 제목 영역 */}
      <div className="space-y-3 border-b border-(--oboon-border-default) pb-4">
        <Skeleton className="h-6 w-3/4" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </div>

      {/* 본문 */}
      <div className="space-y-3 min-h-[120px]">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>

      {/* 답변 영역 */}
      <div className="rounded-xl bg-(--oboon-bg-subtle) p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-8 rounded" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}
