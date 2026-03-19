import { Skeleton } from "@/components/ui/Skeleton";
import Card from "@/components/ui/Card";

export function CommunityPostCardSkeleton() {
  return (
    <Card className="p-4 space-y-3">
      {/* 뱃지 row */}
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>

      {/* 제목 (2줄) */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* 본문 (3줄) */}
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>

      {/* 푸터 */}
      <div className="flex items-center justify-between pt-0.5">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-12" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-3.5 w-8" />
          <Skeleton className="h-3.5 w-8" />
          <Skeleton className="h-3.5 w-4" />
        </div>
      </div>
    </Card>
  );
}
