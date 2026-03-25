"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import Button from "@/components/ui/Button";
import NaverMap, {
  type MapMarker,
  type NaverMapHandle,
} from "@/features/map/components/NaverMap";
import MapLocationStatusPill from "@/features/map/components/MapLocationStatusPill";
import { useCurrentLocationCenter } from "@/features/map/hooks/useCurrentLocationCenter";
import { grade5DetailLabel } from "@/features/condition-validation/lib/grade5Labels";
import type { RecommendationItem } from "@/features/recommendations/hooks/useRecommendations";
import { formatPercent } from "@/lib/format/currency";
import { Copy } from "@/shared/copy";

type MiniMapProps = {
  items: RecommendationItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
};

type RecoPoisResponse = {
  subway?: Array<{
    distance_m?: number | string | null;
    walk_min?: number | string | null;
  }>;
  high_speed_rail?: Array<{
    distance_m?: number | string | null;
    walk_min?: number | string | null;
  }>;
  school_tabs?: Partial<
    Record<
      "high",
      Array<{
        distance_m?: number | string | null;
      }>
    >
  >;
};

type HeroInfraState = {
  badges: Array<{ label: string; tone: "green" }>;
};

type ClusterStage = "province" | "city" | "district" | "marker";

const ALL_KOREA_VIEW_BOUNDS = {
  south: 33.0,
  west: 125.8,
  north: 38.75,
  east: 130.95,
};
const PROVINCE_CLUSTER_ZOOM = 9;
const CITY_CLUSTER_ZOOM = PROVINCE_CLUSTER_ZOOM + 1;
const DISTRICT_CLUSTER_ZOOM = CITY_CLUSTER_ZOOM + 1;
const GPS_FOCUS_ZOOM = 12;

type RegionHierarchy = {
  provinceLabel: string;
  cityLabel: string | null;
  districtLabel: string | null;
  displayLabel: string;
};

type RegionClusterDescriptor = {
  key: string | null;
  label: string;
};

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toneFromGrade(
  grade: RecommendationItem["evalResult"]["finalGrade"],
) {
  if (grade === "GREEN") return "green" as const;
  if (grade === "LIME") return "lime" as const;
  if (grade === "YELLOW") return "yellow" as const;
  if (grade === "ORANGE") return "orange" as const;
  return "red" as const;
}

function normalizeProvinceLabel(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) return "기타";
  if (raw.includes("서울")) return "서울";
  if (raw.includes("경기")) return "경기";
  if (raw.includes("인천")) return "인천";
  if (raw.includes("부산")) return "부산";
  if (raw.includes("대구")) return "대구";
  if (raw.includes("대전")) return "대전";
  if (raw.includes("광주")) return "광주";
  if (raw.includes("울산")) return "울산";
  if (raw.includes("세종")) return "세종";
  if (raw.includes("강원")) return "강원";
  if (raw.includes("충청북")) return "충북";
  if (raw.includes("충청남")) return "충남";
  if (raw.includes("충북")) return "충북";
  if (raw.includes("충남")) return "충남";
  if (raw.includes("전라북")) return "전북";
  if (raw.includes("전라남")) return "전남";
  if (raw.includes("전북")) return "전북";
  if (raw.includes("전남")) return "전남";
  if (raw.includes("경상북")) return "경북";
  if (raw.includes("경상남")) return "경남";
  if (raw.includes("경북")) return "경북";
  if (raw.includes("경남")) return "경남";
  if (raw.includes("제주")) return "제주";
  return (
    raw
      .replace(
        /특별자치시|특별자치도|특별시|광역시|자치시|자치도|도/g,
        "",
      )
      .trim() || raw
  );
}

function splitRegionHierarchy(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) {
    return { cityLabel: null, districtLabel: null };
  }

  const parts = raw.split(/\s+/).filter(Boolean);
  let cityLabel: string | null = null;
  let districtLabel: string | null = null;

  for (const part of parts) {
    if (cityLabel === null && /[시군]$/.test(part)) {
      cityLabel = part;
    }
    if (/[구군]$/.test(part)) {
      districtLabel = part;
    }
  }

  if (parts.length === 1) {
    const only = parts[0];
    if (/[시군]$/.test(only)) {
      cityLabel = only;
    }
    if (/[구군]$/.test(only)) {
      districtLabel = only;
    }
  }

  return { cityLabel, districtLabel };
}

function buildRegionHierarchy(item: RecommendationItem["property"]): RegionHierarchy {
  const provinceLabel = normalizeProvinceLabel(item.regionSido ?? item.regionLabel);
  const { cityLabel, districtLabel } = splitRegionHierarchy(
    item.regionSigungu ?? item.regionLabel,
  );
  const displayLabel = districtLabel ?? cityLabel ?? provinceLabel;

  return {
    provinceLabel,
    cityLabel,
    districtLabel,
    displayLabel,
  };
}

