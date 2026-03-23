import { Skeleton } from "@/components/ui/Skeleton";
import PageContainer from "@/components/shared/PageContainer";

/** 라벨 + 인풋 필드 스켈레톤 */
function FieldSkeleton({ labelWidth = "w-14" }: { labelWidth?: string }) {
  return (
    <div className="space-y-2">
      <Skeleton className={`h-4 ${labelWidth}`} />
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}

/** 상담 예약 숏컷 카드 스켈레톤 */
function ConsultationsShortcutSkeleton() {
  return (
    <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* 아이콘 */}
          <Skeleton className="h-9 w-9 sm:h-12 sm:w-12 rounded-full shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3.5 w-40" />
          </div>
        </div>
        {/* 화살표 */}
        <Skeleton className="h-5 w-5 shrink-0" />
      </div>
    </div>
  );
}

/** 프로필 탭 콘텐츠(기본 프로필) 스켈레톤 */
function ProfileFormSkeleton() {
  return (
    <div className="space-y-4">
      {/* 상담 예약 숏컷 카드 */}
      <ConsultationsShortcutSkeleton />

      {/* 폼 + 아바타 그리드 */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">
        {/* 폼 필드 — 모바일에서 order-2 (아바타 아래) */}
        <div className="order-2 space-y-4 lg:order-1">
          {/* 이름 / 연락처 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldSkeleton labelWidth="w-12" />
            <FieldSkeleton labelWidth="w-16" />
          </div>
          {/* 닉네임 / 이메일 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldSkeleton labelWidth="w-14" />
            <FieldSkeleton labelWidth="w-16" />
          </div>
          {/* 은행 / 계좌번호 / 입금자명 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FieldSkeleton labelWidth="w-8" />
            <FieldSkeleton labelWidth="w-20" />
            <FieldSkeleton labelWidth="w-16" />
          </div>
          {/* 계정 유형 */}
          <FieldSkeleton labelWidth="w-18" />
          {/* 정보 수정 버튼 (하단 우측) */}
          <div className="flex justify-end pt-1">
            <Skeleton className="h-8 w-20 rounded-xl" />
          </div>
        </div>

        {/* 아바타 — 모바일에서 order-1 (폼 위) */}
        <div className="order-1 space-y-2 lg:order-2">
          <Skeleton className="h-4 w-20" />
          <div className="relative mx-auto h-48 w-48 sm:h-60 sm:w-60 lg:h-75 lg:w-75">
            <Skeleton className="h-full w-full rounded-full" />
            {/* 연필 편집 버튼 */}
            <Skeleton className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full z-10" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** 마이페이지 전체 레이아웃 스켈레톤 — ProfilePageShell 구조 미러링 */
export default function ProfilePageSkeleton() {
  return (
    <main className="bg-(--oboon-bg-page) min-h-full [overflow-x:clip]">
      <PageContainer className="pb-10">
        <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10 lg:items-start">

          {/* ─── 데스크탑 사이드바 ─── */}
          <aside className="hidden lg:flex flex-col gap-6 sticky top-[calc(var(--oboon-header-offset)+1.5rem)]">
            {/* 타이틀 + 설명 */}
            <div className="space-y-2">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-4 w-44" />
            </div>
            <div className="h-px bg-(--oboon-border-default)" />
            {/* 내비 아이템 */}
            <div className="space-y-1">
              {["w-20", "w-28", "w-24", "w-20", "w-28"].map((w, i) => (
                <Skeleton key={i} className={`h-9 ${w} rounded-xl`} />
              ))}
            </div>
          </aside>

          {/* ─── 콘텐츠 영역 ─── */}
          <div className="min-w-0">
            {/* 모바일: 타이틀 */}
            <div className="lg:hidden space-y-2 mb-4">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-4 w-48" />
            </div>

            {/* 모바일: 탭 바 */}
            <div className="lg:hidden sticky top-[var(--oboon-header-offset)] z-30 -mx-4 sm:-mx-5 px-4 sm:px-5 bg-(--oboon-bg-page) border-b border-(--oboon-border-default) py-2.5 mb-6">
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
                {["w-20", "w-24", "w-20", "w-20", "w-28"].map(
                  (w, i) => (
                    <Skeleton
                      key={i}
                      className={`h-8 ${w} rounded-full shrink-0`}
                    />
                  ),
                )}
              </div>
            </div>

            {/* 기본 프로필 탭 콘텐츠 */}
            <ProfileFormSkeleton />
          </div>

        </div>
      </PageContainer>
    </main>
  );
}
