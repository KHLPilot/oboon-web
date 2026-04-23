import PageContainer from "@/components/shared/PageContainer";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils/cn";

const SIDEBAR_LABELS = [
  "w-8",
  "w-20",
  "w-16",
  "w-20",
  "w-20",
  "w-16",
  "w-16",
  "w-20",
  "w-16",
  "w-20",
];
const MOBILE_TABS = ["w-8", "w-20", "w-16", "w-20", "w-20"];

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

function SummaryContentSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-10" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>

      <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-5 space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-3 w-28" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
          <CardHeader />
          <div className="mt-3 flex items-center gap-3">
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="mt-2 h-3 w-28" />
        </div>

        <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
          <CardHeader />
          <TwoStatRow />
        </div>

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

        <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4 sm:col-span-2">
          <CardHeader />
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SettlementSubCard />
            <SettlementSubCard />
            <SettlementSubCard />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminPageSkeleton() {
  return (
    <main className="min-h-full bg-(--oboon-bg-page) [overflow-x:clip]">
      <PageContainer className="pb-10">
        <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-10">
          <aside className="hidden flex-col gap-6 lg:sticky lg:flex lg:top-[calc(var(--oboon-header-offset)+1.5rem)]">
            <div className="space-y-2">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-4 w-36" />
            </div>
            <div className="h-px bg-(--oboon-border-default)" />
            <div className="space-y-0.5">
              {SIDEBAR_LABELS.map((w, index) => (
                <Skeleton key={index} className={cn("h-9 rounded-xl", w)} />
              ))}
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-4 space-y-2 lg:hidden">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>

            <div className="sticky top-[var(--oboon-header-offset)] z-30 mb-6 -mx-4 border-b border-(--oboon-border-default) bg-(--oboon-bg-page) px-4 py-2.5 sm:-mx-5 sm:px-5 lg:hidden">
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
                {MOBILE_TABS.map((w, index) => (
                  <Skeleton key={index} className={cn("h-8 shrink-0 rounded-full", w)} />
                ))}
              </div>
            </div>

            <SummaryContentSkeleton />
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
