import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

const REGION_NAME_CANDIDATES: Record<string, string[]> = {
  seoul: ["서울특별시"],
  incheon: ["인천광역시"],
  gyeonggi: ["경기도"],
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
};

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

function simplifyPath(path: RegionPolygonPath): RegionPolygonPath {
  const maxPoints = 1200;
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

async function loadFeatureCollection() {
  if (cachedFeatureCollection) return cachedFeatureCollection;
  const filePath = join(
    process.cwd(),
    "data",
    "geo",
    "skorea-provinces-2018-geo.json",
  );
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as RegionFeatureCollection;
  cachedFeatureCollection = parsed;
  return parsed;
}

function findFeatureForRegion(
  featureCollection: RegionFeatureCollection,
  region: string,
) {
  const names = REGION_NAME_CANDIDATES[region] ?? [];
  if (names.length === 0) return null;
  const features = featureCollection.features ?? [];
  return (
    features.find((feature) => {
      const name = feature.properties?.name?.trim();
      return Boolean(name && names.includes(name));
    }) ?? null
  );
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const region = String(searchParams.get("region") ?? "").trim();
  if (!REGION_NAME_CANDIDATES[region]) {
    return NextResponse.json({ error: "invalid region" }, { status: 400 });
  }

  try {
    const featureCollection = await loadFeatureCollection();
    const feature = findFeatureForRegion(featureCollection, region);
    if (!feature?.geometry) {
      return NextResponse.json({ error: "boundary not found" }, { status: 404 });
    }

    const polygons = collectPolygonPaths(feature.geometry).map(simplifyPath);
    const bounds = computeBounds(polygons);
    if (!bounds || polygons.length === 0) {
      return NextResponse.json({ error: "boundary not found" }, { status: 404 });
    }

    const response: RegionBoundaryResponse = { region, bounds, polygons };
    return NextResponse.json(response, {
      headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
    });
  } catch {
    return NextResponse.json({ error: "boundary fetch error" }, { status: 500 });
  }
}
