"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Expand, Minus, Plus } from "lucide-react";

import Button from "@/components/ui/Button";
import { type Offering } from "@/types/index";
import { formatPriceRange } from "@/shared/price";
import { UXCopy } from "@/shared/uxCopy";
import { Copy } from "@/shared/copy";
import { getGyeonggiSubRegionConfig } from "@/features/offerings/domain/offering.constants";
import {
  normalizeOfferingStatusValue,
  OFFERING_STATUS_VALUES,
} from "@/features/offerings/domain/offering.constants";
import NaverMap, {
  type MapFocusBounds,
  type MapMarker,
  type NaverMapHandle,
} from "@/features/map/components/NaverMap";
import MapLocationStatusPill from "@/features/map/components/MapLocationStatusPill";
import FullscreenMapOverlay from "@/features/map/components/FullscreenMapOverlay";
import { useCurrentLocationCenter } from "@/features/map/hooks/useCurrentLocationCenter";

type MappedOffering = Offering & {
  lat: number;
  lng: number;
};

type RegionBoundaryPayload = {
  region: string;
  bounds: MapFocusBounds;
  polygons: Array<Array<{ lat: number; lng: number }>>;
};

const ALL_KOREA_VIEW_BOUNDS: MapFocusBounds = {
  south: 33.0,
  west: 125.8,
  north: 38.75,
  east: 130.95,
};
const GPS_FOCUS_ZOOM = 12;
const REGION_CLUSTER_ZOOM_THRESHOLD = 16;
const STATUS_OPEN = OFFERING_STATUS_VALUES[1];

const STATIC_REGION_VIEWPORTS = {
  전체: { key: "nationwide", lat: 36.5, lng: 127.9, zoom: 7 },
  서울: { key: "seoul", lat: 37.5665, lng: 126.978, zoom: 11 },
  인천: { key: "incheon", lat: 37.4563, lng: 126.7052, zoom: 11 },
  경기: { key: "gyeonggi", lat: 37.4138, lng: 127.5183, zoom: 10 },
  부산: { key: "busan", lat: 35.1796, lng: 129.0756, zoom: 11 },
  대구: { key: "daegu", lat: 35.8714, lng: 128.6014, zoom: 11 },
  광주: { key: "gwangju", lat: 35.1595, lng: 126.8526, zoom: 11 },
  대전: { key: "daejeon", lat: 36.3504, lng: 127.3845, zoom: 11 },
  울산: { key: "ulsan", lat: 35.5384, lng: 129.3114, zoom: 11 },
  세종: { key: "sejong", lat: 36.4801, lng: 127.289, zoom: 11 },
  강원: { key: "gangwon", lat: 37.8228, lng: 128.1555, zoom: 9 },
  충북: { key: "chungbuk", lat: 36.6357, lng: 127.4917, zoom: 10 },
  충남: { key: "chungnam", lat: 36.5184, lng: 126.8, zoom: 10 },
  전북: { key: "jeonbuk", lat: 35.8202, lng: 127.1089, zoom: 10 },
  전남: { key: "jeonnam", lat: 34.8679, lng: 126.991, zoom: 9 },
  경북: { key: "gyeongbuk", lat: 36.4919, lng: 128.8889, zoom: 9 },
  경남: { key: "gyeongnam", lat: 35.4606, lng: 128.2132, zoom: 10 },
  제주: { key: "jeju", lat: 33.4996, lng: 126.5312, zoom: 10 },
} as const;

function getStaticRegionViewport(region: string) {
  return STATIC_REGION_VIEWPORTS[region as keyof typeof STATIC_REGION_VIEWPORTS] ?? null;
}

