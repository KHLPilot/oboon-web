import { Skeleton } from "@/components/ui/Skeleton";
import PageContainer from "@/components/shared/PageContainer";

const SIDEBAR_LABELS = ["w-8", "w-20", "w-16", "w-20", "w-20", "w-16", "w-16", "w-20", "w-16", "w-20"];
const MOBILE_TABS    = ["w-8", "w-20", "w-16", "w-20", "w-20"];

/** 아이콘 + 라벨 + 이동 버튼 행 */
function CardHeader() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Skeleton className="h-7 w-7 rounded-lg" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>
  );
}

/** 라벨 + 수치 2열 (구분선 포함) */
function TwoStatRow() {
  return (
    <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-6 w-8" />
      </div>
      <div className="h-10 w-px bg-(--oboon-border-default)" />
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-18" />
        <Skeleton className="h-6 w-8" />
      </div>
    </div>
  );
}

/** 정산 하위 카드 (3개) */
function SettlementSubCard() {
  return (
    <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-3.5 w-24" />
        </div>
        <Skeleton className="h-4 w-6" />
      </div>
    </div>
  );
}

/** 요약 탭 콘텐츠 스켈레톤 */
function SummaryContentSkeleton() {
  return (
    <>
      {/* 헤더: "요약" + 새로고침 버튼 */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-10" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>

      {/* OVERVIEW 카드 */}
      <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-5 space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-3 w-28" />
      </div>

      {/* 카드 그리드 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* 전체 사용자 */}
        <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
          <CardHeader />
          <div className="mt-3 flex items-center gap-3">
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="mt-2 h-3 w-28" />
        </div>

        {/* 현장 등록 현황 */}
        <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
          <CardHeader />
          <TwoStatRow />
        </div>

        {/* 오늘 예약 + 1:1 문의 (2열) */}
        <div className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2">
          <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
            <CardHeader />
            <TwoStatRow />
          </div>
          <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
            <CardHeader />
            <TwoStatRow />
          </div>
        </div>

        {/* 정산 처리 필요 목록 (전체 폭) */}
        <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4 sm:col-span-2">
          <CardHeader />
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SettlementSubCard />
            <SettlementSubCard />
            <SettlementSubCard />
          </div>
        </div>
      </div>
    </>
  );
}

/** 관리자 대시보드 스켈레톤 — ProfilePageShell 구조 미러링 */
export default function AdminPageSkeleton() {
  return (
    <main className="bg-(--oboon-bg-page) min-h-full [overflow-x:clip]">
      <PageContainer className="pb-10">
        <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10 lg:items-start">

          {/* ─── 데스크탑 사이드바 ─── */}
          <aside className="hidden lg:flex flex-col gap-6 sticky top-[calc(var(--oboon-header-offset)+1.5rem)]">
            <div className="space-y-2">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-4 w-36" />
            </div>
            <div className="h-px bg-(--oboon-border-default)" />
            <div className="space-y-0.5">
              {SIDEBAR_LABELS.map((w, i) => (
                <Skeleton key={i} className={`h-9 ${w} rounded-xl`} />
              ))}
            </div>
          </aside>

          {/* ─── 콘텐츠 영역 ─── */}
          <div className="min-w-0">
            {/* 모바일: 타이틀 */}
            <div className="lg:hidden space-y-2 mb-4">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>

            {/* 모바일: sticky 탭 바 */}
            <div className="lg:hidden sticky top-[var(--oboon-header-offset)] z-30 -mx-4 sm:-mx-5 px-4 sm:px-5 bg-(--oboon-bg-page) border-b border-(--oboon-border-default) py-2.5 mb-6">
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
                {MOBILE_TABS.map((w, i) => (
                  <Skeleton key={i} className={`h-8 ${w} rounded-full shrink-0`} />
                ))}
              </div>
            </div>

            {/* 요약 탭 콘텐츠 */}
            <div className="space-y-4">
              <SummaryContentSkeleton />
            </div>
          </div>

        </div>
      </PageContainer>
    </main>
  );
}
