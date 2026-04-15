import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  checkRateLimit,
  geoAddressLimiter,
  getClientIp,
} from "@/lib/rateLimit";

const addressQuerySchema = z.object({
  query: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(
      /^[0-9A-Za-z가-힣\s\-.,#()/]+$/,
      "주소 검색어를 확인해주세요.",
    ),
});

const ADDRESS_CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const ADDRESS_CACHE_MAX_ENTRIES = 300;

type AddressPayload = {
  road_address: string | null;
  jibun_address: string | null;
  lat: string | null;
  lng: string | null;
  region_1depth: string | null;
  region_2depth: string | null;
  region_3depth: string | null;
};

const addressCache = new Map<
  string,
  { expiresAt: number; payload: AddressPayload }
>();

function normalizeQuery(raw: string) {
  return raw.trim().replace(/\s+/g, " ");
}

function getCachedAddress(query: string) {
  const cached = addressCache.get(query);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    addressCache.delete(query);
    return null;
  }
  return cached.payload;
}

function setCachedAddress(query: string, payload: AddressPayload) {
  if (addressCache.size >= ADDRESS_CACHE_MAX_ENTRIES) {
    const oldestKey = addressCache.keys().next().value;
    if (oldestKey) {
      addressCache.delete(oldestKey);
    }
  }

  addressCache.set(query, {
    expiresAt: Date.now() + ADDRESS_CACHE_TTL_MS,
    payload,
  });
}

function jsonResponse(payload: AddressPayload, cached = false) {
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "private, max-age=300, stale-while-revalidate=3600",
      "X-Geo-Cache": cached ? "HIT" : "MISS",
    },
  });
}

export async function GET(req: NextRequest) {
  const rateLimitResponse = await checkRateLimit(
    geoAddressLimiter,
    getClientIp(req),
    {
      windowMs: 10 * 60 * 1000,
      message: "주소 검색 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
    },
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { searchParams } = new URL(req.url);
  const parsed = addressQuerySchema.safeParse({
    query: normalizeQuery(searchParams.get("query") ?? ""),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "주소 검색어를 확인해주세요." },
      { status: 400 },
    );
  }

  const query = parsed.data.query;
  const cached = getCachedAddress(query);
  if (cached) {
    return jsonResponse(cached, true);
  }

  const res = await fetch(
    `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(
      query,
    )}`,
    {
      headers: {
        Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}`,
      },
      next: { revalidate: 60 * 60 * 6 },
    },
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "주소 검색 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }

  const json = await res.json();

  if (!Array.isArray(json.documents) || json.documents.length === 0) {
    return NextResponse.json(
      { error: "주소를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const doc = json.documents[0];
  const payload: AddressPayload = {
    road_address: doc.road_address?.address_name ?? null,
    jibun_address: doc.address?.address_name ?? null,
    lat: typeof doc.y === "string" ? doc.y : null,
    lng: typeof doc.x === "string" ? doc.x : null,
    region_1depth: doc.address?.region_1depth_name ?? null,
    region_2depth: doc.address?.region_2depth_name ?? null,
    region_3depth: doc.address?.region_3depth_name ?? null,
  };

  setCachedAddress(query, payload);
  return jsonResponse(payload);
}
