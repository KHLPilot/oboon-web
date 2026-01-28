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
    address: m.addressFull,
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
    return filtered.map(toMarker);
  }, [filtered]);

  const compactItems = useMemo(() => {
    return visible.map(toCompactItem);
  }, [visible]);

  const handleToggleLayer = (key: MarkerType) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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

          <div className="relative h-[360px] overflow-hidden rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) sm:h-[420px] md:h-[480px]">
            <div className="absolute inset-0">
              <NaverMap
                ref={mapApiRef}
                markers={markers}
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

            <LayerControl filters={filters} onToggle={handleToggleLayer} />

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
