import PageContainer from "@/components/shared/PageContainer";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils/cn";

function FieldSkeleton({ labelWidth = "w-14" }: { labelWidth?: string }) {
  return (
    <div className="space-y-2">
      <Skeleton className={cn("h-4", labelWidth)} />
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}

function ConsultationsShortcutSkeleton() {
  return (
    <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full sm:h-12 sm:w-12" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3.5 w-40" />
          </div>
        </div>
        <Skeleton className="h-5 w-5 shrink-0" />
      </div>
    </div>
  );
}

function ProfileFormSkeleton() {
  return (
    <div className="space-y-4">
      <ConsultationsShortcutSkeleton />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">
        <div className="order-2 space-y-4 lg:order-1">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldSkeleton labelWidth="w-12" />
            <FieldSkeleton labelWidth="w-16" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldSkeleton labelWidth="w-14" />
            <FieldSkeleton labelWidth="w-16" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FieldSkeleton labelWidth="w-8" />
            <FieldSkeleton labelWidth="w-20" />
            <FieldSkeleton labelWidth="w-16" />
          </div>
          <FieldSkeleton labelWidth="w-18" />
          <div className="flex justify-end pt-1">
            <Skeleton className="h-8 w-20 rounded-xl" />
          </div>
        </div>

        <div className="order-1 space-y-2 lg:order-2">
          <Skeleton className="h-4 w-20" />
          <div className="relative mx-auto h-48 w-48 sm:h-60 sm:w-60 lg:h-75 lg:w-75">
            <Skeleton className="h-full w-full rounded-full" />
            <Skeleton className="absolute -bottom-1 -right-1 z-10 h-8 w-8 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfilePageSkeleton() {
  return (
    <main className="min-h-full bg-(--oboon-bg-page) [overflow-x:clip]">
      <PageContainer className="pb-10">
        <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-10">
          <aside className="hidden flex-col gap-6 lg:sticky lg:flex lg:top-[calc(var(--oboon-header-offset)+1.5rem)]">
            <div className="space-y-2">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-4 w-44" />
            </div>
            <div className="h-px bg-(--oboon-border-default)" />
            <div className="space-y-1">
              {["w-20", "w-28", "w-24", "w-20", "w-28"].map((w, index) => (
                <Skeleton key={index} className={cn("h-9 rounded-xl", w)} />
              ))}
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-4 space-y-2 lg:hidden">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-4 w-48" />
            </div>

            <div className="sticky top-[var(--oboon-header-offset)] z-30 mb-6 -mx-4 border-b border-(--oboon-border-default) bg-(--oboon-bg-page) px-4 py-2.5 sm:-mx-5 sm:px-5 lg:hidden">
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
                {["w-20", "w-24", "w-20", "w-20", "w-28"].map((w, index) => (
                  <Skeleton key={index} className={cn("h-8 shrink-0 rounded-full", w)} />
                ))}
              </div>
            </div>

            <ProfileFormSkeleton />
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
