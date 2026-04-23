import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20">
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-9 w-48 rounded-lg" />
            <Skeleton className="h-4 w-72 rounded-lg" />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
            <Card className="space-y-4 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
              <Skeleton className="h-8 w-32 rounded-lg" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-44 w-full rounded-2xl" />
              <Skeleton className="h-72 w-full rounded-2xl" />
            </Card>

            <div className="space-y-4">
              <Card className="space-y-4 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
                <Skeleton className="h-6 w-28 rounded-lg" />
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </Card>
              <Card className="space-y-4 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
                <Skeleton className="h-6 w-32 rounded-lg" />
                <Skeleton className="h-24 w-full rounded-2xl" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-24 rounded-full" />
                  <Skeleton className="h-10 w-24 rounded-full" />
                </div>
              </Card>
            </div>
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
