// features/offerings/detail/OfferingDetailLeft.tsx
import type { ReactNode } from "react";
import Image from "next/image";
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Cross,
  GraduationCap,
  Info,
  MapPin,
  ShoppingCart,
  Store,
  TrainFront,
} from "lucide-react";

import Card from "@/components/ui/Card";
import OfferingDetailTabs from "@/features/offerings/components/detail/OfferingDetailTabs.client";
import OfferingUnitTypesAccordion from "./offeringTypesAccordion.client";
import PropertyImageGallery from "./PropertyImageGallery.client";
import NaverMap, { type MapMarker } from "@/features/map/components/NaverMap";
import { UXCopy } from "@/shared/uxCopy";
import OfferingBadge from "@/features/offerings/components/OfferingBadges";
import { isOfferingStatusValue } from "@/features/offerings/domain/offering.constants";
import { formatPriceRange } from "@/shared/price";
import { getSubwayIconPath } from "@/features/reco/constants/subwayIconMap";

/* ---------------- Types (최소 필요만) ---------------- */

export type PropertyRow = {
  id: number;
  created_at: string;
  name: string;
  property_type: string;
  status: string | null;
  description: string | null;
  image_url: string | null;
  floor_plan_url: string | null;

  confirmed_comment: string | null;
  estimated_comment: string | null;

  property_locations: PropertyLocationRow[] | PropertyLocationRow | null;
  property_specs: PropertySpecRow[] | PropertySpecRow | null;
  property_timeline: PropertyTimelineRow[] | PropertyTimelineRow | null;
  property_unit_types: PropertyUnitTypeRow[] | PropertyUnitTypeRow | null;
  property_facilities?: PropertyFacilityRow[] | PropertyFacilityRow | null;
  property_reco_pois?: PropertyRecoPoiRow[] | PropertyRecoPoiRow | null;
  property_gallery_images?:
    | PropertyGalleryImageRow[]
    | PropertyGalleryImageRow
    | null;
};

type PropertyLocationRow = {
  road_address: string | null;
  jibun_address: string | null;
  lat: number | null;
  lng: number | null;
  region_1depth: string | null;
  region_2depth: string | null;
  region_3depth: string | null;
};

type PropertySpecRow = {
  sale_type: string | null;
  trust_company: string | null;
  developer: string | null;
  builder: string | null;
  site_area: number | null;
  building_area: number | null;
  building_coverage_ratio: number | null;
  floor_area_ratio: number | null;
  floor_ground: number | null;
  floor_underground: number | null;
  building_count: number | null;
  household_total: number | null;
  parking_total: number | null;
  parking_per_household: number | null;
  heating_type: string | null;
  amenities: string | string[] | null;
};

type PropertyTimelineRow = {
  announcement_date: string | null;
  application_start: string | null;
  application_end: string | null;
  winner_announce: string | null;
  contract_start: string | null;
  contract_end: string | null;
  move_in_date: string | null;
};

type PropertyUnitTypeRow = {
  id: number;
  type_name: string | null;
  price_min: number | null;
  price_max: number | null;
  is_price_public?: boolean | null;
  is_public?: boolean | null;
  floor_plan_url: string | null;
  image_url: string | null;
  exclusive_area: number | null;
  supply_area: number | null;
  rooms: number | null;
  bathrooms: number | null;
  building_layout: string | null;
  orientation: string | null;
  unit_count: number | null;
  supply_count: number | null;
};

type PropertyFacilityRow = {
  id: number;
  type: string | null;
  road_address: string | null;
  lat: number | string | null;
  lng: number | string | null;
  is_active?: boolean | null;
};

type PropertyGalleryImageRow = {
  id: string;
  property_id: number;
  image_url: string;
  sort_order: number;
  created_at: string;
};

type PropertyRecoPoiRow = {
  category:
    | "HOSPITAL"
    | "CLINIC_DAILY"
    | "MART"
    | "SUBWAY"
    | "SCHOOL"
    | "DEPARTMENT_STORE"
    | "SHOPPING_MALL";
  rank: number;
  kakao_place_id: string;
  name: string;
  distance_m: number | string | null;
  subway_lines?: string[] | null;
  school_level?:
    | "ELEMENTARY"
    | "MIDDLE"
    | "HIGH"
    | "UNIVERSITY"
    | "OTHER"
    | null;
};

