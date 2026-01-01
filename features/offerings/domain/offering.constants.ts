// features/offerings/domain/offering.constants.ts
import type {
  OfferingStatusLabel,
  OfferingStatusValue,
  OfferingRegionTab,
} from "./offering.types";
import { OFFERING_STATUS_VALUES, OFFERING_REGION_TABS } from "./offering.types";

export const OFFERING_STATUS_LABEL: Record<
  OfferingStatusValue,
  OfferingStatusLabel
> = {
  READY: "모집 예정",
  OPEN: "모집 중",
  CLOSED: "모집 종료",
};

export function isOfferingStatusValue(v: string): v is OfferingStatusValue {
  return (OFFERING_STATUS_VALUES as readonly string[]).includes(v);
}

export function normalizeOfferingStatusValue(
  status: string | null | undefined
): OfferingStatusValue | null {
  if (!status) return null;
  const s = status.trim().toUpperCase();
  if (s === "ONGOING") return "OPEN";
  return isOfferingStatusValue(s) ? s : null;
}

export function statusLabelOf(
  v: OfferingStatusValue | null | undefined
): OfferingStatusLabel {
  if (!v) return "확인 중";
  return OFFERING_STATUS_LABEL[v];
}

export function normalizeRegionTab(
  region1Depth: string | null | undefined
): OfferingRegionTab {
  const t = (region1Depth ?? "").trim();
  if (!t) return "전체";
  const hit = OFFERING_REGION_TABS.find(
    (r) => r !== "전체" && t.startsWith(r)
  );
  return hit ?? "전체";
}

export { OFFERING_REGION_TABS, OFFERING_STATUS_VALUES };
