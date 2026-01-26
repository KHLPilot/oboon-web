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

type NaverMapInstance = any;
type MapMode = "base" | "expanded" | "select";

const NaverMap = forwardRef<
  NaverMapHandle,
  {
    markers?: MapMarker[];
    hoveredId?: number | null;
    focusedId?: number | null;
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
    const mapRef = useRef<NaverMapInstance>(null);

    // 최신 markers 스냅샷 (id -> marker data)
    const markerDataByIdRef = useRef<Map<number, MapMarker>>(new Map());
    // 실제 네이버 마커 인스턴스 (id -> naver.maps.Marker)
    const markerByIdRef = useRef<Map<number, any>>(new Map());

    const listenersRef = useRef<any[]>([]);

    const lastFocusedIdRef = useRef<number | null>(null);
    const lastVisibleIdsRef = useRef<string>("");
    const lastHoveredIdRef = useRef<number | null>(null);
    const lastStyledFocusedIdRef = useRef<number | null>(null);

    // visible sync 성능 제어
    const rafVisibleSyncRef = useRef<number | null>(null);
    const isInteractingRef = useRef<boolean>(false);

    const focusedIdRef = useRef(focusedId);
    const hoveredIdRef = useRef(hoveredId);
    focusedIdRef.current = focusedId;
    hoveredIdRef.current = hoveredId;

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
      // 정책: focused 마커만 rich
      return focusedIdRef.current === m.id;
    }

    function applyMarkerStyleById(naver: any, id: number) {
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
        topLabel: m.label,
        mainLabel: m.mainLabel,
      });

      mk.setIcon({
        content: icon,
        anchor: new naver.maps.Point(0, 0),
      });

      if (isFocused) mk.setZIndex(1000);
      else if (isHovered) mk.setZIndex(500);
      else mk.setZIndex(100);
    }

    function applyFocusHoverDeltaStyles(naver: any) {
      // hovered 변화는 이전/현재 2개만 갱신
      const prevHover = lastHoveredIdRef.current;
      const nextHover = hoveredIdRef.current;
      if (prevHover !== nextHover) {
        if (prevHover) applyMarkerStyleById(naver, prevHover);
        if (nextHover) applyMarkerStyleById(naver, nextHover);
        lastHoveredIdRef.current = nextHover;
      }

      // focused 변화는 이전/현재 2개만 갱신
      const prevFocus = lastStyledFocusedIdRef.current;
      const nextFocus = focusedIdRef.current;
      if (prevFocus !== nextFocus) {
        if (prevFocus) applyMarkerStyleById(naver, prevFocus);
        if (nextFocus) applyMarkerStyleById(naver, nextFocus);
        lastStyledFocusedIdRef.current = nextFocus;
      }
    }

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

    function upsertMarkers(next: MapMarker[], map: any, naver: any) {
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
            position: new naver.maps.LatLng(m.lat, m.lng),
            map,
          });

          naver.maps.Event.addListener(mk, "click", (e: any) => {
            if (e.domEvent) {
              e.domEvent.preventDefault();
              e.domEvent.stopPropagation();
            }
            callbacksRef.current.onMarkerSelect?.(m.id);
          });
          naver.maps.Event.addListener(mk, "mouseover", () =>
            callbacksRef.current.onHoverChange?.(m.id),
          );
          naver.maps.Event.addListener(mk, "mouseout", () =>
            callbacksRef.current.onHoverChange?.(null),
          );

          markerByIdRef.current.set(m.id, mk);
          applyMarkerStyleById(naver, m.id);
          continue;
        }

        // position update
        if (!prev || prev.lat !== m.lat || prev.lng !== m.lng) {
          existing.setPosition(new naver.maps.LatLng(m.lat, m.lng));
        }

        // data change update (해당 마커만)
        if (
          !prev ||
          prev.label !== m.label ||
          prev.mainLabel !== m.mainLabel ||
          prev.type !== m.type
        ) {
          applyMarkerStyleById(naver, m.id);
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
        const naver = (window as any).naver;
        if (mapRef.current && naver) {
          naver.maps.Event.trigger(mapRef.current, "resize");
        }
      },
      refreshMarkers: () => {
        const naver = (window as any).naver;
        if (!naver?.maps) return;
        // 강제 전체 리프레시가 필요할 때만 호출
        markerByIdRef.current.forEach((_mk, id) =>
          applyMarkerStyleById(naver, id),
        );
      },
    }));

    // [1] 지도 초기화
    useEffect(() => {
      let isMounted = true;
      const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
      if (!clientId) return;

      loadNaverMaps(clientId).then((naver) => {
        if (!isMounted || !mapContainerRef.current) return;

        const map = new naver.maps.Map(mapContainerRef.current, {
          center: new naver.maps.LatLng(37.5127, 126.9706),
          zoom: 12,
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
              naver.maps.Event.trigger(mapRef.current, "resize");
              // resize 직후 가시영역/스타일 동기화
              scheduleVisibleSync();
              applyFocusHoverDeltaStyles(naver);
            });
          });
          // 일부 iOS에서 1회 더 필요할 때가 있어 보수적으로 1번만 추가
          window.setTimeout(() => {
            if (!mapRef.current) return;
            naver.maps.Event.trigger(mapRef.current, "resize");

            markerByIdRef.current.forEach((_mk, id) => {
              applyMarkerStyleById(naver, id);
            });

            scheduleVisibleSync();
            applyFocusHoverDeltaStyles(naver);
          }, 250);
        };
        triggerInitialResize();

        if (markers.length > 0) upsertMarkers(markers, map, naver);

        const clickListener = naver.maps.Event.addListener(
          map,
          "click",
          (e: any) => {
            if (callbacksRef.current.mode === "select") {
              const lat =
                e?.coord?.lat?.() ?? e?.latlng?.lat?.() ?? e?.latlng?.lat;
              const lng =
                e?.coord?.lng?.() ?? e?.latlng?.lng?.() ?? e?.latlng?.lng;
              if (typeof lat === "number" && typeof lng === "number") {
                callbacksRef.current.onSelectPosition?.(lat, lng);
              }
              return;
            }
            callbacksRef.current.onClearFocus?.();
          },
        );
        const dragStartListener = naver.maps.Event.addListener(
          map,
          "dragstart",
          () => {
            isInteractingRef.current = true;
          },
        );

        const idleListener = naver.maps.Event.addListener(map, "idle", () => {
          isInteractingRef.current = false;
          scheduleVisibleSync();
          // idle에서 델타만 반영 (전체 loop 금지)
          applyFocusHoverDeltaStyles(naver);
        });

        const zoomListener = naver.maps.Event.addListener(
          map,
          "zoom_changed",
          () => {
            isInteractingRef.current = true;
            // 현 정책상 focused만 갱신하면 충분
            const fid = focusedIdRef.current;
            if (fid) applyMarkerStyleById(naver, fid);
          },
        );

        listenersRef.current.push(
          clickListener,
          dragStartListener,
          idleListener,
          zoomListener,
        );
      });

      return () => {
        isMounted = false;
        const naver = (window as any).naver;
        if (naver?.maps) {
          listenersRef.current.forEach((l) =>
            naver.maps.Event.removeListener(l),
          );
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // [1-1] iOS Safari BFCache / 탭 복귀 대응
    useEffect(() => {
      const naver = (window as any).naver;

      const forceRefresh = () => {
        if (!mapRef.current || !naver?.maps) return;

        // 지도 사이즈 재계산
        naver.maps.Event.trigger(mapRef.current, "resize");

        // 🔴 핵심: HTML content marker 재부착
        markerByIdRef.current.forEach((_mk, id) => {
          applyMarkerStyleById(naver, id);
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
      const naver = (window as any).naver;
      const map = mapRef.current;

      if (naver?.maps && map) {
        upsertMarkers(markers, map, naver);
      } else {
        // 지도 준비 전 스냅샷만 갱신
        markerDataByIdRef.current = new Map(markers.map((m) => [m.id, m]));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [markers]);

    // [3] Hover/Focus: 전체 loop 금지 → delta만
    useEffect(() => {
      const naver = (window as any).naver;
      if (!naver?.maps) return;
      applyFocusHoverDeltaStyles(naver);
    }, [hoveredId, focusedId]);

    // [4] Focus 이동
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !focusedId || lastFocusedIdRef.current === focusedId) return;

      const target = markerDataByIdRef.current.get(focusedId);
      if (!target) return;

      const naver = (window as any).naver;
      const targetLatLng = new naver.maps.LatLng(target.lat, target.lng);

      if (mode === "expanded") {
        const proj = map.getProjection();
        const mapSize = map.getSize();

        const targetOffset = proj.fromCoordToOffset(targetLatLng);
        const newCenterOffset = new naver.maps.Point(
          targetOffset.x,
          targetOffset.y + mapSize.height * 0.05,
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