/* ---------------- Utils ---------------- */

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

function pickFirstNonEmpty(...values: Array<string | null | undefined>) {
  for (const v of values) {
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return null;
}

function asArray<T>(v: T | T[] | null | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function firstRow<T>(v: T | T[] | null | undefined): T | null {
  const arr = asArray(v);
  return arr[0] ?? null;
}

function isLikelyImageUrl(url: string | null | undefined) {
  if (!url) return false;
  const u = url.trim();
  if (!u) return false;
  if (u.startsWith("data:image/")) return true;
  return /\.(jpg|jpeg|png|webp|gif|avif|svg)(\?.*)?$/i.test(u);
}

function pickHeroImageUrl(p: PropertyRow) {
  if (isLikelyImageUrl(p.image_url)) return p.image_url;

  const unitTypes = asArray<PropertyUnitTypeRow>(p.property_unit_types);
  const fallback = unitTypes.find((u) =>
    isLikelyImageUrl(u.image_url),
  )?.image_url;
  return fallback ?? null;
}

function buildGalleryImageUrls(p: PropertyRow) {
  const hero = pickHeroImageUrl(p);
  const galleryRows = asArray<PropertyGalleryImageRow>(
    p.property_gallery_images,
  )
    .slice()
    .sort((a, b) => {
      if ((a.sort_order ?? 0) !== (b.sort_order ?? 0)) {
        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      }
      return (a.created_at ?? "").localeCompare(b.created_at ?? "");
    });

  const urls = [hero, ...galleryRows.map((row) => row.image_url)].filter(
    (url): url is string => isLikelyImageUrl(url),
  );

  return Array.from(new Set(urls));
}

function fmtAddr(loc0: PropertyLocationRow | null) {
  return (
    pickFirstNonEmpty(loc0?.road_address, loc0?.jibun_address) ?? UXCopy.address
  );
}

function fmtYMOrYMD(value: string | null | undefined) {
  if (!value) return UXCopy.preNotice;
  const v = value.trim();
  if (!v) return UXCopy.preNotice;
  if (/^\d{4}-\d{2}$/.test(v)) return v;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return UXCopy.preNotice;
}

function fmtRange(a: string | null | undefined, b: string | null | undefined) {
  const fa = fmtYMOrYMD(a);
  const fb = fmtYMOrYMD(b);
  if (fa === UXCopy.preNotice && fb === UXCopy.preNotice)
    return `${UXCopy.preNoticeShort} ~ ${UXCopy.preNoticeShort}`;
  return `${fa} ~ ${fb}`;
}

function fmtText(value: string | null | undefined) {
  return pickFirstNonEmpty(value) ?? "";
}

function fmtNumber(value: number | null | undefined, unit = "") {
  if (value == null || !Number.isFinite(value)) return "";
  return `${value.toLocaleString("ko-KR")}${unit}`;
}

function fmtAmenities(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) {
    const items = value
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    return items.length > 0 ? items.join(", ") : "";
  }
  return fmtText(value);
}

function toNumberOrNull(value: number | string | null | undefined) {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const normalized = value.trim().replaceAll(",", "");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeKoreaCoords(
  lat: number | null,
  lng: number | null,
): { lat: number | null; lng: number | null } {
  if (lat == null || lng == null) return { lat, lng };

  const isKoreaLat = lat >= 30 && lat <= 45;
  const isKoreaLng = lng >= 120 && lng <= 135;
  if (isKoreaLat && isKoreaLng) return { lat, lng };

  // 위/경도가 뒤바뀌어 저장된 케이스 보정
  const isSwappedKoreaLat = lng >= 30 && lng <= 45;
  const isSwappedKoreaLng = lat >= 120 && lat <= 135;
  if (isSwappedKoreaLat && isSwappedKoreaLng) {
    return { lat: lng, lng: lat };
  }

  return { lat, lng };
}

function isValidKoreaCoords(lat: number | null, lng: number | null) {
  return (
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 30 &&
    lat <= 45 &&
    lng >= 120 &&
    lng <= 135
  );
}

function distanceSquared(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
) {
  const dLat = aLat - bLat;
  const dLng = aLng - bLng;
  return dLat * dLat + dLng * dLng;
}

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function isModelHouseType(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) return false;
  const normalized = raw.toLowerCase().replace(/[\s_-]/g, "");
  return (
    normalized === "modelhouse" ||
    normalized === "modelhome" ||
    raw.includes("모델하우스")
  );
}

/* ---------------- Page-local UI atoms ---------------- */

function CardBox({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)",
        className,
      )}
    >
      {children}
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 text-(--oboon-text-muted)">{icon}</div>
      <div>
        <div className="ob-typo-h3 text-(--oboon-text-title)">{title}</div>
        {desc ? (
          <div className="ob-typo-caption text-(--oboon-text-muted)">
            {desc}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <CardBox className="p-0">
      <div className="px-4 py-3">
        <div className="ob-typo-caption text-(--oboon-text-muted)">{label}</div>
        <div className="mt-1 ob-typo-h4 text-(--oboon-text-title)">{value}</div>
      </div>
    </CardBox>
  );
}

