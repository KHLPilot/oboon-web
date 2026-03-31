"use client";

import Link from "next/link";

import {
  Cover,
  cx,
  cardShell,
} from "@/features/briefing/components/briefing.ui";
import { type BriefingOriginalCardModel } from "@/features/briefing/domain/briefing";

type Props = {
  original: BriefingOriginalCardModel;
  count: number;
  href?: string;
};

export default function BriefingOriginalCard({ original, count, href }: Props) {
  const linkHref =
    href ?? `/briefing/oboon-original/${encodeURIComponent(original.key)}`;

  return (
    <Link
      href={linkHref}
      className="group block transition-transform hover:-translate-y-px"
    >
      <div
        className={cx(
          cardShell,
          "flex flex-row items-center gap-3 p-0",
          "sm:flex-col sm:items-stretch sm:gap-2 sm:p-0",
          "group-hover:shadow-[0_18px_40px_rgba(0,0,0,0.08)]",
        )}
      >
        <div className="h-[88px] w-[88px] shrink-0 overflow-hidden rounded-none rounded-l-[15px] sm:h-auto sm:w-full sm:rounded-none sm:rounded-t-[15px] sm:aspect-4/3">
          <Cover
            mode="fill"
            imageUrl={original.coverImageUrl ?? undefined}
            className="h-full w-full"
            imgClassName="group-hover:scale-[1.03]"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center pr-3 sm:p-4">
          <div className="text-base leading-tight font-semibold text-(--oboon-text-title) line-clamp-2 sm:ob-typo-h3">
            {original.name}
          </div>
          <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
            콘텐츠 {count}개
          </div>
        </div>
      </div>
    </Link>
  );
}