function getClusterDescriptor(
  hierarchy: RegionHierarchy,
  stage: ClusterStage,
): RegionClusterDescriptor {
  const { provinceLabel, cityLabel, districtLabel, displayLabel } = hierarchy;

  if (stage === "province") {
    return {
      key: `province:${provinceLabel}`,
      label: provinceLabel,
    };
  }

  if (stage === "city") {
    if (cityLabel) {
      return {
        key: `province:${provinceLabel}|city:${cityLabel}`,
        label: cityLabel,
      };
    }

    if (districtLabel) {
      return {
        key: `province:${provinceLabel}|district:${districtLabel}`,
        label: districtLabel,
      };
    }

    return {
      key: `province:${provinceLabel}`,
      label: provinceLabel,
    };
  }

  if (stage === "district") {
    if (cityLabel && districtLabel) {
      return {
        key: `province:${provinceLabel}|city:${cityLabel}|district:${districtLabel}`,
        label: districtLabel,
      };
    }

    if (districtLabel) {
      return {
        key: `province:${provinceLabel}|district:${districtLabel}`,
        label: districtLabel,
      };
    }

    if (cityLabel) {
      return {
        key: `province:${provinceLabel}|city:${cityLabel}`,
        label: cityLabel,
      };
    }

    return {
      key: `province:${provinceLabel}`,
      label: provinceLabel,
    };
  }

  return {
    key: null,
    label: displayLabel,
  };
}

function buildHeroHighlights(evalResult: RecommendationItem["evalResult"]) {
  const incomeValue =
    evalResult.metrics.monthlyBurdenPercent !== null
      ? formatPercent(evalResult.metrics.monthlyBurdenPercent, 1)
      : grade5DetailLabel(evalResult.categories.income.grade);

  return [
    {
      label: "현금",
      value: grade5DetailLabel(evalResult.categories.cash.grade),
      tone: toneFromGrade(evalResult.categories.cash.grade),
    },
    {
      label: "부담률",
      value: incomeValue,
      tone: toneFromGrade(evalResult.categories.income.grade),
    },
    {
      label: "신용",
      value: grade5DetailLabel(evalResult.categories.ltvDsr.grade),
      tone: toneFromGrade(evalResult.categories.ltvDsr.grade),
    },
  ];
}

function buildHeroInfraBadges(payload: RecoPoisResponse): HeroInfraState {
  const highSchoolDistances =
    payload.school_tabs?.high
      ?.map((row) => toFiniteNumber(row.distance_m))
      .filter((value): value is number => value !== null) ?? [];
  const nearestHighSchoolDistance =
    highSchoolDistances.length > 0 ? Math.min(...highSchoolDistances) : null;

  const transitWalkMinutes = [
    ...(payload.subway ?? []),
    ...(payload.high_speed_rail ?? []),
  ]
    .map((row) => {
      const walkMin = toFiniteNumber(row.walk_min);
      if (walkMin !== null) return walkMin;

      const distance = toFiniteNumber(row.distance_m);
      if (distance === null) return null;
      return Math.ceil(distance / 80);
    })
    .filter((value): value is number => value !== null);

  const nearestTransitWalkMinutes =
    transitWalkMinutes.length > 0 ? Math.min(...transitWalkMinutes) : null;

  const badges: HeroInfraState["badges"] = [];
  if (nearestHighSchoolDistance !== null && nearestHighSchoolDistance <= 1000) {
    badges.push({ label: "학군 우수", tone: "green" });
  }
  if (nearestTransitWalkMinutes !== null && nearestTransitWalkMinutes <= 7) {
    badges.push({ label: "교통 우수", tone: "green" });
  }

  return { badges };
}

