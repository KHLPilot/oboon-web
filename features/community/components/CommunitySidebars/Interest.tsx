"use client";

import Card from "@/components/ui/Card";

const INTERESTED_SITES = ["수지자이 에디션", "드파인 연희", "사우역 지엔하임"];

export default function Interest() {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="ob-typo-h3 font-semibold text-(--oboon-text-title)">
          내 관심 현장
        </div>
        <span className="ob-typo-caption text-(--oboon-text-muted)">수정</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {INTERESTED_SITES.map((site) => (
          <span
            key={site}
            className="rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-1 ob-typo-body text-(--oboon-text-body)"
          >
            {site}
          </span>
        ))}
      </div>
    </Card>
  );
}
