// features/map/marker/marker.theme.ts
import type { MarkerType } from "./marker.type";

export function markerVars(type: MarkerType) {
  const dot =
    type === "agent"
      ? "var(--oboon-primary)"
      : type === "valuation"
        ? "var(--oboon-danger)"
        : type === "modelhouse"
          ? "var(--oboon-safe)"
        : type === "open"
          ? "var(--oboon-primary)"
          : type === "ready"
            ? "var(--oboon-danger)"
        : "var(--oboon-safe)";
  return {
    bg: "var(--oboon-bg-surface)",
    border: "var(--oboon-border-default)",
    text: "var(--oboon-text-title)",
    subText: "var(--oboon-text-muted)",
    dot,
  };
}
