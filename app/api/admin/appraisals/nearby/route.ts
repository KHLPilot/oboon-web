import { NextResponse } from "next/server";
import { adminSupabase, requireAdminRoute } from "@/lib/api/admin-route";
import { handleApiError } from "@/lib/api/route-error";
import { adminAppraisalsNearbyQuerySchema } from "../../_schemas";

type HousingKind = "apartment" | "officetel";

type KakaoKeywordDocument = {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
  distance: string;
  place_url: string;
  category_name: string;
};

type KakaoKeywordResponse = {
  documents?: KakaoKeywordDocument[];
};

type PlaceCandidate = {
  source: "kakao";
  kakaoPlaceId: string;
  kind: HousingKind;
  name: string;
  roadAddress: string | null;
  jibunAddress: string | null;
  lat: number;
  lng: number;
  distanceM: number | null;
  placeUrl: string | null;
  categoryName: string | null;
};

type PropertyLocationRow = {
  road_address: string | null;
  jibun_address: string | null;
  lat: number | null;
  lng: number | null;
};

type PropertyTimelineRow = {
  move_in_date: string | null;
};

type PropertyUnitTypeRow = {
  exclusive_area: number | string | null;
};

type PropertyRow = {
  id: number;
  name: string;
  property_type: string | null;
  property_locations: PropertyLocationRow[] | null;
  property_timeline: PropertyTimelineRow[] | null;
  property_unit_types: PropertyUnitTypeRow[] | null;
};

