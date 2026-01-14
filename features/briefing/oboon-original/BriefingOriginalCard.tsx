// features/briefing/oboon-original/BriefingOriginalCard.tsx

"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Cover, cx, cardShell } from "features/briefing/briefing.ui";
import {
  type BriefingOriginalCardModel,
  getBriefingOriginalHref,
} from "features/briefing/types";

type Props = {
  original: BriefingOriginalCardModel;
  count: number;
  href?: string; // 주입용
};

export default function BriefingOriginalCard({ original, count, href }: Props) {
  const linkHref =
    href ?? `/briefing/oboon-original/${encodeURIComponent(original.key)}`;

  const badgeText = original.description ?? original.name;

  const content = (
    <div className="aspect-4/5">
      <div
        className={cx(
          cardShell,
          "h-full flex flex-col",
          "group-hover:shadow-[0_18px_40px_rgba(0,0,0,0.08)]"
        )}
      >
        <div className="flex-1">
          <div className="h-full w-full overflow-hidden rounded-xl border border-(--oboon-border-default)">
            <Cover
              mode="fill"
              imageUrl={original.coverImageUrl ?? undefined}
              className="h-full w-full"
              imgClassName="group-hover:scale-[1.03]"
            />
          </div>
        </div>

        <div className="p-5">
          <div className="mb-3">
            <Badge variant="status">{badgeText}</Badge>
          </div>

          <div className="ob-typo-h3 text-(--oboon-text-title)">
            {original.name}
          </div>

          <div className="mt-3 ob-typo-caption text-(--oboon-text-muted)">
            브리핑 {count}개
          </div>
        </div>
      </div>
    </div>
  );

  const cls = cx("group block", "hover:-translate-y-px transition-transform");

  return (
    <Link href={linkHref} className={cls}>
      {content}
    </Link>
  );
}
