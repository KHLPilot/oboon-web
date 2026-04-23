import PageContainer from "@/components/shared/PageContainer";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20 pt-10">
        <section className="overflow-hidden rounded-3xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-6 py-7 md:px-8 md:py-9">
          <div className="max-w-3xl space-y-3">
            <Skeleton className="h-4 w-40 rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-4 w-full rounded-lg" />
            <Skeleton className="h-4 w-[92%] rounded-lg" />
            <Skeleton className="h-4 w-[88%] rounded-lg" />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-page) px-4 py-4"
              >
                <Skeleton className="h-4 w-20 rounded-lg" />
                <Skeleton className="mt-2 h-5 w-28 rounded-lg" />
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <article
              key={index}
              className="rounded-3xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-6"
            >
              <Skeleton className="h-7 w-32 rounded-lg" />
              <Skeleton className="mt-3 h-4 w-full rounded-lg" />
              <Skeleton className="mt-2 h-4 w-[92%] rounded-lg" />
              <Skeleton className="mt-2 h-4 w-[84%] rounded-lg" />
              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-full rounded-lg" />
                <Skeleton className="h-4 w-[90%] rounded-lg" />
                <Skeleton className="h-4 w-[76%] rounded-lg" />
              </div>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-3xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-6">
          <Skeleton className="h-7 w-28 rounded-lg" />
          <div className="mt-4 flex flex-wrap gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-28 rounded-lg" />
            ))}
          </div>
        </section>
      </PageContainer>
    </main>
  );
}
