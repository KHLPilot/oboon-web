// features/map/components/MapPageClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Button from "@/components/ui/Button";
import MapFloatingControls from "@/components/ui/MapFloatingControls";
import PageContainer from "@/components/shared/PageContainer";
import { UXCopy } from "@/shared/uxCopy";
import { formatPriceRange } from "@/shared/price";
import { useRouter } from "next/navigation";

import NaverMap, {
  type NaverMapHandle,
  type MapFocusBounds,
  type MapMarker,
} from "@/features/map/components/NaverMap";
import type {
  GeoLocationCenter,
  GeoLocationStatus,
} from "@/features/map/hooks/useCurrentLocationCenter";
import type {
  MarkerLayer,
} from "@/features/map/domain/marker/marker.type";

import LayerControl from "@/features/map/components/MapLayer";
import FullscreenMapOverlay from "@/features/map/components/FullscreenMapOverlay";

import {
  mapPropertyRowsToDbOfferings,
  type DbOffering,
  type MapPropertyRow,
} from "@/features/map/mappers/mapOffering.mapper";

import { createSupabaseClient } from "@/lib/supabaseClient";

const INITIAL_FILTERS: Record<MarkerLayer, boolean> = {
  agent: true,
  valuation: true,
};

const REGION_TABS = [
  { key: "all", label: "전국", lat: 36.5, lng: 127.9, zoom: 7 },
  { key: "seoul", label: "서울", lat: 37.5665, lng: 126.978, zoom: 11 },
  { key: "incheon", label: "인천", lat: 37.4563, lng: 126.7052, zoom: 11 },
  { key: "gyeonggi", label: "경기", lat: 37.4138, lng: 127.5183, zoom: 10 },
  { key: "busan", label: "부산", lat: 35.1796, lng: 129.0756, zoom: 11 },
  { key: "daegu", label: "대구", lat: 35.8714, lng: 128.6014, zoom: 11 },
  { key: "gwangju", label: "광주", lat: 35.1595, lng: 126.8526, zoom: 11 },
  { key: "daejeon", label: "대전", lat: 36.3504, lng: 127.3845, zoom: 11 },
  { key: "ulsan", label: "울산", lat: 35.5384, lng: 129.3114, zoom: 11 },
  { key: "sejong", label: "세종", lat: 36.4801, lng: 127.289, zoom: 11 },
  { key: "gangwon", label: "강원", lat: 37.8228, lng: 128.1555, zoom: 9 },
  { key: "chungbuk", label: "충북", lat: 36.6357, lng: 127.4917, zoom: 10 },
  { key: "chungnam", label: "충남", lat: 36.5184, lng: 126.8, zoom: 10 },
  { key: "jeonbuk", label: "전북", lat: 35.8202, lng: 127.1089, zoom: 10 },
  { key: "jeonnam", label: "전남", lat: 34.8679, lng: 126.991, zoom: 9 },
  { key: "gyeongbuk", label: "경북", lat: 36.4919, lng: 128.8889, zoom: 9 },
  { key: "gyeongnam", label: "경남", lat: 35.4606, lng: 128.2132, zoom: 10 },
  { key: "jeju", label: "제주", lat: 33.4996, lng: 126.5312, zoom: 10 },
] as const;

const STATIC_REGION_VIEWPORTS = {
  all: REGION_TABS[0],
  seoul: REGION_TABS[1],
  incheon: REGION_TABS[2],
  gyeonggi: REGION_TABS[3],
  busan: REGION_TABS[4],
  daegu: REGION_TABS[5],
  gwangju: REGION_TABS[6],
  daejeon: REGION_TABS[7],
  ulsan: REGION_TABS[8],
  sejong: REGION_TABS[9],
  gangwon: REGION_TABS[10],
  chungbuk: REGION_TABS[11],
  chungnam: REGION_TABS[12],
  jeonbuk: REGION_TABS[13],
  jeonnam: REGION_TABS[14],
  gyeongbuk: REGION_TABS[15],
  gyeongnam: REGION_TABS[16],
  jeju: REGION_TABS[17],
} as const;

