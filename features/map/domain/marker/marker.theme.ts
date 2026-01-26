// features/map/marker/marker.theme.ts
import type { MarkerType } from "./marker.type";

export function markerVars(type: MarkerType) {
  const base = `var(--oboon-marker-${type})`;
  return {
    bg: "var(--oboon-bg-surface)",
    border: "var(--oboon-border-default)",
    text: "var(--oboon-text-title)",
    subText: "var(--oboon-text-muted)",
    dot: base,
  };
}
