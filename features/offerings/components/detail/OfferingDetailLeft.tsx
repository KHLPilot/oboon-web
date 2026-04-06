// features/offerings/detail/OfferingDetailLeft.tsx
"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Check,
  Clock,
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
import NaverMap, {
  type MapMarker,
  type NaverMapHandle,
} from "@/features/map/components/NaverMap";
import { UXCopy } from "@/shared/uxCopy";
import OfferingBadge from "@/features/offerings/components/OfferingBadges";
import { useToast } from "@/components/ui/Toast";
import { normalizeOfferingStatusValue } from "@/features/offerings/domain/offering.constants";
import { createSupabaseClient } from "@/lib/supabaseClient";
import type {
  PropertyFacilityRow,
  PropertyGalleryImageRow,
  PropertyLocationRow,
  PropertyModelhouseImageRow,
  PropertyRecoPoiRow,
  PropertyRow,
  PropertySpecRow,
  PropertyTimelineRow,
  PropertyUnitTypeRow,
} from "@/features/offerings/domain/offeringDetail.types";
import { formatPriceRange } from "@/shared/price";
import {
  buildInfraSections,
  getDisplayStationName,
  getSubwayIconPaths,
  getSubwayVisual,
  HIGH_SPEED_RAIL_ICON_BG,
  HIGH_SPEED_RAIL_ICON_PATH,
} from "@/features/offerings/utils/infraSections";
import { normalizeRetailPoiName } from "@/features/reco/utils/poiDisplay";
import PropertyCommunityWidget from "@/features/community/components/PropertyCommunityWidget";
import OfferingInlineCompare from "@/features/offerings/components/detail/OfferingInlineCompare.client";
import type { OfferingCompareItem } from "@/features/offerings/domain/offering.types";

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
    isLikelyImageUrl(u.floor_plan_url),
  )?.floor_plan_url;
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


function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const v = s.trim();
  if (/^\d{4}-\d{2}$/.test(v)) return new Date(v + "-01");
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(v);
  return null;
}

function getStepStatus(
  startDate: string | null | undefined,
  endDate?: string | null | undefined,
): "done" | "active" | "upcoming" {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const effectiveEnd = end ?? start;
  if (!start) return "upcoming";
  if (effectiveEnd && effectiveEnd < today) return "done";
  if (start <= today) return "active";
  return "upcoming";
}

