import { Skeleton } from "@/components/ui/Skeleton";
import PageContainer from "@/components/shared/PageContainer";

/* ── 통계 카드 스켈레톤 ── */
function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-4 py-3 space-y-2">
      <Skeleton className="h-3.5 w-16" />
      <Skeleton className="h-5 w-24" />
    </div>
  );
}

/* ── 섹션 타이틀 스켈레톤 ── */
function SectionTitleSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="h-4 w-4 shrink-0" />
      <Skeleton className="h-5 w-24" />
    </div>
  );
}

/* ── Left 컬럼 ── */
function LeftSkeleton() {
  return (
    <div className="space-y-0">
      {/* 뱃지 행 */}
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-10 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>

      {/* 제목 */}
      <Skeleton className="mt-3 h-9 w-2/3" />

      {/* 주소 */}
      <div className="mt-2 flex items-center gap-1.5">
        <Skeleton className="h-4 w-4 shrink-0" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* 통계 카드 2×2 → md 4열 */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* 갤러리 (히어로 이미지) */}
      <Skeleton className="mt-4 aspect-video w-full rounded-2xl" />

      {/* 모바일 조건 검증 슬롯 — 모바일에서만 카드 형태로 표시 */}
      <div className="mt-3 lg:hidden">
        <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4 space-y-3">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-9 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>

      {/* 탭 내비게이션 */}
      <div className="mt-8 py-3 border-b border-(--oboon-border-default)">
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {["w-20", "w-16", "w-14", "w-20", "w-16"].map((w, i) => (
            <Skeleton key={i} className={`h-8 ${w} shrink-0 rounded-full`} />
          ))}
        </div>
      </div>

      {/* 섹션 플레이스홀더: 주변 인프라 */}
      <div className="mt-10 space-y-3">
        <SectionTitleSkeleton />
        <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4 space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2].map((j) => (
                  <Skeleton key={j} className="h-9 w-28 rounded-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 섹션 플레이스홀더: 지도 */}
      <div className="mt-10 space-y-3">
        <SectionTitleSkeleton />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>

      {/* 섹션 플레이스홀더: 기본 정보 */}
      <div className="mt-10 space-y-3">
        <SectionTitleSkeleton />
        <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) divide-y divide-(--oboon-border-default)">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3.5 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Right 컬럼 (데스크톱 전용) ── */
function RightSkeleton() {
  return (
    <div className="hidden lg:block space-y-3">
      {/* 상담 예약 카드 */}
      <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-16 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        </div>
        <div className="rounded-2xl border border-(--oboon-border-default) p-4 space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full rounded-full" />
        </div>
      </div>

      {/* 조건 맞춤 검증 카드 */}
      <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4 space-y-4">
        <div className="space-y-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3.5 w-44" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}

/* ── 모바일 하단 고정 CTA 바 ── */
function MobileBottomBarSkeleton() {
  return (
    <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 border-t border-(--oboon-border-default) bg-(--oboon-bg-surface)/90 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto w-full max-w-300 px-5 py-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-16 rounded-xl shrink-0" />
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <Skeleton className="h-10 flex-1 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/* ── 페이지 스켈레톤 ── */
export default function OfferingDetailLoading() {
  return (
    <>
      <main className="bg-(--oboon-bg-default) pb-24 lg:pb-10">
        <PageContainer>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
            <div className="lg:pr-5">
              <LeftSkeleton />
            </div>
            <div className="lg:sticky lg:top-32 lg:h-fit space-y-4">
              <RightSkeleton />
            </div>
          </div>
        </PageContainer>
      </main>
      <MobileBottomBarSkeleton />
    </>
  );
}
