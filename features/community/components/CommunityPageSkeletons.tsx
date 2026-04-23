import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils/cn";
import { CommunityPostCardSkeleton } from "@/features/community/components/CommunityFeed/CommunityPostCardSkeleton";

function CommunitySidebarSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Card className="p-4">
      <Skeleton className="h-5 w-24 rounded-lg" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={`sidebar-${index}`} className="space-y-2">
            <Skeleton className="h-4 w-full rounded-lg" />
            <Skeleton className="h-4 w-2/3 rounded-lg" />
          </div>
        ))}
      </div>
    </Card>
  );
}

function CommunityTabsSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton
          key={`tab-${index}`}
          className={cn("h-9 rounded-full", index === 0 ? "w-16" : index % 2 === 0 ? "w-20" : "w-24")}
        />
      ))}
    </div>
  );
}

export function CommunityPageSkeleton() {
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-10">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_260px] lg:grid-cols-[260px_minmax(0,1fr)_260px]">
          <aside className="hidden lg:block lg:sticky lg:top-[calc(var(--oboon-header-offset)+1rem)] lg:self-start">
            <CommunitySidebarSkeleton rows={4} />
          </aside>

          <section className="order-1 min-w-0 lg:order-2">
            <div className="space-y-4">
              <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
                <CommunityTabsSkeleton />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <CommunityPostCardSkeleton key={`community-post-${index}`} />
                ))}
              </div>
            </div>
          </section>

          <aside className="hidden md:block md:sticky md:top-[calc(var(--oboon-header-offset)+1rem)] md:self-start">
            <CommunitySidebarSkeleton rows={4} />
          </aside>
        </div>
      </PageContainer>
    </main>
  );
}

export function CommunityProfilePageSkeleton() {
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className="min-w-0 space-y-3">
            <div className="flex items-start gap-4">
              <Skeleton className="h-16 w-16 flex-shrink-0 rounded-full" />
              <div className="flex-1 space-y-2 pt-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>

            <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
              <CommunityTabsSkeleton />
            </div>

            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <CommunityPostCardSkeleton key={`profile-post-${index}`} />
              ))}
            </div>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-[calc(var(--oboon-header-offset)+1rem)] lg:self-start">
            <CommunitySidebarSkeleton rows={4} />
            <CommunitySidebarSkeleton rows={3} />
          </aside>
        </div>
      </PageContainer>
    </main>
  );
}

export function OtherCommunityProfilePageSkeleton() {
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className="min-w-0 space-y-3">
            <div className="flex items-start gap-4">
              <Skeleton className="h-16 w-16 flex-shrink-0 rounded-full" />
              <div className="flex-1 space-y-2 pt-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>

            <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
              <CommunityTabsSkeleton />
            </div>

            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <CommunityPostCardSkeleton key={`other-profile-post-${index}`} />
              ))}
            </div>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-[calc(var(--oboon-header-offset)+1rem)] lg:self-start">
            <CommunitySidebarSkeleton rows={3} />
            <CommunitySidebarSkeleton rows={3} />
          </aside>
        </div>
      </PageContainer>
    </main>
  );
}
