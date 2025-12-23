"use client";

import Link from "next/link";
import { type BriefingSeries } from "@/app/briefing/_data";
import { Cover, cx, cardShell } from "./briefing.ui";
import { Badge } from "@/components/ui/Badge";

export default function BriefingSeriesCard({
  series,
  count,
}: {
  series: BriefingSeries;
  count: number;
}) {
  return (
    <div
      className={cx("group", "hover:-translate-y-[1px] transition-transform")}
    >
      <div
        className={cx(
          cardShell,
          "group-hover:shadow-[0_18px_40px_rgba(0,0,0,0.08)]"
        )}
      >
        {/* 상단 통이미지 + 좌상단 배지 */}
        <div className="relative">
          <Cover
            imageUrl={series.coverImageUrl}
            className="border-b border-(--oboon-border-default)"
            imgClassName="group-hover:scale-[1.03]"
          />

          {/* ✅ 브리핑 개수 배지를 좌상단으로 */}
          <div className="absolute left-3 top-3">
            <Badge variant="status">{`브리핑 ${count}개`}</Badge>
          </div>
        </div>

        {/* 하단 콘텐츠 */}
        <div className="p-5">
          <div className="text-[18px] font-semibold text-(--oboon-text-title)">
            {series.title}
          </div>

          <p className="mt-2 text-[14px] leading-[1.6] text-(--oboon-text-muted) line-clamp-3">
            {series.description}
          </p>

          <div className="mt-4">
            <Link
              href={`/briefing/series/${encodeURIComponent(series.id)}`}
              className={cx(
                "h-9 inline-flex w-full items-center justify-center rounded-[10px] px-3",
                "text-[13px] font-medium",
                "bg-(--oboon-bg-surface) text-(--oboon-text-body)",
                "border border-(--oboon-border-default)",
                "hover:bg-(--oboon-bg-subtle)",
                "transition-colors",
                "whitespace-nowrap"
              )}
            >
              시리즈 페이지 →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
