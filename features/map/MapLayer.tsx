"use client";

import { useState } from "react";
import { Layers, ChevronDown, ChevronUp } from "lucide-react";

interface LayerControlProps {
  filters: {
    urgent: boolean;
    upcoming: boolean;
    remain: boolean;
  };
  onToggle: (key: "urgent" | "upcoming" | "remain") => void;
}

export default function LayerControl({ filters, onToggle }: LayerControlProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div
      className="
        absolute top-6 left-6 z-20 w-52
        rounded-xl overflow-hidden
        border border-(--oboon-border-default)
        bg-(--oboon-bg-surface)
        shadow-sm
      "
    >
      {/* 헤더 */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="
          w-full flex items-center justify-between
          px-4 py-3
          bg-(--oboon-bg-subtle)
          text-(--oboon-text-muted)
          focus:outline-none focus-visible:ring-2 focus-visible:ring-(--oboon-primary)
          focus-visible:ring-offset-2 focus-visible:ring-offset-(--oboon-bg-surface)
        "
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Layers className="w-4 h-4" />
          지도 레이어
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {/* 구분선(열렸을 때만) */}
      {isOpen && <div className="h-px w-full bg-(--oboon-border-default)" />}

      {/* 필터 */}
      {isOpen && (
        <div className="px-4 py-3 space-y-3">
          {(
            [
              { key: "urgent", label: "선착순 분양" },
              { key: "upcoming", label: "청약 예정" },
              { key: "remain", label: "잔여 세대" },
            ] as const
          ).map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center gap-3 text-sm text-(--oboon-text-body) cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={filters[key]}
                onChange={() => onToggle(key)}
                className="accent-(--oboon-primary)"
              />
              {label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
