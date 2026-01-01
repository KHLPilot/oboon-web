"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { type BriefingSeries } from "@/app/briefing/_data";

export default function HomeBriefingCompactSeriesCard({
  series,
  count = 0,
}: {
  series: BriefingSeries;
  count?: number;
}) {
  return (
    <Link
      href={`/briefing/series/${encodeURIComponent(series.id)}`}
      className={[
        "group block",
        "rounded-2xl border border-(--oboon-border-default)",
        "bg-(--oboon-bg-surface)",
        "shadow-[0_8px_16px_rgba(0,0,0,0.06)]",
        "hover:shadow-[0_16px_32px_rgba(0,0,0,0.10)]",
        "transition-shadow",
      ].join(" ")}
    >
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <Badge variant="status">{`브리핑 ${count}개`}</Badge>
          <span className="text-xs text-(--oboon-text-muted)">
            오리지널 시리즈
          </span>
        </div>

        <div className="mt-3 text-[15px] font-semibold leading-[1.45] text-(--oboon-text-title) line-clamp-2 min-h-[2.8rem]">
          {series.title}
        </div>

        <div className="mt-2 text-[13px] leading-[1.6] text-(--oboon-text-muted) line-clamp-2">
          {series.description}
        </div>

        <div className="mt-4 text-[13px] font-medium text-(--oboon-primary) group-hover:underline">
          시리즈 보기 →
        </div>
      </div>
    </Link>
  );
}
