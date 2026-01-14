"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

import type { BriefingOriginalCardModel } from "@/features/briefing/types";

export default function HomeBriefingCompactOriginalCard({
  Original,
  count = 0,
}: {
  Original: BriefingOriginalCardModel;
  count?: number;
}) {
  const href = `/briefing/oboon-original/${encodeURIComponent(Original.key)}`;

  return (
    <Link
      href={href}
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
        {/* 상단 */}
        <div className="flex items-center justify-between gap-3">
          <Badge variant="status">{`브리핑 ${count}개`}</Badge>
          <span className="ob-typo-caption text-(--oboon-text-muted)">
            오분 오리지널
          </span>
        </div>

        {/* 시리즈 제목 */}
        <div className="mt-3 ob-typo-subtitle text-(--oboon-text-title) line-clamp-2">
          {Original.name}
        </div>

        {/* 설명 */}
        {Original.description ? (
          <div className="mt-2 ob-typo-caption text-(--oboon-text-muted) line-clamp-2">
            {Original.description}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
