"use client";

import { Minus, Plus } from "lucide-react";
import { useMemo, useRef } from "react";

import Button from "@/components/ui/Button";
import NaverMap, {
  type MapMarker,
  type NaverMapHandle,
} from "@/features/map/components/NaverMap";
import type { RecommendationItem } from "@/features/recommendations/hooks/useRecommendations";
import { Copy } from "@/shared/copy";

type MiniMapProps = {
  items: RecommendationItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
};

export default function MiniMap(props: MiniMapProps) {
  const { items, selectedId, onSelect } = props;
  const mapApiRef = useRef<NaverMapHandle | null>(null);

  const markers = useMemo<MapMarker[]>(
    () =>
      items
        .filter(
          (item) =>
            typeof item.property.lat === "number" &&
            Number.isFinite(item.property.lat) &&
            typeof item.property.lng === "number" &&
            Number.isFinite(item.property.lng),
        )
        .map((item) => ({
          id: item.property.id,
          type:
            item.evalResult.finalGrade === "GREEN"
              ? ("modelhouse" as const)
              : item.evalResult.finalGrade === "YELLOW"
                ? ("all" as const)
                : ("valuation" as const),
          label: item.property.name,
          lat: item.property.lat as number,
          lng: item.property.lng as number,
          topLabel: item.property.name,
          mainLabel: item.property.regionLabel,
          address: item.property.addressFull,
          imageUrl: item.property.imageUrl,
        })),
    [items],
  );

  return (
    <div className="relative h-full overflow-hidden rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)">
      {markers.length > 0 ? (
        <>
          <NaverMap
            ref={mapApiRef}
            markers={markers}
            hoveredId={selectedId}
            focusedId={selectedId}
            fitToMarkers
            interactive
            regionClusterEnabled={false}
            showFocusedAsRich={false}
            onMarkerSelect={onSelect}
          />

          <div className="pointer-events-none absolute right-4 top-4 z-10 flex flex-col gap-2">
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
          </div>
        </>
      ) : (
        <div className="flex h-full items-center justify-center px-8 text-center">
          <div className="space-y-2">
            <div className="ob-typo-h3 text-(--oboon-text-title)">
              {Copy.offerings.map.empty}
            </div>
            <p className="ob-typo-body text-(--oboon-text-muted)">
              현장 상세 페이지에서 더 많은 위치 정보를 확인할 수 있습니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
