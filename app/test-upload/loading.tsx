import PageContainer from "@/components/shared/PageContainer";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20">
        <div className="space-y-4">
          <Skeleton className="h-9 w-56 rounded-lg" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-12 w-40 rounded-full" />
        </div>
      </PageContainer>
    </main>
  );
}
