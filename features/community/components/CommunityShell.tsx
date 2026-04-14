"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/Skeleton";

import CommunityFeed from "./CommunityFeed/CommunityFeed";

const ProfileSummary = dynamic(() => import("./CommunitySidebars/ProfileSummary"), {
  ssr: false,
  loading: () => <SidebarSkeleton />,
});

const Trending = dynamic(() => import("./CommunitySidebars/Trending"), {
  ssr: false,
  loading: () => <SidebarSkeleton rows={4} />,
});

function SidebarSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
      <Skeleton className="h-5 w-24 rounded-lg" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-full rounded-lg" />
            <Skeleton className="h-4 w-2/3 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CommunityShell() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_260px] lg:grid-cols-[260px_minmax(0,1fr)_260px]">
      {/* 왼쪽 사이드바: 데스크톱(lg+)에서만 표시 */}
      <aside className="hidden lg:block lg:order-1 lg:sticky lg:top-[calc(var(--oboon-header-offset)+1rem)] lg:self-start">
        <ProfileSummary />
      </aside>

      {/* 메인 피드 */}
      <section className="order-1 min-w-0 lg:order-2">
        <CommunityFeed />
      </section>

      {/* 오른쪽 사이드바: 태블릿(md+)에서 표시 */}
      <aside className="hidden md:block md:order-2 lg:order-3 md:sticky md:top-[calc(var(--oboon-header-offset)+1rem)] md:self-start">
        <Trending />
      </aside>
    </div>
  );
}