const SEOUL_BOUNDARY_KEY_BY_LABEL: Record<string, string> = {
  강남구: "seoul_gangnam",
  강동구: "seoul_gangdong",
  강북구: "seoul_gangbuk",
  강서구: "seoul_gangseo",
  관악구: "seoul_gwanak",
  광진구: "seoul_gwangjin",
  구로구: "seoul_guro",
  금천구: "seoul_geumcheon",
  노원구: "seoul_nowon",
  도봉구: "seoul_dobong",
  동대문구: "seoul_dongdaemun",
  동작구: "seoul_dongjak",
  마포구: "seoul_mapo",
  서대문구: "seoul_seodaemun",
  서초구: "seoul_seocho",
  성동구: "seoul_seongdong",
  성북구: "seoul_seongbuk",
  송파구: "seoul_songpa",
  양천구: "seoul_yangcheon",
  영등포구: "seoul_yeongdeungpo",
  용산구: "seoul_yongsan",
  은평구: "seoul_eunpyeong",
  종로구: "seoul_jongno",
  중구: "seoul_jung",
  중랑구: "seoul_jungnang",
};

function polygonArea(path: Array<{ lat: number; lng: number }>) {
  if (path.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < path.length; i += 1) {
    const p1 = path[i];
    const p2 = path[(i + 1) % path.length];
    sum += p1.lng * p2.lat - p2.lng * p1.lat;
  }
  return Math.abs(sum) / 2;
}

function pickTopAreaPolygons(
  polygons: Array<Array<{ lat: number; lng: number }>>,
  topN: number,
) {
  const ranked = polygons
    .map((path) => ({ path, area: polygonArea(path) }))
    .filter((item) => item.area > 0)
    .sort((a, b) => b.area - a.area);
  if (ranked.length === 0) return [];

  const largestArea = ranked[0].area;
  const filtered = ranked
    .filter((item) => item.area >= largestArea * 0.08)
    .slice(0, Math.max(1, topN))
    .map((item) => item.path);

  return filtered.length > 0 ? filtered : [ranked[0].path];
}

function computeBoundsFromPolygons(
  polygons: Array<Array<{ lat: number; lng: number }>>,
): MapFocusBounds | null {
  const focusPolygons = pickTopAreaPolygons(polygons, 3);
  const points = focusPolygons.flat();
  if (points.length === 0) return null;
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  return {
    south: Math.min(...lats),
    west: Math.min(...lngs),
    north: Math.max(...lats),
    east: Math.max(...lngs),
  };
}

function computeBoundsFromMarkers(markers: MapMarker[]): MapFocusBounds | null {
  if (markers.length === 0) return null;
  const lats = markers.map((m) => m.lat);
  const lngs = markers.map((m) => m.lng);
  const south = Math.min(...lats);
  const north = Math.max(...lats);
  const west = Math.min(...lngs);
  const east = Math.max(...lngs);
  const latPad = Math.max((north - south) * 0.12, 0.01);
  const lngPad = Math.max((east - west) * 0.12, 0.01);
  return {
    south: south - latPad,
    west: west - lngPad,
    north: north + latPad,
    east: east + lngPad,
  };
}

type RegionHierarchy = {
  provinceLabel: string;
  cityLabel: string | null;
  districtLabel: string | null;
  displayLabel: string;
};

function normalizeProvinceLabel(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) return "기타";
  if (raw.includes("서울")) return "서울";
  if (raw.includes("경기")) return "경기";
  if (raw.includes("인천")) return "인천";
  if (raw.includes("부산")) return "부산";
  if (raw.includes("대구")) return "대구";
  if (raw.includes("대전")) return "대전";
  if (raw.includes("광주")) return "광주";
  if (raw.includes("울산")) return "울산";
  if (raw.includes("세종")) return "세종";
  if (raw.includes("강원")) return "강원";
  if (raw.includes("충청북")) return "충북";
  if (raw.includes("충청남")) return "충남";
  if (raw.includes("충북")) return "충북";
  if (raw.includes("충남")) return "충남";
  if (raw.includes("전라북")) return "전북";
  if (raw.includes("전라남")) return "전남";
  if (raw.includes("전북")) return "전북";
  if (raw.includes("전남")) return "전남";
  if (raw.includes("경상북")) return "경북";
  if (raw.includes("경상남")) return "경남";
  if (raw.includes("경북")) return "경북";
  if (raw.includes("경남")) return "경남";
  if (raw.includes("제주")) return "제주";
  return (
    raw
      .replace(
        /특별자치시|특별자치도|특별시|광역시|자치시|자치도|도/g,
        "",
      )
      .trim() || raw
  );
}

