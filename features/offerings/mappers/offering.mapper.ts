// features/offerings/mappers/offering.mapper.ts
import type { Offering } from "@/types/index";
import {
  normalizeOfferingStatusValue,
  statusLabelOf,
  normalizeRegionTab,
} from "@/features/offerings/domain/offering.constants";

type PropertyLocationRow = {
  road_address: string | null;
  jibun_address: string | null;
  region_1depth: string | null;
  region_2depth: string | null;
  region_3depth: string | null;
};

type PropertyUnitTypeRow = {
  price_min: number | string | null;
  price_max: number | string | null;
  is_price_public?: boolean | null;
  is_public?: boolean | null;
};

type PropertyGalleryImageRow = {
  image_url: string | null;
};

export type PropertyRow = {
  id: number;
  created_at: string;
  name: string;
  status: string | null;
  property_type: string;
  image_url: string | null;
  confirmed_comment: string | null;
  estimated_comment: string | null;
  view_count?: number | null;
  click_count?: number | null;
  total_click_count?: number | null;
  property_gallery_images?: PropertyGalleryImageRow[] | null;
  property_locations: PropertyLocationRow[] | null;
  property_unit_types: PropertyUnitTypeRow[] | null;
};

function toNumber(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replaceAll(",", "").trim());
  return Number.isFinite(n) ? n : null;
}

function pickFirstNonEmpty(...values: Array<string | null | undefined>) {
  for (const v of values) if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

function isAgentAvatarUrl(url: string) {
  return /\/profiles\/[^/]+\/avatar-[^/]+$/i.test(url.trim());
}

function pickPropertyImageUrl(row: PropertyRow) {
  const main = pickFirstNonEmpty(row.image_url);
  if (main && !isAgentAvatarUrl(main)) return main;

  for (const image of row.property_gallery_images ?? []) {
    const url = pickFirstNonEmpty(image?.image_url);
    if (url && !isAgentAvatarUrl(url)) return url;
  }

  return null;
}

export function hasAppraiserComment(row: PropertyRow) {
  const v = (s: string | null) => (s ?? "").trim().length > 0;
  return v(row.confirmed_comment) || v(row.estimated_comment);
}

function aggregatePrice(unitTypes: PropertyUnitTypeRow[] | null | undefined) {
  let min: number | null = null;
  let max: number | null = null;
  let hasPrivate = false;
  let hasPublic = false;

  for (const u of unitTypes ?? []) {
    if (u.is_public === false) continue;
    if (u.is_price_public === false) {
      hasPrivate = true;
      continue;
    }
    hasPublic = true;
    const pMin = toNumber(u.price_min);
    const pMax = toNumber(u.price_max);
    if (pMin != null) min = min == null ? pMin : Math.min(min, pMin);
    if (pMax != null) max = max == null ? pMax : Math.max(max, pMax);
  }

  return { min, max, isPrivate: hasPrivate && !hasPublic };
}

export function mapPropertyRowToOffering(
  row: PropertyRow,
  fallback: { addressShort: string; regionShort: string }
) {
  const loc0 = row.property_locations?.[0] ?? null;
  const addr = pickFirstNonEmpty(loc0?.road_address, loc0?.jibun_address);
  const addressShort = addr
    ? addr.length > 26
      ? `${addr.slice(0, 26)}…`
      : addr
    : fallback.addressShort;

  const { min, max, isPrivate } = aggregatePrice(row.property_unit_types);
  const statusValue = normalizeOfferingStatusValue(row.status);
  const status = statusLabelOf(statusValue);

  const regionTab = normalizeRegionTab(loc0?.region_1depth);
  const regionLabel =
    regionTab === "전체" ? fallback.regionShort : regionTab;

  const offering: Offering = {
    id: String(row.id),
    title: row.name,
    addressShort,
    region: regionTab,
    regionLabel,
    status,
    statusValue,
    hasAppraiserComment: hasAppraiserComment(row),
    imageUrl: pickPropertyImageUrl(row),
    priceMin억: min,
    priceMax억: max,
    isPricePrivate: isPrivate,
  };

  return offering;
}
