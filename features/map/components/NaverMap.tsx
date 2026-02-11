// features/map/NaverMap.tsx
"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import { loadNaverMaps } from "@/features/map/services/naver.loader";
import type { MarkerType } from "@/features/map/domain/marker/marker.type";
import { iconFor, type MarkerState } from "@/features/map/domain/marker/marker.icon";

export interface MapMarker {
  id: number;
  label: string;
  lat: number;
  lng: number;
  type: MarkerType;
  topLabel?: string | null;
  mainLabel?: string | null;
}

export type NaverMapHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  resize: () => void;
  refreshMarkers: () => void;
};

type NaverMapInstance = naver.maps.Map;
type NaverMarkerInstance = naver.maps.Marker;
type MapMode = "base" | "expanded" | "select";
type MapEventLatLngLike = {
  lat?: (() => number) | number;
  lng?: (() => number) | number;
};
type MapClickEvent = {
  domEvent?: {
    preventDefault: () => void;
    stopPropagation: () => void;
  };
  coord?: MapEventLatLngLike;
  latlng?: MapEventLatLngLike;
};

const NaverMap = forwardRef<
  NaverMapHandle,
  {
    markers?: MapMarker[];
    hoveredId?: number | null;
    focusedId?: number | null;
    richMarkerIds?: number[];
    showFocusedAsRich?: boolean;
    fitToMarkers?: boolean;
    initialZoom?: number;
    onMarkerSelect?: (id: number) => void;
    onHoverChange?: (id: number | null) => void;
    onVisibleIdsChange?: (ids: number[]) => void;
    onClearFocus?: () => void;
    mode?: MapMode;
    onSelectPosition?: (lat: number, lng: number) => void | Promise<void>;
  }