function splitRegionHierarchy(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) {
    return { cityLabel: null, districtLabel: null };
  }

  const parts = raw.split(/\s+/).filter(Boolean);
  let cityLabel: string | null = null;
  let districtLabel: string | null = null;

  for (const part of parts) {
    if (cityLabel === null && /[시군]$/.test(part)) {
      cityLabel = part;
    }
    if (/[구군]$/.test(part)) {
      districtLabel = part;
    }
  }

  if (parts.length === 1) {
    const only = parts[0];
    if (/[시군]$/.test(only)) {
      cityLabel = only;
    }
    if (/[구군]$/.test(only)) {
      districtLabel = only;
    }
  }

  return { cityLabel, districtLabel };
}

function buildRegionHierarchy(offering: MappedOffering): RegionHierarchy {
  const provinceLabel = normalizeProvinceLabel(
    offering.regionLabel ?? offering.region ?? offering.addressFull,
  );
  const { cityLabel, districtLabel } = splitRegionHierarchy(
    offering.addressFull ?? offering.addressShort ?? offering.regionLabel,
  );
  const displayLabel = districtLabel ?? cityLabel ?? provinceLabel;

  return {
    provinceLabel,
    cityLabel,
    districtLabel,
    displayLabel,
  };
}

function toMapMarkers(offerings: MappedOffering[]): MapMarker[] {
  return offerings.map((offering) => {
    const hierarchy = buildRegionHierarchy(offering);

    return {
      id: Number(offering.id),
      type: "all",
      label: offering.title,
      lat: offering.lat,
      lng: offering.lng,
      topLabel: hierarchy.displayLabel,
      propertyType: offering.propertyType ?? null,
      mainLabel: formatPriceRange(offering.priceMin억, offering.priceMax억, {
        unknownLabel: offering.isPricePrivate
          ? UXCopy.pricePrivateShort
          : UXCopy.priceRangeShort,
      }),
      address: offering.addressShort,
      imageUrl: offering.imageUrl ?? null,
      ctaLabel: offering.status,
      canConsult:
        normalizeOfferingStatusValue(offering.statusValue) === STATUS_OPEN,
      clusterProvinceLabel: hierarchy.provinceLabel,
      clusterCityLabel: hierarchy.cityLabel,
      clusterDistrictLabel: hierarchy.districtLabel,
    };
  });
}

