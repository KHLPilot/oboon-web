import { Skeleton } from "@/components/ui/Skeleton";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

/**
 * variant="default"  — 일반 분양 카드 스켈레톤
 * variant="matched"  — 조건 매칭 카드 스켈레톤 (매칭률 + 등급 배지 포함)
 */
export function OfferingCardSkeleton({
  variant = "default",
  compactLayout = false,
}: {
  variant?: "default" | "matched";
  compactLayout?: boolean;
}) {
  return (
    <div className="h-full">
      <Card className="h-full overflow-hidden p-0">
        {/* 이미지 영역 */}
        <Skeleton className="w-full aspect-video rounded-none" />

        {variant === "matched" ? (
          /* 조건 매칭 레이아웃 */
          <div className={cn("flex flex-1 px-3", compactLayout ? "gap-3 py-3" : "gap-3.5 py-3.5")}>
            {/* 왼쪽 컬러 바 */}
            <Skeleton className="w-[3px] shrink-0 rounded-full h-full" />

            <div className="min-w-0 flex-1 space-y-3">
              {/* 매칭률 */}
              <Skeleton className="h-5 w-16" />
              {/* 타이틀 */}
              <div className="space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              {/* 구분선 */}
              <div className="h-px w-full bg-(--oboon-border-default)" />
              {/* 가격 */}
              <div className="space-y-1">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              {/* 등급 배지 */}
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          </div>
        ) : (
          /* 기본 레이아웃 */
          <div className="px-4 pt-4 pb-4">
            <div className="space-y-2 min-h-[76px]">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="mt-4 space-y-1">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
