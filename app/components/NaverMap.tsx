"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

/* ==================================================
   타입
================================================== */

export type MarkerType = "urgent" | "upcoming" | "remain";

export interface MapMarker {
  id: number;
  label: string;
  lat: number;
  lng: number;
  type: MarkerType;
}

export type NaverMapHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
};

declare global {
  interface Window {
    naver: any;
  }
}

/* ==================================================
   컴포넌트
================================================== */

const NaverMap = forwardRef<
  NaverMapHandle,
  {
    markers: MapMarker[];
    onVisibleIdsChange?: (ids: number[]) => void;
    hoveredId?: number | null;
    focusedId?: number | null;
    onClearFocus?: () => void;
    onMarkerSelect?: (id: number) => void;
  }
>(
  (
    {
      markers,
      onVisibleIdsChange,
      hoveredId,
      focusedId,
      onClearFocus,
      onMarkerSelect,
    },
    ref
  ) => {
    const mapRef = useRef<HTMLDivElement | null>(null);
    const mapInstance = useRef<any>(null);

    const markerById = useRef<Map<number, any>>(new Map());
    const markersRef = useRef<MapMarker[]>([]);
    const lastFocusedId = useRef<number | null>(null);

    const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

    /* ---------- 외부에서 호출 가능한 메서드 ---------- */
    useImperativeHandle(ref, () => ({
      zoomIn() {
        if (!mapInstance.current) return;
        const z = mapInstance.current.getZoom?.();
        if (typeof z !== "number") return;
        mapInstance.current.setZoom?.(z + 1, true);
      },
      zoomOut() {
        if (!mapInstance.current) return;
        const z = mapInstance.current.getZoom?.();
        if (typeof z !== "number") return;
        mapInstance.current.setZoom?.(z - 1, true);
      },
    }));

    /* ---------- 지도 로드 ---------- */
    useEffect(() => {
      if (!clientId) return;

      function initMap() {
        if (!mapRef.current || mapInstance.current) return;

        mapInstance.current = new window.naver.maps.Map(mapRef.current, {
          center: new window.naver.maps.LatLng(37.5665, 126.978),
          zoom: 11,
        });

        // 사용자 직접 조작 → focus 해제
        window.naver.maps.Event.addListener(
          mapInstance.current,
          "dragstart",
          () => {
            lastFocusedId.current = null;
            onClearFocus?.();
          }
        );

        window.naver.maps.Event.addListener(
          mapInstance.current,
          "zoom_changed",
          () => {
            lastFocusedId.current = null;
            onClearFocus?.();
          }
        );

        // bounds 기반 visibleIds (focus 없을 때만)
        if (onVisibleIdsChange) {
          window.naver.maps.Event.addListener(
            mapInstance.current,
            "idle",
            () => {
              if (focusedId) return;

              const bounds = mapInstance.current.getBounds();
              if (!bounds) return;

              const visibleIds = markersRef.current
                .filter((m) =>
                  bounds.hasLatLng(new window.naver.maps.LatLng(m.lat, m.lng))
                )
                .map((m) => m.id);

              onVisibleIdsChange(visibleIds);
            }
          );
        }
      }

      if (window.naver?.maps) {
        initMap();
        return;
      }

      const scriptId = "naver-map-sdk";
      const existing = document.getElementById(scriptId);
      if (existing) {
        existing.addEventListener("load", initMap);
        return;
      }

      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`;
      script.async = true;
      script.onload = initMap;
      document.head.appendChild(script);
    }, [clientId, focusedId, onClearFocus, onVisibleIdsChange]);

    /* ---------- 최신 markers 유지 ---------- */
    useEffect(() => {
      markersRef.current = markers;
    }, [markers]);

    /* ---------- 마커 렌더 ---------- */
    useEffect(() => {
      if (!mapInstance.current || !window.naver?.maps) return;

      const { naver } = window;

      markerById.current.forEach((m) => m.setMap(null));
      markerById.current.clear();

      markers.forEach((m) => {
        const mk = new naver.maps.Marker({
          position: new naver.maps.LatLng(m.lat, m.lng),
          map: mapInstance.current,
          title: m.label,
          icon: {
            content: getMarkerIconHTML(m.type, "default"),
            anchor: new naver.maps.Point(7, 7),
          },
          zIndex: 10,
        });

        // 마커 클릭 → 리스트 선택/포커스
        if (onMarkerSelect) {
          naver.maps.Event.addListener(mk, "click", () => onMarkerSelect(m.id));
        }

        markerById.current.set(m.id, mk);
      });
    }, [markers, onMarkerSelect]);

    /* ---------- hover / focus 스타일 ---------- */
    useEffect(() => {
      applyMarkerStyles({
        markerById: markerById.current,
        markers,
        hoveredId,
        focusedId,
      });
    }, [hoveredId, focusedId, markers]);

    /* ---------- focus 전환 (다른 id 클릭 시만 panTo) ---------- */
    useEffect(() => {
      if (!focusedId) return;
      if (!mapInstance.current || !window.naver?.maps) return;
      if (lastFocusedId.current === focusedId) return;

      const target = markersRef.current.find((m) => m.id === focusedId);
      if (!target) return;

      mapInstance.current.panTo(
        new window.naver.maps.LatLng(target.lat, target.lng)
      );

      lastFocusedId.current = focusedId;
    }, [focusedId]);

    return <div ref={mapRef} className="w-full h-full rounded-xl" />;
  }
);

NaverMap.displayName = "NaverMap";
export default NaverMap;

/* ==================================================
   스타일 유틸
================================================== */

function applyMarkerStyles({
  markerById,
  markers,
  hoveredId,
  focusedId,
}: {
  markerById: Map<number, any>;
  markers: MapMarker[];
  hoveredId?: number | null;
  focusedId?: number | null;
}) {
  markers.forEach((m) => {
    const mk = markerById.get(m.id);
    if (!mk) return;

    let state: "default" | "hover" | "focus" = "default";
    if (focusedId === m.id) state = "focus";
    else if (hoveredId === m.id) state = "hover";

    mk.setIcon({
      content: getMarkerIconHTML(m.type, state),
      anchor: new window.naver.maps.Point(7, 7),
    });

    mk.setZIndex(state === "focus" ? 300 : state === "hover" ? 200 : 10);
  });
}

function getMarkerIconHTML(
  type: MarkerType,
  state: "default" | "hover" | "focus"
) {
  const base = getColor(type);
  const size = state === "focus" ? 18 : state === "hover" ? 16 : 14;

  return `
    <div style="
      background:${base};
      width:${size}px;
      height:${size}px;
      border-radius:50%;
      border:2px solid white;
      box-shadow:0 0 6px rgba(0,0,0,.35);
    "></div>
  `;
}

function getColor(type: MarkerType) {
  switch (type) {
    case "urgent":
      return "#ef4444";
    case "upcoming":
      return "#3b82f6";
    case "remain":
      return "#10b981";
    default:
      return "#64748b";
  }
}