const ALL_KOREA_VIEW_BOUNDS: MapFocusBounds = {
  south: 33.0,
  west: 125.8,
  north: 38.75,
  east: 130.95,
};
const GPS_FOCUS_ZOOM = 12;
const REGION_CLUSTER_ZOOM_THRESHOLD = 16;

const REGION_NAME_MATCHERS: Record<string, string[]> = {
  seoul: ["서울특별시", "서울"],
  incheon: ["인천광역시", "인천"],
  gyeonggi: ["경기도", "경기"],
  busan: ["부산광역시", "부산"],
  daegu: ["대구광역시", "대구"],
  gwangju: ["광주광역시", "광주"],
  daejeon: ["대전광역시", "대전"],
  ulsan: ["울산광역시", "울산"],
  sejong: ["세종특별자치시", "세종"],
  gangwon: ["강원특별자치도", "강원도", "강원"],
  chungbuk: ["충청북도", "충북"],
  chungnam: ["충청남도", "충남"],
  jeonbuk: ["전북특별자치도", "전라북도", "전북"],
  jeonnam: ["전라남도", "전남"],
  gyeongbuk: ["경상북도", "경북"],
  gyeongnam: ["경상남도", "경남"],
  jeju: ["제주특별자치도", "제주"],
};

const SEOUL_GU_TABS = [
  { key: "all", label: "서울 전체" },
  { key: "gangnam", label: "강남구", matcher: "강남구", boundaryKey: "seoul_gangnam" },
  { key: "gangdong", label: "강동구", matcher: "강동구", boundaryKey: "seoul_gangdong" },
  { key: "gangbuk", label: "강북구", matcher: "강북구", boundaryKey: "seoul_gangbuk" },
  { key: "gangseo", label: "강서구", matcher: "강서구", boundaryKey: "seoul_gangseo" },
  { key: "gwanak", label: "관악구", matcher: "관악구", boundaryKey: "seoul_gwanak" },
  { key: "gwangjin", label: "광진구", matcher: "광진구", boundaryKey: "seoul_gwangjin" },
  { key: "guro", label: "구로구", matcher: "구로구", boundaryKey: "seoul_guro" },
  { key: "geumcheon", label: "금천구", matcher: "금천구", boundaryKey: "seoul_geumcheon" },
  { key: "nowon", label: "노원구", matcher: "노원구", boundaryKey: "seoul_nowon" },
  { key: "dobong", label: "도봉구", matcher: "도봉구", boundaryKey: "seoul_dobong" },
  { key: "dongdaemun", label: "동대문구", matcher: "동대문구", boundaryKey: "seoul_dongdaemun" },
  { key: "dongjak", label: "동작구", matcher: "동작구", boundaryKey: "seoul_dongjak" },
  { key: "mapo", label: "마포구", matcher: "마포구", boundaryKey: "seoul_mapo" },
  { key: "seodaemun", label: "서대문구", matcher: "서대문구", boundaryKey: "seoul_seodaemun" },
  { key: "seocho", label: "서초구", matcher: "서초구", boundaryKey: "seoul_seocho" },
  { key: "seongdong", label: "성동구", matcher: "성동구", boundaryKey: "seoul_seongdong" },
  { key: "seongbuk", label: "성북구", matcher: "성북구", boundaryKey: "seoul_seongbuk" },
  { key: "songpa", label: "송파구", matcher: "송파구", boundaryKey: "seoul_songpa" },
  { key: "yangcheon", label: "양천구", matcher: "양천구", boundaryKey: "seoul_yangcheon" },
  { key: "yeongdeungpo", label: "영등포구", matcher: "영등포구", boundaryKey: "seoul_yeongdeungpo" },
  { key: "yongsan", label: "용산구", matcher: "용산구", boundaryKey: "seoul_yongsan" },
  { key: "eunpyeong", label: "은평구", matcher: "은평구", boundaryKey: "seoul_eunpyeong" },
  { key: "jongno", label: "종로구", matcher: "종로구", boundaryKey: "seoul_jongno" },
  { key: "jung", label: "중구", matcher: "중구", boundaryKey: "seoul_jung" },
  { key: "jungnang", label: "중랑구", matcher: "중랑구", boundaryKey: "seoul_jungnang" },
] as const;