export default function MiniMap(props: MiniMapProps) {
  const { items, selectedId, onSelect } = props;
  const mapApiRef = useRef<NaverMapHandle | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const heroInfraCacheRef = useRef<Record<number, HeroInfraState>>({});
  const [heroInfraById, setHeroInfraById] = useState<Record<number, HeroInfraState>>({});
  const [mapZoom, setMapZoom] = useState<number>(PROVINCE_CLUSTER_ZOOM);
  const { center: initialCenter, status: initialLocationStatus } =
    useCurrentLocationCenter();
  const lastViewportKeyRef = useRef<string>("");
  const activeSelectedId =
    selectedId !== null && selectedId > 0 ? selectedId : null;
  const clusterStage: ClusterStage = useMemo(() => {
    if (mapZoom <= PROVINCE_CLUSTER_ZOOM) return "province";
    if (mapZoom <= CITY_CLUSTER_ZOOM) return "city";
    if (mapZoom <= DISTRICT_CLUSTER_ZOOM) return "district";
    return "marker";
  }, [mapZoom]);

  const visibleItems = useMemo(() => items, [items]);

  useEffect(() => {
    if (activeSelectedId === null) return;
    const selectedIdKey: number = activeSelectedId;
    if (heroInfraCacheRef.current[selectedIdKey]) return;

    const controller = new AbortController();
    let active = true;

    async function loadHeroInfra() {
      try {
        const response = await fetch(`/api/reco-pois/${selectedIdKey}`, {
          signal: controller.signal,
        });

        if (!response.ok) return;

        const payload = (await response
          .json()
          .catch(() => null)) as RecoPoisResponse | null;
        if (!active || controller.signal.aborted || !payload) return;

        const next = buildHeroInfraBadges(payload);
        heroInfraCacheRef.current[selectedIdKey] = next;
        setHeroInfraById((prev) =>
          prev[selectedIdKey]
            ? prev
            : {
                ...prev,
                [selectedIdKey]: next,
              },
        );
      } catch {
        if (!controller.signal.aborted) {
          setHeroInfraById((prev) =>
            prev[selectedIdKey]
              ? prev
              : {
                  ...prev,
                  [selectedIdKey]: { badges: [] },
                },
          );
        }
      }
    }

    void loadHeroInfra();

    return () => {
      active = false;
      controller.abort();
    };
  }, [activeSelectedId]);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapApiRef.current;
    if (!map) return;
    let retryTimer: number | null = null;

    if (initialLocationStatus === "granted" && initialCenter) {
      const locationKey = `${initialCenter.lat.toFixed(6)},${initialCenter.lng.toFixed(6)}`;
      const viewportKey = `location:${locationKey}`;
      if (lastViewportKeyRef.current !== viewportKey) {
        lastViewportKeyRef.current = viewportKey;
        map.setView(initialCenter.lat, initialCenter.lng, GPS_FOCUS_ZOOM);
        retryTimer = window.setTimeout(() => {
          mapApiRef.current?.setView(
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

    const viewportKey = "nationwide";
    if (lastViewportKeyRef.current !== viewportKey) {
      lastViewportKeyRef.current = viewportKey;
      map.fitToBounds(ALL_KOREA_VIEW_BOUNDS);
    }
    return () => {
      if (retryTimer !== null) window.clearTimeout(retryTimer);
    };
  }, [
    activeSelectedId,
    initialCenter,
    initialLocationStatus,
    mapReady,
  ]);

  const markers = useMemo<MapMarker[]>(
    () =>
      visibleItems
        .filter(
          (item) =>
            typeof item.property.lat === "number" &&
            Number.isFinite(item.property.lat) &&
            typeof item.property.lng === "number" &&
            Number.isFinite(item.property.lng),
        )
        .map((item) => {
          const hierarchy = buildRegionHierarchy(item.property);
          const descriptor = getClusterDescriptor(hierarchy, clusterStage);

          return {
            id: item.property.id,
            type:
              item.evalResult.finalGrade === "GREEN"
                ? ("grade-green" as const)
                : item.evalResult.finalGrade === "LIME"
                  ? ("grade-lime" as const)
                  : item.evalResult.finalGrade === "YELLOW"
                    ? ("grade-yellow" as const)
                    : item.evalResult.finalGrade === "ORANGE"
                      ? ("grade-orange" as const)
                      : ("grade-red" as const),
            label: item.property.name,
            lat: item.property.lat as number,
            lng: item.property.lng as number,
            topLabel: hierarchy.displayLabel,
            propertyType: item.property.propertyType,
            mainLabel: item.property.priceLabel,
            address: item.property.addressFull,
            imageUrl: item.property.imageUrl,
            ctaLabel: item.property.statusLabel,
            clusterRegion: clusterStage === "marker" ? null : descriptor.label,
            clusterGroupKey: clusterStage === "marker" ? null : descriptor.key,
            clusterGroupLabel: clusterStage === "marker" ? null : descriptor.label,
            heroMeta: {
              highlights: buildHeroHighlights(item.evalResult),
              badges: heroInfraById[item.property.id]?.badges ?? [],
              finalBadgeLabel:
                item.evalResult.gradeLabel ?? grade5DetailLabel(item.evalResult.finalGrade),
              finalBadgeTone: toneFromGrade(item.evalResult.finalGrade),
              scoreLabel: "매칭률",
              scoreValue: item.evalResult.totalScore,
            },
          };
        }),
    [clusterStage, heroInfraById, visibleItems],
  );

  function handleClusterRegionSelect() {
    onSelect(0);
  }

  function handleClearFocus() {
    if (activeSelectedId !== null) {
      onSelect(0);
    }
  }

  return (
    <div className="relative h-full overflow-hidden rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)">
      <MapLocationStatusPill status={initialLocationStatus} />
      {markers.length > 0 ? (
        <>
          <NaverMap
            ref={mapApiRef}
            markers={markers}
            initialCenter={initialCenter}
            initialLocationStatus={initialLocationStatus}
            hoveredId={activeSelectedId}
            focusedId={activeSelectedId}
            initialZoom={PROVINCE_CLUSTER_ZOOM}
            interactive
            regionClusterEnabled
            regionClusterZoomThreshold={16}
            clusterZoomDelta={1}
            showFocusedAsRich
            focusedMarkerViewType="hero"
            onMapReady={() => setMapReady(true)}
            onMarkerSelect={onSelect}
            onClusterRegionSelect={handleClusterRegionSelect}
            onClearFocus={handleClearFocus}
            onZoomChange={setMapZoom}
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
