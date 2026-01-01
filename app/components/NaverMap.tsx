// app/components/NaverMap.tsx

"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

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

type NaverLatLng = {
  lat: () => number;
  lng: () => number;
};

type NaverPoint = {
  x: number;
  y: number;
};

type NaverBounds = {
  hasLatLng: (latLng: NaverLatLng) => boolean;
};

type NaverMapInstance = {
  getZoom?: () => number;
  setZoom?: (zoom: number, animate?: boolean) => void;
  getBounds: () => NaverBounds;
  panTo: (latLng: NaverLatLng) => void;
};

type NaverMarker = {
  setMap: (map: NaverMapInstance | null) => void;
  setIcon: (options: { content: string; anchor: NaverPoint }) => void;
  setZIndex: (zIndex: number) => void;
  setPosition: (latLng: NaverLatLng) => void;
};

type NaverMapApi = {
  maps: {
    Map: new (
      el: HTMLElement,
      options: { center: NaverLatLng; zoom: number }
    ) => NaverMapInstance;
    LatLng: new (lat: number, lng: number) => NaverLatLng;
    Point: new (x: number, y: number) => NaverPoint;
    Marker: new (options: {
      position: NaverLatLng;
      map: NaverMapInstance;
      title?: string;
      icon?: { content: string; anchor: NaverPoint };
      zIndex?: number;
    }) => NaverMarker;
    Event: {
      addListener: (
        target: unknown,
        eventName: string,
        handler: (...args: any[]) => void
      ) => void;
      removeListener: (listener: any) => void;
    };
  };
};

declare global {
  interface Window {
    naver?: NaverMapApi;
  }
}

const NaverMap = forwardRef<
  NaverMapHandle,
  {
    markers?: MapMarker[];
    onVisibleIdsChange?: (ids: number[]) => void;
    hoveredId?: number | null;
    focusedId?: number | null;
    onClearFocus?: () => void;
    onMarkerSelect?: (id: number) => void;
    onSelectPosition?: (lat: number, lng: number) => void; // ✅ Main 기능 추가
  }
