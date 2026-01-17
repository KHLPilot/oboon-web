"use client";

import { useState } from "react";
import { Layers, ChevronDown, ChevronUp } from "lucide-react";
import type { MarkerType } from "@/features/map/marker/marker.type";
import {
  MARKER_TYPES,
  MARKER_TYPE_LABEL,
} from "@/features/map/marker/marker.constants";
import { markerVars } from "@/features/map/marker/marker.theme";

interface LayerControlProps {
  filters: Record<MarkerType, boolean>;
  onToggle: (key: MarkerType) => void;
}

export default function LayerControl({ filters, onToggle }: LayerControlProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div
      className="
        absolute top-1 left-1 z-20 w-40
        rounded-xl overflow-hidden
        border border-(--oboon-border-default)
        bg-(--oboon-bg-surface)
        shadow-sm
      "
    >
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

      {isOpen && <div className="h-px w-full bg-(--oboon-border-default)" />}

      {isOpen && (
        <div className="px-4 py-3 space-y-3">
          {MARKER_TYPES.map((key) => (
            <label
              key={key}
              className="flex items-center gap-2 ob-typo-caption text-(--oboon-text-body) cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={!!filters[key]}
                onChange={() => onToggle(key)}
                className="accent-(--oboon-primary)"
              />

              {/* ✅ 타입별 dot 색상 */}
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: markerVars(key).dot }}
              />

              {MARKER_TYPE_LABEL[key]}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
