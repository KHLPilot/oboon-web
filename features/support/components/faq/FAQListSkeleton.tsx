import { Skeleton } from "@/components/ui/Skeleton";

/** FAQ 아코디언 로딩 스켈레톤 */
export function FAQListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="divide-y divide-(--oboon-border-default)">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-4">
          <div className="flex flex-1 items-center gap-2">
            {/* 카테고리 뱃지 */}
            <Skeleton className="h-5 w-14 rounded-md flex-shrink-0" />
            {/* 질문 텍스트 */}
            <Skeleton className="h-4 w-full max-w-sm" />
          </div>
          {/* 화살표 아이콘 자리 */}
          <Skeleton className="h-5 w-5 flex-shrink-0 rounded" />
        </div>
      ))}
    </div>
  );
}
