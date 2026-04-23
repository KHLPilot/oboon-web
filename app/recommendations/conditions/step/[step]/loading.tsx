import PageContainer from "@/components/shared/PageContainer";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20">
        <div className="space-y-6">
          <Skeleton className="h-9 w-48 rounded-lg" />
          <Skeleton className="h-6 w-72 rounded-lg" />
          <Skeleton className="h-4 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <div className="flex justify-between gap-3">
            <Skeleton className="h-11 w-28 rounded-full" />
            <Skeleton className="h-11 w-28 rounded-full" />
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
