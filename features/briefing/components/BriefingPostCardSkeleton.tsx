"use client";

import { cx, cardShell } from "./briefing.ui";
import { Skeleton } from "@/components/ui/Skeleton";

export default function BriefingPostCardSkeleton() {
  return (
    <div className="aspect-4/5">
      <div className={cx(cardShell, "h-full flex flex-col")}>
        <Skeleton className="flex-1 rounded-none rounded-t-2xl border-b border-(--oboon-border-default)" />

        <div className="p-5 flex flex-col h-[116px]">
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>

          <div className="mt-auto pt-3">
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}
