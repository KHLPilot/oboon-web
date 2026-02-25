// features/map/components/MapPageClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Minus, Expand } from "lucide-react";

import Button from "@/components/ui/Button";
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
  MarkerLayer,
} from "@/features/map/domain/marker/marker.type";

import LayerControl from "@/features/map/components/MapLayer";
import MapOfferingCompactList, {
  type MapOfferingCompactItem,
} from "@/features/map/components/MapOfferingCompactList";
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

const REGION_FOCUS_BOUNDS: Record<string, MapFocusBounds | null> = {
  all: null,
  seoul: { south: 37.41, west: 126.76, north: 37.72, east: 127.19 },
  incheon: { south: 37.2, west: 126.35, north: 37.72, east: 126.95 },
  gyeonggi: { south: 36.88, west: 126.3, north: 38.35, east: 127.86 },
  busan: { south: 34.98, west: 128.78, north: 35.4, east: 129.35 },
  daegu: { south: 35.6, west: 128.35, north: 36.02, east: 128.82 },
  gwangju: { south: 35.02, west: 126.67, north: 35.31, east: 127.0 },
  daejeon: { south: 36.2, west: 127.24, north: 36.49, east: 127.54 },
  ulsan: { south: 35.35, west: 129.03, north: 35.75, east: 129.48 },
  sejong: { south: 36.43, west: 127.18, north: 36.62, east: 127.38 },
  gangwon: { south: 37.02, west: 127.25, north: 38.62, east: 129.35 },
  chungbuk: { south: 36.0, west: 127.27, north: 37.25, east: 128.7 },
  chungnam: { south: 35.98, west: 125.95, north: 37.05, east: 127.75 },
  jeonbuk: { south: 35.27, west: 126.38, north: 36.2, east: 127.95 },
  jeonnam: { south: 33.85, west: 125.98, north: 35.5, east: 127.95 },
  gyeongbuk: { south: 35.53, west: 128.15, north: 37.3, east: 129.65 },
  gyeongnam: { south: 34.45, west: 127.53, north: 35.92, east: 129.25 },
  jeju: { south: 33.1, west: 126.1, north: 33.62, east: 126.99 },
};

const ALL_KOREA_VIEW_BOUNDS: MapFocusBounds = {
  south: 33.0,
  west: 125.8,
  north: 38.75,
  east: 130.95,
};

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

type RegionBoundaryPayload = {
  region: string;
  bounds: MapFocusBounds;
  polygons: Array<Array<{ lat: number; lng: number }>>;
};

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

function toCompactItem(m: DbOffering): MapOfferingCompactItem {
  return {
    id: m.id,
    title: m.title,
    address: m.addressFull,
    priceRange: formatPriceRange(m.priceMinWon, m.priceMaxWon, {
      unknownLabel: m.isPricePrivate
        ? UXCopy.pricePrivateShort
        : UXCopy.priceRangeShort,
    }),
    statusValue: m.statusEnum,
  };
}