/* ---------------- Component ---------------- */

export default function OfferingDetailLeft({
  property,
}: {
  property: PropertyRow;
}) {
  const p = property as PropertyRow;

  const loc0 = firstRow<PropertyLocationRow>(p.property_locations);
  const specs0 = firstRow<PropertySpecRow>(p.property_specs);
  const timeline0 = firstRow<PropertyTimelineRow>(p.property_timeline);
  const facilities = asArray<PropertyFacilityRow>(p.property_facilities);
  const recoPois = asArray<PropertyRecoPoiRow>(p.property_reco_pois).slice();

  const unitTypes = asArray<PropertyUnitTypeRow>(p.property_unit_types)
    .filter((u) => u.is_public !== false)
    .slice()
    .sort((a, b) => (a.type_name ?? "").localeCompare(b.type_name ?? ""));
  const hasPriceTable = unitTypes.length > 0;

  const hasPrivatePriceUnits = unitTypes.some(
    (u) => u.is_price_public === false,
  );
  const hasPublicPriceUnits = unitTypes.some(
    (u) => u.is_price_public !== false,
  );
  const isPricePrivate = hasPrivatePriceUnits && !hasPublicPriceUnits;

  const address = fmtAddr(loc0);
  const statusValue =
    typeof p.status === "string" && isOfferingStatusValue(p.status)
      ? p.status
      : null;

  const galleryImageUrls = buildGalleryImageUrls(p);
  const confirmedMemo = pickFirstNonEmpty(p.confirmed_comment);
  const estimatedMemo = pickFirstNonEmpty(p.estimated_comment);
  const hasMemo = confirmedMemo !== null || estimatedMemo !== null;
  const propertyDescription = pickFirstNonEmpty(p.description);

  const priceMin =
    unitTypes
      .filter((u) => u.is_price_public !== false)
      .map((u) => u.price_min)
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b)[0] ?? null;

  const priceMax =
    unitTypes
      .filter((u) => u.is_price_public !== false)
      .map((u) => u.price_max)
      .filter((n): n is number => n !== null)
      .sort((a, b) => b - a)[0] ?? null;

  const moveIn = fmtYMOrYMD(timeline0?.move_in_date);
  const hasTimeline =
    timeline0?.announcement_date != null ||
    timeline0?.application_start != null ||
    timeline0?.application_end != null ||
    timeline0?.winner_announce != null ||
    timeline0?.contract_start != null ||
    timeline0?.contract_end != null ||
    timeline0?.move_in_date != null;
  const businessInfoItems = [
    { label: "건물 유형", value: fmtText(p.property_type) },
    { label: "주소", value: address },
    { label: "분양 유형", value: fmtText(specs0?.sale_type) },
    { label: "신탁사", value: fmtText(specs0?.trust_company) },
    { label: "시행사", value: fmtText(specs0?.developer) },
    { label: "시공사", value: fmtText(specs0?.builder) },
  ];

  const areaRatioItems = [
    { label: "대지면적(㎡)", value: fmtNumber(specs0?.site_area, "㎡") },
    { label: "건축면적(㎡)", value: fmtNumber(specs0?.building_area, "㎡") },
    {
      label: "건폐율(%)",
      value: fmtNumber(specs0?.building_coverage_ratio, "%"),
    },
    { label: "용적률(%)", value: fmtNumber(specs0?.floor_area_ratio, "%") },
  ];

  const scaleEtcItems = [
    { label: "지상층수", value: fmtNumber(specs0?.floor_ground, "층") },
    { label: "지하층수", value: fmtNumber(specs0?.floor_underground, "층") },
    { label: "건물 동수", value: fmtNumber(specs0?.building_count, "동") },
    { label: "총 세대수", value: fmtNumber(specs0?.household_total, "세대") },
    { label: "총 주차대수", value: fmtNumber(specs0?.parking_total, "대") },
    {
      label: "세대당 주차대수",
      value: fmtNumber(specs0?.parking_per_household, "대"),
    },
    { label: "난방방식", value: fmtText(specs0?.heating_type) },
    { label: "어메니티", value: fmtAmenities(specs0?.amenities) },
  ];

  const siteCoords = normalizeKoreaCoords(
    toNumberOrNull(loc0?.lat),
    toNumberOrNull(loc0?.lng),
  );
  const siteLat = isValidKoreaCoords(siteCoords.lat, siteCoords.lng)
    ? siteCoords.lat
    : null;
  const siteLng = isValidKoreaCoords(siteCoords.lat, siteCoords.lng)
    ? siteCoords.lng
    : null;
  const modelHouseCandidates = facilities
    .filter((facility) => isModelHouseType(facility.type))
    .map((facility) => {
      const normalized = normalizeKoreaCoords(
        toNumberOrNull(facility.lat),
        toNumberOrNull(facility.lng),
      );
      return {
        facility,
        lat: normalized.lat,
        lng: normalized.lng,
      };
    })
    .filter((candidate) => isValidKoreaCoords(candidate.lat, candidate.lng));

  const activeCandidates = modelHouseCandidates.filter(
    (candidate) => candidate.facility.is_active !== false,
  );
  const prioritizedCandidates =
    activeCandidates.length > 0 ? activeCandidates : modelHouseCandidates;

  const selectedModelHouseCandidate =
    siteLat != null && siteLng != null
      ? (prioritizedCandidates.slice().sort((a, b) => {
          const aDistance = distanceSquared(a.lat!, a.lng!, siteLat, siteLng);
          const bDistance = distanceSquared(b.lat!, b.lng!, siteLat, siteLng);
          return aDistance - bDistance;
        })[0] ?? null)
      : (prioritizedCandidates[0] ?? null);

  const modelHouseCoords = selectedModelHouseCandidate
    ? {
        lat: selectedModelHouseCandidate.lat,
        lng: selectedModelHouseCandidate.lng,
      }
    : { lat: null, lng: null };
  const modelHouseLat = modelHouseCoords.lat;
  const modelHouseLng = modelHouseCoords.lng;
  const overlapsWithSite =
    siteLat != null &&
    siteLng != null &&
    modelHouseLat != null &&
    modelHouseLng != null &&
    Math.abs(siteLat - modelHouseLat) < 0.000001 &&
    Math.abs(siteLng - modelHouseLng) < 0.000001;
  const adjustedModelHouseLat =
    overlapsWithSite && modelHouseLat != null
      ? modelHouseLat + 0.00012
      : modelHouseLat;
  const adjustedModelHouseLng =
    overlapsWithSite && modelHouseLng != null
      ? modelHouseLng + 0.00012
      : modelHouseLng;

  const locationMarkers: MapMarker[] = [
    ...(siteLat != null && siteLng != null
      ? [
          {
            id: 1,
            label: "현장 위치",
            lat: siteLat,
            lng: siteLng,
            type: "ready" as const,
            topLabel: null,
            mainLabel: "현장 위치",
          },
        ]
      : []),
    ...(adjustedModelHouseLat != null && adjustedModelHouseLng != null
      ? [
          {
            id: 2,
            label: "모델하우스",
            lat: adjustedModelHouseLat,
            lng: adjustedModelHouseLng,
            type: "open" as const,
            topLabel: null,
            mainLabel: "모델하우스",
          },
        ]
      : []),
  ];
  const shouldFitLocationMarkers =
    locationMarkers.length >= 2
      ? distanceKm(
          locationMarkers[0].lat,
          locationMarkers[0].lng,
          locationMarkers[1].lat,
          locationMarkers[1].lng,
        ) <= 20
      : locationMarkers.length === 1;

  const fmtDistance = (value: number | null) => {
    if (value == null || !Number.isFinite(value)) return "정보 없음";
    const rounded = Math.max(0, Math.round(value));
    if (rounded >= 1000) {
      const km = rounded / 1000;
      return `${km.toFixed(km >= 10 ? 0 : 1)}km`;
    }
    return `${rounded.toLocaleString("ko-KR")}m`;
  };

  const sortedRecoPois = recoPois
    .filter((poi) => poi && typeof poi.name === "string")
    .sort((a, b) => {
      if (a.category !== b.category)
        return a.category.localeCompare(b.category);
      if ((a.rank ?? 0) !== (b.rank ?? 0)) return (a.rank ?? 0) - (b.rank ?? 0);
      return (
        (toNumberOrNull(a.distance_m) ?? 0) -
        (toNumberOrNull(b.distance_m) ?? 0)
      );
    });

  const subwayPois = sortedRecoPois.filter((poi) => poi.category === "SUBWAY");
  const schoolPois = sortedRecoPois.filter((poi) => poi.category === "SCHOOL");
  const martPois = sortedRecoPois.filter((poi) => poi.category === "MART");
  const hospitalPois = sortedRecoPois.filter(
    (poi) => poi.category === "HOSPITAL",
  );
  const clinicDailyPois = sortedRecoPois.filter(
    (poi) => poi.category === "CLINIC_DAILY",
  );
  const departmentStorePois = sortedRecoPois.filter(
    (poi) => poi.category === "DEPARTMENT_STORE",
  );
  const shoppingMallPois = sortedRecoPois.filter(
    (poi) => poi.category === "SHOPPING_MALL",
  );

  const visibleInfraSections = [
    subwayPois.length > 0 ? "SUBWAY" : null,
    schoolPois.length > 0 ? "SCHOOL" : null,
    martPois.length > 0 ? "MART" : null,
    hospitalPois.length > 0 ? "HOSPITAL" : null,
    clinicDailyPois.length > 0 ? "CLINIC_DAILY" : null,
    departmentStorePois.length > 0 ? "DEPARTMENT_STORE" : null,
    shoppingMallPois.length > 0 ? "SHOPPING_MALL" : null,
  ].filter(Boolean).length;
  const visibleChipCount = 4;

  const extractSubwayPrimaryLine = (poi: PropertyRecoPoiRow) => {
    const lines =
      Array.isArray(poi.subway_lines) && poi.subway_lines.length > 0
        ? poi.subway_lines
        : [];
    if (lines[0]) return lines[0];

    const namedLineCandidates =
      poi.name.match(/[가-힣A-Za-z0-9-]+(?:[0-9]+호선|선)/g) ?? [];
    const namedLine = namedLineCandidates.find((candidate) =>
      Boolean(getSubwayIconPath(candidate)),
    );
    if (namedLine) return namedLine;

    const fromName = poi.name.match(/([0-9]+)호선/);
    return fromName ? `${fromName[1]}호선` : null;
  };

  const stripLineSuffixFromName = (name: string) =>
    name.replace(/\s*[0-9]+호선/g, "").trim();

  const renderPoiChips = (
    pois: PropertyRecoPoiRow[],
    formatLabel?: (poi: PropertyRecoPoiRow) => string,
    renderLeading?: (poi: PropertyRecoPoiRow) => ReactNode,
  ) => {
    const primary = pois.slice(0, visibleChipCount);
    const extra = pois.slice(visibleChipCount);

    return (
      <>
        <div className="mt-3 flex flex-wrap gap-2">
          {primary.map((poi) => (
            <div
              key={`${poi.category}-${poi.kakao_place_id}`}
              className="inline-flex items-center rounded-full bg-(--oboon-bg-subtle) px-3 py-2 ob-typo-body text-(--oboon-text-title)"
            >
              {renderLeading ? (
                <span className="mr-2 inline-flex">{renderLeading(poi)}</span>
              ) : null}
              {formatLabel
                ? formatLabel(poi)
                : `${poi.name} · ${fmtDistance(toNumberOrNull(poi.distance_m))}`}
            </div>
          ))}
        </div>
        {extra.length > 0 ? (
          <details className="mt-3 group">
            <summary className="mx-auto inline-flex cursor-pointer list-none items-center justify-center rounded-full border border-(--oboon-border-default) px-5 py-2 ob-typo-body text-(--oboon-text-muted) marker:content-['']">
              더보기
            </summary>
            <div className="mt-3 flex flex-wrap gap-2">
              {extra.map((poi) => (
                <div
                  key={`${poi.category}-${poi.kakao_place_id}`}
                  className="inline-flex items-center rounded-full bg-(--oboon-bg-subtle) px-3 py-2 ob-typo-body text-(--oboon-text-title)"
                >
                  {renderLeading ? (
                    <span className="mr-2 inline-flex">
                      {renderLeading(poi)}
                    </span>
                  ) : null}
                  {formatLabel
                    ? formatLabel(poi)
                    : `${poi.name} · ${fmtDistance(toNumberOrNull(poi.distance_m))}`}
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </>
    );
  };

  return (
    <div className="[--oboon-shadow-card:none]">
      {/* Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <OfferingBadge type="status" value={statusValue} />
        <OfferingBadge type="region" value={loc0?.region_1depth} />
        <OfferingBadge type="propertyType" value={property.property_type} />
      </div>

      {/* Title */}
      <div className="mt-2 px-1 ob-typo-h1 text-(--oboon-text-title)">
        {p.name}
      </div>

      {/* Address */}
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 ob-typo-body text-(--oboon-text-muted)">
        <div className="flex items-center gap-1">
          <MapPin className="h-4 w-4" />
          <span>{address}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="분양가 범위"
          value={formatPriceRange(priceMin, priceMax, {
            unknownLabel: isPricePrivate
              ? UXCopy.pricePrivate
              : UXCopy.priceRange,
          })}
        />
        <StatCard
          label="총 세대수"
          value={
            specs0?.household_total
              ? `${specs0.household_total}세대`
              : UXCopy.checking
          }
        />
        <StatCard
          label="세대 당 주차대수"
          value={
            specs0?.parking_total
              ? `${specs0.parking_total}대`
              : UXCopy.checking
          }
        />
        <StatCard label="입주 예정" value={moveIn} />
      </div>

      {/* Hero image + additional images */}
      <div className="mt-4">
        <PropertyImageGallery
          imageUrls={galleryImageUrls}
          title={p.name}
          placeholderText={UXCopy.imagePlaceholder}
        />
      </div>

      {propertyDescription ? (
        <div className="mt-3">
          <Card className="px-5 py-4">
            <div className="ob-typo-caption text-(--oboon-text-muted)">
              현장 설명
            </div>
            <div className="mt-2 whitespace-pre-wrap wrap-break-word ob-typo-body text-(--oboon-text-title)">
              {propertyDescription}
            </div>
          </Card>
        </div>
      ) : null}

      {/* Tabs (sticky) */}
      <div
        className={[
          "sticky top-16 z-20",
          "mx-0 mt-8 md:-mx-5 md:px-5 py-3",
          "isolate",
          "bg-(--oboon-bg-default)",
        ].join(" ")}
      >
        <OfferingDetailTabs
          hasMemo={hasMemo}
          hasPrices={hasPriceTable}
          hasTimeline={hasTimeline}
          hasInfra
        />
      </div>

      {/* Basic */}
      <div id="basic" className="mt-4 scroll-mt-30 lg:scroll-mt-30">
        <SectionTitle
          icon={<Building2 className="h-5 w-5" />}
          title="기본 정보"
          desc="판단에 필요한 현장 정보를 한 화면에서 확인합니다."
        />

        <div className="mt-3 space-y-3">
          <Card className="px-5 py-3">
            <div className="ob-typo-subtitle text-(--oboon-text-title)">
              분양·사업 정보
            </div>
            <div className="mt-3 grid grid-cols-1 gap-y-4 md:grid-cols-2 md:gap-x-10">
              {businessInfoItems.map((item) => (
                <div key={item.label}>
                  <div className="ob-typo-caption text-(--oboon-text-muted)">
                    {item.label}
                  </div>
                  <div className="mt-1 ob-typo-h4 text-(--oboon-text-title)">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="px-5 py-3">
            <div className="ob-typo-subtitle text-(--oboon-text-title)">
              면적·비율
            </div>
            <div className="mt-3 grid grid-cols-1 gap-y-4 md:grid-cols-2 md:gap-x-10">
              {areaRatioItems.map((item) => (
                <div key={item.label}>
                  <div className="ob-typo-caption text-(--oboon-text-muted)">
                    {item.label}
                  </div>
                  <div className="mt-1 ob-typo-h4 text-(--oboon-text-title)">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="px-5 py-3">
            <div className="ob-typo-subtitle text-(--oboon-text-title)">
              규모·주차·난방·기타
            </div>
            <div className="mt-3 grid grid-cols-1 gap-y-4 md:grid-cols-2 md:gap-x-10">
              {scaleEtcItems.map((item) => (
                <div key={item.label}>
                  <div className="ob-typo-caption text-(--oboon-text-muted)">
                    {item.label}
                  </div>
                  <div className="mt-1 ob-typo-h4 text-(--oboon-text-title)">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Memo */}
      {hasMemo ? (
        <div id="memo" className="mt-10 scroll-mt-30 lg:scroll-mt-30">
          <SectionTitle
            icon={<Info className="h-5 w-5" />}
            title="감정평가사 메모"
            desc="등록된 항목만 노출합니다."
          />

          <div className="mt-3 space-y-3">
            {confirmedMemo ? (
              <Card className="px-5 py-3">
                <div className="ob-typo-caption text-(--oboon-text-muted)">
                  확정 내용
                </div>
                <div className="mt-2 whitespace-pre-wrap wrap-break-word ob-typo-h4 text-(--oboon-text-title)">
                  {confirmedMemo}
                </div>
              </Card>
            ) : null}

            {estimatedMemo ? (
              <Card className="px-5 py-3">
                <div className="ob-typo-caption text-(--oboon-text-muted)">
                  추정 내용
                </div>
                <div className="mt-2 whitespace-pre-wrap wrap-break-word ob-typo-h4 text-(--oboon-text-title)">
                  {estimatedMemo}
                </div>
              </Card>
            ) : null}

            <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-4 py-3">
              <div className="ob-typo-caption text-(--oboon-text-muted)">
                감정평가사 메모는 참고용 정보이며 법적 효력을 갖지 않습니다.
                최종 판단 및 계약은 관련 공문, 고시, 계약서 등 공식 자료를
                반드시 확인해 주세요.
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Prices */}
      {hasPriceTable ? (
        <div id="prices" className="mt-10 scroll-mt-30 lg:scroll-mt-30">
          <SectionTitle
            icon={<BadgeCheck className="h-5 w-5" />}
            title="분양가표"
            desc="전용면적별 최소/최대 범위를 요약합니다."
          />

          <div className="mt-3">
            <Card className="p-3">
              <OfferingUnitTypesAccordion
                unitTypes={unitTypes}
                emptyText={UXCopy.checking}
                imagePlaceholderText={UXCopy.imagePlaceholder}
              />
            </Card>
          </div>
        </div>
      ) : null}

      <div id="infra" className="mt-10 scroll-mt-30 lg:scroll-mt-30">
        <SectionTitle
          icon={<Store className="h-5 w-5" />}
          title="주변 인프라"
          desc="현장 기준 주요 생활 인프라를 확인합니다. 인프라 거리는 직선거리 기준 참고값입니다."
        />

        <div className="mt-3">
          <Card className="overflow-hidden p-0">
            {visibleInfraSections > 0 ? (
              <div className="divide-y divide-(--oboon-border-default)">
                {subwayPois.length > 0 ? (
                  <div className="p-4">
                    <div className="flex items-center gap-2 ob-typo-subtitle text-(--oboon-text-title)">
                      <TrainFront className="h-5 w-5" />
                      지하철 {subwayPois.length}
                    </div>
                    {renderPoiChips(
                      subwayPois,
                      (poi) => {
                        const distance = toNumberOrNull(poi.distance_m);
                        const walkMin = Math.ceil((distance ?? 0) / 80);
                        const stationName = stripLineSuffixFromName(poi.name);
                        return `${stationName} · ${fmtDistance(distance)}/도보 ${walkMin}분`;
                      },
                      (poi) => {
                        const primary = extractSubwayPrimaryLine(poi);
                        if (!primary) return null;
                        const iconPath = getSubwayIconPath(primary);
                        if (!iconPath) return null;
                        return (
                          <Image
                            src={iconPath}
                            alt={primary}
                            width={20}
                            height={20}
                            className="h-5 w-5 rounded-full"
                          />
                        );
                      },
                    )}
                  </div>
                ) : null}

                {schoolPois.length > 0 ? (
                  <div className="p-4">
                    <div className="flex items-center gap-2 ob-typo-subtitle text-(--oboon-text-title)">
                      <GraduationCap className="h-5 w-5" />
                      학교 {schoolPois.length}
                    </div>
                    {renderPoiChips(schoolPois)}
                  </div>
                ) : null}

                {martPois.length > 0 ? (
                  <div className="p-4">
                    <div className="flex items-center gap-2 ob-typo-subtitle text-(--oboon-text-title)">
                      <ShoppingCart className="h-5 w-5" />
                      마트 {martPois.length}
                    </div>
                    {renderPoiChips(martPois)}
                  </div>
                ) : null}

                {hospitalPois.length > 0 ? (
                  <div className="p-4">
                    <div className="flex items-center gap-2 ob-typo-subtitle text-(--oboon-text-title)">
                      <Cross className="h-5 w-5" />
                      병원 {hospitalPois.length}
                    </div>
                    {renderPoiChips(hospitalPois)}
                  </div>
                ) : null}

                {clinicDailyPois.length > 0 ? (
                  <div className="p-4">
                    <div className="flex items-center gap-2 ob-typo-subtitle text-(--oboon-text-title)">
                      <Cross className="h-5 w-5" />
                      생활의료 {clinicDailyPois.length}
                    </div>
                    {renderPoiChips(clinicDailyPois)}
                  </div>
                ) : null}

                {departmentStorePois.length > 0 ? (
                  <div className="p-4">
                    <div className="flex items-center gap-2 ob-typo-subtitle text-(--oboon-text-title)">
                      <Store className="h-5 w-5" />
                      백화점 {departmentStorePois.length}
                    </div>
                    {renderPoiChips(departmentStorePois)}
                  </div>
                ) : null}

                {shoppingMallPois.length > 0 ? (
                  <div className="p-4">
                    <div className="flex items-center gap-2 ob-typo-subtitle text-(--oboon-text-title)">
                      <Store className="h-5 w-5" />
                      쇼핑몰 {shoppingMallPois.length}
                    </div>
                    {renderPoiChips(shoppingMallPois)}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="p-4 ob-typo-body text-(--oboon-text-muted)">
                아직 주변 인프라 데이터가 없습니다. 잠시 후 다시 확인해 주세요.
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Timeline */}
      {hasTimeline ? (
        <div id="timeline" className="mt-10 scroll-mt-30 lg:scroll-mt-30">
          <SectionTitle
            icon={<CalendarDays className="h-5 w-5" />}
            title="분양 일정"
            desc="공고/청약/계약/입주 핵심만 요약합니다."
          />

          <div className="mt-3">
            <Card className="p-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <StatCard
                  label="모집공고"
                  value={fmtYMOrYMD(timeline0?.announcement_date)}
                />
                <StatCard
                  label="청약 접수"
                  value={fmtRange(
                    timeline0?.application_start,
                    timeline0?.application_end,
                  )}
                />
                <StatCard
                  label="당첨자 발표"
                  value={fmtYMOrYMD(timeline0?.winner_announce)}
                />
                <StatCard
                  label="계약"
                  value={fmtRange(
                    timeline0?.contract_start,
                    timeline0?.contract_end,
                  )}
                />
                <StatCard
                  label="입주 예정"
                  value={fmtYMOrYMD(timeline0?.move_in_date)}
                />
              </div>

              <div className="mt-2 px-2 py-1 ob-typo-caption text-(--oboon-text-muted)">
                입주 예정일은 &quot;년도-월&quot; 또는 &quot;년도-월-일&quot;
                형식이 혼재할 수 있어요.
                <br />월 단위 표기는 해당 월로 안내되는 정보를 의미합니다.
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      <div id="location" className="mt-10 scroll-mt-30 lg:scroll-mt-30">
        <SectionTitle
          icon={<MapPin className="h-5 w-5" />}
          title="현장/모델하우스 위치"
          desc="분양 일정 아래에서 위치를 바로 확인할 수 있습니다."
        />

        <div className="mt-3">
          <Card className="p-3">
            {locationMarkers.length > 0 ? (
              <div className="h-[25rem] overflow-hidden rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)">
                <NaverMap
                  markers={locationMarkers}
                  focusedId={locationMarkers[0]?.id ?? null}
                  showFocusedAsRich={false}
                  fitToMarkers={shouldFitLocationMarkers}
                  mode="base"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-(--oboon-border-default) p-4 text-center ob-typo-body text-(--oboon-text-muted)">
                등록된 위치 좌표가 없어 지도를 표시할 수 없습니다.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
