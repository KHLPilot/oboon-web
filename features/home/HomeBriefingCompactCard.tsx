"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

import type { BriefingPostCardModel } from "@/features/briefing/types";
import {
  getBriefingPostHref,
  getBriefingPostBadgeText,
  formatBriefingDate,
} from "@/features/briefing/types";

export default function HomeBriefingCompactCard({
  post,
}: {
  post: BriefingPostCardModel;
}) {
  const href = getBriefingPostHref(post);
  const badgeText = getBriefingPostBadgeText(post);
  const dateText = formatBriefingDate(post.createdAt);

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
        {/* 상단: 타입 배지 + 날짜 */}
        <div className="flex items-center justify-between gap-3">
          <Badge variant="status">{badgeText}</Badge>
          <span className="ob-typo-caption text-(--oboon-text-muted)">
            {dateText}
          </span>
        </div>

        {/* 제목: 2줄 고정 */}
        <div
          className={[
            "mt-3",
            "ob-typo-subtitle text-(--oboon-text-title)",
            "line-clamp-2 min-h-[2.8rem]",
          ].join(" ")}
        >
          {post.title}
        </div>
      </div>
    </Link>
  );
}