>(
  (
    {
      markers = [],
      onVisibleIdsChange,
      hoveredId,
      focusedId,
      onClearFocus,
      onMarkerSelect,
      onSelectPosition, // ✅ Main 기능 추가
    },
    ref
  ) => {
    const mapRef = useRef<HTMLDivElement | null>(null);
    const mapInstance = useRef<NaverMapInstance | null>(null);

    const markerById = useRef<Map<number, NaverMarker>>(new Map());
    const markersRef = useRef<MapMarker[]>([]);
    const lastFocusedId = useRef<number | null>(null);
    const selectedMarkerRef = useRef<NaverMarker | null>(null); // ✅ Main 기능 추가

    const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

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

    useEffect(() => {
      if (!clientId) return;

      function initMap() {
        const naver = window.naver;
        if (!naver?.maps) return;
        if (!mapRef.current || mapInstance.current) return;

        mapInstance.current = new naver.maps.Map(mapRef.current, {
          center: new naver.maps.LatLng(37.5665, 126.978),
          zoom: 11,
        });

        naver.maps.Event.addListener(mapInstance.current, "dragstart", () => {
          lastFocusedId.current = null;
          onClearFocus?.();
        });

        naver.maps.Event.addListener(mapInstance.current, "zoom_changed", () => {
          lastFocusedId.current = null;
          onClearFocus?.();
        });

        if (onVisibleIdsChange) {
          naver.maps.Event.addListener(mapInstance.current, "idle", () => {
            if (focusedId) return;

            const bounds = mapInstance.current?.getBounds();
            if (!bounds) return;

            const visibleIds = markersRef.current
              .filter((m) =>
                bounds.hasLatLng(new naver.maps.LatLng(m.lat, m.lng))
              )
              .map((m) => m.id);

            onVisibleIdsChange(visibleIds);
          });
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

    // ✅ Main 기능 추가: 지도 클릭으로 위치 선택
    useEffect(() => {
      if (!mapInstance.current || !window.naver?.maps || !onSelectPosition)
        return;

      const { naver } = window;

      const listener = naver.maps.Event.addListener(
        mapInstance.current,
        "click",
        (e: any) => {
          const latlng = e.latlng;
          if (!latlng) return;

          const lat = latlng.lat();
          const lng = latlng.lng();

          // 마커가 없으면 생성
          if (!selectedMarkerRef.current) {
            selectedMarkerRef.current = new naver.maps.Marker({
              position: latlng,
              map: mapInstance.current!,
              icon: {
                content: getMarkerIconHTML("urgent", "focus"),
                anchor: new naver.maps.Point(7, 7),
              },
              zIndex: 500,
            });
          } else {
            // 있으면 위치만 이동
            selectedMarkerRef.current.setPosition(latlng);
          }

          onSelectPosition(lat, lng);
        }
      );

      return () => {
        naver.maps.Event.removeListener(listener);
      };
    }, [onSelectPosition]);

    useEffect(() => {
      markersRef.current = markers;
    }, [markers]);

    useEffect(() => {
      const naver = window.naver;
      const map = mapInstance.current;
      if (!map || !naver?.maps) return;

      markerById.current.forEach((m) => m.setMap(null));
      markerById.current.clear();

      markers.forEach((m) => {
        const mk = new naver.maps.Marker({
          position: new naver.maps.LatLng(m.lat, m.lng),
          map,
          title: m.label,
          icon: {
            content: getMarkerIconHTML(m.type, "default"),
            anchor: new naver.maps.Point(7, 7),
          },
          zIndex: 10,
        });

        if (onMarkerSelect) {
          naver.maps.Event.addListener(mk, "click", () => onMarkerSelect(m.id));
        }

        markerById.current.set(m.id, mk);
      });
    }, [markers, onMarkerSelect]);

    useEffect(() => {
      const naver = window.naver;
      if (!naver?.maps) return;
      applyMarkerStyles({
        naver,
        markerById: markerById.current,
        markers,
        hoveredId,
        focusedId,
      });
    }, [hoveredId, focusedId, markers]);

    useEffect(() => {
      const naver = window.naver;
      const map = mapInstance.current;
      if (!focusedId || !map || !naver?.maps) return;
      if (lastFocusedId.current === focusedId) return;

      const target = markersRef.current.find((m) => m.id === focusedId);
      if (!target) return;

      map.panTo(new naver.maps.LatLng(target.lat, target.lng));

      lastFocusedId.current = focusedId;
    }, [focusedId]);

    return <div ref={mapRef} className="w-full h-full rounded-xl" />;
  }
);

NaverMap.displayName = "NaverMap";
export default NaverMap;

function applyMarkerStyles({
  naver,
  markerById,
  markers,
  hoveredId,
  focusedId,
}: {
  naver: NaverMapApi;
  markerById: Map<number, NaverMarker>;
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
      anchor: new naver.maps.Point(7, 7),
    });

    mk.setZIndex(state === "focus" ? 300 : state === "hover" ? 200 : 10);
  });
}

function getMarkerIconHTML(
  type: MarkerType,
  state: "default" | "hover" | "focus"
) {
  const size = state === "focus" ? 18 : state === "hover" ? 16 : 14;

  const halo =
    state === "focus"
      ? `
        box-shadow:
          0 0 0 4px var(--oboon-primary-alpha-20),
          0 0 10px var(--oboon-shadow-strong);
      `
      : state === "hover"
        ? `
        box-shadow:
          0 0 8px var(--oboon-shadow-strong);
      `
        : `
        box-shadow:
          0 0 6px var(--oboon-shadow-default);
      `;

  return `
    <div style="
      background: var(--oboon-marker-${type});
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: 2px solid var(--oboon-bg-surface);
      ${halo}
    "></div>
  `;
}