function fmtDateTbd(value: string | null | undefined): string {
  if (!value) return "미정";
  const v = value.trim();
  if (/^\d{4}-\d{2}$/.test(v) || /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return "미정";
}

function fmtRangeTbd(
  a: string | null | undefined,
  b: string | null | undefined,
): string {
  return `${fmtDateTbd(a)} ~ ${fmtDateTbd(b)}`;
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

type DetailInfoItem = {
  label: string;
  value: string;
};

function filterFilledInfoItems(items: DetailInfoItem[]) {
  return items.filter((item) => item.value.trim().length > 0);
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
    raw.includes("모델하우스") ||
    raw.includes("견본주택") ||
    raw.includes("홍보관") ||
    raw.includes("분양사무실")
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
  hasApprovedAgent = false,
  currentCompareItem = null,
  availableItemsForCompare = [],
  scrappedIdsForCompare = [],
}: {
  property: PropertyRow;
  hasApprovedAgent?: boolean;
  currentCompareItem?: OfferingCompareItem | null;
  availableItemsForCompare?: { id: string; name: string; location: string }[];
  scrappedIdsForCompare?: string[];
}) {
  const toast = useToast();
  const supabase = useMemo(() => createSupabaseClient(), []);
  const p = property as PropertyRow;
  const locationMapRef = useRef<NaverMapHandle | null>(null);
  const [isModelhouseConsultEnabled, setIsModelhouseConsultEnabled] =
    useState(false);

  const loc0 = firstRow<PropertyLocationRow>(p.property_locations);
  const specs0 = firstRow<PropertySpecRow>(p.property_specs);
  const timeline0 = firstRow<PropertyTimelineRow>(p.property_timeline);
  const facilities = asArray<PropertyFacilityRow>(p.property_facilities);
  const recoPois = asArray<PropertyRecoPoiRow>(p.property_reco_pois).slice();

  const unitTypes = asArray<PropertyUnitTypeRow>(p.property_unit_types)
    .map((unit, index) => ({ unit, index }))
    .filter(({ unit }) => unit.is_public !== false)
    .sort((a, b) => {
      if ((a.unit.sort_order ?? 0) !== (b.unit.sort_order ?? 0)) {
        return (a.unit.sort_order ?? 0) - (b.unit.sort_order ?? 0);
      }
      return a.index - b.index;
    })
    .map(({ unit }) => unit);
  const hasPriceTable = unitTypes.length > 0;

  const hasPrivatePriceUnits = unitTypes.some(
    (u) => u.is_price_public === false,
  );
  const hasPublicPriceUnits = unitTypes.some(
    (u) => u.is_price_public !== false,
  );
  const isPricePrivate = hasPrivatePriceUnits && !hasPublicPriceUnits;

  const address = fmtAddr(loc0);
  const statusValue = normalizeOfferingStatusValue(p.status);

  const galleryImageUrls = buildGalleryImageUrls(p);
  const modelhouseImageRows = asArray<PropertyModelhouseImageRow>(
    p.property_modelhouse_images,
  )
    .slice()
    .sort((a, b) => {
      const rank = (kind: "modelhouse_main" | "modelhouse_gallery") =>
        kind === "modelhouse_main" ? 0 : 1;
      if (rank(a.kind) !== rank(b.kind)) return rank(a.kind) - rank(b.kind);
      if ((a.sort_order ?? 0) !== (b.sort_order ?? 0)) {
        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      }
      return (a.created_at ?? "").localeCompare(b.created_at ?? "");
    });
  const modelhouseImageUrl =
    modelhouseImageRows.find((row) => isLikelyImageUrl(row.image_url))
      ?.image_url ?? null;
  const confirmedMemo = pickFirstNonEmpty(p.confirmed_comment);
  const estimatedMemo = pickFirstNonEmpty(p.estimated_comment);
  const hasMemo = confirmedMemo !== null || estimatedMemo !== null;
  const propertyDescription = pickFirstNonEmpty(p.description);

  useEffect(() => {
    let mounted = true;

    async function evaluateConsultEligibility() {
      if (!hasApprovedAgent || !p.id) {
        if (mounted) setIsModelhouseConsultEnabled(false);
        return;
      }

      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        if (!mounted) return;

        let isBookingBlockedRole = false;
        if (currentUser?.id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", currentUser.id)
            .maybeSingle();
          if (!mounted) return;
          const role = (profile?.role as string | null) ?? null;
          isBookingBlockedRole = role === "agent" || role === "admin";
        }

        const { count } = await supabase
          .from("property_agents")
          .select("property_id", { count: "exact", head: true })
          .eq("property_id", p.id)
          .eq("status", "approved");
        if (!mounted) return;

        const hasBookableAgent = hasApprovedAgent && (count ?? 0) > 0;
        setIsModelhouseConsultEnabled(hasBookableAgent && !isBookingBlockedRole);
      } catch {
        if (mounted) setIsModelhouseConsultEnabled(false);
      }
    }

    void evaluateConsultEligibility();
    return () => {
      mounted = false;
    };
  }, [hasApprovedAgent, p.id, supabase]);

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

  const moveIn = pickFirstNonEmpty(timeline0?.move_in_text) ?? fmtYMOrYMD(timeline0?.move_in_date);
  const hasTimeline =
    timeline0?.announcement_date != null ||
    timeline0?.application_start != null ||
    timeline0?.application_end != null ||
    timeline0?.winner_announce != null ||
    timeline0?.contract_start != null ||
    timeline0?.contract_end != null ||
    timeline0?.move_in_date != null ||
    timeline0?.move_in_text != null;
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
  const visibleBusinessInfoItems = filterFilledInfoItems(businessInfoItems);
  const visibleAreaRatioItems = filterFilledInfoItems(areaRatioItems);
  const visibleScaleEtcItems = filterFilledInfoItems(scaleEtcItems);

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
          (() => {
            const modelhouseAddress =
              selectedModelHouseCandidate?.facility.road_address?.trim() ||
              "주소 정보 없음";
            return {
              id: 2,
              label: "모델하우스",
              lat: adjustedModelHouseLat,
              lng: adjustedModelHouseLng,
              type: "modelhouse" as const,
              topLabel: "모델하우스",
              mainLabel: modelhouseAddress,
              imageUrl: modelhouseImageUrl ?? null,
              address: modelhouseAddress,
              ctaLabel: "상담하기",
              canConsult: isModelhouseConsultEnabled,
            };
          })(),
        ]
      : []),
  ];
  const [focusedLocationMarkerId, setFocusedLocationMarkerId] = useState<number | null>(null);
  const effectiveFocusedLocationMarkerId =
    focusedLocationMarkerId != null &&
    locationMarkers.some((marker) => marker.id === focusedLocationMarkerId)
      ? focusedLocationMarkerId
      : null;
  const focusedLocationMarker =
    effectiveFocusedLocationMarkerId == null
      ? null
      : (locationMarkers.find((marker) => marker.id === effectiveFocusedLocationMarkerId) ??
        null);
  const richLocationMarkerIds =
    focusedLocationMarker?.type === "modelhouse" &&
    effectiveFocusedLocationMarkerId != null
      ? [effectiveFocusedLocationMarkerId]
      : [];

  const handleMarkerAction = async (
    markerId: number,
    action: "copy-address" | "consult",
  ) => {
    const marker = locationMarkers.find((item) => item.id === markerId);
    if (!marker || marker.type !== "modelhouse") return;
    if (action === "consult" && !marker.canConsult) return;

    if (action === "copy-address") {
      const address = marker.address?.trim() ?? "";
      if (!address) {
        toast.warning("복사할 주소 정보가 없습니다.");
        return;
      }
      try {
        await navigator.clipboard.writeText(address);
        toast.success("주소가 복사되었습니다.");
      } catch {
        toast.error("주소 복사에 실패했습니다.");
      }
      return;
    }

    window.dispatchEvent(
      new CustomEvent("oboon:open-consultation", {
        detail: { propertyId: p.id },
      }),
    );
  };
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

  const {
    subwayPois,
    highSpeedRailPois,
    schoolPois,
    schoolGroups,
    retailPois,
    combinedHospitalPois,
    visibleInfraSections,
  } = buildInfraSections(recoPois, property.property_type);

  const renderPoiChips = (
    pois: PropertyRecoPoiRow[],
    formatLabel?: (poi: PropertyRecoPoiRow) => string,
    renderLeading?: (poi: PropertyRecoPoiRow) => ReactNode,
  ) => {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {pois.map((poi) => (
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

      <div id="offering-mobile-condition-validation-slot" className="mt-3 lg:hidden" />

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

      {/* Memo */}
      {hasMemo ? (
        <div id="memo" className="mt-4 scroll-mt-30 lg:scroll-mt-30">
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
                        const { primary, iconPath } = getSubwayVisual(poi);
                        const stationName = getDisplayStationName(
                          poi,
                          primary,
                          iconPath,
                        );
                        return `${stationName} · ${fmtDistance(distance)}/도보 ${walkMin}분`;
                      },
                      (poi) => {
                        const iconPaths = getSubwayIconPaths(poi);
                        if (iconPaths.length === 0) return null;
                        return (
                          <span className="inline-flex items-center gap-1">
                            {iconPaths.map((path, index) => (
                              <Image
                                key={`${poi.kakao_place_id}-${path}-${index}`}
                                src={path}
                                alt={poi.name}
                                width={20}
                                height={20}
                                className="h-5 w-5 rounded-full"
                              />
                            ))}
                          </span>
                        );
                      },
                    )}
                  </div>
                ) : null}

                {highSpeedRailPois.length > 0 ? (
                  <div className="p-4">
                    <div className="flex items-center gap-2 ob-typo-subtitle text-(--oboon-text-title)">
                      <TrainFront className="h-5 w-5" />
                      고속철도 {highSpeedRailPois.length}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {highSpeedRailPois.map((railPoi) => (
                        <div
                          key={`high-speed-${railPoi.stationName}`}
                          className="inline-flex items-center rounded-full bg-(--oboon-bg-subtle) px-3 py-2 ob-typo-body text-(--oboon-text-title)"
                        >
                          <span className="mr-2 inline-flex items-center gap-1">
                            {railPoi.lines.map((line) => (
                              <span
                                key={`${railPoi.stationName}-${line}`}
                                className="inline-flex h-6 w-6 items-center justify-center rounded-full"
                                style={{ backgroundColor: HIGH_SPEED_RAIL_ICON_BG[line] }}
                              >
                                <Image
                                  src={HIGH_SPEED_RAIL_ICON_PATH[line]}
                                  alt={line}
                                  width={16}
                                  height={16}
                                  className="h-4 w-4 object-contain"
                                />
                              </span>
                            ))}
                          </span>
                          {`${railPoi.stationName} · ${fmtDistance(railPoi.distanceM)}`}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {schoolPois.length > 0 ? (
                  <div className="p-4">
                    <div className="flex items-center gap-2 ob-typo-subtitle text-(--oboon-text-title)">
                      <GraduationCap className="h-5 w-5" />
                      학교 {schoolPois.length}
                    </div>
                    <div className="mt-3 space-y-3">
                      {schoolGroups.map((group) => (
                        <div key={group.key}>
                          <div className="ob-typo-caption font-semibold text-(--oboon-text-muted)">
                            {group.label}
                          </div>
                          {renderPoiChips(group.pois)}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {retailPois.length > 0 ? (
                  <div className="p-4">
                    <div className="flex items-center gap-2 ob-typo-subtitle text-(--oboon-text-title)">
                      <ShoppingCart className="h-5 w-5" />
                      마트 {retailPois.length}
                    </div>
                    {renderPoiChips(
                      retailPois,
                      (poi) =>
                        `${normalizeRetailPoiName(poi.name)} · ${fmtDistance(
                          toNumberOrNull(poi.distance_m),
                        )}`,
                    )}
                  </div>
                ) : null}

                {combinedHospitalPois.length > 0 ? (
                  <div className="p-4">
                    <div className="flex items-center gap-2 ob-typo-subtitle text-(--oboon-text-title)">
                      <Cross className="h-5 w-5" />
                      병원 {combinedHospitalPois.length}
                    </div>
                    {renderPoiChips(combinedHospitalPois)}
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
            <Card className="p-4">
              {(() => {
                const steps = [
                  {
                    label: "모집공고",
                    date: fmtDateTbd(timeline0?.announcement_date),
                    startRaw: timeline0?.announcement_date,
                    endRaw: undefined,
                  },
                  {
                    label: "청약 접수",
                    date: fmtRangeTbd(
                      timeline0?.application_start,
                      timeline0?.application_end,
                    ),
                    startRaw: timeline0?.application_start,
                    endRaw: timeline0?.application_end,
                  },
                  {
                    label: "당첨자 발표",
                    date: fmtDateTbd(timeline0?.winner_announce),
                    startRaw: timeline0?.winner_announce,
                    endRaw: undefined,
                  },
                  {
                    label: "계약",
                    date: fmtRangeTbd(
                      timeline0?.contract_start,
                      timeline0?.contract_end,
                    ),
                    startRaw: timeline0?.contract_start,
                    endRaw: timeline0?.contract_end,
                  },
                  {
                    label: "입주 예정",
                    date:
                      pickFirstNonEmpty(timeline0?.move_in_text) ??
                      fmtDateTbd(timeline0?.move_in_date),
                    startRaw: timeline0?.move_in_date,
                    endRaw: undefined,
                  },
                ];

                const statuses = steps.map((s) =>
                  getStepStatus(s.startRaw, s.endRaw),
                );

                const dotStyle = (st: "done" | "active" | "upcoming") =>
                  st === "done"
                    ? {
                        backgroundColor: "var(--oboon-safe)",
                        borderColor: "var(--oboon-safe)",
                        color: "#fff",
                      }
                    : st === "active"
                      ? {
                          backgroundColor: "var(--oboon-primary)",
                          borderColor: "var(--oboon-primary)",
                          color: "#fff",
                        }
                      : {
                          backgroundColor: "var(--oboon-bg-surface)",
                          borderColor: "var(--oboon-border-default)",
                          color: "var(--oboon-text-muted)",
                        };

                const lineColor = (st: "done" | "active" | "upcoming") =>
                  st === "done"
                    ? "var(--oboon-safe)"
                    : "var(--oboon-border-default)";

                const labelColor = (st: "done" | "active" | "upcoming") =>
                  st === "active"
                    ? "var(--oboon-primary)"
                    : st === "done"
                      ? "var(--oboon-text-primary)"
                      : "var(--oboon-text-muted)";

                const dateColor = (st: "done" | "active" | "upcoming") =>
                  st === "upcoming"
                    ? "var(--oboon-text-muted)"
                    : "var(--oboon-text-secondary)";

                const DotIcon = ({
                  status,
                  idx,
                }: {
                  status: "done" | "active" | "upcoming";
                  idx: number;
                }) =>
                  status === "done" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : status === "active" ? (
                    <Clock className="h-3.5 w-3.5" />
                  ) : (
                    <span className="ob-typo-caption font-bold">{idx + 1}</span>
                  );

                return (
                  <>
                    {/* ── Mobile: vertical ── */}
                    <div className="flex flex-col md:hidden">
                      {steps.map((step, i) => {
                        const status = statuses[i];
                        const isLast = i === steps.length - 1;
                        return (
                          <div key={step.label} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2"
                                style={dotStyle(status)}
                              >
                                <DotIcon status={status} idx={i} />
                              </div>
                              {!isLast && (
                                <div
                                  className="my-0.5 w-0.5 flex-1"
                                  style={{
                                    minHeight: "1.25rem",
                                    backgroundColor: lineColor(status),
                                  }}
                                />
                              )}
                            </div>
                            <div
                              className="min-w-0 flex-1"
                              style={{ paddingBottom: isLast ? 0 : "0.875rem" }}
                            >
                              <div className="flex items-center gap-1.5">
                                <p
                                  className="ob-typo-subtitle"
                                  style={{ color: labelColor(status) }}
                                >
                                  {step.label}
                                </p>
                                {status === "active" && (
                                  <span
                                    className="ob-typo-caption rounded-full px-1.5 py-0.5"
                                    style={{
                                      backgroundColor:
                                        "color-mix(in srgb, var(--oboon-primary) 12%, transparent)",
                                      color: "var(--oboon-primary)",
                                    }}
                                  >
                                    진행 중
                                  </span>
                                )}
                              </div>
                              <p
                                className="ob-typo-caption mt-0.5"
                                style={{ color: dateColor(status) }}
                              >
                                {step.date}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* ── Desktop: horizontal ── */}
                    <div className="hidden md:flex md:w-full md:items-start">
                      {steps.map((step, i) => {
                        const status = statuses[i];
                        const prevStatus = i > 0 ? statuses[i - 1] : null;
                        const isFirst = i === 0;
                        const isLast = i === steps.length - 1;
                        return (
                          <div
                            key={step.label}
                            className="flex flex-1 flex-col items-center"
                          >
                            {/* label + badge */}
                            <div className="mb-2 grid min-h-[44px] content-start justify-items-center gap-0.5 px-2">
                              <p
                                className="ob-typo-subtitle whitespace-nowrap text-center"
                                style={{ color: labelColor(status) }}
                              >
                                {step.label}
                              </p>
                              <span
                                aria-hidden={status !== "active"}
                                className={cn(
                                  "ob-typo-caption rounded-full px-1.5 py-px",
                                  status === "active" ? undefined : "invisible",
                                )}
                                style={{
                                  backgroundColor:
                                    "color-mix(in srgb, var(--oboon-primary) 12%, transparent)",
                                  color: "var(--oboon-primary)",
                                }}
                              >
                                진행 중
                              </span>
                            </div>
                            {/* dot + horizontal lines */}
                            <div className="flex w-full items-center">
                              <div
                                className="h-0.5 flex-1"
                                style={{
                                  backgroundColor: isFirst
                                    ? "transparent"
                                    : lineColor(prevStatus!),
                                }}
                              />
                              <div
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2"
                                style={dotStyle(status)}
                              >
                                <DotIcon status={status} idx={i} />
                              </div>
                              <div
                                className="h-0.5 flex-1"
                                style={{
                                  backgroundColor: isLast
                                    ? "transparent"
                                    : lineColor(status),
                                }}
                              />
                            </div>
                            {/* date */}
                            <p
                              className="ob-typo-caption mt-2 whitespace-nowrap px-2 text-center"
                              style={{ color: dateColor(status) }}
                            >
                              {step.date}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
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
                  ref={locationMapRef}
                  markers={locationMarkers}
                  focusedId={effectiveFocusedLocationMarkerId}
                  showFocusedAsRich={false}
                  richMarkerIds={richLocationMarkerIds}
                  fitToMarkers={shouldFitLocationMarkers}
                  mode="base"
                  onMarkerSelect={(id) => {
                    setFocusedLocationMarkerId(id);
                    const marker = locationMarkers.find((item) => item.id === id);
                    if (marker?.type === "modelhouse") {
                      locationMapRef.current?.setView(marker.lat, marker.lng);
                    }
                  }}
                  onMarkerAction={handleMarkerAction}
                  onClearFocus={() => setFocusedLocationMarkerId(null)}
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

      {/* Basic */}
      <div id="basic" className="mt-10 scroll-mt-30 lg:scroll-mt-30">
        <SectionTitle
          icon={<Building2 className="h-5 w-5" />}
          title="기본 정보"
          desc="판단에 필요한 현장 정보를 한 화면에서 확인합니다."
        />

        <div className="mt-3 space-y-3">
          {visibleBusinessInfoItems.length > 0 ? (
            <Card className="px-5 py-3">
              <div className="ob-typo-subtitle text-(--oboon-text-title)">
                분양·사업 정보
              </div>
              <div className="mt-3 grid grid-cols-1 gap-y-4 md:grid-cols-2 md:gap-x-10">
                {visibleBusinessInfoItems.map((item) => (
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
          ) : null}

          {visibleAreaRatioItems.length > 0 ? (
            <Card className="px-5 py-3">
              <div className="ob-typo-subtitle text-(--oboon-text-title)">
                면적·비율
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4 md:gap-x-10">
                {visibleAreaRatioItems.map((item) => (
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
          ) : null}

          {visibleScaleEtcItems.length > 0 ? (
            <Card className="px-5 py-3">
              <div className="ob-typo-subtitle text-(--oboon-text-title)">
                규모·주차·난방·기타
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4 md:gap-x-10">
                {visibleScaleEtcItems.map((item) => (
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
          ) : null}
        </div>
      </div>

      {/* Inline Compare Widget */}
      {currentCompareItem ? (
        <div id="compare" className="mt-10 scroll-mt-30 lg:scroll-mt-30">
          <OfferingInlineCompare
            currentItem={currentCompareItem}
            availableItems={availableItemsForCompare}
            scrappedIds={scrappedIdsForCompare}
          />
        </div>
      ) : null}

      {/* Community Widget */}
      <div id="community" className="mt-10 scroll-mt-30 lg:scroll-mt-30">
        <PropertyCommunityWidget propertyId={p.id} propertyName={p.name} />
      </div>
    </div>
  );
}
