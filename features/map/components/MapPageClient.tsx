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
  type MapMarker,
} from "@/features/map/components/NaverMap";
import type { MarkerType } from "@/features/map/domain/marker/marker.type";

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

const INITIAL_FILTERS: Record<MarkerType, boolean> = {
  ready: true,
  open: true,
  closed: true,
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
    region: m.region,
    priceRange: formatPriceRange(m.priceMinWon, m.priceMaxWon, {
      unknownLabel: UXCopy.priceRangeShort,
    }),
    statusValue: m.statusEnum,
  };
}

export default function MapPageClient() {
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

      const rows = data as unknown as MapPropertyRow[];
      const mapped = mapPropertyRowsToDbOfferings(rows);
      setAll(mapped);
    }

    run();

    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return all.filter((item) => filters[item.type as MarkerType]);
  }, [all, filters]);

  const visible = useMemo(() => {
    if (!visibleIds) return filtered;
    const set = new Set(visibleIds);
    return filtered.filter((item) => set.has(item.id));
  }, [filtered, visibleIds]);

  const markers = useMemo(() => {
    return visible.map(toMarker);
  }, [visible]);

  const compactItems = useMemo(() => {
    return visible.map(toCompactItem);
  }, [visible]);

  const handleToggleLayer = (key: MarkerType) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <main className="min-h-screen bg-(--oboon-bg-page)">
      <PageContainer variant="full">
        <div className="relative min-h-[calc(100dvh-72px)]">
          <div className="absolute inset-0">
            <NaverMap
              ref={mapApiRef}
              markers={markers}
              hoveredId={hoveredId}
              focusedId={focusedId}
              onVisibleIdsChange={setVisibleIds}
              onHoverChange={setHoveredId}
              onMarkerSelect={(id) => setFocusedId(id)}
              onClearFocus={() => setFocusedId(null)}
            />

            <div className="pointer-events-none absolute bottom-6 left-4 flex flex-col gap-2 sm:left-6">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="pointer-events-auto h-10 w-10 rounded-full"
                onClick={() => mapApiRef.current?.zoomIn()}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="pointer-events-auto h-10 w-10 rounded-full"
                onClick={() => mapApiRef.current?.zoomOut()}
              >
                <Minus className="h-4 w-4" />
              </Button>
            </div>

            <div className="pointer-events-none absolute bottom-6 right-4 sm:right-6">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="pointer-events-auto h-10 w-10 rounded-full"
                onClick={() => setOverlayOpen(true)}
              >
                <Expand className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="relative z-10 flex min-h-[calc(100dvh-72px)] flex-col gap-4 pt-6">
            <div className="flex items-center justify-between">
              <h1 className="ob-typo-h1 text-(--oboon-text-title)">
                지도에서 분양 찾기
              </h1>
              <div className="hidden sm:block">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => router.push("/offerings")}
                >
                  리스트로 보기
                </Button>
              </div>
            </div>

            <LayerControl filters={filters} onToggle={handleToggleLayer} />

            <MapOfferingCompactList
              items={compactItems}
              hoveredId={hoveredId}
              focusedId={focusedId}
              onHover={setHoveredId}
              onSelect={setFocusedId}
            />
          </div>

          <FullscreenMapOverlay
            open={overlayOpen}
            markers={markers}
            offerings={visible}
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