export default function OfferingsMapView({
  offerings,
}: {
  offerings: Offering[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const mapApiRef = useRef<NaverMapHandle | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [focusedId, setFocusedId] = useState<number | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const { center: initialCenter, status: initialLocationStatus } =
    useCurrentLocationCenter(true, { startDelayMs: 1200 });
  const lastViewportKeyRef = useRef<string>("");
  const [regionBoundaryByKey, setRegionBoundaryByKey] = useState<
    Record<string, RegionBoundaryPayload>
  >({});
  const region = sp.get("region") ?? "전체";
  const subRegion = sp.get("subRegion") ?? "";
  const hasActiveListFilters = useMemo(
    () =>
      Boolean(
        (sp.get("region") ?? "").trim() ||
          (sp.get("subRegion") ?? "").trim() ||
          (sp.get("status") ?? "").trim() ||
          (sp.get("q") ?? "").trim() ||
          (sp.get("budgetMin") ?? "").trim() ||
          (sp.get("budgetMax") ?? "").trim() ||
          (sp.get("agent") ?? "").trim() ||
          (sp.get("appraisal") ?? "").trim() ||
          (sp.get("recommended") ?? "").trim() ||
          (sp.get("recommendedIds") ?? "").trim(),
      ),
    [sp],
  );

  const mappableOfferings = useMemo<MappedOffering[]>(
    () =>
      offerings.filter(
        (offering): offering is MappedOffering =>
          typeof offering.lat === "number" &&
          Number.isFinite(offering.lat) &&
          typeof offering.lng === "number" &&
          Number.isFinite(offering.lng),
      ),
    [offerings],
  );
  const markers = useMemo(
    () => toMapMarkers(mappableOfferings),
    [mappableOfferings],
  );
  const byId = useMemo(
    () => new Map(mappableOfferings.map((offering) => [Number(offering.id), offering])),
    [mappableOfferings],
  );
  const activeFocusedId =
    focusedId !== null && byId.has(focusedId) ? focusedId : null;
  const activeBounds = useMemo(
    () =>
      computeBoundsFromMarkers(markers) ??
      ALL_KOREA_VIEW_BOUNDS,
    [markers],
  );
  const activeBoundaryRegionKey = useMemo(() => {
    if (region === "서울" && subRegion && subRegion !== "전체") {
      return SEOUL_BOUNDARY_KEY_BY_LABEL[subRegion] ?? "seoul";
    }
    if (region === "경기" && subRegion === "north") return "gyeonggi_north";
    if (region === "경기" && subRegion === "south") return "gyeonggi_south";
    if (region === "경기" && subRegion && subRegion !== "전체") {
      return getGyeonggiSubRegionConfig(subRegion)?.boundaryKey ?? "gyeonggi";
    }
    if (region === "서울") return "seoul";
    if (region === "경기") return "gyeonggi";
    if (region === "인천") return "incheon";
    if (region === "부산") return "busan";
    if (region === "대구") return "daegu";
    if (region === "광주") return "gwangju";
    if (region === "대전") return "daejeon";
    if (region === "울산") return "ulsan";
    if (region === "세종") return "sejong";
    if (region === "강원") return "gangwon";
    if (region === "충북") return "chungbuk";
    if (region === "충남") return "chungnam";
    if (region === "전북") return "jeonbuk";
    if (region === "전남") return "jeonnam";
    if (region === "경북") return "gyeongbuk";
    if (region === "경남") return "gyeongnam";
    if (region === "제주") return "jeju";
    return "all";
  }, [region, subRegion]);
  const activeRegionFocusPolygons = useMemo(
    () =>
      activeBoundaryRegionKey === "all"
        ? []
        : (regionBoundaryByKey[activeBoundaryRegionKey]?.polygons ?? []),
    [activeBoundaryRegionKey, regionBoundaryByKey],
  );
  const activeRegionBoundaryPayload =
    activeBoundaryRegionKey === "all"
      ? null
      : regionBoundaryByKey[activeBoundaryRegionKey] ?? null;
  const hasActiveRegionBoundary = activeBoundaryRegionKey === "all"
    ? true
    : Boolean(activeRegionBoundaryPayload);
  const isDefaultScope = activeBoundaryRegionKey === "all" && !hasActiveListFilters;
  const mapInitialCenter = isDefaultScope ? initialCenter : null;
  const staticRegionViewport = getStaticRegionViewport(region);
  const activeRegionFocusBounds = useMemo(
    () => {
      if (activeBoundaryRegionKey === "all") return null;
      if (!activeRegionBoundaryPayload) return null;
      return (
        computeBoundsFromPolygons(activeRegionFocusPolygons) ??
        activeRegionBoundaryPayload.bounds
      );
    },
    [
      activeBoundaryRegionKey,
      activeRegionBoundaryPayload,
      activeRegionFocusPolygons,
    ],
  );
  const handleMarkerSelect = useCallback((id: number) => {
    if (activeFocusedId === id) {
      router.push(`/offerings/${id}`);
      return;
    }
    setFocusedId(id);
  }, [activeFocusedId, router]);
  const handleOverlaySelect = useCallback((id: number) => {
    if (id <= 0) {
      setFocusedId(null);
      return;
    }
    if (activeFocusedId === id) {
      router.push(`/offerings/${id}`);
      return;
    }
    setFocusedId(id);
  }, [activeFocusedId, router]);
  useEffect(() => {
    if (activeBoundaryRegionKey === "all") return;
    if (regionBoundaryByKey[activeBoundaryRegionKey]) return;

    const controller = new AbortController();

    async function loadBoundary() {
      try {
        const response = await fetch(
          `/api/map/region-boundary?region=${encodeURIComponent(activeBoundaryRegionKey)}`,
          {
            signal: controller.signal,
            cache: process.env.NODE_ENV === "development" ? "no-store" : "default",
          },
        );
        if (!response.ok) return;
        const payload = (await response.json()) as RegionBoundaryPayload;
        if (!payload?.bounds || !Array.isArray(payload?.polygons)) return;
        setRegionBoundaryByKey((prev) => ({
          ...prev,
          [activeBoundaryRegionKey]: payload,
        }));
      } catch {
        // ignore boundary fetch failures
      }
    }

    void loadBoundary();
    return () => controller.abort();
  }, [activeBoundaryRegionKey, regionBoundaryByKey]);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapApiRef.current;
    if (!map) return;
    let retryTimer: number | null = null;

    if (isDefaultScope) {
      if (initialLocationStatus === "granted" && initialCenter) {
        const locationKey = `${initialCenter.lat.toFixed(6)},${initialCenter.lng.toFixed(6)}`;
        const viewportKey = `location:${locationKey}`;
        if (lastViewportKeyRef.current !== viewportKey) {
          lastViewportKeyRef.current = viewportKey;
          map.setView(initialCenter.lat, initialCenter.lng, GPS_FOCUS_ZOOM);
          retryTimer = window.setTimeout(() => {
            mapApiRef.current?.setView(
              initialCenter.lat,
              initialCenter.lng,
              GPS_FOCUS_ZOOM,
            );
          }, 180);
        }
        return () => {
          if (retryTimer !== null) window.clearTimeout(retryTimer);
        };
      }

      if (
        initialLocationStatus === "pending" ||
        initialLocationStatus === "idle"
      ) {
        return;
      }

      if (lastViewportKeyRef.current !== "nationwide") {
        lastViewportKeyRef.current = "nationwide";
        map.fitToBounds(ALL_KOREA_VIEW_BOUNDS);
      }
      return;
    }

    if (staticRegionViewport) {
      const viewportKey = `region:${staticRegionViewport.key}:${staticRegionViewport.lat.toFixed(4)},${staticRegionViewport.lng.toFixed(4)},${staticRegionViewport.zoom}`;
      if (lastViewportKeyRef.current !== viewportKey) {
        lastViewportKeyRef.current = viewportKey;
        map.setView(
          staticRegionViewport.lat,
          staticRegionViewport.lng,
          staticRegionViewport.zoom,
        );
      }
      return () => {
        if (retryTimer !== null) window.clearTimeout(retryTimer);
      };
    }

    if (hasActiveListFilters) {
      const bounds = activeBounds;
      const boundsKey = `${bounds.south.toFixed(4)},${bounds.west.toFixed(4)},${bounds.north.toFixed(4)},${bounds.east.toFixed(4)}`;
      const viewportKey = `bounds:${boundsKey}`;
      if (lastViewportKeyRef.current !== viewportKey) {
        lastViewportKeyRef.current = viewportKey;
        map.fitToBounds(bounds);
      }
      return () => {
        if (retryTimer !== null) window.clearTimeout(retryTimer);
      };
    }

    if (!hasActiveRegionBoundary) return;
    const bounds =
      activeBoundaryRegionKey === "all"
        ? activeBounds
        : activeRegionFocusBounds;
    if (!bounds) return;
    const boundsKey = `${bounds.south.toFixed(4)},${bounds.west.toFixed(4)},${bounds.north.toFixed(4)},${bounds.east.toFixed(4)}`;
    const viewportKey = `region:${activeBoundaryRegionKey}:${boundsKey}`;
    if (lastViewportKeyRef.current === viewportKey) return;
    lastViewportKeyRef.current = viewportKey;
    map.fitToBounds(bounds);
    return () => {
      if (retryTimer !== null) window.clearTimeout(retryTimer);
    };
  }, [
    activeBoundaryRegionKey,
    activeBounds,
    activeRegionFocusBounds,
    isDefaultScope,
    initialCenter,
    initialLocationStatus,
    hasActiveListFilters,
    hasActiveRegionBoundary,
    mapReady,
    staticRegionViewport,
  ]);

  if (mappableOfferings.length === 0) {
    return (
      <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-6 space-y-2">
        <p className="ob-typo-body font-semibold text-(--oboon-text-title)">
          {Copy.offerings.map.empty.title}
        </p>
        <p className="ob-typo-caption text-(--oboon-text-muted)">
          {Copy.offerings.map.empty.subtitle}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <div className="overflow-hidden rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)">
          <div className="relative h-[500px] sm:h-[520px] md:h-[620px]">
            <div className="absolute inset-0">
              <NaverMap
                ref={mapApiRef}
                markers={markers}
                initialCenter={mapInitialCenter}
                initialLocationStatus={initialLocationStatus}
                initialZoom={11}
                regionClusterEnabled
                regionClusterZoomThreshold={REGION_CLUSTER_ZOOM_THRESHOLD}
                clusterZoomDelta={1}
                showFocusedAsRich
                focusedMarkerViewType="hero"
                focusBounds={hasActiveRegionBoundary ? activeRegionFocusBounds : null}
                focusPolygons={hasActiveRegionBoundary ? activeRegionFocusPolygons : []}
                hoveredId={hoveredId}
                focusedId={activeFocusedId}
                onMapReady={() => setMapReady(true)}
                onHoverChange={setHoveredId}
                onMarkerSelect={handleMarkerSelect}
                onClearFocus={() => setFocusedId(null)}
                onMapMoveStart={() => setFocusedId(null)}
              />
            </div>
            <MapLocationStatusPill status={initialLocationStatus} />

            <div className="pointer-events-none absolute right-4 top-4 flex flex-col gap-2">
              <Button
                type="button"
                shape="pill"
                size="sm"
                variant="secondary"
                className="pointer-events-auto h-10 w-10 bg-(--oboon-bg-surface)/50"
                onClick={() => mapApiRef.current?.zoomIn()}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                shape="pill"
                size="sm"
                variant="secondary"
                className="pointer-events-auto h-10 w-10 bg-(--oboon-bg-surface)/50"
                onClick={() => mapApiRef.current?.zoomOut()}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                shape="pill"
                size="sm"
                variant="secondary"
                className="pointer-events-auto h-10 w-10 bg-(--oboon-bg-surface)/50 md:hidden"
                onClick={() => setOverlayOpen(true)}
              >
                <Expand className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

      </div>

      <FullscreenMapOverlay
        open={overlayOpen}
        title={Copy.offerings.map.title}
        markers={markers}
        initialCenter={mapInitialCenter}
        initialLocationStatus={initialLocationStatus}
        regionClusterEnabled
        regionClusterZoomThreshold={REGION_CLUSTER_ZOOM_THRESHOLD}
        clusterZoomDelta={1}
        hoveredId={hoveredId}
        focusedId={activeFocusedId}
        onHoverChange={setHoveredId}
        onSelect={handleOverlaySelect}
        onClose={() => setOverlayOpen(false)}
      />
    </div>
  );
}