const KAKAO_ENDPOINT = "https://dapi.kakao.com/v2/local/search/keyword.json";
const KAKAO_QUERY_BY_KIND: Record<HousingKind, string> = {
  apartment: "아파트",
  officetel: "오피스텔",
};
const FACILITY_ALIAS_SUFFIXES = [
  "관리사무소",
  "관리사무실",
  "관리실",
  "관리센터",
  "관리동",
  "입주지원센터",
  "입주자대표회의",
  "경비실",
];
const EXCLUDED_PLACE_NAME_KEYWORDS = [
  "상가",
  "노인정",
  "학교",
  "경비실",
  "주차장",
  "주차타워",
  "주차동",
  "주차장입구",
  "정문",
  "후문",
  "북문",
  "남문",
  "동문",
  "서문",
  "출입구",
  "게이트",
  "gate",
];
const EXCLUDED_CATEGORY_KEYWORDS = [
  "상가",
  "노인정",
  "학교",
  "경비실",
  "주차장",
  "주차장입구",
  "정문",
  "후문",
  "출입구",
  "게이트",
  "gate",
];
const VILLA_LIKE_KEYWORDS = [
  "빌라",
  "연립",
  "연립주택",
  "다세대",
  "다세대주택",
  "다가구",
  "타운하우스",
];

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^가-힣a-z0-9]/g, "");
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function compactForMatch(value: string | null | undefined): string {
  return normalizeWhitespace(value ?? "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\s+/g, "");
}

function hasAnyKeyword(value: string | null | undefined, keywords: string[]): boolean {
  const compact = compactForMatch(value);
  if (!compact) return false;
  return keywords.some((keyword) => compact.includes(compactForMatch(keyword)));
}

function shouldExcludePlaceCandidate(args: {
  kind: HousingKind;
  name: string;
  categoryName: string | null;
}): boolean {
  if (hasAnyKeyword(args.name, EXCLUDED_PLACE_NAME_KEYWORDS)) {
    return true;
  }
  if (hasAnyKeyword(args.categoryName, EXCLUDED_CATEGORY_KEYWORDS)) {
    return true;
  }
  // 카카오 키워드 검색 결과에서 빌라/연립/다세대가 아파트로 섞이는 케이스 차단
  if (
    args.kind === "apartment" &&
    (hasAnyKeyword(args.name, VILLA_LIKE_KEYWORDS) ||
      hasAnyKeyword(args.categoryName, VILLA_LIKE_KEYWORDS))
  ) {
    return true;
  }
  return false;
}

function isFacilityAliasName(name: string): boolean {
  const compact = normalizeWhitespace(name);
  return FACILITY_ALIAS_SUFFIXES.some((suffix) => compact.endsWith(suffix));
}

function canonicalComplexName(name: string): string {
  const compact = normalizeWhitespace(name).replace(/\(.*?\)/g, "").trim();
  let result = compact;

  for (const suffix of FACILITY_ALIAS_SUFFIXES) {
    if (!result.endsWith(suffix)) continue;
    const trimmed = result.slice(0, result.length - suffix.length).trim();
    if (trimmed.length >= 2) {
      result = trimmed;
    }
    break;
  }

  // "00아파트 208동", "00오피스텔 101동", "00아파트208동" 같은
  // 개별 동 표기를 제거해 단지 대표명으로 정규화한다.
  result = result
    // 공백이 있는 동 표기 (예: "사당우성2단지아파트 208동", "xx오피스텔 A동")
    .replace(/\s+(?:제?\d{1,4}(?:-\d{1,3})?|[A-Za-z])\s*동$/i, "")
    // 공백이 없는 동 표기 (예: "사당우성2단지아파트208동")
    .replace(/(아파트|오피스텔)\s*(?:제?\d{1,4}(?:-\d{1,3})?|[A-Za-z])\s*동$/i, "$1")
    .trim();

  return normalizeWhitespace(result);
}

function coordinateBucket(value: number): string {
  // 약 50m 수준으로 묶어 같은 단지 내 유사 POI를 1개로 축약
  return String(Math.round(value * 2000) / 2000);
}

function candidatePriority(item: PlaceCandidate): number {
  let score = item.distanceM ?? 10_000;
  if (isFacilityAliasName(item.name)) {
    score += 3_000;
  }
  if (!item.roadAddress && !item.jibunAddress) {
    score += 200;
  }
  return score;
}

function tokenize(value: string): string[] {
  return value
    .split(/\s+/)
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

function haversineDistanceM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const r = 6_371_000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return r * c;
}

function parseKinds(raw: string | null): HousingKind[] {
  if (!raw) return ["apartment", "officetel"];
  const values = raw
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter((v): v is HousingKind => v === "apartment" || v === "officetel");
  if (values.length === 0) return ["apartment", "officetel"];
  return Array.from(new Set(values));
}

function parseDateIso(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function computeAgeYears(dateIso: string | null): number | null {
  if (!dateIso) return null;
  const parsed = new Date(dateIso);
  if (Number.isNaN(parsed.getTime())) return null;
  const now = new Date();
  const years = (now.getTime() - parsed.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (!Number.isFinite(years)) return null;
  return Math.max(0, Math.floor(years));
}

async function fetchKakaoCandidates(params: {
  lat: number;
  lng: number;
  radiusM: number;
  limit: number;
  kinds: HousingKind[];
}): Promise<{ items: PlaceCandidate[]; warnings: string[] }> {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) {
    throw new Error("Missing KAKAO_REST_API_KEY");
  }

  const perPageSize = 15;
  const maxPageByKind: Record<HousingKind, number> = {
    apartment: 3,
    officetel: 2,
  };
  const warnings: string[] = [];

  const results = await Promise.all(
    params.kinds.map(async (kind) => {
      const pages = Array.from({ length: maxPageByKind[kind] }, (_, index) => index + 1);
      const pageResults = await Promise.all(
        pages.map(async (page) => {
          const query = new URLSearchParams({
            query: KAKAO_QUERY_BY_KIND[kind],
            x: String(params.lng),
            y: String(params.lat),
            radius: String(params.radiusM),
            sort: "distance",
            size: String(perPageSize),
            page: String(page),
          });

          try {
            const response = await fetch(`${KAKAO_ENDPOINT}?${query.toString()}`, {
              headers: {
                Authorization: `KakaoAK ${key}`,
              },
              cache: "no-store",
            });

            if (!response.ok) {
              warnings.push(`${kind} 검색 실패 (${response.status})`);
              return [] as PlaceCandidate[];
            }

            const payload = (await response.json()) as KakaoKeywordResponse;
            const documents = payload.documents ?? [];

            return documents
              .map((doc) => {
                const placeName = doc.place_name?.trim() ?? "";
                if (!placeName) return null;
                if (
                  shouldExcludePlaceCandidate({
                    kind,
                    name: placeName,
                    categoryName: doc.category_name?.trim() || null,
                  })
                ) {
                  return null;
                }

                const lat = toFiniteNumber(doc.y);
                const lng = toFiniteNumber(doc.x);
            if (lat === null || lng === null) return null;
            const distanceM = toFiniteNumber(doc.distance);
            const canonicalName = canonicalComplexName(placeName);
            return {
              source: "kakao",
              kakaoPlaceId: doc.id,
              kind,
              name: canonicalName || placeName,
              roadAddress: doc.road_address_name?.trim() || null,
              jibunAddress: doc.address_name?.trim() || null,
              lat,
                  lng,
                  distanceM: distanceM === null ? null : Math.max(0, Math.floor(distanceM)),
                  placeUrl: doc.place_url?.trim() || null,
                  categoryName: doc.category_name?.trim() || null,
                } satisfies PlaceCandidate;
              })
              .filter((item): item is PlaceCandidate => item !== null);
          } catch {
            warnings.push(`${kind} 검색 중 네트워크 오류`);
            return [] as PlaceCandidate[];
          }
        }),
      );

      return pageResults.flat();
    }),
  );

  const deduped = new Map<string, PlaceCandidate>();
  for (const item of results.flat()) {
    const canonicalName = canonicalComplexName(item.name);
    const canonicalNameNorm = normalizeText(canonicalName || item.name);
    const primaryAddressNorm = normalizeText(item.roadAddress ?? item.jibunAddress ?? "");
    const bucketKey = `${coordinateBucket(item.lat)}|${coordinateBucket(item.lng)}`;
    const key = [
      item.kind,
      canonicalNameNorm,
      primaryAddressNorm || bucketKey,
    ].join("|");

    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, item);
      continue;
    }

    const nextPriority = candidatePriority(item);
    const prevPriority = candidatePriority(existing);
    if (nextPriority < prevPriority) {
      deduped.set(key, item);
    }
  }

  return {
    items: Array.from(deduped.values())
      .sort((a, b) => (a.distanceM ?? Number.MAX_SAFE_INTEGER) - (b.distanceM ?? Number.MAX_SAFE_INTEGER))
      .slice(0, params.limit),
    warnings,
  };
}

