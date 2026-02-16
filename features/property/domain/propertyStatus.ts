// features/property/domain/propertyStatus.ts

export type PropertyStatus = "READY" | "OPEN" | "CLOSED";

export const PROPERTY_STATUS_LABEL: Record<PropertyStatus, string> = {
  READY: "분양 예정",
  OPEN: "분양 중",
  CLOSED: "분양 종료",
};

export const PROPERTY_STATUS_OPTIONS: Array<{
  value: PropertyStatus;
  label: string;
}> = (Object.keys(PROPERTY_STATUS_LABEL) as PropertyStatus[]).map((v) => ({
  value: v,
  label: PROPERTY_STATUS_LABEL[v],
}));

export function isPropertyStatus(v: string | null | undefined): v is PropertyStatus {
  return v === "READY" || v === "OPEN" || v === "CLOSED";
}

export function normalizePropertyStatus(
  v: string | null | undefined
): PropertyStatus | null {
  if (!v) return null;
  const s = v.trim().toUpperCase();
  if (s === "ONGOING") return "OPEN";
  return isPropertyStatus(s) ? s : null;
}
