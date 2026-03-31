import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAuthenticatedUser } from "@/lib/api/route-security";
import { checkRateLimit, geoReverseLimiter } from "@/lib/rateLimit";

const reverseQuerySchema = z.object({
  lat: z.coerce.number().min(33).max(39.5),
  lng: z.coerce.number().min(124).max(132),
});

const REVERSE_CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const REVERSE_CACHE_MAX_ENTRIES = 300;

type ReversePayload = {
  region_1depth: string | null;
  region_2depth: string | null;
  region_3depth: string | null;
};

const reverseCache = new Map<
  string,
  { expiresAt: number; payload: ReversePayload }
>();

function toReverseCacheKey(lat: number, lng: number) {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

function getCachedReverse(key: string) {
  const cached = reverseCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    reverseCache.delete(key);
    return null;
  }
  return cached.payload;
}

function setCachedReverse(key: string, payload: ReversePayload) {
  if (reverseCache.size >= REVERSE_CACHE_MAX_ENTRIES) {
    const oldestKey = reverseCache.keys().next().value;
    if (oldestKey) {
      reverseCache.delete(oldestKey);
    }
  }

  reverseCache.set(key, {
    expiresAt: Date.now() + REVERSE_CACHE_TTL_MS,
    payload,
  });
}

function jsonResponse(payload: ReversePayload, cached = false) {
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "private, max-age=300, stale-while-revalidate=3600",
      "X-Geo-Cache": cached ? "HIT" : "MISS",
    },
  });
}

export async function GET(req: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) {
    return auth.response;
  }

  const rateLimitResponse = await checkRateLimit(
    geoReverseLimiter,
    auth.user.id,
    {
      windowMs: 10 * 60 * 1000,
      message:
        "좌표 기반 주소 검색 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
    },
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { searchParams } = new URL(req.url);
  const parsed = reverseQuerySchema.safeParse({
    lat: searchParams.get("lat"),
    lng: searchParams.get("lng"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "위도/경도 값이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const { lat, lng } = parsed.data;
  const cacheKey = toReverseCacheKey(lat, lng);
  const cached = getCachedReverse(cacheKey);
  if (cached) {
    return jsonResponse(cached, true);
  }

  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`,
      {
        headers: {
          Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}`,
        },
        next: { revalidate: 60 * 60 * 6 },
      },
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "좌표 기반 주소 검색 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    const data = await res.json();
    const address = data.documents?.[0]?.address;

    if (!address) {
      return NextResponse.json(
        { error: "주소를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const payload: ReversePayload = {
      region_1depth: address.region_1depth_name ?? null,
      region_2depth: address.region_2depth_name ?? null,
      region_3depth: address.region_3depth_name ?? null,
    };

    setCachedReverse(cacheKey, payload);
    return jsonResponse(payload);
  } catch {
    return NextResponse.json(
      { error: "좌표 기반 주소 검색 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
