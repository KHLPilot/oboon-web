import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

function MobileSearchRowSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 flex-1 rounded-xl" />
      <Skeleton className="h-10 w-10 rounded-full" />
    </div>
  );
}

function MobileControlRowSkeleton() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Skeleton className="h-10 w-[6rem] rounded-xl" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    </div>
  );
}

function DesktopSearchToolbarSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 flex-1 rounded-xl" />
      <Skeleton className="h-10 w-10 rounded-full" />
      <Skeleton className="h-10 w-[6rem] rounded-xl" />
      <Skeleton className="h-10 w-10 rounded-full" />
      <Skeleton className="h-10 w-10 rounded-full" />
    </div>
  );
}

function MobileConditionSheetSkeleton() {
  return (
    <Card className="space-y-3 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
      <div className="flex gap-1 rounded-full bg-(--oboon-bg-subtle) p-1">
        <Skeleton className="h-9 flex-1 rounded-full" />
        <Skeleton className="h-9 flex-1 rounded-full" />
      </div>
      <Skeleton className="h-px w-full" />
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
      </div>
    </Card>
  );
}

function DesktopConditionPanelSkeleton() {
  return (
    <Card className="space-y-4 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-5">
      <div className="flex gap-1 rounded-full bg-(--oboon-bg-subtle) p-1">
        <Skeleton className="h-9 flex-1 rounded-full" />
        <Skeleton className="h-9 flex-1 rounded-full" />
      </div>
      <Skeleton className="h-px w-full" />
      <div className="grid gap-3">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    </Card>
  );
}

function MapSkeleton() {
  return (
    <Card className="overflow-hidden rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)">
      <div className="border-b border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-5 w-24 rounded-lg" />
            <Skeleton className="h-4 w-40 rounded-lg" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
      </div>
      <Skeleton className="h-[520px] w-full rounded-none sm:h-[620px]" />
    </Card>
  );
}

export default function Loading() {
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20">
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-9 w-56 rounded-lg" />
            <Skeleton className="h-4 w-72 rounded-lg" />
          </div>

          <div className="sm:hidden">
            <div className="space-y-3">
              <MobileSearchRowSkeleton />
              <MobileConditionSheetSkeleton />
              <MobileControlRowSkeleton />
              <MapSkeleton />
            </div>
          </div>

          <div className="hidden sm:block">
            <div className="space-y-4">
              <DesktopSearchToolbarSkeleton />
              <div className="grid gap-4 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
                <DesktopConditionPanelSkeleton />
                <MapSkeleton />
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
