"use client";

import OfferingBadge from "@/features/offerings/OfferingBadges";
import type { OfferingStatusValue } from "@/features/offerings/domain/offering.types";

export type MapOfferingCompactItem = {
  id: number;
  title: string;
  region: string;
  priceRange: string;
  statusValue: OfferingStatusValue | null;
};

export default function MapOfferingCompactList({
  items,
  hoveredId,
  focusedId,
  onHover,
  onSelect,
}: {
  items: MapOfferingCompactItem[];
  hoveredId?: number | null;
  focusedId?: number | null;
  onHover?: (id: number | null) => void;
  onSelect?: (id: number) => void;
}) {
  return (
    <section className="mt-6">
      <div className="mb-2 text-sm text-(--oboon-text-muted)">
        현재 화면에{" "}
        <span className="font-semibold text-(--oboon-text-title)">
          {items.length}
        </span>
        개
      </div>

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
                "px-4 py-3 cursor-pointer transition-colors",
                "hover:bg-(--oboon-bg-subtle)",
                isFocused ? "bg-(--oboon-bg-subtle)" : "",
                isHovered && !isFocused ? "bg-(--oboon-bg-subtle)" : "",
              ].join(" ")}
            >
              <div className="flex items-center gap-2">
                <OfferingBadge
                  type="status"
                  value={item.statusValue ?? undefined}
                  className={
                    isFocused
                      ? "border-(--oboon-page) bg-(--oboon-page) text-(--oboon-text-title)"
                      : ""
                  }
                />

                <span className="text-sm font-semibold text-(--oboon-text-title) line-clamp-1">
                  {item.title}
                </span>
              </div>

              <div className="mt-1 text-sm text-(--oboon-text-muted) line-clamp-1">
                {item.region} · {item.priceRange}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
