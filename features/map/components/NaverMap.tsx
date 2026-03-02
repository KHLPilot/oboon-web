// features/map/NaverMap.tsx
"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import { loadNaverMaps } from "@/features/map/services/naver.loader";
import type { MarkerType } from "@/features/map/domain/marker/marker.type";
import {
  iconFor,
  type MarkerState,
} from "@/features/map/domain/marker/marker.icon";

export interface MapMarker {
  id: number;
  label: string;
  lat: number;
  lng: number;
  type: MarkerType;
  isCluster?: boolean;
  clusterRegion?: string | null;
  topLabel?: string | null;
  mainLabel?: string | null;
  imageUrl?: string | null;
  address?: string | null;
  ctaLabel?: string | null;
  canConsult?: boolean;
}

export type MapFocusBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type MapFocusPolygonPath = Array<{ lat: number; lng: number }>;
export type MapFocusOverlayTone = "default" | "danger" | "warning" | "mixed";
export type MapFocusPolygonGroup = {
  paths: MapFocusPolygonPath[];
  tone?: MapFocusOverlayTone;
};

export type NaverMapHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  setView: (lat: number, lng: number, zoom?: number) => void;
  fitToBounds: (bounds: MapFocusBounds) => void;
  resize: () => void;
  refreshMarkers: () => void;
};

type NaverMapInstance = naver.maps.Map;
type NaverMarkerInstance = naver.maps.Marker;
type MapMode = "base" | "expanded" | "select";
type FocusMaskMode = "outside" | "inside";
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

const REGION_CLUSTER_ZOOM_THRESHOLD = 10;
const MERCATOR_TILE_SIZE = 256;

type RgbaColor = { r: number; g: number; b: number; a: number };

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function parseCssColorToRgba(value: string): RgbaColor | null {
  const text = value.trim();
  if (!text) return null;

  if (text.startsWith("#")) {
    const hex = text.slice(1);
    if (hex.length === 3) {
      const r = Number.parseInt(hex[0] + hex[0], 16);
      const g = Number.parseInt(hex[1] + hex[1], 16);
      const b = Number.parseInt(hex[2] + hex[2], 16);
      return { r, g, b, a: 1 };
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = Number.parseInt(hex.slice(0, 2), 16);
      const g = Number.parseInt(hex.slice(2, 4), 16);
      const b = Number.parseInt(hex.slice(4, 6), 16);
      const a =
        hex.length === 8
          ? Number.parseInt(hex.slice(6, 8), 16) / 255
          : 1;
      return { r, g, b, a };
    }
    return null;
  }

  const match = text.match(/^rgba?\((.+)\)$/i);
  if (!match) return null;
  const parts = match[1].split(",").map((part) => part.trim());
  if (parts.length < 3) return null;

  const toChannel = (raw: string) => {
    if (raw.endsWith("%")) {
      const pct = Number.parseFloat(raw.slice(0, -1));
      if (!Number.isFinite(pct)) return 0;
      return Math.round((Math.max(0, Math.min(100, pct)) / 100) * 255);
    }
    const num = Number.parseFloat(raw);
    if (!Number.isFinite(num)) return 0;
    return Math.round(Math.max(0, Math.min(255, num)));
  };

  const r = toChannel(parts[0]);
  const g = toChannel(parts[1]);
  const b = toChannel(parts[2]);
  const a =
    parts.length >= 4
      ? clamp01(Number.parseFloat(parts[3]))
      : 1;
  return { r, g, b, a };
}

function mixRgbaColors(a: RgbaColor, b: RgbaColor, ratio = 0.5): RgbaColor {
  const t = clamp01(ratio);
  return {
    r: Math.round(a.r * (1 - t) + b.r * t),
    g: Math.round(a.g * (1 - t) + b.g * t),
    b: Math.round(a.b * (1 - t) + b.b * t),
    a: a.a * (1 - t) + b.a * t,
  };
}

function rgbaToCss(value: RgbaColor): string {
  return `rgba(${value.r}, ${value.g}, ${value.b}, ${value.a.toFixed(3)})`;
}

function latRad(lat: number) {
  const sin = Math.sin((lat * Math.PI) / 180);
  const radX2 = Math.log((1 + sin) / (1 - sin)) / 2;
  return Math.max(Math.min(radX2, Math.PI), -Math.PI) / 2;
}

