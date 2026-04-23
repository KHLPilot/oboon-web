import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

function TabSidebarSkeleton() {
  return (
    <aside className="h-fit">
      <div className="rounded-2xl md:sticky md:top-24">
        <div className="space-y-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-36 rounded-lg" />
        </div>
      </div>
    </aside>
  );
}

function StatCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-5 w-24 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16 rounded-lg" />
          <Skeleton className="h-7 w-16 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-px" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-20 rounded-lg" />
          <Skeleton className="h-7 w-16 rounded-lg" />
        </div>
      </div>
    </Card>
  );
}

function SummaryPanelSkeleton() {
  return (
    <section>
      <div className="mb-4">
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      <Card className="p-4 mb-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24 rounded-lg" />
          <Skeleton className="h-7 w-40 rounded-lg" />
          <Skeleton className="h-4 w-56 rounded-lg" />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className="p-4 sm:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded-lg" />
              <Skeleton className="h-5 w-24 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Card key={index} className="p-3 shadow-none">
                <Skeleton className="h-4 w-12 rounded-lg" />
                <Skeleton className="mt-1 h-7 w-10 rounded-lg" />
              </Card>
            ))}
          </div>
        </Card>

        <StatCardSkeleton />
        <StatCardSkeleton />
        <Card className="p-4 sm:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded-lg" />
              <Skeleton className="h-5 w-24 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 rounded-lg" />
              <Skeleton className="h-7 w-28 rounded-lg" />
            </div>
            <Skeleton className="hidden h-10 w-px sm:block" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 rounded-lg" />
              <div className="flex flex-wrap gap-1.5">
                <Skeleton className="h-6 w-10 rounded-full" />
                <Skeleton className="h-6 w-10 rounded-full" />
                <Skeleton className="h-6 w-10 rounded-full" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

function ListPanelSkeleton() {
  return (
    <Card className="space-y-3 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40 rounded-lg" />
          <Skeleton className="h-4 w-56 rounded-lg" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-64 rounded-lg" />
      <Skeleton className="h-4 w-52 rounded-lg" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
    </Card>
  );
}

export default function Loading() {
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-9 w-44 rounded-lg" />
            <Skeleton className="h-4 w-72 rounded-lg" />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
            <TabSidebarSkeleton />
            <div className="space-y-5">
              <SummaryPanelSkeleton />
              <section>
                <div className="mb-4">
                  <Skeleton className="h-8 w-32 rounded-lg" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <ListPanelSkeleton key={index} />
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
