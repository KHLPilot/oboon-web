import PageContainer from "@/components/shared/PageContainer";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <main className="flex-1 bg-(--oboon-bg-page)">
      <PageContainer className="pb-16">
        <section className="mx-auto w-full max-w-5xl">
          <header className="pt-2">
            <div className="mb-4 flex items-center gap-2">
              <Skeleton className="h-4 w-16 rounded-lg" />
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-4 w-24 rounded-lg" />
            </div>
            <Skeleton className="h-12 w-full max-w-3xl rounded-lg" />
          </header>

          <div className="mt-6 border-t border-(--oboon-border-default)" />

          <article className="space-y-4 py-14">
            <Skeleton className="h-5 w-full rounded-lg" />
            <Skeleton className="h-5 w-[95%] rounded-lg" />
            <Skeleton className="h-5 w-[90%] rounded-lg" />
            <Skeleton className="h-5 w-[96%] rounded-lg" />
            <Skeleton className="h-5 w-[80%] rounded-lg" />
            <Skeleton className="h-5 w-[92%] rounded-lg" />
            <Skeleton className="h-5 w-[88%] rounded-lg" />
          </article>

          <div className="border-t border-(--oboon-border-default) pt-10">
            <Skeleton className="h-5 w-24 rounded-lg" />
          </div>
        </section>
      </PageContainer>
    </main>
  );
}