export default function MapPageClient() {
  const [filters, setFilters] =
    useState<Record<MarkerLayer, boolean>>(INITIAL_FILTERS);
  const [showAllOfferings, setShowAllOfferings] = useState(true);

  const [all, setAll] = useState<DbOffering[]>([]);
  // null = 아직 지도 가시영역 계산 전(초기 상태)
  const [visibleIds, setVisibleIds] = useState<number[] | null>(null);

  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [focusedId, setFocusedId] = useState<number | null>(null);

  const [overlayOpen, setOverlayOpen] = useState(false);
  const [activeRegionTab, setActiveRegionTab] = useState<string>("all");
  const [mapReady, setMapReady] = useState(false);
  const [regionBoundaryByKey, setRegionBoundaryByKey] = useState<
    Record<string, RegionBoundaryPayload>
  >({});

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
    if (!showAllOfferings) return [];
    const regionMatchers = REGION_NAME_MATCHERS[activeRegionTab] ?? [];
    const selectedLayers = (Object.entries(filters) as Array<[MarkerLayer, boolean]>)
      .filter(([, enabled]) => enabled)
      .map(([layer]) => layer);

    return all.filter((item) => {
      if (selectedLayers.length > 0) {
        const matchesLayer = selectedLayers.some((layer) =>
          item.layers.includes(layer),
        );
        if (!matchesLayer) return false;
      }
      if (activeRegionTab === "all") return true;
      const region = (item.regionSido ?? "").trim();
      if (!region) return false;
      return regionMatchers.some((matcher) => region.includes(matcher));
    });
  }, [activeRegionTab, all, filters, showAllOfferings]);

  const visible = useMemo(() => {
    if (!visibleIds) return filtered;
    const set = new Set(visibleIds);
    return filtered.filter((item) => set.has(item.id));
  }, [filtered, visibleIds]);

  const markers = useMemo(() => {
    return filtered.map(toMarker);
  }, [filtered]);

  const compactItems = useMemo(() => {
    return visible.map(toCompactItem);
  }, [visible]);
  const activeRegionFocusBounds = useMemo(
    () =>
      regionBoundaryByKey[activeRegionTab]?.bounds ??
      REGION_FOCUS_BOUNDS[activeRegionTab] ??
      null,
    [activeRegionTab, regionBoundaryByKey],
  );
  const activeRegionFocusPolygons = useMemo(
    () => regionBoundaryByKey[activeRegionTab]?.polygons ?? [],
    [activeRegionTab, regionBoundaryByKey],
  );

  const handleToggleLayer = (key: MarkerLayer) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleMoveRegion = (regionKey: string) => {
    const target = REGION_TABS.find((tab) => tab.key === regionKey);
    if (!target) return;
    setActiveRegionTab(target.key);
    if (!mapReady) {
      setFocusedId(null);
      return;
    }
    const boundaryBounds =
      target.key === "all"
        ? ALL_KOREA_VIEW_BOUNDS
        :
      regionBoundaryByKey[target.key]?.bounds ??
      REGION_FOCUS_BOUNDS[target.key] ??
      null;
    if (boundaryBounds) {
      mapApiRef.current?.fitToBounds(boundaryBounds);
    } else {
      mapApiRef.current?.setView(target.lat, target.lng, target.zoom);
    }
    setFocusedId(null);
  };

  useEffect(() => {
    if (activeRegionTab === "all") return;
    if (regionBoundaryByKey[activeRegionTab]) return;

    const controller = new AbortController();

    async function loadBoundary() {
      try {
        const response = await fetch(
          `/api/map/region-boundary?region=${encodeURIComponent(activeRegionTab)}`,
          { signal: controller.signal },
        );
        if (!response.ok) return;
        const payload = (await response.json()) as RegionBoundaryPayload;
        if (!payload?.bounds || !Array.isArray(payload?.polygons)) return;
        setRegionBoundaryByKey((prev) => ({ ...prev, [activeRegionTab]: payload }));
      } catch {
        // ignore boundary fetch failures and keep static bounds fallback
      }
    }

    void loadBoundary();
    return () => controller.abort();
  }, [activeRegionTab, regionBoundaryByKey]);

  useEffect(() => {
    if (!mapReady) return;
    const bounds =
      activeRegionTab === "all"
        ? ALL_KOREA_VIEW_BOUNDS
        : (regionBoundaryByKey[activeRegionTab]?.bounds ?? null);
    if (!bounds) return;
    mapApiRef.current?.fitToBounds(bounds);
  }, [activeRegionTab, mapReady, regionBoundaryByKey]);

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer>
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="ob-typo-h1 text-(--oboon-text-title)">지도</div>
              <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                상담 지도에서 위치를 보고, 하단에서 현장을 빠르게 비교하세요.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {REGION_TABS.map((tab) => (
              <Button
                key={tab.key}
                type="button"
                size="sm"
                shape="pill"
                variant={activeRegionTab === tab.key ? "primary" : "secondary"}
                onClick={() => handleMoveRegion(tab.key)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          <div className="relative h-[360px] overflow-hidden rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) sm:h-[420px] md:h-[480px]">
            <div className="absolute inset-0">
              <NaverMap
                ref={mapApiRef}
                markers={markers}
                initialZoom={13}
                focusBounds={activeRegionFocusBounds}
                focusPolygons={activeRegionFocusPolygons}
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

          <MapOfferingCompactList
            items={compactItems}
            hoveredId={hoveredId}
            focusedId={focusedId}
            onHover={setHoveredId}
            onSelect={setFocusedId}
          />

          <FullscreenMapOverlay
            open={overlayOpen}
            markers={markers}
            offerings={filtered}
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
