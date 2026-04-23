import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils/cn";

function EditorSectionSkeleton({ titleWidth }: { titleWidth: string }) {
  return (
    <Card className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="space-y-2">
          <Skeleton className={cn("h-5 rounded-lg", titleWidth)} />
          <Skeleton className="h-4 w-56 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-16 rounded-full" />
      </div>
      <Skeleton className="h-24 w-full rounded-2xl" />
    </Card>
  );
}

export default function Loading() {
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20">
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-9 w-48 rounded-lg" />
              <Skeleton className="h-4 w-72 rounded-lg" />
            </div>
            <Skeleton className="h-10 w-24 rounded-full" />
          </div>

          <Card className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
              <Skeleton className="aspect-video w-full rounded-2xl" />
              <div className="space-y-3">
                <Skeleton className="h-7 w-40 rounded-lg" />
                <Skeleton className="h-4 w-full rounded-lg" />
                <Skeleton className="h-4 w-5/6 rounded-lg" />
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-4">
            <EditorSectionSkeleton titleWidth="w-32" />
            <EditorSectionSkeleton titleWidth="w-28" />
            <EditorSectionSkeleton titleWidth="w-36" />
            <EditorSectionSkeleton titleWidth="w-40" />
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
