import PageContainer from "@/components/shared/PageContainer";
import { Skeleton } from "@/components/ui/Skeleton";

function TabSkeleton() {
  return (
    <div className="space-y-4 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
      <Skeleton className="h-8 w-40 rounded-lg" />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-8 w-16 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-18 rounded-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20">
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-9 w-40 rounded-lg" />
            <Skeleton className="h-4 w-64 rounded-lg" />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <TabSkeleton />
            <div className="space-y-4">
              <Skeleton className="h-48 w-full rounded-2xl" />
              <Skeleton className="h-72 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
