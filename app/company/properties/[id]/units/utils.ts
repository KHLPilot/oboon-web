import type { UnitRow, UnitStatus } from "./types";

export function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

export function toNumberOrNull(v: string): number | null {
  if (v == null) return null;
  const s = v.trim();
  if (!s) return null;
  const n = Number(s.replaceAll(",", ""));
  return Number.isFinite(n) ? n : null;
}

export function toIntOrNull(v: string): number | null {
  if (v == null) return null;
  const s = v.trim();
  if (!s) return null;

  // 콤마 제거 후, "정수" 문자열만 허용
  const normalized = s.replaceAll(",", "");
  if (!/^-?\d+$/.test(normalized)) return null;

  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;

  return Math.trunc(n);
}

export function numberWithCommas(n: number) {
  return n.toLocaleString("en-US");
}

export function formatM2(v: number | null | undefined) {
  if (v === null || v === undefined) return "-";
  return `${v}`;
}

export function summarizeRoomsBaths(
  rooms: number | null,
  baths: number | null
) {
  const parts: string[] = [];
  if (rooms != null) parts.push(`방 ${rooms}`);
  if (baths != null) parts.push(`욕실 ${baths}`);
  return parts.length ? parts.join(" · ") : "-";
}

function formatEok(value: number, digits = 2): string {
  const eok = value / 100_000_000;
  return `${eok.toFixed(digits)}억`;
}

export function formatPriceRange(
  min?: number | null,
  max?: number | null,
  digits = 2
): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null)
    return `${formatEok(min, digits)} ~ ${formatEok(max, digits)}`;
  if (min != null) return formatEok(min, digits);
  return formatEok(max as number, digits);
}

function isFilled(v: unknown) {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return Number.isFinite(v);
  return true;
}

/**
 * 상태 규칙
 * - 미입력: 주요 필드 채움 <= 2
 * - 입력 중: 일부만 채움
 * - 완료: 주요 필드 모두 채움
 *
 * 주요 필드:
 * type_name, exclusive_area, supply_area, rooms, bathrooms,
 * building_layout, orientation, price_min, price_max, unit_count
 */
export function getUnitStatus(u: UnitRow): UnitStatus {
  const required = [
    u.type_name,
    u.exclusive_area,
    u.supply_area,
    u.rooms,
    u.bathrooms,
    u.building_layout,
    u.orientation,
    u.price_min,
    u.price_max,
    u.unit_count,
  ];

  const filled = required.filter(isFilled).length;

  if (filled <= 2) return "미입력";
  if (filled < required.length) return "입력 중";
  return "완료";
}
