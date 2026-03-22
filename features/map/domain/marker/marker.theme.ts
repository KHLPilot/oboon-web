// features/map/marker/marker.theme.ts
import type { MarkerType } from "./marker.type";

export function markerVars(type: MarkerType) {
  const dot =
    type === "grade-green"
      ? "var(--oboon-grade-green)"
      : type === "grade-lime"
        ? "var(--oboon-grade-lime)"
        : type === "grade-yellow"
          ? "var(--oboon-grade-yellow)"
          : type === "grade-orange"
            ? "var(--oboon-grade-orange)"
            : type === "grade-red"
              ? "var(--oboon-grade-red)"
              : type === "agent"
                ? "var(--oboon-primary)"
                : type === "valuation"
                  ? "var(--oboon-danger)"
                  : type === "all"
                    ? "var(--oboon-warning)"
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
