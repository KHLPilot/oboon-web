import type { UnitRow, UnitStatus } from "./types";
import { formatPriceRange as formatPriceRangeWon } from "@/shared/price";

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

  // 肄ㅻ쭏 ?쒓굅 ?? "?뺤닔" 臾몄옄?대쭔 ?덉슜
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
  if (rooms != null) parts.push(`\uBC29 ${rooms}`);
  if (baths != null) parts.push(`\uC695\uC2E4 ${baths}`);
  return parts.length ? parts.join(" \u00B7 ") : "-";
}

export function formatPriceRange(
  min?: number | null,
  max?: number | null
): string | null {
  const text = formatPriceRangeWon(min ?? null, max ?? null, {
    unknownLabel: "",
  });
  return text || null;
}

function isFilled(v: unknown) {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return Number.isFinite(v);
  return true;
}

/**
 * ?곹깭 洹쒖튃
 * - 誘몄엯?? 二쇱슂 ?꾨뱶 梨꾩? <= 2
 * - ?낅젰 以? ?쇰?留?梨꾩?
 * - ?꾨즺: 二쇱슂 ?꾨뱶 紐⑤몢 梨꾩?
 *
 * 二쇱슂 ?꾨뱶:
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

  if (filled <= 2) return "\uBBF8\uC785\uB825";
  if (filled < required.length) return "\uC785\uB825 \uC911";
  return "\uC644\uB8CC";
}
