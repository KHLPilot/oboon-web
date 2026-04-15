import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAuthenticatedUser } from "@/lib/api/route-security";
import { checkRateLimit, commuteLimiter } from "@/lib/rateLimit";

const querySchema = z.object({
  propertyId: z.string().trim().min(1).max(20),
  workplaceLat: z.coerce.number().min(33).max(40),
  workplaceLng: z.coerce.number().min(124).max(132),
  workplaceCode: z.string().trim().min(1).max(60),
});

type CacheEntry = {
  transit: number;
  car: number;
  cachedAt: number;
};

type PropertyLocationSnapshot = {
  lat?: number | string | null;
  lng?: number | string | null;
} | null;

type PropertySnapshot = {
  property_locations?: PropertyLocationSnapshot | PropertyLocationSnapshot[] | null;
};

type NaverRouteSummary = {
  duration?: number;
};

type NaverRouteItem = {
  summary?: NaverRouteSummary;
};

type NaverDirectionsResponse = {
  route?: Record<string, NaverRouteItem[]>;
};

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getCached(key: string): CacheEntry | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry;
}

function setCached(key: string, entry: CacheEntry) {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }
  cache.set(key, entry);
}

function extractFirstLocation(snapshot: PropertySnapshot): {
  lat: number;
  lng: number;
} | null {
  const locations = Array.isArray(snapshot.property_locations)
    ? snapshot.property_locations
    : snapshot.property_locations
      ? [snapshot.property_locations]
      : [];
  const first = locations[0];
  if (!first) return null;

  const lat = toFiniteNumber(first.lat);
  const lng = toFiniteNumber(first.lng);
  if (lat === null || lng === null) return null;

  return { lat, lng };
}

function extractDurationMinutes(payload: NaverDirectionsResponse): number | null {
  const routeGroups = payload.route ? Object.values(payload.route) : [];

  for (const group of routeGroups) {
    const summary = group[0]?.summary?.duration;
    if (typeof summary === "number" && Number.isFinite(summary)) {
      return Math.round(summary / 60_000);
    }
  }

  return null;
}

async function fetchNaverDirections(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  mode: "driving" | "transit",
): Promise<number | null> {
  const apiKeyId = process.env.NAVER_DIRECTIONS_API_KEY_ID;
  const apiKey = process.env.NAVER_DIRECTIONS_API_KEY;
  if (!apiKeyId || !apiKey) return null;

  const baseUrl =
    mode === "driving"
      ? "https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving"
      : "https://naveropenapi.apigw.ntruss.com/map-direction/v1/transit";

  const url = `${baseUrl}?start=${fromLng},${fromLat}&goal=${toLng},${toLat}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-NCP-APIGW-API-KEY-ID": apiKeyId,
      "X-NCP-APIGW-API-KEY": apiKey,
    },
    cache: "no-store",
  });

  if (!res.ok) return null;

  const json = (await res.json()) as NaverDirectionsResponse;
  return extractDurationMinutes(json);
}

export async function GET(req: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) {
    return auth.response;
  }

  const rateLimitResponse = await checkRateLimit(
    commuteLimiter,
    auth.user.id,
    {
      windowMs: 60 * 1000,
      message: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
    },
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    propertyId: searchParams.get("propertyId"),
    workplaceLat: searchParams.get("workplaceLat"),
    workplaceLng: searchParams.get("workplaceLng"),
    workplaceCode: searchParams.get("workplaceCode"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { propertyId, workplaceLat, workplaceLng, workplaceCode } = parsed.data;
  const cacheKey = `${propertyId}:${workplaceCode}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json({ transit: cached.transit, car: cached.car, unit: "분" });
  }

  const { data, error } = await auth.supabase
    .from("property_public_snapshots")
    .select("snapshot")
    .eq("property_id", Number(propertyId))
    .maybeSingle<{ snapshot: unknown }>();

  if (error || !data?.snapshot || typeof data.snapshot !== "object") {
    return NextResponse.json(
      { error: "현장 정보를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const location = extractFirstLocation(data.snapshot as PropertySnapshot);
  if (!location) {
    return NextResponse.json(
      { error: "현장 좌표가 없습니다." },
      { status: 404 },
    );
  }

  const [transitResult, carResult] = await Promise.allSettled([
    fetchNaverDirections(location.lat, location.lng, workplaceLat, workplaceLng, "transit"),
    fetchNaverDirections(location.lat, location.lng, workplaceLat, workplaceLng, "driving"),
  ]);

  const transit =
    transitResult.status === "fulfilled" ? transitResult.value : null;
  const car = carResult.status === "fulfilled" ? carResult.value : null;

  if (transit === null || car === null) {
    return NextResponse.json(
      { error: "경로를 계산할 수 없습니다." },
      { status: 502 },
    );
  }

  setCached(cacheKey, {
    transit,
    car,
    cachedAt: Date.now(),
  });

  return NextResponse.json({ transit, car, unit: "분" });
}
