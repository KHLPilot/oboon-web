"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import NaverMap, {
  type MarkerType,
  type NaverMapHandle,
  type MapMarker,
} from "@/app/components/NaverMap";
import LayerControl from "@/features/map/MapLayer";
import MapOfferingCompactList, {
  type MapOfferingCompactItem,
} from "@/features/map/MapOfferingCompactList";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageContainer from "@/components/shared/PageContainer";
import { UXCopy } from "@/shared/uxCopy";
import { formatPriceRange } from "@/shared/price";
import {
  mapPropertyRowsToDbOfferings,
  type DbOffering,
  type MapPropertyRow,
} from "@/features/map/mappers/mapOffering.mapper";

import { createSupabaseClient } from "@/lib/supabaseClient";
import { Plus, Minus, Navigation as NavIcon } from "lucide-react";

/* ================================
 * Page
 * ================================ */

export default function MapPage() {
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<Record<MarkerType, boolean>>({
    urgent: true,
    upcoming: true,
    remain: true,
  });

  const toggleFilter = (key: MarkerType) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const [all, setAll] = useState<DbOffering[]>([]);

  const [visibleIds, setVisibleIds] = useState<number[]>([]);
  const [hasCalculatedVisible, setHasCalculatedVisible] = useState(false);

  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [focusedId, setFocusedId] = useState<number | null>(null);
  const mapApiRef = useRef<NaverMapHandle | null>(null);

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
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
        `
        )
        .order("id", { ascending: false })
        .limit(200);

      if (!alive) return;

      if (error || !data) {
        setAll([]);
        setLoading(false);
        return;
      }

      const rows = mapPropertyRowsToDbOfferings(data as MapPropertyRow[]);

      setAll(rows);
      setLoading(false);
    }

    run();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return all.filter((m) => filters[m.type]);
  }, [all, filters]);

  const markers: MapMarker[] = useMemo(() => {
    return filtered.map((m) => ({
      id: m.id,
      type: m.type,
      label: m.title,
      lat: m.lat,
      lng: m.lng,
    }));
  }, [filtered]);

  const visible = useMemo(() => {
    if (!hasCalculatedVisible) return filtered;
    const set = new Set(visibleIds);
    return filtered.filter((m) => set.has(m.id));
  }, [filtered, visibleIds, hasCalculatedVisible]);

  const listItems: MapOfferingCompactItem[] = useMemo(() => {
    return visible.map((m) => ({
      id: m.id,
      title: m.title,
      region: `${m.region} · ${m.address}`,
      priceRange: formatPriceRange(m.priceMinWon, m.priceMaxWon, {
        unknownLabel: UXCopy.priceRangeShort,
      }),
      statusValue: m.statusEnum,
    }));
  }, [visible]);

  const handleSelect = (id: number) => {
    setFocusedId((prev) => (prev === id ? null : id));
    requestAnimationFrame(() => {
      const el = document.getElementById(`offering-row-${id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer>
        <div className="mb-4">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-(--oboon-text-title)">
            지도
          </h1>
          <p className="mt-1 text-[14px] leading-[1.6] text-(--oboon-text-muted)">
            지도에서 분양 현장을 한눈에 확인할 수 있어요.
          </p>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="relative w-full h-[520px]">
            <div className="absolute inset-0">
              <NaverMap
                ref={mapApiRef}
                markers={markers}
                hoveredId={hoveredId}
                focusedId={focusedId}
                onClearFocus={() => setFocusedId(null)}
                onMarkerSelect={handleSelect}
                onVisibleIdsChange={(ids) => {
                  setVisibleIds(ids);
                  setHasCalculatedVisible(true);
                }}
              />
            </div>

            <div className="absolute left-4 top-4 flex items-center gap-2">
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
                className="w-10 h-10 justify-center"
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
                className="w-10 h-10 justify-center"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                shape="pill"
                aria-label="현재 위치"
                className="w-10 h-10 justify-center"
                onClick={() => {
                  // (선택) 현재위치 기능은 나중에 붙일 수 있게 자리만 유지
                }}
              >
                <NavIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="px-5 pb-6">
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
        </Card>
      </PageContainer>
    </main>
  );
}
