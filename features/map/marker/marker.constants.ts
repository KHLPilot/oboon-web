// features/map/marker/marker.constants.ts
import type { MarkerType } from "./marker.type";

export const MARKER_TYPES = [
  "urgent",
  "upcoming",
  "remain",
] as const satisfies ReadonlyArray<MarkerType>;

export const MARKER_TYPE_LABEL: Record<MarkerType, string> = {
  urgent: "선착순 분양",
  upcoming: "청약 예정",
  remain: "잔여 세대",
};
