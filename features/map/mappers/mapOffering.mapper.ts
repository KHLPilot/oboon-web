// features/map/mappers/mapOffering.mapper.ts
import type { MarkerType } from "@/app/components/NaverMap";
import { UXCopy } from "@/shared/uxCopy";
import { OFFERING_STATUS_VALUES, normalizeOfferingStatusValue } from "@/features/offerings/domain/offering.constants";
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
};

export type MapPropertyRow = {
  id: number;
  name: string;
  status: string | null;
  image_url: string | null;
  property_locations: PropertyLocationRow[] | null;
  property_unit_types: PropertyUnitTypeRow[] | null;
};

export type DbOffering = {
  id: number;
  type: MarkerType;
  title: string;
  region: string;
  address: string;
  priceMinWon: number | null;
  priceMaxWon: number | null;
  statusEnum: OfferingStatusValue | null;
  lat: number;
  lng: number;
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

function toMarkerType(status: string | null): MarkerType {
  const s = normalizeOfferingStatusValue(status);
  const [readyStatus, openStatus] = OFFERING_STATUS_VALUES;

  if (s === openStatus) return "urgent";
  if (s === readyStatus) return "upcoming";
  return "remain";
}

function getRegionLabel(loc0: PropertyLocationRow | null) {
  const r = pickFirstNonEmpty(
    loc0?.region_3depth,
    loc0?.region_2depth,
    loc0?.region_1depth
  );
  return r ?? UXCopy.regionShort;
}

function getAddressShort(loc0: PropertyLocationRow | null) {
  const addr = pickFirstNonEmpty(loc0?.road_address, loc0?.jibun_address);
  if (!addr) return UXCopy.addressShort;
  return addr.length > 26 ? `${addr.slice(0, 26)}…` : addr;
}

export function mapPropertyRowsToDbOfferings(rows: MapPropertyRow[]) {
  return rows
    .map((r) => {
      const loc0 = r.property_locations?.[0] ?? null;
      const lat = toNumber(loc0?.lat);
      const lng = toNumber(loc0?.lng);

      if (lat == null || lng == null) return null;

      const prices = (r.property_unit_types ?? []).flatMap((u) => {
        const min = toNumber(u.price_min);
        const max = toNumber(u.price_max);
        return [
          ...(min == null ? [] : [min]),
          ...(max == null ? [] : [max]),
        ];
      });

      const priceMin = prices.length ? Math.min(...prices) : null;
      const priceMax = prices.length ? Math.max(...prices) : null;

      const statusEnum = normalizeOfferingStatusValue(r.status);
      const type = toMarkerType(r.status);

      return {
        id: r.id,
        type,
        title: r.name,
        region: getRegionLabel(loc0),
        address: getAddressShort(loc0),
        priceMinWon: priceMin,
        priceMaxWon: priceMax,
        statusEnum,
        lat,
        lng,
      } satisfies DbOffering;
    })
    .filter((v): v is DbOffering => Boolean(v));
}
