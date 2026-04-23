import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils/cn";

function SectionSkeleton({ titleWidth = "w-36" }: { titleWidth?: string }) {
  return (
    <Card className="space-y-4 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4 sm:p-5">
      <Skeleton className={cn("h-6 rounded-lg", titleWidth)} />
      <div className="space-y-3">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </Card>
  );
}

export default function Loading() {
  return (
    <main className="w-full max-w-full overflow-x-hidden bg-(--oboon-bg-page)">
      <PageContainer className="pb-16">
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-9 w-48 rounded-lg" />
            <Skeleton className="h-4 w-72 max-w-full rounded-lg" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionSkeleton titleWidth="w-28" />
            <SectionSkeleton titleWidth="w-32" />
            <SectionSkeleton titleWidth="w-40" />
            <SectionSkeleton titleWidth="w-36" />
          </div>

          <Card className="space-y-4 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4 sm:p-5">
            <Skeleton className="h-6 w-32 rounded-lg" />
            <Skeleton className="h-56 w-full rounded-2xl" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
            <Skeleton className="h-12 w-full rounded-xl" />
          </Card>
        </div>
      </PageContainer>
    </main>
  );
}
