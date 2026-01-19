// app/map/page.tsx
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
  type MapMarker,
} from "@/features/map/NaverMap";
import type { MarkerType } from "@/features/map/marker/marker.type";

import LayerControl from "@/features/map/MapLayer";
import MapOfferingCompactList, {
  type MapOfferingCompactItem,
} from "@/features/map/MapOfferingCompactList";
import FullscreenMapOverlay from "@/features/map/FullscreenMapOverlay";

import {
  mapPropertyRowsToDbOfferings,
  type DbOffering,
  type MapPropertyRow,
} from "@/features/map/mappers/mapOffering.mapper";

import { createSupabaseClient } from "@/lib/supabaseClient";

const INITIAL_FILTERS: Record<MarkerType, boolean> = {
  urgent: true,
  upcoming: true,
  remain: true,
};

function toMarker(m: DbOffering): MapMarker {
  return {
    id: m.id,
    type: m.type as MarkerType,
    label: m.title,
    lat: m.lat,
    lng: m.lng,
    topLabel: m.region,
    mainLabel: formatPriceRange(m.priceMinWon, m.priceMaxWon, {
      unknownLabel: UXCopy.priceRangeShort,
    }),
  };
}

function toCompactItem(m: DbOffering): MapOfferingCompactItem {
  return {
    id: m.id,
    title: m.title,
    region: `${m.region} · ${m.address}`,
    priceRange: formatPriceRange(m.priceMinWon, m.priceMaxWon, {
      unknownLabel: UXCopy.priceRangeShort,
    }),
    statusValue: m.statusEnum,
  };
}

export default function MapPage() {
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] =
    useState<Record<MarkerType, boolean>>(INITIAL_FILTERS);

  const [all, setAll] = useState<DbOffering[]>([]);
  // null = 아직 지도 가시영역 계산 전(초기 상태)
  const [visibleIds, setVisibleIds] = useState<number[] | null>(null);

  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [focusedId, setFocusedId] = useState<number | null>(null);

  const [overlayOpen, setOverlayOpen] = useState(false);

  const mapApiRef = useRef<NaverMapHandle | null>(null);
  const router = useRouter();

  // 1) Load
  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      try {
        const supabase = createSupabaseClient();
        const { data, error } = await supabase
          .from("properties")
          .select(
            `
            id,
            name,
            status,
            image_url,
            property_locations (
              lat,
              lng,
              road_address,
              jibun_address,
              region_1depth,
              region_2depth,
              region_3depth
            ),
            property_unit_types (
              price_min,
              price_max
            )
          `,
          )
          .order("id", { ascending: false })
          .limit(200);

        if (!alive) return;

        if (error || !data) {
          setAll([]);
          return;
        }

        setAll(mapPropertyRowsToDbOfferings(data as MapPropertyRow[]));
      } catch {
        if (!alive) return;
        setAll([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, []);

  // 2) Filtered (by marker type toggles)
  const filtered = useMemo(() => {
    return all.filter((m) => filters[m.type as MarkerType]);
  }, [all, filters]);

  // 3) Markers
  const markers = useMemo(() => filtered.map(toMarker), [filtered]);

  // 4) Visible list (map viewport driven)
  const visible = useMemo(() => {
    if (visibleIds === null) return filtered; // 아직 계산 전이면 전체 표시
    const set = new Set(visibleIds);
    return filtered.filter((m) => set.has(m.id));
  }, [filtered, visibleIds]);

  const listItems = useMemo(() => visible.map(toCompactItem), [visible]);

  // 5) Events
  const toggleFilter = (key: MarkerType) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /**
   * 선택은 "상태"만 바꾼다.
   * 상세 이동(router.push)은 리스트/오버레이 내부의 명시적 CTA에서만 수행하는 것이 안전하다.
   */
  const handleSelect = (id: number) => {
    if (id <= 0) {
      setFocusedId(null);
      return;
    }
    if (!overlayOpen && focusedId === id) {
      router.push(`/offerings/${id}`);
      return;
    }
    // 첫 클릭은 focus만
    setFocusedId(id);
  };

  return (
    <main className="bg-(--oboon-bg-page) min-h-[calc(100dvh_-_3.5rem_-_14rem_-_env(safe-area-inset-bottom))] flex flex-col justify-start">
      <PageContainer className="flex flex-col justify-start">
        <div className="mb-4">
          <h1 className="ob-typo-h1 tracking-[-0.02em] text-(--oboon-text-title)">
            지도
          </h1>
          <p className="mt-1 ob-typo-caption leading-[1.6] text-(--oboon-text-muted)">
            상단 지도에서 위치를 보고, 하단에서 현장을 빠르게 비교하세요.
          </p>
        </div>

        <div className="relative w-full h-130">
          {/* 
            iOS Safari + NaverMap HTML Marker(content) 조합에서
            지도 컨테이너에 border/radius가 걸리면 마커가 클리핑되어 안 보이는 케이스가 있어,
            "지도 DOM"과 "UI 프레임(border/radius)"를 분리한다.
          */}
          {/* UI 프레임(클릭 방해 금지) */}
          <div className="absolute inset-0 pointer-events-none rounded-xl border border-(--oboon-border-default)" />

          {/* 지도 DOM(clip-free) */}
          <div className="absolute inset-0">
            <NaverMap
              ref={mapApiRef}
              markers={markers}
              hoveredId={hoveredId}
              focusedId={focusedId}
              onHoverChange={setHoveredId}
              onClearFocus={() => setFocusedId(null)}
              onMarkerSelect={handleSelect}
              onVisibleIdsChange={(ids) => setVisibleIds(ids)}
            />
          </div>

          <div className="absolute left-2 top-2 flex items-center gap-2">
            <LayerControl
              filters={filters}
              onToggle={(key: MarkerType) => toggleFilter(key)}
            />
          </div>

          <div className="absolute right-4 top-4 flex flex-col gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              shape="pill"
              onClick={() => mapApiRef.current?.zoomIn()}
              aria-label="확대"
              className="w-10 h-10 justify-center bg-(--oboon-bg-surface)/50"
            >
              <Plus className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              shape="pill"
              onClick={() => mapApiRef.current?.zoomOut()}
              aria-label="축소"
              className="w-10 h-10 justify-center bg-(--oboon-bg-surface)/50"
            >
              <Minus className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              shape="pill"
              onClick={() => {
                setOverlayOpen(true);
                setFocusedId(null);
              }}
              aria-label="지도 확장"
              className="w-10 h-10 justify-center md:hidden bg-(--oboon-bg-surface)/50"
            >
              <Expand className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div>
          {loading ? (
            <div className="mt-6 text-sm text-(--oboon-text-muted)">
              {UXCopy.loadingShort}
            </div>
          ) : (
            <MapOfferingCompactList
              items={listItems}
              hoveredId={hoveredId}
              focusedId={focusedId}
              onHover={setHoveredId}
              onSelect={handleSelect}
            />
          )}
        </div>

        <FullscreenMapOverlay
          open={overlayOpen}
          title="지도"
          markers={markers}
          offerings={filtered}
          hoveredId={hoveredId}
          focusedId={focusedId}
          onHoverChange={setHoveredId}
          onSelect={handleSelect}
          onClose={() => {
            setOverlayOpen(false);
            setFocusedId(null);
          }}
          filtersSlot={
            <LayerControl
              filters={filters}
              onToggle={(key: MarkerType) => toggleFilter(key)}
            />
          }
        />
      </PageContainer>
    </main>
  );
}
