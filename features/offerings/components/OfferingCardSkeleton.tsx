import { Skeleton } from "@/components/ui/Skeleton";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

/**
 * variant="default"  — 일반 분양 카드 스켈레톤
 * variant="matched"  — 조건 매칭 카드 스켈레톤 (매칭률 + 등급 배지 포함)
 * mobileRecommendationLayout — 모바일에서 가로형 리스트 레이아웃
 */
export function OfferingCardSkeleton({
  variant = "default",
  compactLayout = false,
  mobileRecommendationLayout = false,
}: {
  variant?: "default" | "matched";
  compactLayout?: boolean;
  mobileRecommendationLayout?: boolean;
}) {
  return (
    <div className="h-full">
      <Card className="h-full overflow-hidden p-0">

        {mobileRecommendationLayout ? (
          <>
            {/* ── 모바일: 가로형 레이아웃 (sm:hidden) ── */}
            <div className="space-y-3 p-3 sm:hidden">
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
                {/* 72px 정사각 썸네일 */}
                <Skeleton className="aspect-square w-[72px] shrink-0 rounded-xl" />
                {/* 텍스트 영역 */}
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Skeleton className="h-[18px] w-3/4" />   {/* 제목 */}
                      <Skeleton className="h-3.5 w-2/5" />       {/* 지역 · 상태 */}
                      <Skeleton className="mt-1 h-[17px] w-1/3" /> {/* 분양가 */}
                    </div>
                    <Skeleton className="h-5 w-14 shrink-0 rounded-full" /> {/* 상태 배지 */}
                  </div>
                </div>
              </div>

              {/* 구분선 */}
              <div className="h-px bg-(--oboon-border-default)" />

              {/* 태그 + 스크랩 버튼 */}
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="ml-auto h-7 w-7 rounded-full" />
              </div>
            </div>

            {/* ── 데스크탑: 세로형 레이아웃 (hidden sm:block) ── */}
            <div className="hidden sm:block">
              <div className="relative w-full aspect-video bg-(--oboon-bg-subtle)">
                <Skeleton className="absolute inset-0 rounded-none" />
                <div className="absolute left-3 top-3 flex items-center gap-1.5">
                  <Skeleton className="h-5 w-12 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
                <div className="absolute right-3 top-3">
                  <Skeleton className="h-7 w-7 rounded-full" />
                </div>
              </div>
              <div className="px-4 pt-4 pb-4">
                <div className="space-y-2 min-h-[76px]">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="mt-3 space-y-1.5">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-3 w-14" />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* ── 이미지 영역 (전 variant 공통) ── */}
            <div className="relative w-full aspect-video bg-(--oboon-bg-subtle)">
              <Skeleton className="absolute inset-0 rounded-none" />
              {/* 좌상단 배지 자리 */}
              <div className="absolute left-3 top-3 flex items-center gap-1.5">
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              {/* 우상단 스크랩 버튼 자리 */}
              <div className="absolute right-3 top-3">
                <Skeleton className="h-7 w-7 rounded-full" />
              </div>
            </div>

            {/* ── 콘텐츠 영역 ── */}
            {variant === "matched" ? (
              <div className={cn("flex flex-1 px-3", compactLayout ? "gap-3 py-3" : "gap-3.5 py-3.5")}>
                {/* 왼쪽 컬러 바 */}
                <Skeleton className="w-[3px] shrink-0 rounded-full self-stretch" />
                <div className="min-w-0 flex-1 space-y-3">
                  {/* 매칭률 */}
                  <Skeleton className="h-5 w-16" />
                  {/* 제목 + 주소 */}
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  {/* 구분선 */}
                  <div className="h-px w-full bg-(--oboon-border-default)" />
                  {/* 분양가 */}
                  <div className="space-y-1">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  {/* 등급 배지 */}
                  <div className="flex gap-1.5">
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-4 pt-4 pb-4">
                {/* 제목 (2줄 자리) */}
                <div className="space-y-2 min-h-[76px]">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-5 w-2/3" />
                  {/* 주소 */}
                  <Skeleton className="h-4 w-1/2" />
                </div>
                {/* 분양가 */}
                <div className="mt-3 space-y-1.5">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-3 w-14" />
                </div>
              </div>
            )}
          </>
        )}

      </Card>
    </div>
  );
}
