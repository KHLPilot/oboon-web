"use client";

import { cx, cardShell } from "./briefing.ui";

export default function BriefingPostCardSkeleton() {
  return (
    <div className={cx(cardShell)}>
      {/* 실제 카드와 동일한 이미지 비율(4:5) */}
      <div className="aspect-4/5 w-full bg-(--oboon-bg-subtle) border-b border-(--oboon-border-default)" />

      {/* 실제 카드 p-5 + title 2줄 높이 + date 하단 고정 느낌 */}
      <div className="p-5 flex flex-col">
        <div className="space-y-3">
          <div className="h-4 w-3/4 rounded bg-(--oboon-bg-subtle)" />
          <div className="h-4 w-2/3 rounded bg-(--oboon-bg-subtle)" />
        </div>

        <div className="mt-auto pt-3">
          <div className="h-3 w-24 rounded bg-(--oboon-bg-subtle)" />
        </div>
      </div>
    </div>
  );
}