const GYEONGGI_SUB_TABS = [
  { key: "all", label: "경기 전체" },
  { key: "north", label: "경기 북부" },
  { key: "south", label: "경기 남부" },
] as const;

const GYEONGGI_NORTH_REGION2_MATCHERS = [
  "고양시",
  "김포시",
  "동두천시",
  "양주시",
  "의정부시",
  "파주시",
  "포천시",
  "연천군",
  "가평군",
  "구리시",
  "남양주시",
] as const;

function isGyeonggiNorth(addressFull: string) {
  return GYEONGGI_NORTH_REGION2_MATCHERS.some((matcher) =>
    addressFull.includes(matcher),
  );
}

function resolveRegionTabKeyFromClusterLabel(label: string) {
  const t = label.trim();
  if (!t) return null;
  if (t.includes("서울")) return "seoul";
  if (t.includes("경기")) return "gyeonggi";
  if (t.includes("인천")) return "incheon";
  if (t.includes("부산")) return "busan";
  if (t.includes("대구")) return "daegu";
  if (t.includes("광주")) return "gwangju";
  if (t.includes("대전")) return "daejeon";
  if (t.includes("울산")) return "ulsan";
  if (t.includes("세종")) return "sejong";
  if (t.includes("강원")) return "gangwon";
  if (t.includes("충북")) return "chungbuk";
  if (t.includes("충남")) return "chungnam";
  if (t.includes("전북")) return "jeonbuk";
  if (t.includes("전남")) return "jeonnam";
  if (t.includes("경북")) return "gyeongbuk";
  if (t.includes("경남")) return "gyeongnam";
  if (t.includes("제주")) return "jeju";
  return null;
}

type RegionBoundaryPayload = {
  region: string;
  bounds: MapFocusBounds;
  polygons: Array<Array<{ lat: number; lng: number }>>;
};

function getStaticRegionViewport(regionKey: string) {
  return (
    STATIC_REGION_VIEWPORTS[
      regionKey as keyof typeof STATIC_REGION_VIEWPORTS
    ] ?? null
  );
}

function toMarker(m: DbOffering): MapMarker {
  return {
    id: m.id,
    type: m.type,
    label: m.title,
    lat: m.lat,
    lng: m.lng,
    clusterRegion: m.regionSido,
    topLabel: m.region,
    mainLabel: formatPriceRange(m.priceMinWon, m.priceMaxWon, {
      unknownLabel: m.isPricePrivate
        ? UXCopy.pricePrivateShort
        : UXCopy.priceRangeShort,
    }),
  };
}

