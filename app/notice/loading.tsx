import PageContainer from "@/components/shared/PageContainer";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <main className="flex-1 bg-(--oboon-bg-page)">
      <PageContainer className="pb-16">
        <section className="w-full">
          <div className="mb-4 space-y-3">
            <Skeleton className="h-9 w-36 rounded-lg" />
            <div className="flex gap-5 overflow-x-auto">
              <Skeleton className="h-8 w-16 rounded-lg" />
              <Skeleton className="h-8 w-16 rounded-lg" />
              <Skeleton className="h-8 w-16 rounded-lg" />
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
          </div>

          <div className="border-b border-(--oboon-border-default) pb-4">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-8 w-40 rounded-full" />
              <Skeleton className="h-8 w-44 rounded-full" />
            </div>
          </div>

          <div className="divide-y divide-(--oboon-border-default)">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="grid grid-cols-[88px_minmax(0,1fr)_112px] items-center gap-3 px-3 py-6"
              >
                <Skeleton className="h-4 w-16 rounded-lg" />
                <div className="min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-12 rounded-full" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                  <Skeleton className="h-5 w-full rounded-lg" />
                </div>
                <Skeleton className="ml-auto h-4 w-20 rounded-lg" />
              </div>
            ))}
          </div>
        </section>
      </PageContainer>
    </main>
  );
}
