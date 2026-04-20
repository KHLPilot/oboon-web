import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

import { GYEONGGI_SUB_REGION_CONFIGS } from "@/features/offerings/domain/offering.constants";

const GYEONGGI_REGION_NAME_CANDIDATES = Object.fromEntries(
  GYEONGGI_SUB_REGION_CONFIGS.map((item) => [item.boundaryKey, item.boundaryNames]),
) as Record<string, string[]>;

const REGION_NAME_CANDIDATES: Record<string, string[]> = {
  seoul: ["서울특별시"],
  seoul_gangnam: ["서울특별시 강남구"],
  seoul_gangdong: ["서울특별시 강동구"],
  seoul_gangbuk: ["서울특별시 강북구"],
  seoul_gangseo: ["서울특별시 강서구"],
  seoul_gwanak: ["서울특별시 관악구"],
  seoul_gwangjin: ["서울특별시 광진구"],
  seoul_guro: ["서울특별시 구로구"],
  seoul_geumcheon: ["서울특별시 금천구"],
  seoul_nowon: ["서울특별시 노원구"],
  seoul_dobong: ["서울특별시 도봉구"],
  seoul_dongdaemun: ["서울특별시 동대문구"],
  seoul_dongjak: ["서울특별시 동작구"],
  seoul_mapo: ["서울특별시 마포구"],
  seoul_seodaemun: ["서울특별시 서대문구"],
  seoul_seocho: ["서울특별시 서초구"],
  seoul_seongdong: ["서울특별시 성동구"],
  seoul_seongbuk: ["서울특별시 성북구"],
  seoul_songpa: ["서울특별시 송파구"],
  seoul_yangcheon: ["서울특별시 양천구"],
  seoul_yeongdeungpo: ["서울특별시 영등포구"],
  seoul_yongsan: ["서울특별시 용산구"],
  seoul_eunpyeong: ["서울특별시 은평구"],
  seoul_jongno: ["서울특별시 종로구"],
  seoul_jung: ["서울특별시 중구"],
  seoul_jungnang: ["서울특별시 중랑구"],
  incheon: ["인천광역시"],
  gyeonggi: ["경기도"],
  gyeonggi_north: ["경기북부"],
  gyeonggi_south: ["경기남부"],
  busan: ["부산광역시"],
  daegu: ["대구광역시"],
  gwangju: ["광주광역시"],
  daejeon: ["대전광역시"],
  ulsan: ["울산광역시"],
  sejong: ["세종특별자치시"],
  gangwon: ["강원특별자치도", "강원도"],
  chungbuk: ["충청북도"],
  chungnam: ["충청남도"],
  jeonbuk: ["전북특별자치도", "전라북도"],
  jeonnam: ["전라남도"],
  gyeongbuk: ["경상북도"],
  gyeongnam: ["경상남도"],
  jeju: ["제주특별자치도"],
  ...GYEONGGI_REGION_NAME_CANDIDATES,
};

const NAME_OPTIMIZE_RULE_KEYS: Array<{ prefix: string; optimizeKey: string }> = [
  { prefix: "서울특별시 ", optimizeKey: "seoul" },
  { prefix: "경기도 ", optimizeKey: "gyeonggi" },
  { prefix: "인천광역시 ", optimizeKey: "incheon" },
];

type Coord = [number, number]; // [lng, lat]
type RegionBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};
type RegionPolygonPath = Array<{ lat: number; lng: number }>;
type RegionBoundaryResponse = {
  region: string;
  bounds: RegionBounds;
  polygons: RegionPolygonPath[];
};
type RegionFeature = {
  properties?: { name?: string };
  geometry?: { type?: string; coordinates?: unknown };
};
type RegionFeatureCollection = {
  type?: string;
  features?: RegionFeature[];
};

let cachedFeatureCollection: RegionFeatureCollection | null = null;

type RegionOptimizeRule = {
  minArea: number;
  maxPolygons: number;
  maxPointsPerPolygon: number;
  maxTotalPoints?: number;
};

const DEFAULT_OPTIMIZE_RULE: RegionOptimizeRule = {
  minArea: 0,
  maxPolygons: 120,
  maxPointsPerPolygon: 900,
  maxTotalPoints: 24000,
};

