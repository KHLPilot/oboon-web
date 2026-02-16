// features/map/marker/marker.constants.ts
import type { MarkerLayer } from "./marker.type";

export const MARKER_TYPES = [
  "agent",
  "valuation",
] as const satisfies ReadonlyArray<MarkerLayer>;

export const MARKER_TYPE_LABEL: Record<MarkerLayer, string> = {
  agent: "상담 가능",
  valuation: "감정 평가 보유",
};