async function fetchInternalProperties(): Promise<PropertyRow[]> {
  const { data, error } = await adminSupabase
    .from("properties")
    .select(
      `
      id,
      name,
      property_type,
      property_locations (road_address, jibun_address, lat, lng),
      property_timeline (move_in_date),
      property_unit_types (exclusive_area)
      `,
    )
    .order("id", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("GET /api/admin/appraisals/nearby property load error:", error);
    return [];
  }

  return (data ?? []) as PropertyRow[];
}

function getUnitAreaRange(unitTypes: PropertyUnitTypeRow[] | null): {
  min: number | null;
  max: number | null;
} {
  const nums = (unitTypes ?? [])
    .map((row) => toFiniteNumber(row.exclusive_area))
    .filter((v): v is number => v !== null && v > 0);

  if (nums.length === 0) {
    return { min: null, max: null };
  }

  return {
    min: Math.min(...nums),
    max: Math.max(...nums),
  };
}

function pickAddress(locations: PropertyLocationRow[] | null): string | null {
  const row = (locations ?? [])[0];
  if (!row) return null;
  return row.road_address ?? row.jibun_address ?? null;
}

function pickLatLng(
  locations: PropertyLocationRow[] | null,
): { lat: number; lng: number } | null {
  const row = (locations ?? [])[0];
  if (!row) return null;
  const lat = toFiniteNumber(row.lat);
  const lng = toFiniteNumber(row.lng);
  if (lat === null || lng === null) return null;
  return { lat, lng };
}

