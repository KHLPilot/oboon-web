// features/map/marker/marker.type.ts
export type MarkerLayer = "agent" | "valuation";
export type MarkerLegacyType = "open" | "ready";
export type MarkerType =
  | MarkerLayer
  | "all"
  | "both"
  | MarkerLegacyType
  | "modelhouse";