const REGION_OPTIMIZE_RULES: Partial<Record<string, RegionOptimizeRule>> = {
  incheon: { minArea: 0.00001, maxPolygons: 24, maxPointsPerPolygon: 700 },
  busan: { minArea: 0.000005, maxPolygons: 32, maxPointsPerPolygon: 700 },
  gangwon: { minArea: 0, maxPolygons: 24, maxPointsPerPolygon: 4000 },
  chungbuk: { minArea: 0, maxPolygons: 24, maxPointsPerPolygon: 4000 },
  chungnam: { minArea: 0, maxPolygons: 24, maxPointsPerPolygon: 4000 },
  jeonbuk: { minArea: 0, maxPolygons: 24, maxPointsPerPolygon: 4000 },
  jeonnam: {
    minArea: 0.00002,
    maxPolygons: 48,
    maxPointsPerPolygon: 4000,
    maxTotalPoints: 22000,
  },
  gyeonggi: { minArea: 0, maxPolygons: 32, maxPointsPerPolygon: 4000 },
  gyeongbuk: { minArea: 0, maxPolygons: 24, maxPointsPerPolygon: 4000 },
  gyeongnam: { minArea: 0, maxPolygons: 24, maxPointsPerPolygon: 4000 },
  jeju: {
    minArea: 0.00002,
    maxPolygons: 24,
    maxPointsPerPolygon: 4000,
    maxTotalPoints: 18000,
  },
  gyeonggi_north: { minArea: 0, maxPolygons: 24, maxPointsPerPolygon: 4000 },
  gyeonggi_south: { minArea: 0, maxPolygons: 24, maxPointsPerPolygon: 4000 },
};

function toPath(coords: Coord[]) {
  return coords
    .filter(
      (point): point is Coord =>
        Array.isArray(point) &&
        point.length >= 2 &&
        Number.isFinite(point[0]) &&
        Number.isFinite(point[1]),
    )
    .map(([lng, lat]) => ({ lat, lng }));
}

function collectPolygonPaths(geometry: unknown) {
  const empty = [] as Array<Array<{ lat: number; lng: number }>>;
  if (!geometry || typeof geometry !== "object") return empty;

  const geo = geometry as { type?: string; coordinates?: unknown };
  if (!geo.type || !geo.coordinates) return empty;

  if (geo.type === "Polygon" && Array.isArray(geo.coordinates)) {
    const outer = geo.coordinates[0] as Coord[] | undefined;
    if (!Array.isArray(outer)) return empty;
    const path = toPath(outer);
    return path.length >= 3 ? [path] : empty;
  }

  if (geo.type === "MultiPolygon" && Array.isArray(geo.coordinates)) {
    const paths = (geo.coordinates as unknown[])
      .map((poly) => {
        if (!Array.isArray(poly)) return null;
        const outer = poly[0] as Coord[] | undefined;
        if (!Array.isArray(outer)) return null;
        const path = toPath(outer);
        return path.length >= 3 ? path : null;
      })
      .filter((path): path is Array<{ lat: number; lng: number }> => Boolean(path));
    return paths;
  }

  return empty;
}

function computeBounds(paths: Array<Array<{ lat: number; lng: number }>>) {
  const points = paths.flat();
  if (points.length === 0) return null;
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  return {
    south: Math.min(...lats),
    west: Math.min(...lngs),
    north: Math.max(...lats),
    east: Math.max(...lngs),
  };
}

function simplifyPath(path: RegionPolygonPath, maxPoints: number): RegionPolygonPath {
  if (path.length <= maxPoints) return path;
  const step = Math.ceil(path.length / maxPoints);
  const sampled: RegionPolygonPath = [];
  for (let i = 0; i < path.length; i += step) {
    sampled.push(path[i]);
  }
  if (sampled.length > 0) {
    const last = path[path.length - 1];
    const tail = sampled[sampled.length - 1];
    if (!tail || tail.lat !== last.lat || tail.lng !== last.lng) {
      sampled.push(last);
    }
  }
  return sampled;
}

function polygonArea(path: RegionPolygonPath) {
  if (path.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < path.length; i += 1) {
    const p1 = path[i];
    const p2 = path[(i + 1) % path.length];
    sum += p1.lng * p2.lat - p2.lng * p1.lat;
  }
  return Math.abs(sum) / 2;
}