function zoomToFitBounds(args: {
  south: number;
  west: number;
  north: number;
  east: number;
  width: number;
  height: number;
}) {
  const { south, west, north, east, width, height } = args;
  const latFraction = Math.max((latRad(north) - latRad(south)) / Math.PI, 1e-9);
  const lngDiff = east - west;
  const lngFraction = Math.max(
    ((lngDiff < 0 ? lngDiff + 360 : lngDiff) / 360),
    1e-9,
  );

  const latZoom = Math.log2(height / MERCATOR_TILE_SIZE / latFraction);
  const lngZoom = Math.log2(width / MERCATOR_TILE_SIZE / lngFraction);
  return Math.min(latZoom, lngZoom);
}

function clusterLabelIconFor(args: { label: string; state: MarkerState }) {
  const safeLabel = escapeHtml(args.label);
  const scale =
    args.state === "focus" ? 1.05 : args.state === "hover" ? 1.02 : 1;
  const ring =
    args.state === "focus"
      ? "0 0 0 4px var(--oboon-focus-ring)"
      : "0 0 0 0 transparent";

  return `
    <div style="
      position:absolute;
      left:0; top:0;
      transform: translate(-50%, -50%) scale(${scale});
      padding: 8px 14px;
      border-radius: 999px;
      border: 2px solid var(--oboon-primary);
      background: color-mix(in srgb, var(--oboon-bg-default) 70%, transparent);
      color: var(--oboon-text-title);
      font-size: 13px;
      font-weight: 800;
      line-height: 1;
      white-space: nowrap;
      box-shadow:
        ${ring},
        0 4px 14px var(--oboon-map-shadow-strong);
      pointer-events:auto;
    ">
      ${safeLabel}
    </div>
  `;
}

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
    onMarkerAction?: (
      markerId: number,
      action: "copy-address" | "consult",
    ) => void;
    onHoverChange?: (id: number | null) => void;
    onVisibleIdsChange?: (ids: number[]) => void;
    onClearFocus?: () => void;
    focusBounds?: MapFocusBounds | null;
    focusPolygons?: MapFocusPolygonPath[];
    focusPolygonGroups?: MapFocusPolygonGroup[];
    focusMaskMode?: FocusMaskMode;
    onMapReady?: () => void;
    mode?: MapMode;
    regionClusterEnabled?: boolean;
    onSelectPosition?: (lat: number, lng: number) => void | Promise<void>;
    interactive?: boolean;
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
      onMarkerAction,
      onHoverChange = () => {},
      onVisibleIdsChange,
      onClearFocus,
      focusBounds = null,
      focusPolygons = [],
      focusPolygonGroups = [],
      focusMaskMode = "outside",
      onMapReady,
      mode = "base",
      regionClusterEnabled = true,
      onSelectPosition,
      interactive = true,
    },
    ref,
  ) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<NaverMapInstance | null>(null);

    // 최신 markers 스냅샷 (id -> marker data)
    const markerDataByIdRef = useRef<Map<number, MapMarker>>(new Map());
    const sourceMarkersRef = useRef<MapMarker[]>(markers);
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
    const focusBoundsRef = useRef<MapFocusBounds | null>(focusBounds);
    const focusPolygonsRef = useRef<MapFocusPolygonPath[]>(focusPolygons);
    const focusPolygonGroupsRef = useRef<MapFocusPolygonGroup[]>(
      focusPolygonGroups,
    );
    const focusMaskModeRef = useRef<FocusMaskMode>(focusMaskMode);
    const maskPolygonsRef = useRef<Array<{ setMap: (map: unknown) => void }>>(
      [],
    );
    const outlinePolygonsRef = useRef<Array<{ setMap: (map: unknown) => void }>>(
      [],
    );
    focusedIdRef.current = focusedId;
    hoveredIdRef.current = hoveredId;
    richMarkerIdsRef.current = richMarkerIds;
    showFocusedAsRichRef.current = showFocusedAsRich;
    focusBoundsRef.current = focusBounds;
    focusPolygonsRef.current = focusPolygons;
    focusPolygonGroupsRef.current = focusPolygonGroups;
    focusMaskModeRef.current = focusMaskMode;
    const applyMarkerStyleByIdRef = useRef<
      (naverObj: NaverGlobal, id: number) => void
    >(() => {});
    const applyFocusHoverDeltaStylesRef = useRef<
      (naverObj: NaverGlobal) => void
    >(() => {});
    const fitMapToMarkersRef = useRef<
      (naverObj: NaverGlobal, next: MapMarker[], force?: boolean) => void
    >(() => {});
    const refreshDisplayMarkersRef = useRef<(naverObj: NaverGlobal) => void>(
      () => {},
    );
    const applyRegionFocusOverlayRef = useRef<(naverObj: NaverGlobal) => void>(
      () => {},
    );

    function clearRegionFocusOverlay() {
      maskPolygonsRef.current.forEach((polygon) => polygon.setMap(null));
      maskPolygonsRef.current = [];
      outlinePolygonsRef.current.forEach((polygon) => polygon.setMap(null));
      outlinePolygonsRef.current = [];
    }

    function makeRectPath(
      naverObj: NaverGlobal,
      south: number,
      west: number,
      north: number,
      east: number,
    ) {
      return [
        new naverObj.maps.LatLng(south, west),
        new naverObj.maps.LatLng(north, west),
        new naverObj.maps.LatLng(north, east),
        new naverObj.maps.LatLng(south, east),
      ];
    }

    function toLatLngPath(
      naverObj: NaverGlobal,
      path: MapFocusPolygonPath,
      reverse = false,
    ) {
      const points = path.map(
        (point) => new naverObj.maps.LatLng(point.lat, point.lng),
      );
      return reverse ? [...points].reverse() : points;
    }

    function resolveRegionFocusOverlayColor(tone: MapFocusOverlayTone = "danger") {
      const fallbackByTone: Record<
        MapFocusOverlayTone,
        { fillColor: string; strokeColor: string }
      > = {
        danger: {
          fillColor: "rgba(239, 68, 68, 0.18)",
          strokeColor: "rgba(239, 68, 68, 0.35)",
        },
        warning: {
          fillColor: "rgba(245, 158, 11, 0.18)",
          strokeColor: "rgba(245, 158, 11, 0.35)",
        },
        mixed: {
          fillColor: "rgba(242, 113, 28, 0.18)",
          strokeColor: "rgba(242, 113, 28, 0.35)",
        },
        default: {
          fillColor: "rgba(255, 255, 255, 0.06)",
          strokeColor: "rgba(255, 255, 255, 0.2)",
        },
      };
      const fallback = fallbackByTone[tone];
      if (typeof window === "undefined") return fallback;
      const styles = window.getComputedStyle(window.document.documentElement);
      const tokenByTone: Record<
        MapFocusOverlayTone,
        { fill: string; fillAlt?: string; stroke: string }
      > = {
        danger: {
          fill: "--oboon-danger-bg-subtle",
          fillAlt: "--oboon-danger-bg",
          stroke: "--oboon-danger-border",
        },
        warning: {
          fill: "--oboon-warning-bg-subtle",
          fillAlt: "--oboon-warning-bg",
          stroke: "--oboon-warning-border",
        },
        mixed: {
          fill: "--oboon-danger-bg-subtle",
          fillAlt: "--oboon-danger-bg",
          stroke: "--oboon-danger-border",
        },
        default: {
          fill: "--oboon-bg-subtle",
          stroke: "--oboon-border-default",
        },
      };

      if (tone === "mixed") {
        const dangerFillRaw =
          styles.getPropertyValue("--oboon-danger-bg-subtle").trim() ||
          styles.getPropertyValue("--oboon-danger-bg").trim();
        const warningFillRaw =
          styles.getPropertyValue("--oboon-warning-bg-subtle").trim() ||
          styles.getPropertyValue("--oboon-warning-bg").trim();
        const dangerStrokeRaw =
          styles.getPropertyValue("--oboon-danger-border").trim();
        const warningStrokeRaw =
          styles.getPropertyValue("--oboon-warning-border").trim();

        const dangerFill = parseCssColorToRgba(dangerFillRaw);
        const warningFill = parseCssColorToRgba(warningFillRaw);
        const dangerStroke = parseCssColorToRgba(dangerStrokeRaw);
        const warningStroke = parseCssColorToRgba(warningStrokeRaw);

        if (dangerFill && warningFill && dangerStroke && warningStroke) {
          return {
            fillColor: rgbaToCss(mixRgbaColors(dangerFill, warningFill, 0.5)),
            strokeColor: rgbaToCss(
              mixRgbaColors(dangerStroke, warningStroke, 0.5),
            ),
          };
        }
      }

      const tokens = tokenByTone[tone];
      const fill =
        styles.getPropertyValue(tokens.fill).trim() ||
        (tokens.fillAlt ? styles.getPropertyValue(tokens.fillAlt).trim() : "") ||
        fallback.fillColor;
      const stroke =
        styles.getPropertyValue(tokens.stroke).trim() || fallback.strokeColor;
      return { fillColor: fill, strokeColor: stroke };
    }

    function applyRegionFocusOverlay(naverObj: NaverGlobal) {
      const map = mapRef.current;
      if (!map) return;

      clearRegionFocusOverlay();
      const b = focusBoundsRef.current;
      if (!b) return;

      const KOREA_BOUNDS = {
        south: 33.0,
        west: 124.5,
        north: 38.9,
        east: 131.9,
      } as const;

      const south = Math.max(b.south, KOREA_BOUNDS.south);
      const west = Math.max(b.west, KOREA_BOUNDS.west);
      const north = Math.min(b.north, KOREA_BOUNDS.north);
      const east = Math.min(b.east, KOREA_BOUNDS.east);
      if (!(south < north && west < east)) return;
      const { fillColor, strokeColor } = resolveRegionFocusOverlayColor();

      // 마스크 바깥 링은 "현재 화면"을 덮어야 잘림이 없다.
      const viewBounds = map.getBounds() as unknown as {
        getSW: () => { lat: () => number; lng: () => number };
        getNE: () => { lat: () => number; lng: () => number };
      };
      const viewSouth = viewBounds.getSW().lat();
      const viewWest = viewBounds.getSW().lng();
      const viewNorth = viewBounds.getNE().lat();
      const viewEast = viewBounds.getNE().lng();
      const outerSouth = Math.min(KOREA_BOUNDS.south, viewSouth) - 0.05;
      const outerWest = Math.min(KOREA_BOUNDS.west, viewWest) - 0.05;
      const outerNorth = Math.max(KOREA_BOUNDS.north, viewNorth) + 0.05;
      const outerEast = Math.max(KOREA_BOUNDS.east, viewEast) + 0.05;

      const rects: Array<{
        south: number;
        west: number;
        north: number;
        east: number;
      }> = [
        // North
        {
          south: north,
          west: KOREA_BOUNDS.west,
          north: KOREA_BOUNDS.north,
          east: KOREA_BOUNDS.east,
        },
        // South
        {
          south: KOREA_BOUNDS.south,
          west: KOREA_BOUNDS.west,
          north: south,
          east: KOREA_BOUNDS.east,
        },
        // West
        { south, west: KOREA_BOUNDS.west, north, east: west },
        // East
        { south, west: east, north, east: KOREA_BOUNDS.east },
      ].filter((r) => r.south < r.north && r.west < r.east);

      const mapsAny = naverObj.maps as unknown as {
        Polygon: new (options: Record<string, unknown>) => {
          setMap: (map: unknown) => void;
        };
      };

      const groupedPaths = focusPolygonGroupsRef.current.flatMap((group) =>
        group.paths.filter((path) => path.length >= 3),
      );
      const effectiveFocusPolygons =
        groupedPaths.length > 0 ? groupedPaths : focusPolygonsRef.current;
      const hasFocusPolygon = effectiveFocusPolygons.length > 0;
      if (hasFocusPolygon) {
        if (focusMaskModeRef.current === "inside") {
          if (focusPolygonGroupsRef.current.length > 0) {
            const masks: Array<{ setMap: (map: unknown) => void }> = [];
            const outlines: Array<{ setMap: (map: unknown) => void }> = [];
            for (const group of focusPolygonGroupsRef.current) {
              const paths = group.paths.filter((path) => path.length >= 3);
              if (paths.length === 0) continue;
              const toneColors = resolveRegionFocusOverlayColor(
                group.tone ?? "danger",
              );
              for (const path of paths) {
                masks.push(
                  new mapsAny.Polygon({
                    map,
                    paths: toLatLngPath(naverObj, path),
                    fillColor: toneColors.fillColor,
                    fillOpacity: 1,
                    strokeOpacity: 0,
                    clickable: false,
                    zIndex: 10,
                  }),
                );
                outlines.push(
                  new mapsAny.Polygon({
                    map,
                    paths: toLatLngPath(naverObj, path),
                    fillOpacity: 0,
                    strokeColor: toneColors.strokeColor,
                    strokeOpacity: 0.95,
                    strokeWeight: 2,
                    clickable: false,
                    zIndex: 11,
                  }),
                );
              }
            }
            maskPolygonsRef.current = masks;
            outlinePolygonsRef.current = outlines;
            return;
          }

          maskPolygonsRef.current = effectiveFocusPolygons
            .map((path) => {
              return new mapsAny.Polygon({
                map,
                paths: toLatLngPath(naverObj, path),
                fillColor,
                fillOpacity: 1,
                strokeOpacity: 0,
                clickable: false,
                zIndex: 10,
              });
            });

          outlinePolygonsRef.current = effectiveFocusPolygons
            .map((path) => {
              return new mapsAny.Polygon({
                map,
                paths: toLatLngPath(naverObj, path),
                fillOpacity: 0,
                strokeColor,
                strokeOpacity: 0.95,
                strokeWeight: 2,
                clickable: false,
                zIndex: 11,
              });
            });
          return;
        }

        const outerPath = makeRectPath(
          naverObj,
          outerSouth,
          outerWest,
          outerNorth,
          outerEast,
        );
        const holePaths = effectiveFocusPolygons.map((path) =>
          toLatLngPath(naverObj, path, true),
        );

        if (holePaths.length > 0) {
          maskPolygonsRef.current = [
            new mapsAny.Polygon({
              map,
              paths: [outerPath, ...holePaths],
              fillColor,
              fillOpacity: 1,
              strokeOpacity: 0,
              clickable: false,
              zIndex: 10,
            }),
          ];
        }

        outlinePolygonsRef.current = effectiveFocusPolygons.map((path) => {
            return new mapsAny.Polygon({
              map,
              paths: toLatLngPath(naverObj, path),
              fillOpacity: 0,
              strokeColor,
              strokeOpacity: 0.95,
              strokeWeight: 2,
              clickable: false,
              zIndex: 11,
            });
          });
        return;
      }

      if (focusMaskModeRef.current === "inside") {
        maskPolygonsRef.current = [
          new mapsAny.Polygon({
            map,
            paths: makeRectPath(naverObj, south, west, north, east),
            fillColor,
            fillOpacity: 1,
            strokeOpacity: 0,
            clickable: false,
            zIndex: 10,
          }),
        ];
        outlinePolygonsRef.current = [
          new mapsAny.Polygon({
            map,
            paths: makeRectPath(naverObj, south, west, north, east),
            fillOpacity: 0,
            strokeColor,
            strokeOpacity: 0.9,
            strokeWeight: 2,
            clickable: false,
            zIndex: 11,
          }),
        ];
        return;
      }

      maskPolygonsRef.current = rects.map((r) => {
        return new mapsAny.Polygon({
          map,
          paths: makeRectPath(naverObj, r.south, r.west, r.north, r.east),
          fillColor,
          fillOpacity: 1,
          strokeOpacity: 0,
          clickable: false,
          zIndex: 10,
        });
      });

      outlinePolygonsRef.current = [
        new mapsAny.Polygon({
          map,
          paths: makeRectPath(naverObj, south, west, north, east),
          fillOpacity: 0,
          strokeColor,
          strokeOpacity: 0.9,
          strokeWeight: 2,
          clickable: false,
          zIndex: 11,
        }),
      ];
    }
    applyRegionFocusOverlayRef.current = applyRegionFocusOverlay;

    // 콜백 Ref
    const callbacksRef = useRef({
      onMarkerSelect,
      onMarkerAction,
      onHoverChange,
      onVisibleIdsChange,
      onClearFocus,
      onMapReady,
      onSelectPosition,
      mode,
    });

    useEffect(() => {
      callbacksRef.current = {
        onMarkerSelect,
        onMarkerAction,
        onHoverChange,
        onVisibleIdsChange,
        onClearFocus,
        onMapReady,
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

    function normalizeRegionLabel(raw: string | null | undefined) {
      const value = (raw ?? "").trim();
      if (!value) return "기타";
      if (value.includes("서울")) return "서울";
      if (value.includes("경기")) return "경기";
      if (value.includes("인천")) return "인천";
      if (value.includes("부산")) return "부산";
      if (value.includes("대구")) return "대구";
      if (value.includes("대전")) return "대전";
      if (value.includes("광주")) return "광주";
      if (value.includes("울산")) return "울산";
      if (value.includes("세종")) return "세종";
      if (value.includes("강원")) return "강원";
      if (value.includes("충북")) return "충북";
      if (value.includes("충남")) return "충남";
      if (value.includes("전북")) return "전북";
      if (value.includes("전남")) return "전남";
      if (value.includes("경북")) return "경북";
      if (value.includes("경남")) return "경남";
      if (value.includes("제주")) return "제주";
      return (
        value
          .replace(
            /특별자치시|특별자치도|특별시|광역시|자치시|자치도|도|시/g,
            "",
          )
          .trim() || value
      );
    }

    function buildRegionClusterMarkers(input: MapMarker[]): MapMarker[] {
      const groups = new Map<
        string,
        { region: string; count: number; latSum: number; lngSum: number }
      >();

      input.forEach((m) => {
        const region = normalizeRegionLabel(m.clusterRegion ?? m.topLabel);
        const acc = groups.get(region);
        if (!acc) {
          groups.set(region, {
            region,
            count: 1,
            latSum: m.lat,
            lngSum: m.lng,
          });
          return;
        }
        acc.count += 1;
        acc.latSum += m.lat;
        acc.lngSum += m.lng;
      });

      return Array.from(groups.values()).map((g, idx) => ({
        id: -100000 - idx,
        label: `${g.region} ${g.count}건`,
        lat: g.latSum / g.count,
        lng: g.lngSum / g.count,
        type: "agent",
        isCluster: true,
        clusterRegion: g.region,
        topLabel: g.region,
        mainLabel: `${g.count}건`,
      }));
    }

    function shouldUseRegionCluster(map: naver.maps.Map) {
      if (mode === "select") return false;
      if (!regionClusterEnabled) return false;
      return map.getZoom() <= REGION_CLUSTER_ZOOM_THRESHOLD;
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

      const icon = m.isCluster
        ? clusterLabelIconFor({
            label: m.label || `${m.clusterRegion ?? "권역"} 집계`,
            state,
          })
        : iconFor({
            type: m.type,
            state,
            viewType: isRich ? "rich" : "compact",
            label: m.label,
            topLabel: m.topLabel,
            mainLabel: m.mainLabel,
            imageUrl: m.imageUrl,
            address: m.address,
            ctaLabel: m.ctaLabel,
            canConsult: m.canConsult,
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

      sourceMarkersRef.current.forEach((m) => {
        const latLng = new naver.maps.LatLng(m.lat, m.lng);
        if (bounds.hasLatLng(latLng)) visibleIds.push(m.id);
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

    function fitMapToMarkers(
      naverObj: NaverGlobal,
      next: MapMarker[],
      force = false,
    ) {
      const map = mapRef.current;
      if (!map || !fitToMarkers || next.length < 1) return;

      if (next.length === 1) {
        const single = next[0];
        map.panTo(new naverObj.maps.LatLng(single.lat, single.lng));
        if (map.getZoom() < 14) {
          map.setZoom(14, true);
        }
        lastFittedMarkersKeyRef.current = `${single.id}:${single.lat.toFixed(6)},${single.lng.toFixed(6)}`;
        return;
      }

      const markersKey = next
        .map((m) => `${m.id}:${m.lat.toFixed(6)},${m.lng.toFixed(6)}`)
        .join("|");
      if (!force && markersKey === lastFittedMarkersKeyRef.current) return;

      const lats = next.map((m) => m.lat);
      const lngs = next.map((m) => m.lng);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;

      // 마커가 화면 가장자리에 걸리지 않도록 최소한의 여유만 적용
      const latSpan = Math.max(maxLat - minLat, 0.0002) * 1.2;
      const lngSpan = Math.max(maxLng - minLng, 0.0002) * 1.2;
      const span = Math.max(latSpan, lngSpan);

      const targetZoom =
        span > 1
          ? 9
          : span > 0.5
            ? 10
            : span > 0.2
              ? 11
              : span > 0.1
                ? 12
                : span > 0.05
                  ? 13
                  : span > 0.02
                    ? 14
                    : span > 0.01
                      ? 15
                      : 16;

      map.panTo(new naverObj.maps.LatLng(centerLat, centerLng));
      map.setZoom(targetZoom, true);

      // 일부 환경에서 setCenter/setZoom 이후 실제 bounds 계산이 늦게 반영되어
      // 마커 일부가 화면 밖으로 남는 경우가 있어, 후검증으로 보정한다.
      const ensureVisible = (attempt: number) => {
        const currentMap = mapRef.current;
        if (!currentMap) return;
        if (attempt >= 2) return;

        const bounds = currentMap.getBounds();
        const allVisible = next.every((m) =>
          bounds.hasLatLng(new naverObj.maps.LatLng(m.lat, m.lng)),
        );
        if (allVisible) return;

        const nextZoom = Math.max(currentMap.getZoom() - 1, 13);
        if (nextZoom === currentMap.getZoom()) return;
        currentMap.setZoom(nextZoom, true);
        window.setTimeout(() => ensureVisible(attempt + 1), 120);
      };
      window.setTimeout(() => ensureVisible(0), 180);
      lastFittedMarkersKeyRef.current = markersKey;
    }
    fitMapToMarkersRef.current = fitMapToMarkers;

    function upsertMarkers(
      next: MapMarker[],
      map: naver.maps.Map,
      naverObj: NaverGlobal,
    ) {
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
            if (m.isCluster) {
              map.setZoom(map.getZoom() + 2, true);
              map.panTo(new naverObj.maps.LatLng(m.lat, m.lng));
              return;
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

    function refreshDisplayMarkers(naverObj: NaverGlobal) {
      const map = mapRef.current;
      if (!map) return;

      const base = sourceMarkersRef.current;
      const next = shouldUseRegionCluster(map)
        ? buildRegionClusterMarkers(base)
        : base;
      upsertMarkers(next, map, naverObj);
    }
    refreshDisplayMarkersRef.current = refreshDisplayMarkers;

    useImperativeHandle(ref, () => ({
      zoomIn: () => {
        const m = mapRef.current;
        if (m) m.setZoom(m.getZoom() + 1, true);
      },
      zoomOut: () => {
        const m = mapRef.current;
        if (m) m.setZoom(m.getZoom() - 1, true);
      },
      setView: (lat: number, lng: number, zoom?: number) => {
        const m = mapRef.current;
        const naverObj = window.naver;
        if (!m || !naverObj?.maps) return;
        (
          m as unknown as {
            setCenter: (latLng: naver.maps.LatLng) => void;
          }
        ).setCenter(new naverObj.maps.LatLng(lat, lng));
        if (typeof zoom === "number") {
          m.setZoom(zoom, true);
        }
      },
      fitToBounds: (bounds: MapFocusBounds) => {
        const m = mapRef.current;
        const naverObj = window.naver;
        if (!m || !naverObj?.maps) return;

        const mapSize = m.getSize();
        const paddingX = 20;
        const paddingY = 12;
        const fitWidth = Math.max((mapSize?.width ?? 0) - paddingX * 2, 120);
        const fitHeight = Math.max((mapSize?.height ?? 0) - paddingY * 2, 120);

        const centerLat = (bounds.south + bounds.north) / 2;
        const centerLng = (bounds.west + bounds.east) / 2;
        const targetZoom = Math.max(
          6,
          Math.min(
            16,
            Math.floor(
              zoomToFitBounds({
                south: bounds.south,
                west: bounds.west,
                north: bounds.north,
                east: bounds.east,
                width: fitWidth,
                height: fitHeight,
              }) + 0.45,
            ),
          ),
        );

        (
          m as unknown as {
            setCenter: (latLng: naver.maps.LatLng) => void;
          }
        ).setCenter(new naverObj.maps.LatLng(centerLat, centerLng));
        m.setZoom(targetZoom, true);
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
        refreshDisplayMarkersRef.current(naverObj);
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
        callbacksRef.current.onMapReady?.();

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
              fitMapToMarkers(naverObj, sourceMarkersRef.current, true);
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
            fitMapToMarkers(naverObj, sourceMarkersRef.current, true);
          }, 250);
        };
        triggerInitialResize();

        sourceMarkersRef.current = markers;
        if (markers.length > 0) {
          refreshDisplayMarkers(naverObj);
          fitMapToMarkers(naverObj, markers);
        }
        applyRegionFocusOverlay(naverObj);

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

        const idleListener = naverObj.maps.Event.addListener(
          map,
          "idle",
          () => {
            isInteractingRef.current = false;
            refreshDisplayMarkersRef.current(naverObj);
            applyRegionFocusOverlayRef.current(naverObj);
            scheduleVisibleSync();
            // idle에서 델타만 반영 (전체 loop 금지)
            applyFocusHoverDeltaStyles(naverObj);
          },
        );

        const zoomListener = naverObj.maps.Event.addListener(
          map,
          "zoom_changed",
          () => {
            isInteractingRef.current = true;
            refreshDisplayMarkersRef.current(naverObj);
            applyRegionFocusOverlayRef.current(naverObj);
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
        clearRegionFocusOverlay();
        const naverObj = window.naver;
        const listeners = [...mountedListeners];
        if (naverObj?.maps) {
          listeners.forEach((l) => naverObj.maps.Event.removeListener(l));
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      const actionDedupRef = {
        lastKey: "",
        lastAt: 0,
      };

      const resolveActionElement = (event: Event) => {
        const path = typeof event.composedPath === "function" ? event.composedPath() : [];
        for (const node of path) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.dataset.mapAction) return node;
        }
        const target = event.target as HTMLElement | null;
        return target?.closest("[data-map-action]") as HTMLElement | null;
      };

      const onActionCapture = (event: Event) => {
        const actionEl = resolveActionElement(event);
        if (!actionEl) return;

        const action = actionEl.dataset.mapAction;
        if (action !== "copy-address" && action !== "consult") return;
        if (action === "consult" && actionEl.dataset.mapDisabled === "1") {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        const markerId = focusedIdRef.current;
        if (!markerId) return;

        const key = `${markerId}:${action}`;
        const now = Date.now();
        if (actionDedupRef.lastKey === key && now - actionDedupRef.lastAt < 450) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        actionDedupRef.lastKey = key;
        actionDedupRef.lastAt = now;

        event.preventDefault();
        event.stopPropagation();
        markerClickTsRef.current = Date.now();
        callbacksRef.current.onMarkerAction?.(markerId, action);
      };

      // SDK 내부에서 bubble phase를 차단하는 경우가 있어 capture에서 먼저 처리
      document.addEventListener("pointerdown", onActionCapture, true);
      document.addEventListener("click", onActionCapture, true);
      return () => {
        document.removeEventListener("pointerdown", onActionCapture, true);
        document.removeEventListener("click", onActionCapture, true);
      };
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

        fitMapToMarkersRef.current(naverObj, sourceMarkersRef.current, true);
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
      sourceMarkersRef.current = markers;

      if (naverObj?.maps && map) {
        refreshDisplayMarkersRef.current(naverObj);
        fitMapToMarkers(naverObj, markers);
      } else {
        // 지도 준비 전 스냅샷만 갱신
        markerDataByIdRef.current = new Map(
          sourceMarkersRef.current.map((m) => [m.id, m]),
        );
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [markers]);

    useEffect(() => {
      const naverObj = window.naver;
      if (!naverObj?.maps || !mapRef.current) return;
      applyRegionFocusOverlayRef.current(naverObj);
    }, [focusBounds, focusPolygons, focusPolygonGroups]);

    useEffect(() => {
      const naverObj = window.naver;
      if (!naverObj?.maps || !mapRef.current) return;
      refreshDisplayMarkersRef.current(naverObj);
    }, [regionClusterEnabled]);

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
      if (fitToMarkers && markers.length > 1) return;

      const target =
        sourceMarkersRef.current.find((m) => m.id === focusedId) ??
        markerDataByIdRef.current.get(focusedId);
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
    }, [focusedId, mode, fitToMarkers, markers.length]);

    return (
      <div className="relative w-full h-full">
        <div ref={mapContainerRef} className="w-full h-full" />
        {!interactive ? (
          <div className="absolute inset-0 z-10" aria-hidden="true" />
        ) : null}
      </div>
    );
  },
);

NaverMap.displayName = "NaverMap";

export default NaverMap;
