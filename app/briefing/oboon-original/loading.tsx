import { Skeleton } from "@/components/ui/Skeleton";
import BriefingPostCardSkeleton from "@/features/briefing/components/BriefingPostCardSkeleton";

export default function BriefingOriginalLoading() {
  return (
    <div className="px-4 py-6 space-y-8">
      {/* Featured Hero 스켈레톤 */}
      <div className="aspect-video w-full overflow-hidden rounded-2xl">
        <Skeleton className="h-full w-full rounded-2xl" />
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8 w-16 rounded-full" />
        ))}
      </div>

      {/* 카드 그리드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <BriefingPostCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
