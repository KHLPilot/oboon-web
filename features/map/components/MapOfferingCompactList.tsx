"use client";

import Link from "next/link";
import OfferingBadge from "@/features/offerings/components/OfferingBadges";
import type { OfferingStatusValue } from "@/features/offerings/domain/offering.types";
import { ChevronRight } from "lucide-react";

export type MapOfferingCompactItem = {
  id: number;
  title: string;
  address: string;
  priceRange: string;
  statusValue: OfferingStatusValue | null;
};

export default function MapOfferingCompactList({
  items,
  hoveredId,
  focusedId,
  onHover,
  onSelect,
  hideCounter = false,
}: {
  items: MapOfferingCompactItem[];
  hoveredId?: number | null;
  focusedId?: number | null;
  onHover?: (id: number | null) => void;
  onSelect?: (id: number) => void;
  hideCounter?: boolean;
}) {
  const rowPad = "p-3";

  return (
    <section>
      {!hideCounter ? (
        <div className="mb-2 ob-typo-subtitle text-(--oboon-text-muted)">
          현재 화면에{" "}
          <span className="font-semibold text-(--oboon-text-title)">
            {items.length}
          </span>
          개
        </div>
      ) : null}

      <ul className="overflow-hidden rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) divide-y divide-(--oboon-border-default)">
        {items.map((item) => {
          const isFocused = focusedId === item.id;
          const isHovered = hoveredId === item.id;

          return (
            <li
              key={item.id}
              id={`offering-row-${item.id}`}
              onMouseEnter={() => onHover?.(item.id)}
              onMouseLeave={() => onHover?.(null)}
              onClick={() => onSelect?.(item.id)}
              className={[
                rowPad,
                "cursor-pointer transition-colors",
                "hover:bg-(--oboon-bg-subtle)",
                isFocused ? "bg-(--oboon-bg-subtle)" : "",
                isHovered && !isFocused ? "bg-(--oboon-bg-subtle)" : "",
              ].join(" ")}
            >
              {/* [수정] 상단: 뱃지 + 제목 + 화살표 버튼 */}
              <div className="flex items-center justify-between mb-1">
                {/* 좌측: 뱃지와 제목 */}
                <div className="flex min-w-0 items-center gap-2">
                  <OfferingBadge
                    type="status"
                    value={item.statusValue ?? undefined}
                    className="shrink-0 whitespace-nowrap"
                  />
                  <span className="min-w-0 truncate ob-typo-h3 text-(--oboon-text-title)">
                    {item.title}
                  </span>
                </div>
                <Link
                  href={`/offerings/${item.id}`}
                  onClick={(e) => e.stopPropagation()} // row 선택과 분리
                  aria-label="현장 상세 보기"
                  className={[
                    "inline-flex items-center justify-center",
                    "h-8 w-8 rounded-full",
                    "border border-(--oboon-border-default)",
                    "bg-(--oboon-bg-surface)",
                    "text-(--oboon-text-muted)",
                    "hover:text-(--oboon-text-title)",
                    "hover:bg-(--oboon-bg-subtle)",
                    "transition-colors",
                    "shrink-0",
                  ].join(" ")}
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="flex flex-col ml-2 gap-0.5">
                <div className="mt-1 ob-typo-body text-(--oboon-text-muted)">
                  {item.address}
                </div>
                <div className="mt-1 ob-typo-h4">{item.priceRange}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
