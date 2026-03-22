// features/map/marker/marker.type.ts
export type MarkerLayer = "agent" | "valuation";
export type MarkerLegacyType = "open" | "ready";
export type MarkerGradeType =
  | "grade-green"
  | "grade-lime"
  | "grade-yellow"
  | "grade-orange"
  | "grade-red";
export type MarkerType =
  | MarkerLayer
  | "all"
  | "both"
  | MarkerLegacyType
  | "modelhouse"
  | MarkerGradeType;
