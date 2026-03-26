// features/map/FullscreenMapOverlay.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Minus } from "lucide-react";

import Button from "@/components/ui/Button";
import NaverMap, {
  type MapMarker,
  type NaverMapHandle,
} from "@/features/map/components/NaverMap";
import type {
  GeoLocationCenter,
  GeoLocationStatus,
} from "@/features/map/hooks/useCurrentLocationCenter";

const ALL_KOREA_VIEW_BOUNDS = {
  south: 33.0,
  west: 125.8,
  north: 38.75,
  east: 130.95,
};
const GPS_FOCUS_ZOOM = 12;

export default function FullscreenMapOverlay({
  open,
  title = "지도",
  markers,
  initialCenter = null,
  initialLocationStatus = "idle",
  regionClusterEnabled = false,
  regionClusterZoomThreshold,
  clusterZoomDelta,
  filtersSlot,
  hoveredId,
  focusedId,
  onHoverChange,
  onSelect,
  onClose,
}: {
  open: boolean;
  title?: string;

  markers: MapMarker[];
  initialCenter?: GeoLocationCenter | null;
  initialLocationStatus?: GeoLocationStatus;
  regionClusterEnabled?: boolean;
  regionClusterZoomThreshold?: number;
  clusterZoomDelta?: number;

  filtersSlot?: React.ReactNode;

  hoveredId: number | null;
  focusedId: number | null;
  onHoverChange: (id: number | null) => void;
  onSelect: (id: number) => void;

  onClose: () => void;
}) {
  const [portalEl] = useState<HTMLDivElement | null>(() => {
    if (typeof document === "undefined") return null;
    const el = document.createElement("div");
    el.setAttribute("data-oboon-map-overlay-root", "true");
    return el;
  });
  const mapRef = useRef<NaverMapHandle | null>(null);
  const [mapReadyVersion, setMapReadyVersion] = useState(0);
  const lastViewportKeyRef = useRef<string>("");

  useEffect(() => {
    if (!open) {
      lastViewportKeyRef.current = "";
      mapRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open || mapReadyVersion === 0) return;
    const map = mapRef.current;
    if (!map) return;
    let retryTimer: number | null = null;

    if (initialLocationStatus === "granted" && initialCenter) {
      const locationKey = `${initialCenter.lat.toFixed(6)},${initialCenter.lng.toFixed(6)}`;
      const viewportKey = `location:${locationKey}`;
      if (lastViewportKeyRef.current !== viewportKey) {
        lastViewportKeyRef.current = viewportKey;
        map.setView(initialCenter.lat, initialCenter.lng, GPS_FOCUS_ZOOM);
        retryTimer = window.setTimeout(() => {
          mapRef.current?.setView(
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

    if (initialLocationStatus === "pending" || initialLocationStatus === "idle") {
      return;
    }

    if (lastViewportKeyRef.current !== "nationwide") {
      lastViewportKeyRef.current = "nationwide";
      map.fitToBounds(ALL_KOREA_VIEW_BOUNDS);
    }
    return () => {
      if (retryTimer !== null) window.clearTimeout(retryTimer);
    };
  }, [initialCenter, initialLocationStatus, mapReadyVersion, open]);

  useEffect(() => {
    if (!open || !portalEl) return;

    document.body.appendChild(portalEl);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    requestAnimationFrame(() => {
      mapRef.current?.resize();
      mapRef.current?.refreshMarkers();
    });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      if (portalEl.parentNode) portalEl.parentNode.removeChild(portalEl);
    };
  }, [open, portalEl, onClose, mapRef]);

  if (!open || !portalEl) return null;

  return createPortal(
    <div className="fixed inset-0 z-99999">
      {/* dim */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />

      {/* panel */}
      <div className="absolute inset-0 flex flex-col bg-(--oboon-bg-page)">
        {/* top bar */}
        <div className="shrink-0 border-b border-(--oboon-border-default) bg-(--oboon-bg-surface)">
          <div className="mx-auto flex max-w-300 items-center justify-between px-4 py-3">
            <div className="ob-typo-h3 text-(--oboon-text-title)">{title}</div>

            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-(--oboon-bg-subtle)"
            >
              <X className="h-5 w-5 text-(--oboon-text-title)" />
            </button>
          </div>
        </div>

        {/* map area */}
        <div className="relative flex-1 w-full min-h-0">
          <div className="absolute inset-0">
            <NaverMap
              ref={(api) => {
                mapRef.current = api;
              }}
              mode="expanded"
              markers={markers}
              initialCenter={initialCenter}
              initialLocationStatus={initialLocationStatus}
              regionClusterEnabled={regionClusterEnabled}
              regionClusterZoomThreshold={regionClusterZoomThreshold}
              clusterZoomDelta={clusterZoomDelta}
              hoveredId={hoveredId}
              focusedId={focusedId}
              showFocusedAsRich
              focusedMarkerViewType="hero"
              onMapReady={() => setMapReadyVersion((prev) => prev + 1)}
              onHoverChange={onHoverChange}
              onClearFocus={() => onSelect(0)}
              onMarkerSelect={(id) => onSelect(id)}
            />
          </div>

          {/* layer/filter slot */}
          {filtersSlot ? (
            <div className="absolute left-4 top-4">{filtersSlot}</div>
          ) : null}

          {/* zoom controls */}
          <div className="absolute right-4 top-4 flex flex-col gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              shape="pill"
              onClick={() => mapRef.current?.zoomIn()}
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
              onClick={() => mapRef.current?.zoomOut()}
              aria-label="축소"
              className="w-10 h-10 justify-center"
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>,
    portalEl
  );
}