function optimizePolygons(region: string, polygons: RegionPolygonPath[]) {
  const rule = REGION_OPTIMIZE_RULES[region] ?? DEFAULT_OPTIMIZE_RULE;
  const withArea = polygons
    .map((path) => ({ path, area: polygonArea(path) }))
    .filter((item) => item.path.length >= 3 && item.area >= rule.minArea)
    .sort((a, b) => b.area - a.area)
    .slice(0, rule.maxPolygons);

  let simplified = withArea.map((item) =>
    simplifyPath(item.path, rule.maxPointsPerPolygon),
  );

  const maxTotalPoints = rule.maxTotalPoints ?? DEFAULT_OPTIMIZE_RULE.maxTotalPoints;
  if (!maxTotalPoints) return simplified;

  let totalPoints = simplified.reduce((sum, path) => sum + path.length, 0);
  if (totalPoints <= maxTotalPoints) return simplified;

  let adjustedMaxPoints = rule.maxPointsPerPolygon;
  for (let attempt = 0; attempt < 4 && totalPoints > maxTotalPoints; attempt += 1) {
    const ratio = maxTotalPoints / totalPoints;
    adjustedMaxPoints = Math.max(
      140,
      Math.floor(adjustedMaxPoints * ratio * 0.92),
    );
    simplified = withArea.map((item) =>
      simplifyPath(item.path, adjustedMaxPoints),
    );
    totalPoints = simplified.reduce((sum, path) => sum + path.length, 0);
  }

  return simplified;
}

async function loadFeatureCollection(): Promise<
  RegionFeatureCollection | NextResponse
> {
  if (cachedFeatureCollection) return cachedFeatureCollection;
  const filePath = join(
    process.cwd(),
    "data",
    "geo",
    "skorea-provinces-2018-geo.json",
  );
  const raw = await readFile(filePath, "utf8");
  try {
    const parsed = JSON.parse(raw) as RegionFeatureCollection;
    cachedFeatureCollection = parsed;
    return parsed;
  } catch {
    return NextResponse.json(
      { error: "지역 경계 데이터 파싱 실패" },
      { status: 500 },
    );
  }
}

function findFeaturesForRegion(
  featureCollection: RegionFeatureCollection,
  region: string,
) {
  const names = REGION_NAME_CANDIDATES[region] ?? [];
  if (names.length === 0) return [] as RegionFeature[];
  const features = featureCollection.features ?? [];
  return features.filter((feature) => {
      const name = feature.properties?.name?.trim();
      return Boolean(name && names.includes(name));
    });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const region = String(searchParams.get("region") ?? "").trim();
  const regionName = String(
    searchParams.get("name") ?? searchParams.get("regionName") ?? "",
  ).trim();

  if (!region && !regionName) {
    return NextResponse.json({ error: "invalid region" }, { status: 400 });
  }
  if (region && !REGION_NAME_CANDIDATES[region]) {
    return NextResponse.json({ error: "invalid region" }, { status: 400 });
  }

  try {
    const loadedFeatureCollection = await loadFeatureCollection();
    if (loadedFeatureCollection instanceof Response) {
      return loadedFeatureCollection;
    }
    const featureCollection = loadedFeatureCollection;
    const features = regionName
      ? (featureCollection.features ?? []).filter(
          (item) => item?.properties?.name?.trim() === regionName,
        )
      : findFeaturesForRegion(featureCollection, region);
    if (features.length === 0) {
      return NextResponse.json({ error: "boundary not found" }, { status: 404 });
    }

    const optimizeKey = region
      ? region.startsWith("gyeonggi_")
        ? "gyeonggi"
        : region
      : NAME_OPTIMIZE_RULE_KEYS.find((item) => regionName.startsWith(item.prefix))
          ?.optimizeKey ?? "default";
    const polygons = optimizePolygons(
      optimizeKey,
      features.flatMap((feature) => collectPolygonPaths(feature.geometry)),
    );
    const bounds = computeBounds(polygons);
    if (!bounds || polygons.length === 0) {
      return NextResponse.json({ error: "boundary not found" }, { status: 404 });
    }

    const response: RegionBoundaryResponse = {
      region: region || regionName,
      bounds,
      polygons,
    };
    return NextResponse.json(response, {
      headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
    });
  } catch {
    return NextResponse.json({ error: "boundary fetch error" }, { status: 500 });
  }
}
