// features/map/marker/marker.constants.ts
import type { MarkerType } from "./marker.type";

export const MARKER_TYPES = [
  "ready",
  "open",
  "closed",
] as const satisfies ReadonlyArray<MarkerType>;

export const MARKER_TYPE_LABEL: Record<MarkerType, string> = {
  ready: "분양 예정",
  open: "분양 중",
  closed: "분양 종료",
};
