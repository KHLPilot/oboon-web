"use client";

// features/offerings/components/compare/CompareSlotGrid.client.tsx
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Heart, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { CompareSlot } from "@/features/offerings/domain/offering.types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";

type OfferingOption = {
  id: string;
  name: string;
  location: string;
};

interface CompareSlotGridProps {
  availableItems: OfferingOption[];
  initialSlots?: Partial<Record<CompareSlot, string>>;
  scrappedIds?: string[];
}

const SLOTS: CompareSlot[] = ["a", "b", "c"];

export default function CompareSlotGrid({
  availableItems,
  initialSlots = {},
  scrappedIds = [],
}: CompareSlotGridProps) {
  const scrappedSet = useMemo(() => new Set(scrappedIds), [scrappedIds]);

  const sortedAvailableItems = useMemo(() => {
    if (scrappedSet.size === 0) return availableItems;
    return [
      ...availableItems.filter((i) => scrappedSet.has(i.id)),
      ...availableItems.filter((i) => !scrappedSet.has(i.id)),
    ];
  }, [availableItems, scrappedSet]);
  const router = useRouter();
  const [slots, setSlots] = useState<Partial<Record<CompareSlot, string>>>(
    initialSlots,
  );

  const pushUrl = useCallback(
    (next: Partial<Record<CompareSlot, string>>) => {
      const params = new URLSearchParams();
      SLOTS.forEach((s) => {
        if (next[s]) params.set(s, next[s]!);
      });
      const qs = params.toString();
      router.replace(
        qs ? `/offerings/compare?${qs}` : "/offerings/compare",
        { scroll: false },
      );
    },
    [router],
  );

  const handleSelect = useCallback(
    (slot: CompareSlot, id: string) => {
      const next = { ...slots, [slot]: id };
      setSlots(next);
      pushUrl(next);
    },
    [slots, pushUrl],
  );

  const handleClear = useCallback(
    (slot: CompareSlot) => {
      const next = { ...slots };
      delete next[slot];
      setSlots(next);
      pushUrl(next);
    },
    [slots, pushUrl],
  );

  const optionsFor = useCallback(
    (slot: CompareSlot) => {
      const otherSelected = new Set(
        SLOTS.filter((s) => s !== slot && slots[s]).map((s) => slots[s]!),
      );
      return sortedAvailableItems.filter((item) => !otherSelected.has(item.id));
    },
    [slots, sortedAvailableItems],
  );

  const selectedItem = useCallback(
    (slot: CompareSlot): OfferingOption | null => {
      const id = slots[slot];
      if (!id) return null;
      return sortedAvailableItems.find((item) => item.id === id) ?? null;
    },
    [slots, sortedAvailableItems],
  );

  return (
    <div className="space-y-6">
      {/* 슬롯 선택 그리드 */}
      <div className="grid grid-cols-2 gap-2 md:gap-4 md:grid-cols-3">
        {SLOTS.map((slot) => {
          const item = selectedItem(slot);
          const options = optionsFor(slot);
          const isC = slot === "c";

          return (
            <div
              key={slot}
              className={cn("group relative", isC && "hidden md:block")}
            >
              {/* 슬롯 카드 */}
              <div
                className={cn(
                  "flex flex-col rounded-2xl border-2 bg-(--oboon-bg-surface) transition-all duration-200",
                  item
                    ? "border-(--oboon-primary)"
                    : "border-(--oboon-border-default)",
                )}
              >
                {/* 현장 정보 + X 버튼 */}
                <div className="flex items-start gap-2 px-4 pt-4 pb-3">
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "ob-typo-body font-semibold leading-snug truncate",
                      item ? "text-(--oboon-text-title)" : "text-(--oboon-text-muted)",
                    )}>
                      {item ? item.name : "현장을 선택하세요"}
                    </div>
                    <div className="mt-0.5 ob-typo-caption text-(--oboon-text-muted) truncate">
                      {item ? item.location : ""}
                    </div>
                  </div>
                  {item ? (
                    <button
                      type="button"
                      onClick={() => handleClear(slot)}
                      className="mt-0.5 shrink-0 rounded-full p-0.5 text-(--oboon-text-muted) hover:text-(--oboon-text-body) transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>

                {/* 드롭다운 트리거 */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between",
                        "border-t px-4 py-2.5",
                        "ob-typo-caption transition-colors rounded-b-2xl",
                        item
                          ? "border-(--oboon-primary-border) text-(--oboon-primary) hover:bg-(--oboon-primary-bg)"
                          : "border-(--oboon-border-default) text-(--oboon-text-muted) hover:bg-(--oboon-bg-subtle)",
                      )}
                    >
                      <span>{item ? "현장 변경" : "현장 선택"}</span>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" matchTriggerWidth>
                    <div className="max-h-72 overflow-y-auto">
                      {options.length === 0 ? (
                        <div className="px-3 py-4 text-center ob-typo-caption text-(--oboon-text-muted)">
                          선택 가능한 현장이 없습니다
                        </div>
                      ) : (
                        options.map((option) => (
                          <DropdownMenuItem
                            key={option.id}
                            onClick={() => handleSelect(slot, option.id)}
                            className={cn(
                              "flex items-center gap-2 py-2.5",
                              slots[slot] === option.id &&
                                "bg-(--oboon-bg-subtle)",
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <span className="ob-typo-body font-medium text-(--oboon-text-title) block truncate">
                                {option.name}
                              </span>
                              <span className="ob-typo-caption text-(--oboon-text-muted)">
                                {option.location}
                              </span>
                            </div>
                            {scrappedSet.has(option.id) && (
                              <Heart className="h-3.5 w-3.5 shrink-0 fill-rose-500 text-rose-500" />
                            )}
                          </DropdownMenuItem>
                        ))
                      )}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
