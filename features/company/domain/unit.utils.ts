// app/company/properties/[id]/units/utils.ts

import type { UnitRow, UnitStatus } from "./unit.types";
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

// ✅ 추가: ㎡ → 평 변환
export function toPyeong(m2: number | null | undefined): string {
  if (!m2 || m2 <= 0) return "";
  return (m2 / 3.305785).toFixed(2);
}

// ✅ 추가: 원 → 억/만원 변환
export function formatKoreanMoney(value: number | null | undefined): string {
  if (!value || value <= 0) return "";
  const units = [
    { value: 1_0000_0000, label: "억" },
    { value: 1_0000, label: "만" },
  ];
  let remain = value;
  let result = "";
  for (const u of units) {
    if (remain >= u.value) {
      result += `${Math.floor(remain / u.value)}${u.label} `;
      remain %= u.value;
    }
  }
  return result.trim() + "원";
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