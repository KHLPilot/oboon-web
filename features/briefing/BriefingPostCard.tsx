"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Cover, cx, cardShell } from "./briefing.ui";
import {
  type BriefingPostCardModel,
  formatBriefingDate,
  getBriefingPostBadgeText,
  getBriefingPostHref,
} from "./types";

export default function BriefingPostCard({
  post,
}: {
  post: BriefingPostCardModel;
}) {
  const href = getBriefingPostHref(post);

  return (
    <Link href={href} className={cx("group block", "hover:-translate-y-px")}>
      <div className="aspect-4/5">
        <div
          className={cx(
            cardShell,
            "h-full flex flex-col",
            "group-hover:shadow-[0_18px_40px_rgba(0,0,0,0.08)]"
          )}
        >
          <div className="relative flex-1">
            <Cover
              mode="fill"
              imageUrl={post.coverImageUrl ?? undefined}
              className="h-full w-full border-b border-(--oboon-border-default)"
              imgClassName="group-hover:scale-[1.03]"
            />

            <div className="absolute left-3 top-3">
              <Badge variant="status">{getBriefingPostBadgeText(post)}</Badge>
            </div>
          </div>

          <div className="p-5 flex flex-col h-[116px]">
            <div
              className={cx(
                "ob-typo-card-title text-(--oboon-text-title)",
                "line-clamp-2",
                "min-h-[2.9rem]",
                "group-hover:underline"
              )}
            >
              {post.title}
            </div>

            <div className="mt-auto pt-3 ob-typo-meta text-(--oboon-text-muted)">
              {formatBriefingDate(post.createdAt)}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
