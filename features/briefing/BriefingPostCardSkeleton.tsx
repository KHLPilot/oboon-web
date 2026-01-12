"use client";

import { cx, cardShell } from "./briefing.ui";

export default function BriefingPostCardSkeleton() {
  return (
    <div className="aspect-4/5">
      <div className={cx(cardShell, "h-full flex flex-col")}>
        <div className="flex-1 bg-(--oboon-bg-subtle) border-b border-(--oboon-border-default)" />

        <div className="p-5 flex flex-col h-[116px]">
          <div className="space-y-3">
            <div className="h-4 w-3/4 rounded bg-(--oboon-bg-subtle)" />
            <div className="h-4 w-2/3 rounded bg-(--oboon-bg-subtle)" />
          </div>

          <div className="mt-auto pt-3">
            <div className="h-3 w-24 rounded bg-(--oboon-bg-subtle)" />
          </div>
        </div>
      </div>
    </div>
  );
}
