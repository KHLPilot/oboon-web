// components/ui/datePrecision.ts
export type DatePrecision = "month" | "day";
export type DatePrecisionPolicy = "monthOnly" | "dayOnly" | "both";

export function inferPrecision(
  value: string | null | undefined
): DatePrecision {
  if (!value) return "month";
  return value.length === 10 ? "day" : "month"; // 10: YYYY-MM-DD, 7: YYYY-MM
}

export function parseYmOrYmdToLocalDate(
  value: string | null | undefined
): Date | null {
  if (!value) return null;

  // YYYY-MM
  let m = /^(\d{4})-(\d{2})$/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, 1);

  // YYYY-MM-DD
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

  return null;
}

export function formatLocalDate(
  date: Date | null,
  precision: DatePrecision
): string | null {
  if (!date) return null;
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  if (precision === "month") return `${y}-${mo}`;
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

export function dateFormatFor(precision: DatePrecision) {
  return precision === "month" ? "yyyy-MM" : "yyyy-MM-dd";
}

export function placeholderFor(precision: DatePrecision) {
  return precision === "month" ? "예) 2026-01" : "예) 2026-01-15";
}
