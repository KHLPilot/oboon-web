"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatDate, typeLabel, type BriefingPost } from "@/app/briefing/_data";

export default function HomeBriefingCompactCard({
  post,
}: {
  post: BriefingPost;
}) {
  return (
    <Link
      href={`/briefing/${post.id}`}
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
          <Badge variant="status">{typeLabel(post.type)}</Badge>
          <span className="text-xs text-(--oboon-text-muted)">
            {formatDate(post.createdAt)}
          </span>
        </div>

        {/* 제목: 2줄 고정(홈 카드 높이 균일화) */}
        <div
          className={[
            "mt-3",
            "text-[15px] font-semibold leading-[1.45] text-(--oboon-text-title)",
            "line-clamp-2",
            "min-h-[2.8rem]",
          ].join(" ")}
        >
          {post.title}
        </div>

        {/* CTA */}
        <div className="mt-4 text-[13px] font-medium text-(--oboon-primary) group-hover:underline">
          브리핑 보기 →
        </div>
      </div>
    </Link>
  );
}