function matchProperty(
  place: PlaceCandidate,
  rows: PropertyRow[],
): { row: PropertyRow; score: number } | null {
  const targetNameNorm = normalizeText(place.name);
  const targetAddress = place.roadAddress ?? place.jibunAddress ?? "";
  const targetTokens = tokenize(place.name);

  let best: { row: PropertyRow; score: number } | null = null;

  for (const row of rows) {
    const rowNameNorm = normalizeText(row.name);
    if (!rowNameNorm) continue;

    let score = 0;
    if (rowNameNorm === targetNameNorm) {
      score += 60;
    } else if (
      rowNameNorm.includes(targetNameNorm) ||
      targetNameNorm.includes(rowNameNorm)
    ) {
      score += 42;
    } else {
      const tokenMatchCount = targetTokens.filter((token) => row.name.includes(token)).length;
      score += Math.min(20, tokenMatchCount * 8);
    }

    const rowAddress = pickAddress(row.property_locations) ?? "";
    if (targetAddress && rowAddress) {
      if (rowAddress.includes(targetAddress) || targetAddress.includes(rowAddress)) {
        score += 20;
      } else {
        const targetAddressNorm = normalizeText(targetAddress);
        const rowAddressNorm = normalizeText(rowAddress);
        if (
          rowAddressNorm.includes(targetAddressNorm) ||
          targetAddressNorm.includes(rowAddressNorm)
        ) {
          score += 12;
        }
      }
    }

    const rowLatLng = pickLatLng(row.property_locations);
    if (rowLatLng) {
      const distance = haversineDistanceM(place.lat, place.lng, rowLatLng.lat, rowLatLng.lng);
      if (distance <= 120) score += 25;
      else if (distance <= 250) score += 18;
      else if (distance <= 500) score += 10;
    }

    const typeNorm = normalizeText(row.property_type ?? "");
    if (place.kind === "apartment" && typeNorm.includes("아파트")) score += 5;
    if (place.kind === "officetel" && typeNorm.includes("오피스텔")) score += 5;

    if (!best || score > best.score) {
      best = { row, score };
    }
  }

  if (!best || best.score < 45) return null;
  return best;
}

export async function GET(request: Request) {
  const auth = await requireAdminRoute();
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const parsed = adminAppraisalsNearbyQuerySchema.safeParse({
    lat: searchParams.get("lat") ?? undefined,
    lng: searchParams.get("lng") ?? undefined,
    radius: searchParams.get("radius") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    types: searchParams.get("types") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "lat, lng 파라미터가 필요합니다." },
      { status: 400 },
    );
  }

    const lat = parsed.data.lat;
    const lng = parsed.data.lng;
    const radiusM = parsed.data.radius ?? 1000;
    const limit = parsed.data.limit ?? 30;
    const kinds = parseKinds(parsed.data.types ?? null);

  try {
    const { items: kakaoItems, warnings } = await fetchKakaoCandidates({
      lat,
      lng,
      radiusM,
      limit,
      kinds,
    });

    const internalRows = kakaoItems.length > 0 ? await fetchInternalProperties() : [];

    const items = kakaoItems.map((item) => {
      const matched = matchProperty(item, internalRows);
      const matchedRow = matched?.row ?? null;
      const unitRange = getUnitAreaRange(matchedRow?.property_unit_types ?? null);
      const moveInDate = parseDateIso(matchedRow?.property_timeline?.[0]?.move_in_date ?? null);
      const useApprovalDate = moveInDate;
      const ageYears = computeAgeYears(useApprovalDate);
      const internalLocation =
        matchedRow?.property_locations?.[0]?.road_address ??
        matchedRow?.property_locations?.[0]?.jibun_address ??
        null;

      return {
        id: `${item.kind}-${item.kakaoPlaceId}`,
        kind: item.kind,
        name: item.name,
        road_address: item.roadAddress,
        jibun_address: item.jibunAddress,
        lat: item.lat,
        lng: item.lng,
        distance_m: item.distanceM,
        place_url: item.placeUrl,
        category_name: item.categoryName,
        detail: {
          complex_name: matchedRow?.name ?? item.name,
          location: item.roadAddress ?? item.jibunAddress ?? internalLocation,
          use_approval_date: useApprovalDate,
          use_approval_date_is_estimated: Boolean(useApprovalDate),
          age_years: ageYears,
          exclusive_area_min_m2: unitRange.min,
          exclusive_area_max_m2: unitRange.max,
          source: {
            kakao: true,
            internal_db: Boolean(matchedRow),
            public_data: false,
          },
          matched_property_id: matchedRow?.id ?? null,
          match_score: matched?.score ?? null,
        },
      };
    });

    return NextResponse.json({
      fetched_at: new Date().toISOString(),
      params: {
        lat,
        lng,
        radius_m: radiusM,
        limit,
        kinds,
      },
      warnings,
      items,
      meta: {
        use_approval_date_note:
          "현재는 카카오 검색 + 내부 데이터 매칭 기준이며, 사용승인일은 내부 입주일(move_in_date) 기준 추정치입니다.",
      },
    });
  } catch (error) {
    return handleApiError("admin/appraisals/nearby", error, {
      clientMessage: "감정평가 근방 검색 중 오류가 발생했습니다.",
    });
  }
}