export default function MapPageClient() {
  const [filters, setFilters] =
    useState<Record<MarkerLayer, boolean>>(INITIAL_FILTERS);
  const [showAllOfferings, setShowAllOfferings] = useState(true);

  const [all, setAll] = useState<DbOffering[]>([]);
  // null = 아직 지도 가시영역 계산 전(초기 상태)
  const [, setVisibleIds] = useState<number[] | null>(null);

  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [focusedId, setFocusedId] = useState<number | null>(null);

  const [overlayOpen, setOverlayOpen] = useState(false);
  const [activeRegionTab, setActiveRegionTab] = useState<string>("all");
  const [activeSubRegionTab, setActiveSubRegionTab] = useState<string>("all");
  const [mapReady, setMapReady] = useState(false);
  const [regionBoundaryByKey, setRegionBoundaryByKey] = useState<
    Record<string, RegionBoundaryPayload>
  >({});
  const [locationStatus, setLocationStatus] =
    useState<GeoLocationStatus>("idle");
  const [currentLocationCenter, setCurrentLocationCenter] =
    useState<GeoLocationCenter | null>(null);
  const lastViewportKeyRef = useRef<string>("");
  const suppressNextViewportSyncRef = useRef(false);

  const mapApiRef = useRef<NaverMapHandle | null>(null);
  const router = useRouter();

  // 1) Load
  useEffect(() => {
    let alive = true;

    async function run() {
      const supabase = createSupabaseClient();
      const { data: snapshots, error } = await supabase
        .from("property_public_snapshots")
        .select("snapshot, published_at")
        .order("published_at", { ascending: false })
        .limit(200);

      if (!alive) return;

      if (error || !snapshots) {
        setAll([]);
        return;
      }

      const visibleRows = snapshots
        .map((row) => row.snapshot)
        .filter(Boolean) as unknown as MapPropertyRow[];
      const propertyIds = visibleRows
        .map((row) => Number(row.id))
        .filter((id): id is number => Number.isFinite(id));

      let approvedAgentPropertySet = new Set<number>();
      if (propertyIds.length > 0) {
        const { data: agentRows } = await supabase
          .from("property_agents")
          .select("property_id")
          .eq("status", "approved")
          .in("property_id", propertyIds);

        approvedAgentPropertySet = new Set(
          (agentRows ?? [])
            .map((row) => Number(row.property_id))
            .filter((id): id is number => Number.isFinite(id)),
        );
      }

      const enrichedRows = visibleRows.map((row) => ({
        ...row,
        has_agent: approvedAgentPropertySet.has(Number(row.id)),
      }));

      const mapped = mapPropertyRowsToDbOfferings(enrichedRows);
      setAll(mapped);
    }

    run();

    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const regionMatchers = REGION_NAME_MATCHERS[activeRegionTab] ?? [];
    const selectedLayers = (Object.entries(filters) as Array<[MarkerLayer, boolean]>)
      .filter(([, enabled]) => enabled)
      .map(([layer]) => layer);
    if (!showAllOfferings && selectedLayers.length === 0) return [];
    const selectedSeoulGuTab = SEOUL_GU_TABS.find(
      (tab) => tab.key === activeSubRegionTab,
    );
    const selectedSeoulGu =
      activeRegionTab === "seoul" && activeSubRegionTab !== "all"
        ? (selectedSeoulGuTab && "matcher" in selectedSeoulGuTab
            ? selectedSeoulGuTab.matcher
            : null)
        : null;

    return all.filter((item) => {
      if (!showAllOfferings && selectedLayers.length > 0) {
        const matchesLayer = selectedLayers.some((layer) =>
          item.layers.includes(layer),
        );
        if (!matchesLayer) return false;
      }
      if (activeRegionTab === "all") return true;
      if (activeRegionTab === "gyeonggi" && activeSubRegionTab === "north") {
        if (!item.regionSido.includes("경기")) return false;
        return isGyeonggiNorth(item.addressFull);
      }
      if (activeRegionTab === "gyeonggi" && activeSubRegionTab === "south") {
        if (!item.regionSido.includes("경기")) return false;
        return !isGyeonggiNorth(item.addressFull);
      }
      const region = (item.regionSido ?? "").trim();
      if (!region) return false;
      const matchesRegion = regionMatchers.some((matcher) => region.includes(matcher));
      if (!matchesRegion) return false;
      if (selectedSeoulGu) {
        return item.addressFull.includes(selectedSeoulGu);
      }
      return true;
    });
  }, [activeRegionTab, activeSubRegionTab, all, filters, showAllOfferings]);

  const markers = useMemo(() => {
    return filtered.map(toMarker);
  }, [filtered]);
  const activeBoundaryRegionKey = useMemo(() => {
    if (activeRegionTab === "seoul" && activeSubRegionTab !== "all") {
      const seoulTab = SEOUL_GU_TABS.find((tab) => tab.key === activeSubRegionTab);
      if (seoulTab && "boundaryKey" in seoulTab) {
        return seoulTab.boundaryKey;
      }
    }
    if (activeRegionTab === "gyeonggi" && activeSubRegionTab === "north") {
      return "gyeonggi_north";
    }
    if (activeRegionTab === "gyeonggi" && activeSubRegionTab === "south") {
      return "gyeonggi_south";
    }
    return activeRegionTab;
  }, [activeRegionTab, activeSubRegionTab]);
  const activeRegionFocusPolygons = useMemo(
    () =>
      activeRegionTab === "all"
        ? []
        : (regionBoundaryByKey[activeBoundaryRegionKey]?.polygons ?? []),
    [activeBoundaryRegionKey, activeRegionTab, regionBoundaryByKey],
  );
  const isDefaultScope = activeRegionTab === "all" && activeSubRegionTab === "all";

  const handleToggleLayer = (key: MarkerLayer) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleRequestCurrentLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationStatus("unsupported");
      return;
    }

    setLocationStatus("pending");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCenter = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentLocationCenter(nextCenter);
        setLocationStatus("granted");
        mapApiRef.current?.setView(nextCenter.lat, nextCenter.lng, GPS_FOCUS_ZOOM);
      },
      (error) => {
        setLocationStatus(error.code === 1 ? "denied" : "unavailable");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10_000,
      },
    );
  };

  const handleUseCurrentLocation = () => {
    if (!mapReady) return;
    if (!currentLocationCenter) {
      handleRequestCurrentLocation();
      return;
    }
    const locationKey = `${currentLocationCenter.lat.toFixed(6)},${currentLocationCenter.lng.toFixed(6)}`;
    lastViewportKeyRef.current = `location:${locationKey}`;
    mapApiRef.current?.setView(currentLocationCenter.lat, currentLocationCenter.lng, GPS_FOCUS_ZOOM);
  };

  const handleMoveRegion = (regionKey: string) => {
    const target = REGION_TABS.find((tab) => tab.key === regionKey);
    if (!target) return;
    setActiveRegionTab(target.key);
    setActiveSubRegionTab("all");
    setFocusedId(null);
  };

  const handleMoveSubRegion = (subKey: string) => {
    setActiveSubRegionTab(subKey);
    setFocusedId(null);
  };

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
        // ignore boundary fetch failures and keep static bounds fallback
      }
    }

    void loadBoundary();
    return () => controller.abort();
  }, [activeBoundaryRegionKey, regionBoundaryByKey]);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapApiRef.current;
    if (!map) return;

    if (suppressNextViewportSyncRef.current) {
      suppressNextViewportSyncRef.current = false;
      return;
    }

    if (isDefaultScope) {
      if (lastViewportKeyRef.current !== "nationwide") {
        lastViewportKeyRef.current = "nationwide";
        map.fitToBounds(ALL_KOREA_VIEW_BOUNDS);
      }
      return;
    }

    const staticViewport = getStaticRegionViewport(activeRegionTab);
    if (!staticViewport) return;

    const viewportKey = `region:${staticViewport.key}:${staticViewport.lat.toFixed(4)},${staticViewport.lng.toFixed(4)},${staticViewport.zoom}`;
    if (lastViewportKeyRef.current === viewportKey) return;
    lastViewportKeyRef.current = viewportKey;
    map.setView(
      staticViewport.lat,
      staticViewport.lng,
      staticViewport.zoom,
    );
  }, [activeRegionTab, activeSubRegionTab, isDefaultScope, mapReady]);

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer>
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="ob-typo-h1 text-(--oboon-text-title)">지도</div>
              <p className="mt-1 ob-typo-body text-(--oboon-text-muted)">
                상담 지도에서 위치를 확인하고 지역별로 현장을 탐색하세요.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:gap-3">
            <div className="-mx-4 lg:mx-0">
              <div className="flex gap-1.5 overflow-x-auto whitespace-nowrap pb-1 pl-4 pr-4 scrollbar-none lg:flex-wrap lg:overflow-visible lg:whitespace-normal lg:gap-2 lg:pl-0 lg:pr-0">
                {REGION_TABS.map((tab) => (
                  <Button
                    key={tab.key}
                    type="button"
                    size="sm"
                    shape="pill"
                    className="shrink-0 lg:shrink"
                    variant={activeRegionTab === tab.key ? "primary" : "secondary"}
                    onClick={() => handleMoveRegion(tab.key)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            </div>

            {activeRegionTab === "seoul" ? (
              <div className="-mx-4 lg:mx-0">
                <div className="flex gap-1.5 overflow-x-auto whitespace-nowrap pb-1 pl-4 pr-4 scrollbar-none lg:flex-wrap lg:overflow-visible lg:whitespace-normal lg:gap-2 lg:pl-0 lg:pr-0">
                  {SEOUL_GU_TABS.map((tab) => (
                    <Button
                      key={tab.key}
                      type="button"
                      size="sm"
                      shape="pill"
                      className="shrink-0 lg:shrink"
                      variant={activeSubRegionTab === tab.key ? "primary" : "secondary"}
                      onClick={() => handleMoveSubRegion(tab.key)}
                    >
                      {tab.label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
            {activeRegionTab === "gyeonggi" ? (
              <div className="-mx-4 lg:mx-0">
                <div className="flex gap-1.5 overflow-x-auto whitespace-nowrap pb-1 pl-4 pr-4 scrollbar-none lg:flex-wrap lg:overflow-visible lg:whitespace-normal lg:gap-2 lg:pl-0 lg:pr-0">
                  {GYEONGGI_SUB_TABS.map((tab) => (
                    <Button
                      key={tab.key}
                      type="button"
                      size="sm"
                      shape="pill"
                      className="shrink-0 lg:shrink"
                      variant={activeSubRegionTab === tab.key ? "primary" : "secondary"}
                      onClick={() => handleMoveSubRegion(tab.key)}
                    >
                      {tab.label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="relative h-[420px] overflow-hidden rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) sm:h-[520px] md:h-[620px]">
              <div className="absolute inset-0">
                <NaverMap
                  ref={mapApiRef}
                  markers={markers}
                  initialCenter={null}
                  initialLocationStatus={locationStatus}
                  initialZoom={13}
                  focusBounds={null}
                  focusPolygons={activeRegionFocusPolygons}
                  regionClusterEnabled={activeRegionTab === "all"}
                  onClusterRegionSelect={(regionLabel) => {
                    const regionKey = resolveRegionTabKeyFromClusterLabel(regionLabel);
                    if (!regionKey) return;
                    suppressNextViewportSyncRef.current = true;
                    setActiveRegionTab(regionKey);
                    setActiveSubRegionTab("all");
                    setFocusedId(null);
                  }}
                  onMapReady={() => setMapReady(true)}
                  hoveredId={hoveredId}
                  focusedId={focusedId}
                  onVisibleIdsChange={setVisibleIds}
                  onHoverChange={setHoveredId}
                  onMarkerSelect={(id) => {
                    if (focusedId === id) {
                      router.push(`/offerings/${id}`);
                      return;
                    }
                    setFocusedId(id);
                  }}
                  onClearFocus={() => setFocusedId(null)}
                />
              </div>

              <LayerControl
                showAll={showAllOfferings}
                onToggleAll={() => setShowAllOfferings((prev) => !prev)}
                filters={filters}
                onToggle={handleToggleLayer}
              />

              <MapFloatingControls
                onZoomIn={() => mapApiRef.current?.zoomIn()}
                onZoomOut={() => mapApiRef.current?.zoomOut()}
                onUseCurrentLocation={handleUseCurrentLocation}
                onExpand={() => setOverlayOpen(true)}
                className="pointer-events-none absolute right-4 top-4 flex flex-col gap-2"
              />
            </div>
          </div>

          <FullscreenMapOverlay
            open={overlayOpen}
            markers={markers}
            initialCenter={currentLocationCenter}
            initialLocationStatus={locationStatus}
            regionClusterEnabled={activeRegionTab === "all"}
            regionClusterZoomThreshold={REGION_CLUSTER_ZOOM_THRESHOLD}
            clusterZoomDelta={1}
            hoveredId={hoveredId}
            focusedId={focusedId}
            onHoverChange={setHoveredId}
            onSelect={setFocusedId}
            onClose={() => setOverlayOpen(false)}
          />
        </div>
      </PageContainer>
    </main>
  );
}
