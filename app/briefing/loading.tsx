import { Skeleton } from "@/components/ui/Skeleton";
import BriefingPostCardSkeleton from "@/features/briefing/components/BriefingPostCardSkeleton";

export default function BriefingLoading() {
  return (
    <div className="px-4 py-6 space-y-8">
      {/* Hero 카드 스켈레톤 */}
      <div className="aspect-video w-full overflow-hidden rounded-2xl">
        <Skeleton className="h-full w-full rounded-2xl" />
      </div>

      {/* 섹션 제목 */}
      <div className="space-y-4">
        <Skeleton className="h-5 w-28" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <BriefingPostCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