>(
  (
    {
      markers = [],
      hoveredId = null,
      focusedId = null,
      richMarkerIds = [],
      showFocusedAsRich = true,
      fitToMarkers = false,
      initialZoom = 12,
      onMarkerSelect,
      onHoverChange = () => {},
      onVisibleIdsChange,
      onClearFocus,
      mode = "base",
      onSelectPosition,
    },
    ref,
  ) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<NaverMapInstance | null>(null);

    // 최신 markers 스냅샷 (id -> marker data)
    const markerDataByIdRef = useRef<Map<number, MapMarker>>(new Map());
    // 실제 네이버 마커 인스턴스 (id -> naver.maps.Marker)
    const markerByIdRef = useRef<Map<number, NaverMarkerInstance>>(new Map());

    const listenersRef = useRef<naver.maps.EventHandle[]>([]);

    const lastFocusedIdRef = useRef<number | null>(null);
    const lastVisibleIdsRef = useRef<string>("");
    const lastHoveredIdRef = useRef<number | null>(null);
    const lastStyledFocusedIdRef = useRef<number | null>(null);

    // visible sync 성능 제어
    const rafVisibleSyncRef = useRef<number | null>(null);
    const isInteractingRef = useRef<boolean>(false);

    const focusedIdRef = useRef(focusedId);
    const hoveredIdRef = useRef(hoveredId);
    const richMarkerIdsRef = useRef<number[]>(richMarkerIds);
    const showFocusedAsRichRef = useRef(showFocusedAsRich);
    const markerClickTsRef = useRef<number>(0);
    const lastFittedMarkersKeyRef = useRef<string>("");
    focusedIdRef.current = focusedId;
    hoveredIdRef.current = hoveredId;
    richMarkerIdsRef.current = richMarkerIds;
    showFocusedAsRichRef.current = showFocusedAsRich;
    const applyMarkerStyleByIdRef = useRef<
      (naverObj: NaverGlobal, id: number) => void
    >(
      () => {},
    );
    const applyFocusHoverDeltaStylesRef = useRef<(naverObj: NaverGlobal) => void>(
      () => {},
    );

    // 콜백 Ref
    const callbacksRef = useRef({
      onMarkerSelect,
      onHoverChange,
      onVisibleIdsChange,
      onClearFocus,
      onSelectPosition,
      mode,
    });

    useEffect(() => {
      callbacksRef.current = {
        onMarkerSelect,
        onHoverChange,
        onVisibleIdsChange,
        onClearFocus,
        onSelectPosition,
        mode,
      };
    });

    function shouldBeRich(m: MapMarker) {
      // 기본은 focused 마커만 rich, 필요 시 richMarkerIds로 추가 지정 가능
      if (showFocusedAsRichRef.current && focusedIdRef.current === m.id) {
        return true;
      }
      return richMarkerIdsRef.current.includes(m.id);
    }

    function applyMarkerStyleById(naverObj: NaverGlobal, id: number) {
      const map = mapRef.current;
      if (!map) return;

      const mk = markerByIdRef.current.get(id);
      const m = markerDataByIdRef.current.get(id);
      if (!mk || !m) return;

      const isFocused = focusedIdRef.current === id;
      const isHovered = hoveredIdRef.current === id;
      const state: MarkerState = isFocused
        ? "focus"
        : isHovered
          ? "hover"
          : "default";
      const isRich = shouldBeRich(m);

      const icon = iconFor({
        type: m.type,
        state,
        viewType: isRich ? "rich" : "compact",
        label: m.label,
        topLabel: m.topLabel,
        mainLabel: m.mainLabel,
      });

      mk.setIcon({
        content: icon,
        anchor: new naverObj.maps.Point(0, 0),
      });

      if (isFocused) mk.setZIndex(1000);
      else if (isHovered) mk.setZIndex(500);
      else mk.setZIndex(100);
    }
    applyMarkerStyleByIdRef.current = applyMarkerStyleById;

    function applyFocusHoverDeltaStyles(naverObj: NaverGlobal) {
      // hovered 변화는 이전/현재 2개만 갱신
      const prevHover = lastHoveredIdRef.current;
      const nextHover = hoveredIdRef.current;
      if (prevHover !== nextHover) {
        if (prevHover) applyMarkerStyleById(naverObj, prevHover);
        if (nextHover) applyMarkerStyleById(naverObj, nextHover);
        lastHoveredIdRef.current = nextHover;
      }

      // focused 변화는 이전/현재 2개만 갱신
      const prevFocus = lastStyledFocusedIdRef.current;
      const nextFocus = focusedIdRef.current;
      if (prevFocus !== nextFocus) {
        if (prevFocus) applyMarkerStyleById(naverObj, prevFocus);
        if (nextFocus) applyMarkerStyleById(naverObj, nextFocus);
        lastStyledFocusedIdRef.current = nextFocus;
      }
    }
    applyFocusHoverDeltaStylesRef.current = applyFocusHoverDeltaStyles;

    function syncVisibleMarkers() {
      const map = mapRef.current;
      const cb = callbacksRef.current.onVisibleIdsChange;

      if (!map || !cb) return;
      if (isInteractingRef.current) return; // 드래그/줌 중엔 중지

      const bounds = map.getBounds();
      const visibleIds: number[] = [];

      markerByIdRef.current.forEach((mk, id) => {
        if (bounds.hasLatLng(mk.getPosition())) visibleIds.push(id);
      });

      visibleIds.sort((a, b) => a - b);
      const idsKey = visibleIds.join(",");

      if (idsKey === lastVisibleIdsRef.current) return;
      lastVisibleIdsRef.current = idsKey;

      cb(visibleIds);
    }

    function scheduleVisibleSync() {
      if (rafVisibleSyncRef.current != null) return;
      rafVisibleSyncRef.current = window.requestAnimationFrame(() => {
        rafVisibleSyncRef.current = null;
        syncVisibleMarkers();
      });
    }

    function fitMapToMarkers(naverObj: NaverGlobal, next: MapMarker[]) {
      const map = mapRef.current;
      if (!map || !fitToMarkers || next.length < 2) return;

      const markersKey = next
        .map((m) => `${m.id}:${m.lat.toFixed(6)},${m.lng.toFixed(6)}`)
        .join("|");
      if (markersKey === lastFittedMarkersKeyRef.current) return;

      const lats = next.map((m) => m.lat);
      const lngs = next.map((m) => m.lng);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;
      const span = Math.max(maxLat - minLat, maxLng - minLng);

      // 마커 간 거리(span)에 따라 대략적인 줌을 선택
      const targetZoom =
        span > 1
          ? 8
          : span > 0.5
            ? 9
            : span > 0.2
              ? 10
              : span > 0.1
                ? 11
                : span > 0.05
                  ? 12
                  : span > 0.02
                    ? 13
                    : span > 0.01
                      ? 14
                      : 15;

      map.panTo(new naverObj.maps.LatLng(centerLat, centerLng));
      map.setZoom(targetZoom, true);
      lastFittedMarkersKeyRef.current = markersKey;
    }

    function upsertMarkers(next: MapMarker[], map: naver.maps.Map, naverObj: NaverGlobal) {
      const nextIds = new Set<number>();
      for (const m of next) nextIds.add(m.id);

      // remove
      markerByIdRef.current.forEach((mk, id) => {
        if (!nextIds.has(id)) {
          mk.setMap(null);
          markerByIdRef.current.delete(id);
          markerDataByIdRef.current.delete(id);
          if (lastHoveredIdRef.current === id) lastHoveredIdRef.current = null;
          if (lastStyledFocusedIdRef.current === id)
            lastStyledFocusedIdRef.current = null;
        }
      });

      // add/update
      for (const m of next) {
        const prev = markerDataByIdRef.current.get(m.id);
        markerDataByIdRef.current.set(m.id, m);

        const existing = markerByIdRef.current.get(m.id);
        if (!existing) {
          const mk = new naver.maps.Marker({
            position: new naverObj.maps.LatLng(m.lat, m.lng),
            map,
          });

          naverObj.maps.Event.addListener(mk, "click", (e?: unknown) => {
            const event = e as MapClickEvent | undefined;
            markerClickTsRef.current = Date.now();
            if (event?.domEvent) {
              event.domEvent.preventDefault();
              event.domEvent.stopPropagation();
            }
            callbacksRef.current.onMarkerSelect?.(m.id);
          });
          naverObj.maps.Event.addListener(mk, "mouseover", () =>
            callbacksRef.current.onHoverChange?.(m.id),
          );
          naverObj.maps.Event.addListener(mk, "mouseout", () =>
            callbacksRef.current.onHoverChange?.(null),
          );

          markerByIdRef.current.set(m.id, mk);
          applyMarkerStyleById(naverObj, m.id);
          continue;
        }

        // position update
        if (!prev || prev.lat !== m.lat || prev.lng !== m.lng) {
          existing.setPosition(new naverObj.maps.LatLng(m.lat, m.lng));
        }

        // data change update (해당 마커만)
        if (
          !prev ||
          prev.label !== m.label ||
          prev.mainLabel !== m.mainLabel ||
          prev.type !== m.type
        ) {
          applyMarkerStyleById(naverObj, m.id);
        }
      }

      scheduleVisibleSync();
    }

    useImperativeHandle(ref, () => ({
      zoomIn: () => {
        const m = mapRef.current;
        if (m) m.setZoom(m.getZoom() + 1, true);
      },
      zoomOut: () => {
        const m = mapRef.current;
        if (m) m.setZoom(m.getZoom() - 1, true);
      },
      resize: () => {
        const naverObj = window.naver;
        if (mapRef.current && naverObj?.maps) {
          naverObj.maps.Event.trigger(mapRef.current, "resize");
        }
      },
      refreshMarkers: () => {
        const naverObj = window.naver;
        if (!naverObj?.maps) return;
        // 강제 전체 리프레시가 필요할 때만 호출
        markerByIdRef.current.forEach((_mk, id) =>
          applyMarkerStyleById(naverObj, id),
        );
      },
    }));

    // [1] 지도 초기화
    useEffect(() => {
      let isMounted = true;
      const mountedListeners = listenersRef.current;
      const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
      if (!clientId) return;

      loadNaverMaps(clientId).then((naverObj) => {
        if (!isMounted || !mapContainerRef.current) return;

        const map = new naverObj.maps.Map(mapContainerRef.current, {
          center: new naverObj.maps.LatLng(37.5127, 126.9706),
          zoom: initialZoom,
          zoomControl: false,
        });
        mapRef.current = map;

        /**
         * iOS Safari / WKWebView(Whale 등)에서 초기 레이아웃 타이밍 때문에
         * 오버레이(HTML content marker)가 첫 렌더에서 보이지 않는 케이스가 있어,
         * 초기 2-RAF + 짧은 setTimeout으로 resize를 강제한다.
         */
        const triggerInitialResize = () => {
          // 2-RAF: 레이아웃/페인트/합성 이후로 미룸
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (!mapRef.current) return;
              naverObj.maps.Event.trigger(mapRef.current, "resize");
              // resize 직후 가시영역/스타일 동기화
              scheduleVisibleSync();
              applyFocusHoverDeltaStyles(naverObj);
            });
          });
          // 일부 iOS에서 1회 더 필요할 때가 있어 보수적으로 1번만 추가
          window.setTimeout(() => {
            if (!mapRef.current) return;
            naverObj.maps.Event.trigger(mapRef.current, "resize");

            markerByIdRef.current.forEach((_mk, id) => {
              applyMarkerStyleById(naverObj, id);
            });

            scheduleVisibleSync();
            applyFocusHoverDeltaStyles(naverObj);
          }, 250);
        };
        triggerInitialResize();

      if (markers.length > 0) upsertMarkers(markers, map, naverObj);
      if (markers.length > 0) fitMapToMarkers(naverObj, markers);

        const clickListener = naverObj.maps.Event.addListener(
          map,
          "click",
          (e?: unknown) => {
            // 마커 클릭 직후 발생하는 지도 클릭 버블링성 이벤트는 무시
            if (Date.now() - markerClickTsRef.current < 250) return;

            const event = e as MapClickEvent | undefined;
            if (callbacksRef.current.mode === "select") {
              const lat =
                (typeof event?.coord?.lat === "function"
                  ? event.coord.lat()
                  : event?.coord?.lat) ??
                (typeof event?.latlng?.lat === "function"
                  ? event.latlng.lat()
                  : event?.latlng?.lat);
              const lng =
                (typeof event?.coord?.lng === "function"
                  ? event.coord.lng()
                  : event?.coord?.lng) ??
                (typeof event?.latlng?.lng === "function"
                  ? event.latlng.lng()
                  : event?.latlng?.lng);
              if (typeof lat === "number" && typeof lng === "number") {
                callbacksRef.current.onSelectPosition?.(lat, lng);
              }
              return;
            }
            callbacksRef.current.onClearFocus?.();
          },
        );
        const dragStartListener = naverObj.maps.Event.addListener(
          map,
          "dragstart",
          () => {
            isInteractingRef.current = true;
          },
        );

        const idleListener = naverObj.maps.Event.addListener(map, "idle", () => {
          isInteractingRef.current = false;
          scheduleVisibleSync();
          // idle에서 델타만 반영 (전체 loop 금지)
          applyFocusHoverDeltaStyles(naverObj);
        });

        const zoomListener = naverObj.maps.Event.addListener(
          map,
          "zoom_changed",
          () => {
            isInteractingRef.current = true;
            // 현 정책상 focused만 갱신하면 충분
            const fid = focusedIdRef.current;
            if (fid) applyMarkerStyleById(naverObj, fid);
          },
        );

        mountedListeners.push(
          clickListener,
          dragStartListener,
          idleListener,
          zoomListener,
        );
      });

      return () => {
        isMounted = false;
        const naverObj = window.naver;
        const listeners = [...mountedListeners];
        if (naverObj?.maps) {
          listeners.forEach((l) =>
            naverObj.maps.Event.removeListener(l),
          );
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // [1-1] iOS Safari BFCache / 탭 복귀 대응
    useEffect(() => {
      const naverObj = window.naver;

      const forceRefresh = () => {
        if (!mapRef.current || !naverObj?.maps) return;

        // 지도 사이즈 재계산
        naverObj.maps.Event.trigger(mapRef.current, "resize");

        // 🔴 핵심: HTML content marker 재부착
        markerByIdRef.current.forEach((_mk, id) => {
          applyMarkerStyleByIdRef.current(naverObj, id);
        });
      };

      window.addEventListener("pageshow", forceRefresh);
      document.addEventListener("visibilitychange", forceRefresh);

      return () => {
        window.removeEventListener("pageshow", forceRefresh);
        document.removeEventListener("visibilitychange", forceRefresh);
      };
    }, []);

    // [2] markers 변경 시: 전체 재생성 금지 → diff upsert
    useEffect(() => {
      const naverObj = window.naver;
      const map = mapRef.current;

      if (naverObj?.maps && map) {
        upsertMarkers(markers, map, naverObj);
        fitMapToMarkers(naverObj, markers);
      } else {
        // 지도 준비 전 스냅샷만 갱신
        markerDataByIdRef.current = new Map(markers.map((m) => [m.id, m]));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [markers]);

    // [3] Hover/Focus: 전체 loop 금지 → delta만
    useEffect(() => {
      const naverObj = window.naver;
      if (!naverObj?.maps) return;
      applyFocusHoverDeltaStylesRef.current(naverObj);
    }, [hoveredId, focusedId]);

    // [4] Focus 이동
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !focusedId || lastFocusedIdRef.current === focusedId) return;

      const target = markerDataByIdRef.current.get(focusedId);
      if (!target) return;

      const naverObj = window.naver;
      if (!naverObj?.maps) return;
      const targetLatLng = new naverObj.maps.LatLng(target.lat, target.lng);

      if (mode === "expanded") {
        const proj = map.getProjection();
        const mapSize = map.getSize();

        const targetOffset = proj.fromCoordToOffset(targetLatLng);
        const newCenterOffset = new naverObj.maps.Point(
          targetOffset.x,
          targetOffset.y + mapSize.height * 0.1,
        );

        const newCenter = proj.fromOffsetToCoord(newCenterOffset);
        map.panTo(newCenter);
      } else {
        map.panTo(targetLatLng);
      }

      lastFocusedIdRef.current = focusedId;
    }, [focusedId, mode]);

    return (
      <div className="relative w-full h-full">
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>
    );
  },
);

NaverMap.displayName = "NaverMap";

export default NaverMap;
