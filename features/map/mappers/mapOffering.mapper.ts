// features/map/mappers/mapOffering.mapper.ts
import type {
  MarkerLayer,
} from "@/features/map/domain/marker/marker.type";
import { UXCopy } from "@/shared/uxCopy";
import {
  normalizeOfferingStatusValue,
} from "@/features/offerings/domain/offering.constants";
import type { OfferingStatusValue } from "@/features/offerings/domain/offering.types";

type PropertyLocationRow = {
  lat: number | string | null;
  lng: number | string | null;
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
};

export type MapPropertyRow = {
  id: number;
  name: string;
  status: string | null;
  image_url: string | null;
  confirmed_comment?: string | null;
  estimated_comment?: string | null;
  pending_comment?: string | null;
  has_agent?: boolean | null;
  property_locations: PropertyLocationRow[] | null;
  property_unit_types: PropertyUnitTypeRow[] | null;
};

export type DbOffering = {
  id: number;
  type: MarkerLayer | "both";
  title: string;
  region: string;
  regionSido: string;
  address: string;
  addressFull: string;
  priceMinWon: number | null;
  priceMaxWon: number | null;
  isPricePrivate: boolean;
  statusEnum: OfferingStatusValue | null;
  hasAgent: boolean;
  hasValuation: boolean;
  layers: MarkerLayer[];
  lat: number;
  lng: number;
  imageUrl: string | null;
};

function toNumber(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replaceAll(",", "").trim());
  return Number.isFinite(n) ? n : null;
}

function pickFirstNonEmpty(...values: Array<string | null | undefined>) {
  for (const v of values) {
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return null;
}

function hasAppraiserComment(row: MapPropertyRow) {
  const hasConfirmed = (row.confirmed_comment ?? "").trim().length > 0;
  const hasEstimated = (row.estimated_comment ?? "").trim().length > 0;
  const hasPending = (row.pending_comment ?? "").trim().length > 0;
  return hasConfirmed || hasEstimated || hasPending;
}

function getRegionLabel(loc0: PropertyLocationRow | null) {
  const r = pickFirstNonEmpty(
    loc0?.region_3depth,
    loc0?.region_2depth,
    loc0?.region_1depth,
  );
  return r ?? UXCopy.regionShort;
}

function getAddressShort(loc0: PropertyLocationRow | null) {
  const addr = pickFirstNonEmpty(loc0?.road_address, loc0?.jibun_address);
  if (!addr) return UXCopy.addressShort;
  return addr.length > 26 ? `${addr.slice(0, 26)}…` : addr;
}

function getAddressFull(loc0: PropertyLocationRow | null) {
  const addr = pickFirstNonEmpty(loc0?.road_address, loc0?.jibun_address);
  return addr ?? UXCopy.addressShort;
}

export function mapPropertyRowsToDbOfferings(rows: MapPropertyRow[]) {
  return rows
    .map((r) => {
      const loc0 = r.property_locations?.[0] ?? null;
      const lat = toNumber(loc0?.lat);
      const lng = toNumber(loc0?.lng);

      if (lat == null || lng == null) return null;

      const prices = (r.property_unit_types ?? []).flatMap((u) => {
        if (u.is_price_public === false) return [];
        const min = toNumber(u.price_min);
        const max = toNumber(u.price_max);
        return [...(min == null ? [] : [min]), ...(max == null ? [] : [max])];
      });

      const unitTypes = r.property_unit_types ?? [];
      const hasPrivate = unitTypes.some((u) => u.is_price_public === false);
      const hasPublic = unitTypes.some((u) => u.is_price_public !== false);

      const priceMin = prices.length ? Math.min(...prices) : null;
      const priceMax = prices.length ? Math.max(...prices) : null;

      const statusEnum = normalizeOfferingStatusValue(r.status);
      const hasAgent = r.has_agent === true;
      const hasValuation = hasAppraiserComment(r);
      const layers: MarkerLayer[] = [];
      if (hasAgent) layers.push("agent");
      if (hasValuation) layers.push("valuation");
      const type: MarkerLayer | "both" =
        hasAgent && hasValuation
          ? "both"
          : hasAgent
            ? "agent"
            : "valuation";

      return {
        id: r.id,
        type,
        title: r.name,
        region: getRegionLabel(loc0),
        regionSido: pickFirstNonEmpty(loc0?.region_1depth) ?? "",
        address: getAddressShort(loc0),
        addressFull: getAddressFull(loc0),
        priceMinWon: priceMin,
        priceMaxWon: priceMax,
        isPricePrivate: hasPrivate && !hasPublic,
        statusEnum,
        hasAgent,
        hasValuation,
        layers,
        lat,
        lng,
        imageUrl: r.image_url ?? null,
      } satisfies DbOffering;
    })
    .filter((v): v is DbOffering => Boolean(v));
}
