import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BatchStats,
  KakaoPlace,
  PoiUpsertRow,
  RecoPoiCategory,
  SchoolLevel,
} from "@/features/reco/domain/recoPoi.types";
import {
  fetchKakaoTopPoisByCategory,
  fetchKakaoTopPoisByKeyword,
  filterHospitalTiered,
  filterMartTiered,
} from "@/features/reco/services/kakaoLocal";
import {
  enrichSubwayLines,
  mapSchoolLevelFromCategoryName,
} from "@/features/reco/services/subwayPublicEnrichment";
import {
  getHighSpeedRailLinesForStation,
  isHighSpeedRailStation,
} from "@/features/reco/constants/highSpeedRailMap";
import { canonicalizeSubwayLine } from "@/features/reco/constants/subwayIconMap";
import { AppError, ERR, createSupabaseServiceError, toAppError } from "@/lib/errors";
import { createServiceAdminClient } from "@/lib/services/supabase-admin";

const FETCH_CATEGORIES: Array<"SUBWAY" | "SCHOOL" | "HOSPITAL"> = [
  "SUBWAY",
  "SCHOOL",
  "HOSPITAL",
];
const DEFAULT_TOP_N = 3;
const DEFAULT_RADIUS = 2000;
const HOSPITAL_SEARCH_PAGES = 4;
const KAKAO_MAX_PAGES = 45;
const SCHOOL_SEARCH_PAGES = 8;
const SCHOOL_BUCKET_LIMIT = 2;
const SCHOOL_TARGET_LEVELS = [
  "KINDERGARTEN",
  "ELEMENTARY",
  "MIDDLE",
  "HIGH",
] as const;
const OUTLET_KEYWORDS = ["아울렛", "롯데아울렛", "현대아울렛", "신세계아울렛"] as const;
const RAIL_KEYWORDS = ["KTX역", "SRT역", "ITX역", "기차역"] as const;
const DEFAULT_CHUNK = 50;
const DEFAULT_CONCURRENCY = 3;
const MAX_RETRY = 3;
const TRANSIT_LINE_TOKEN_REGEX =
  /(공항철도|인천공항철도|용인에버라인|에버라인|김포골드라인|김포도시철도|수인분당선|신분당선|경의중앙선|경춘선|경강선|서해선|신림선|신안산선|우이신설선|의정부경전철|동해선|동해본선|동해남부선|동북선|위례선|대경선|동탄인덕원선|대장홍대선|대구산업선|(?:서울|수도권|인천|부산|대구|광주|대전)\s*(?:도시철도|선)?\s*[1-9]호선|[1-9]호선\s*\((?:서울|수도권|인천|부산|대구|광주|대전)\)|[0-9]+호선|KTX|SRT|ITX|GTX-[A-D])/gi;

type LocationRow = {
  properties_id: number;
  lat: number | string | null;
  lng: number | string | null;
};

type JobRow = {
  id: number;
  property_id: number;
  attempts: number;
};

type PropertyTypeRow = {
  id: number;
  property_type: string | null;
};

const NON_RESIDENTIAL_PROPERTY_TYPE_KEYWORDS = [
  "지식산업센터",
  "상업시설",
  "상가",
  "오피스",
  "업무시설",
  "근린생활시설",
  "공장",
  "창고",
] as const;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toRecoPoiBatchError(
  action: string,
  error: { code?: string | null; hint?: string | null; message?: string | null } | null,
  context?: Record<string, string | number | boolean | null | undefined>,
) {
  return createSupabaseServiceError(error, {
    scope: "recoPoiBatch.service",
    action,
    defaultMessage: "추천 POI 처리 중 오류가 발생했습니다.",
    context,
  });
}

function missingRecoPoiBatchConfigError() {
  return new AppError(
    ERR.CONFIG,
    "처리 중 오류가 발생했습니다.",
    500,
  );
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function byDistanceAsc(a: KakaoPlace, b: KakaoPlace) {
  return Number(a.distance ?? 0) - Number(b.distance ?? 0);
}

function isTargetSchoolLevel(
  level: SchoolLevel,
): level is (typeof SCHOOL_TARGET_LEVELS)[number] {
  return SCHOOL_TARGET_LEVELS.includes(
    level as (typeof SCHOOL_TARGET_LEVELS)[number],
  );
}

function buildSchoolBuckets(places: KakaoPlace[]) {
  const buckets: Record<(typeof SCHOOL_TARGET_LEVELS)[number], KakaoPlace[]> = {
    KINDERGARTEN: [],
    ELEMENTARY: [],
    MIDDLE: [],
    HIGH: [],
  };

  for (const place of places) {
    const schoolLevel = mapSchoolLevelFromCategoryName(
      place.category_name,
      place.place_name,
    );
    if (!isTargetSchoolLevel(schoolLevel)) continue;
    buckets[schoolLevel].push(place);
  }

  for (const level of SCHOOL_TARGET_LEVELS) {
    buckets[level].sort(byDistanceAsc);
  }

  return buckets;
}

async function fetchSchoolPlaces(params: {
  kakaoApiKey: string;
  lat: number;
  lng: number;
  radius: number;
}) {
  const deduped = new Map<string, KakaoPlace>();

  for (let page = 1; page <= SCHOOL_SEARCH_PAGES; page += 1) {
    const pageRows = await withRetry(() =>
      fetchKakaoTopPoisByCategory({
        kakaoApiKey: params.kakaoApiKey,
        category: "SCHOOL",
        lat: params.lat,
        lng: params.lng,
        radius: params.radius,
        topN: 15,
        page,
      }),
    );

    if (pageRows.length === 0) break;

    for (const place of pageRows) {
      deduped.set(place.id, place);
    }

    const buckets = buildSchoolBuckets(Array.from(deduped.values()));
    const hasEnoughEachBucket = SCHOOL_TARGET_LEVELS.every(
      (level) => buckets[level].length >= SCHOOL_BUCKET_LIMIT,
    );
    if (hasEnoughEachBucket) break;
    if (pageRows.length < 15) break;
  }

  return Array.from(deduped.values());
}

function toStationToken(name: string) {
  const withoutParens = name.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  if (!withoutParens) return "";

  const directStation = withoutParens.match(/[가-힣A-Za-z0-9]+역/g)?.[0];
  if (directStation) return directStation;

  const normalized = withoutParens
    .replace(TRANSIT_LINE_TOKEN_REGEX, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "";

  const tokens = normalized.split(" ");
  const stationToken =
    tokens.find((token) => /역$/.test(token)) ??
    tokens[tokens.length - 1] ??
    normalized;
  return stationToken;
}

function isStationName(name: string) {
  const stationToken = toStationToken(name);
  return /역$/.test(stationToken);
}

function isLikelyRailStationPlace(place: KakaoPlace) {
  const name = place.place_name ?? "";
  const categoryName = place.category_name ?? "";
  if (!isStationName(name)) return false;
  if (
    /(점|라운지|주차|주차타워|은행|카페|픽업|고객센터|atm|편의점|출구|렌터카|투루카|쏘카|g\s*car|아마노)/i.test(
      name,
    )
  ) {
    return false;
  }
  return (
    place.category_group_code === "SW8" ||
    /철도|기차|지하철역|기차역|도시철도역|전철역/.test(categoryName) ||
    /ktx|srt|itx|gtx|공항철도/i.test(name) ||
    /ktx|srt|itx|gtx|공항철도/i.test(categoryName)
  );
}

function classifyTransitCategory(
  place: KakaoPlace,
): "SUBWAY" | "HIGH_SPEED_RAIL" | null {
  const name = place.place_name ?? "";
  const categoryName = place.category_name ?? "";
  const source = `${name} ${categoryName}`;
  const stationToken = toStationToken(name);

  if (!isLikelyRailStationPlace(place)) return null;

  const hasSubwayHint =
    place.category_group_code === "SW8" ||
    /지하철|전철|호선|골드라인|에버라인|경의중앙선|수인분당선|신분당선|공항철도/.test(
      source,
    );

  if (
    (/ktx|srt|itx/i.test(source) || (isHighSpeedRailStation(stationToken) && !hasSubwayHint)) &&
    !/공항철도/.test(source)
  ) {
    return "HIGH_SPEED_RAIL";
  }

  if (hasSubwayHint) {
    return "SUBWAY";
  }

  return null;
}

function isLivingInfraAllowed(propertyType: string | null | undefined) {
  const normalized = (propertyType ?? "").replace(/\s+/g, "").toLowerCase();
  if (!normalized) return true;
  return !NON_RESIDENTIAL_PROPERTY_TYPE_KEYWORDS.some((keyword) =>
    normalized.includes(keyword.replace(/\s+/g, "").toLowerCase()),
  );
}

function inferRegionalSubwayLine(lineToken: string, source: string): string | null {
  const compact = lineToken.replace(/\s+/g, "").trim();
  if (!compact) return null;

  const canonical = canonicalizeSubwayLine(compact);
  const exactRegional = canonical.match(
    /^(서울|인천|부산|대구|광주|대전)([1-9])호선$/,
  )?.[0];
  if (exactRegional) return exactRegional;

  if (canonical === "대전1호선") return canonical;

  const lineNum = canonical.match(/^([1-9])호선$/)?.[1];
  if (!lineNum) return null;

  const regionHints = new Set<"서울" | "인천" | "부산" | "대구" | "광주" | "대전">();
  if (/인천|인천도시철도/.test(source)) regionHints.add("인천");
  if (/부산/.test(source)) regionHints.add("부산");
  if (/대구/.test(source)) regionHints.add("대구");
  if (/광주/.test(source)) regionHints.add("광주");
  if (/대전|대전도시철도/.test(source)) regionHints.add("대전");
  if (/서울|수도권/.test(source)) regionHints.add("서울");
  if (regionHints.size !== 1) return null;
  const [region] = Array.from(regionHints);
  if (!region) return null;
  return `${region}${lineNum}호선`;
}

function normalizeSubwayLines(rawLines: string[], source: string): string[] {
  const lines = new Set<string>();
  const explicitRegionalByLine = new Map<string, Set<string>>();
  const parseRegionalLine = (lineToken: string) => {
    const matched = lineToken.match(/^(서울|인천|부산|대구|광주|대전)([1-9])호선$/);
    if (!matched?.[1] || !matched?.[2]) return null;
    return { region: matched[1], lineNum: matched[2] };
  };

  const markExplicitRegional = (lineToken: string) => {
    const regional = parseRegionalLine(canonicalizeSubwayLine(lineToken));
    if (!regional) return;
    const set = explicitRegionalByLine.get(regional.lineNum) ?? new Set<string>();
    set.add(regional.region);
    explicitRegionalByLine.set(regional.lineNum, set);
  };

  const addLine = (rawToken: string, explicit = false) => {
    const compact = rawToken.replace(/\s+/g, "").trim();
    if (!compact) return;
    const canonical = canonicalizeSubwayLine(compact);
    if (explicit) markExplicitRegional(canonical || compact);
    if (canonical) lines.add(canonical);
    const inferred = inferRegionalSubwayLine(canonical || compact, source);
    if (!inferred) return;

    const inferredRegional = parseRegionalLine(inferred);
    if (inferredRegional) {
      for (const existing of Array.from(lines)) {
        const genericLineNum = existing.match(/^([1-9])호선$/)?.[1];
        if (genericLineNum === inferredRegional.lineNum) {
          lines.delete(existing);
        }
      }
    }

    lines.add(inferred);
  };

  for (const rawLine of rawLines) {
    const line = String(rawLine ?? "").trim();
    if (!line) continue;
    addLine(line);
  }

  const sourceLineRegex =
    /(공항철도|인천공항철도|용인에버라인|에버라인|김포골드라인|김포도시철도|수인분당선|신분당선|경의중앙선|경춘선|경강선|서해선|신림선|신안산선|우이신설선|의정부경전철|동해선|동해본선|동해남부선|동북선|위례선|대경선|동탄인덕원선|대장홍대선|(?:서울|수도권|인천|부산|대구|광주|대전)\s*(?:도시철도|선)?\s*[1-9]호선|[1-9]호선\s*\((?:서울|수도권|인천|부산|대구|광주|대전)\)|대전\s*도시철도|인천\s*1호선|인천\s*2호선|[1-9]호선)/gi;
  const sourceMatches = source.match(sourceLineRegex) ?? [];
  for (const matched of sourceMatches) {
    addLine(matched, true);
  }

  for (const [lineNum, regions] of explicitRegionalByLine.entries()) {
    if (regions.size === 0) continue;
    for (const existing of Array.from(lines)) {
      const existingRegional = parseRegionalLine(existing);
      if (existingRegional && existingRegional.lineNum === lineNum) {
        if (!regions.has(existingRegional.region)) {
          lines.delete(existing);
        }
        continue;
      }

      const genericLineNum = existing.match(/^([1-9])호선$/)?.[1];
      if (genericLineNum === lineNum) {
        lines.delete(existing);
      }
    }
  }

  return Array.from(lines);
}

async function withRetry<T>(fn: () => Promise<T>, maxRetry = MAX_RETRY) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt += 1;
      if (attempt >= maxRetry) {
        throw toAppError(
          error,
          ERR.DB_QUERY,
          "추천 POI 처리 중 오류가 발생했습니다.",
          500,
        );
      }
      const backoff = 300 * 2 ** (attempt - 1);
      await sleep(backoff);
    }
  }
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) {
  let index = 0;
  const workers = Array.from({ length: Math.max(1, concurrency) }).map(
    async () => {
      while (index < items.length) {
        const current = items[index];
        index += 1;
        await worker(current);
      }
    },
  );
  await Promise.all(workers);
}

function buildEmptyStats(): BatchStats {
  return {
    scanned: 0,
    dueCandidates: 0,
    queuedPicked: 0,
    processed: 0,
    succeeded: 0,
    failed: 0,
    upsertedRows: 0,
    categoryCounts: {
      HOSPITAL: 0,
      CLINIC_DAILY: 0,
      MART: 0,
      SUBWAY: 0,
      HIGH_SPEED_RAIL: 0,
      SCHOOL: 0,
      DEPARTMENT_STORE: 0,
      SHOPPING_MALL: 0,
    },
  };
}

function dedupeByProperty(rows: LocationRow[]): Array<{ propertyId: number; lat: number; lng: number }> {
  const seen = new Set<number>();
  const result: Array<{ propertyId: number; lat: number; lng: number }> = [];
  for (const row of rows) {
    const propertyId = row.properties_id;
    if (seen.has(propertyId)) continue;
    const lat = toFiniteNumber(row.lat);
    const lng = toFiniteNumber(row.lng);
    if (lat == null || lng == null) continue;
    seen.add(propertyId);
    result.push({ propertyId, lat, lng });
  }
  return result;
}

async function upsertCategoryRows(params: {
  supabase: SupabaseClient;
  propertyId: number;
  category: RecoPoiCategory;
  rows: PoiUpsertRow[];
}) {
  const { supabase, propertyId, category, rows } = params;

  const { error: deleteError } = await supabase
    .from("property_reco_pois")
    .delete()
    .eq("property_id", propertyId)
    .eq("category", category);

  if (deleteError) {
    throw toRecoPoiBatchError("replacePoiRows.delete", deleteError, {
      propertyId,
      category,
    });
  }
  if (rows.length === 0) return 0;

  const { error: insertError } = await supabase
    .from("property_reco_pois")
    .insert(rows);
  if (insertError) {
    throw toRecoPoiBatchError("replacePoiRows.insert", insertError, {
      propertyId,
      category,
      rowCount: rows.length,
    });
  }
  return rows.length;
}

async function processProperty(params: {
  supabase: SupabaseClient;
  propertyId: number;
  propertyType?: string | null;
  lat: number;
  lng: number;
  kakaoApiKey: string;
  topN: number;
  radius: number;
  stats: BatchStats;
}) {
  const {
    supabase,
    propertyId,
    propertyType,
    lat,
    lng,
    kakaoApiKey,
    topN,
    radius,
    stats,
  } =
    params;

  const now = new Date().toISOString();
  const allowLivingInfra = isLivingInfraAllowed(propertyType);
  for (const category of FETCH_CATEGORIES) {
    if (
      !allowLivingInfra &&
      (category === "SCHOOL" || category === "HOSPITAL")
    ) {
      const clearTargets: RecoPoiCategory[] =
        category === "HOSPITAL"
          ? ["HOSPITAL", "CLINIC_DAILY"]
          : ["SCHOOL"];

      for (const clearCategory of clearTargets) {
        const inserted = await upsertCategoryRows({
          supabase,
          propertyId,
          category: clearCategory,
          rows: [],
        });
        stats.upsertedRows += inserted;
        stats.categoryCounts[clearCategory] += inserted;
      }
      continue;
    }

    const rawPlaces =
      category === "HOSPITAL"
        ? (
            await Promise.all(
              Array.from({ length: HOSPITAL_SEARCH_PAGES }, (_, i) =>
                withRetry(() =>
                  fetchKakaoTopPoisByCategory({
                    kakaoApiKey,
                    category,
                    lat,
                    lng,
                    radius,
                    topN: 15,
                    page: i + 1,
                  }),
                ),
              ),
            )
          ).flat()
        : category === "SUBWAY"
          ? (
              await (async () => {
                const [categoryRows, ...railKeywordRows] = await Promise.all([
                  (async () => {
                    const all: KakaoPlace[] = [];
                    for (let page = 1; page <= KAKAO_MAX_PAGES; page += 1) {
                      const pageRows = await withRetry(() =>
                        fetchKakaoTopPoisByCategory({
                          kakaoApiKey,
                          category,
                          lat,
                          lng,
                          radius,
                          topN: 15,
                          page,
                        }),
                      );
                      if (pageRows.length === 0) break;
                      all.push(...pageRows);
                      // page size 최대치(15)보다 적으면 마지막 페이지
                      if (pageRows.length < 15) break;
                    }
                    return all;
                  })(),
                  ...RAIL_KEYWORDS.map((query) =>
                    withRetry(() =>
                      fetchKakaoTopPoisByKeyword({
                        kakaoApiKey,
                        query,
                        lat,
                        lng,
                        radius,
                        topN: 15,
                      }),
                    ),
                  ),
                ]);

                const keywordRailRows = railKeywordRows
                  .flat()
                  .filter(isLikelyRailStationPlace);

                return [...categoryRows, ...keywordRailRows];
              })()
            )
        : category === "SCHOOL"
          ? await fetchSchoolPlaces({
              kakaoApiKey,
              lat,
              lng,
              radius,
            })
        : await withRetry(() =>
            fetchKakaoTopPoisByCategory({
              kakaoApiKey,
              category,
              lat,
              lng,
              radius,
              topN,
            }),
          );

    const dedupedRawPlaces = Array.from(
      new Map(rawPlaces.map((place) => [place.id, place])).values(),
    );

    if (category === "HOSPITAL") {
      const large: KakaoPlace[] = [];
      const clinicDaily: KakaoPlace[] = [];

      for (const place of dedupedRawPlaces) {
        const decision = filterHospitalTiered(place);
        if (!decision.include) continue;
        if (decision.kind === "HOSPITAL_LARGE") {
          large.push(place);
          continue;
        }
        clinicDaily.push(place);
      }

      const hospitalTargets: Array<{
        category: "HOSPITAL" | "CLINIC_DAILY";
        places: KakaoPlace[];
      }> = [
        { category: "HOSPITAL", places: large.sort(byDistanceAsc).slice(0, Math.min(2, topN)) },
        { category: "CLINIC_DAILY", places: clinicDaily.sort(byDistanceAsc).slice(0, Math.min(3, topN)) },
      ];

      for (const target of hospitalTargets) {
        const rows: PoiUpsertRow[] = [];
        for (let i = 0; i < target.places.length; i += 1) {
          const p = target.places[i];
          const distance = toFiniteNumber(p.distance);
          if (distance == null) continue;

          rows.push({
            property_id: propertyId,
            category: target.category,
            rank: i + 1,
            kakao_place_id: p.id,
            name: p.place_name,
            distance_m: Math.max(0, Math.round(distance)),
            lat: toFiniteNumber(p.y),
            lng: toFiniteNumber(p.x),
            address: p.address_name || null,
            road_address: p.road_address_name || null,
            phone: p.phone || null,
            place_url: p.place_url || null,
            category_name: p.category_name || null,
            fetched_at: now,
            raw_kakao: p as unknown as Record<string, unknown>,
            subway_lines: null,
            subway_station_code: null,
            raw_public: null,
            school_level: null,
            updated_at: now,
          });
        }

        const inserted = await upsertCategoryRows({
          supabase,
          propertyId,
          category: target.category,
          rows,
        });
        stats.upsertedRows += inserted;
        stats.categoryCounts[target.category] += inserted;
      }

      continue;
    }

    if (category === "SCHOOL") {
      const schoolBuckets = buildSchoolBuckets(dedupedRawPlaces);
      const schoolPlaces = SCHOOL_TARGET_LEVELS.flatMap((level) =>
        schoolBuckets[level].slice(0, SCHOOL_BUCKET_LIMIT),
      );
      const rows: PoiUpsertRow[] = [];

      for (let i = 0; i < schoolPlaces.length; i += 1) {
        const p = schoolPlaces[i];
        const distance = toFiniteNumber(p.distance);
        if (distance == null) continue;

        rows.push({
          property_id: propertyId,
          category,
          rank: i + 1,
          kakao_place_id: p.id,
          name: p.place_name,
          distance_m: Math.max(0, Math.round(distance)),
          lat: toFiniteNumber(p.y),
          lng: toFiniteNumber(p.x),
          address: p.address_name || null,
          road_address: p.road_address_name || null,
          phone: p.phone || null,
          place_url: p.place_url || null,
          category_name: p.category_name || null,
          fetched_at: now,
          raw_kakao: p as unknown as Record<string, unknown>,
          subway_lines: null,
          subway_station_code: null,
          raw_public: null,
          school_level: mapSchoolLevelFromCategoryName(
            p.category_name,
            p.place_name,
          ),
          updated_at: now,
        });
      }

      const inserted = await upsertCategoryRows({
        supabase,
        propertyId,
        category,
        rows,
      });
      stats.upsertedRows += inserted;
      stats.categoryCounts[category] += inserted;
      continue;
    }

    if (category === "SUBWAY") {
      const transitBuckets: Record<"SUBWAY" | "HIGH_SPEED_RAIL", KakaoPlace[]> =
        {
          SUBWAY: [],
          HIGH_SPEED_RAIL: [],
        };

      for (const place of dedupedRawPlaces) {
        const transitCategory = classifyTransitCategory(place);
        if (!transitCategory) continue;
        transitBuckets[transitCategory].push(place);
      }

      const transitTargets: Array<"SUBWAY" | "HIGH_SPEED_RAIL"> = [
        "SUBWAY",
        "HIGH_SPEED_RAIL",
      ];

      for (const transitCategory of transitTargets) {
        const places = transitBuckets[transitCategory].slice().sort(byDistanceAsc);
        const rows: PoiUpsertRow[] = [];

        for (let i = 0; i < places.length; i += 1) {
          const p = places[i];
          const distance = toFiniteNumber(p.distance);
          if (distance == null) continue;

          const row: PoiUpsertRow = {
            property_id: propertyId,
            category: transitCategory,
            rank: i + 1,
            kakao_place_id: p.id,
            name: p.place_name,
            distance_m: Math.max(0, Math.round(distance)),
            lat: toFiniteNumber(p.y),
            lng: toFiniteNumber(p.x),
            address: p.address_name || null,
            road_address: p.road_address_name || null,
            phone: p.phone || null,
            place_url: p.place_url || null,
            category_name: p.category_name || null,
            fetched_at: now,
            raw_kakao: p as unknown as Record<string, unknown>,
            subway_lines: null,
            subway_station_code: null,
            raw_public: null,
            school_level: null,
            updated_at: now,
          };

          const enriched = await withRetry(() =>
            enrichSubwayLines({ stationName: p.place_name }),
          );
          const highSpeedFallbackLines =
            transitCategory === "HIGH_SPEED_RAIL"
              ? getHighSpeedRailLinesForStation(toStationToken(p.place_name))
              : [];
          const mergedLinesRaw = [...(enriched.lines ?? []), ...highSpeedFallbackLines];
          const mergedLines =
            transitCategory === "SUBWAY"
              ? normalizeSubwayLines(
                  mergedLinesRaw,
                  `${p.place_name} ${p.category_name ?? ""}`,
                )
              : Array.from(
                  new Set(
                    mergedLinesRaw
                      .map((line) => String(line ?? "").trim())
                      .filter((line) => line.length > 0),
                  ),
                );
          row.subway_lines = mergedLines.length > 0 ? mergedLines : null;
          row.subway_station_code = enriched.stationCode;
          row.raw_public = enriched.rawPublic;

          rows.push(row);
        }

        const inserted = await upsertCategoryRows({
          supabase,
          propertyId,
          category: transitCategory,
          rows,
        });
        stats.upsertedRows += inserted;
        stats.categoryCounts[transitCategory] += inserted;
      }

      continue;
    }

    const places = dedupedRawPlaces;

    const rows: PoiUpsertRow[] = [];
    for (let i = 0; i < places.length; i += 1) {
      const p = places[i];
      const distance = toFiniteNumber(p.distance);
      if (distance == null) continue;

      const row: PoiUpsertRow = {
        property_id: propertyId,
        category,
        rank: i + 1,
        kakao_place_id: p.id,
        name: p.place_name,
        distance_m: Math.max(0, Math.round(distance)),
        lat: toFiniteNumber(p.y),
        lng: toFiniteNumber(p.x),
        address: p.address_name || null,
        road_address: p.road_address_name || null,
        phone: p.phone || null,
        place_url: p.place_url || null,
        category_name: p.category_name || null,
        fetched_at: now,
        raw_kakao: p as unknown as Record<string, unknown>,
        subway_lines: null,
        subway_station_code: null,
        raw_public: null,
        school_level: null,
        updated_at: now,
      };

      if (category === "SCHOOL") {
        row.school_level = mapSchoolLevelFromCategoryName(
          p.category_name,
          p.place_name,
        );
      }

      rows.push(row);
    }

    const inserted = await upsertCategoryRows({
      supabase,
      propertyId,
      category,
      rows,
    });
    stats.upsertedRows += inserted;
    stats.categoryCounts[category as RecoPoiCategory] += inserted;
  }

  const rawMartPlaces = (
    await Promise.all([
      withRetry(() =>
        fetchKakaoTopPoisByCategory({
          kakaoApiKey,
          category: "MART",
          lat,
          lng,
          radius,
          topN: Math.min(15, topN * 5),
        }),
      ),
      ...OUTLET_KEYWORDS.map((query) =>
        withRetry(() =>
          fetchKakaoTopPoisByKeyword({
            kakaoApiKey,
            query,
            lat,
            lng,
            radius,
            topN: 15,
          }),
        ),
      ),
    ])
  ).flat();

  const dedupedMartPlaces = Array.from(
    new Map(rawMartPlaces.map((place) => [place.id, place])).values(),
  );

  const martBuckets: Record<"MART" | "DEPARTMENT_STORE" | "SHOPPING_MALL", KakaoPlace[]> =
    {
      MART: [],
      DEPARTMENT_STORE: [],
      SHOPPING_MALL: [],
    };

  for (const place of dedupedMartPlaces) {
    const decision = filterMartTiered(place);
    if (!decision.include) continue;
    if (decision.kind === "MART_LARGE") {
      martBuckets.MART.push(place);
    } else {
      martBuckets[decision.kind].push(place);
    }
  }

  const martTargetCategories: Array<"MART" | "DEPARTMENT_STORE" | "SHOPPING_MALL"> = [
    "MART",
    "DEPARTMENT_STORE",
    "SHOPPING_MALL",
  ];

  for (const category of martTargetCategories) {
    const rows: PoiUpsertRow[] = [];
    const places = martBuckets[category].slice().sort(byDistanceAsc).slice(0, topN);

    for (let i = 0; i < places.length; i += 1) {
      const p = places[i];
      const distance = toFiniteNumber(p.distance);
      if (distance == null) continue;

      rows.push({
        property_id: propertyId,
        category,
        rank: i + 1,
        kakao_place_id: p.id,
        name: p.place_name,
        distance_m: Math.max(0, Math.round(distance)),
        lat: toFiniteNumber(p.y),
        lng: toFiniteNumber(p.x),
        address: p.address_name || null,
        road_address: p.road_address_name || null,
        phone: p.phone || null,
        place_url: p.place_url || null,
        category_name: p.category_name || null,
        fetched_at: now,
        raw_kakao: p as unknown as Record<string, unknown>,
        subway_lines: null,
        subway_station_code: null,
        raw_public: null,
        school_level: null,
        updated_at: now,
      });
    }

    const inserted = await upsertCategoryRows({
      supabase,
      propertyId,
      category,
      rows,
    });
    stats.upsertedRows += inserted;
    stats.categoryCounts[category] += inserted;
  }
}

export async function runRecoPoiForProperty(input: {
  propertyId: number;
  topN?: number;
  radius?: number;
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const kakaoApiKey = process.env.KAKAO_REST_API_KEY;

  if (!url || !serviceKey || !kakaoApiKey) {
    throw missingRecoPoiBatchConfigError();
  }

  const topN = Math.max(1, Math.min(10, input.topN ?? DEFAULT_TOP_N));
  const radius = Math.max(100, Math.min(20000, input.radius ?? DEFAULT_RADIUS));
  const supabase = createServiceAdminClient();
  const stats = buildEmptyStats();

  const { data: location, error: locationError } = await supabase
    .from("property_locations")
    .select("properties_id, lat, lng")
    .eq("properties_id", input.propertyId)
    .not("lat", "is", null)
    .not("lng", "is", null)
    .order("id", { ascending: true })
    .maybeSingle();

  if (locationError) {
    throw toRecoPoiBatchError("runRecoPoiForProperty.location", locationError, {
      propertyId: input.propertyId,
    });
  }
  if (!location) return { ok: false, reason: "missing_property_location" as const };

  const lat = toFiniteNumber(location.lat);
  const lng = toFiniteNumber(location.lng);
  if (lat == null || lng == null) {
    return { ok: false, reason: "invalid_property_location" as const };
  }

  const { data: propertyTypeRow } = await supabase
    .from("properties")
    .select("property_type")
    .eq("id", input.propertyId)
    .maybeSingle();

  await processProperty({
    supabase,
    propertyId: input.propertyId,
    propertyType: propertyTypeRow?.property_type ?? null,
    lat,
    lng,
    kakaoApiKey,
    topN,
    radius,
    stats,
  });

  return { ok: true, stats } as const;
}

async function markJobResult(params: {
  supabase: SupabaseClient;
  job: JobRow;
  ok: boolean;
  errorMessage?: string;
}) {
  const { supabase, job, ok, errorMessage } = params;
  if (ok) {
    await supabase
      .from("property_reco_poi_jobs")
      .update({
        status: "done",
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    return;
  }

  const attempts = (job.attempts ?? 0) + 1;
  if (attempts >= MAX_RETRY) {
    await supabase
      .from("property_reco_poi_jobs")
      .update({
        status: "failed",
        attempts,
        last_error: errorMessage ?? "unknown_error",
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    return;
  }

  const delayMin = 2 ** attempts;
  const runAfter = new Date(Date.now() + delayMin * 60 * 1000).toISOString();
  await supabase
    .from("property_reco_poi_jobs")
    .update({
      status: "pending",
      attempts,
      run_after: runAfter,
      last_error: errorMessage ?? "retry_scheduled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);
}

export async function runRecoPoiBatch(input?: {
  chunkSize?: number;
  topN?: number;
  radius?: number;
  concurrency?: number;
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const kakaoApiKey = process.env.KAKAO_REST_API_KEY;

  if (!url || !serviceKey || !kakaoApiKey) {
    throw missingRecoPoiBatchConfigError();
  }

  const chunkSize = Math.max(1, input?.chunkSize ?? DEFAULT_CHUNK);
  const topN = Math.max(1, Math.min(10, input?.topN ?? DEFAULT_TOP_N));
  const radius = Math.max(100, Math.min(20000, input?.radius ?? DEFAULT_RADIUS));
  const concurrency = Math.max(1, input?.concurrency ?? DEFAULT_CONCURRENCY);

  const supabase = createServiceAdminClient();
  const stats = buildEmptyStats();

  const nowIso = new Date().toISOString();
  const { data: queuedRows, error: queuedError } = await supabase
    .from("property_reco_poi_jobs")
    .select("id, property_id, attempts")
    .eq("status", "pending")
    .lte("run_after", nowIso)
    .order("run_after", { ascending: true })
    .limit(chunkSize);

  if (queuedError) {
    throw toRecoPoiBatchError("runRecoPoiBatch.queuedJobs", queuedError, {
      chunkSize,
    });
  }
  const queuedJobs = (queuedRows ?? []) as JobRow[];
  stats.queuedPicked = queuedJobs.length;

  if (queuedJobs.length > 0) {
    const queueIds = queuedJobs.map((r) => r.id);
    await supabase
      .from("property_reco_poi_jobs")
      .update({
        status: "running",
        locked_at: nowIso,
        updated_at: nowIso,
      })
      .in("id", queueIds);
  }

  const { data: locationsRows, error: locationError } = await supabase
    .from("property_locations")
    .select("properties_id, lat, lng")
    .not("lat", "is", null)
    .not("lng", "is", null)
    .order("id", { ascending: true });
  if (locationError) {
    throw toRecoPoiBatchError("runRecoPoiBatch.locations", locationError, {
      chunkSize,
    });
  }

  const properties = dedupeByProperty((locationsRows ?? []) as LocationRow[]);
  stats.scanned = properties.length;

  const propertyIds = properties.map((p) => p.propertyId);
  const propertyTypeMap = new Map<number, string | null>();
  if (propertyIds.length > 0) {
    const { data: propertyTypeRows } = await supabase
      .from("properties")
      .select("id, property_type")
      .in("id", propertyIds);
    for (const row of (propertyTypeRows ?? []) as PropertyTypeRow[]) {
      propertyTypeMap.set(row.id, row.property_type);
    }
  }

  const latestFetchedMap = new Map<number, string>();
  if (propertyIds.length > 0) {
    const { data: poiRows } = await supabase
      .from("property_reco_pois")
      .select("property_id, fetched_at")
      .in("property_id", propertyIds)
      .order("fetched_at", { ascending: false });
    for (const row of poiRows ?? []) {
      const pid = row.property_id as number;
      if (!latestFetchedMap.has(pid)) {
        latestFetchedMap.set(pid, String(row.fetched_at));
      }
    }
  }

  const now = Date.now();
  const dueProperties = properties.filter((p) => {
    const latest = latestFetchedMap.get(p.propertyId);
    if (!latest) return true;
    const ageMs = now - new Date(latest).getTime();
    return ageMs >= 7 * 24 * 60 * 60 * 1000;
  });
  stats.dueCandidates = dueProperties.length;

  const jobPropertyIds = new Set(queuedJobs.map((j) => j.property_id));
  const dueTargets = dueProperties
    .filter((p) => !jobPropertyIds.has(p.propertyId))
    .slice(0, Math.max(0, chunkSize - queuedJobs.length));

  const jobTargets = queuedJobs
    .map((job) => {
      const loc = properties.find((p) => p.propertyId === job.property_id);
      if (!loc) return null;
      return {
        job,
        ...loc,
        propertyType: propertyTypeMap.get(loc.propertyId) ?? null,
      };
    })
    .filter(
      (
        v,
      ): v is {
        job: JobRow;
        propertyId: number;
        propertyType: string | null;
        lat: number;
        lng: number;
      } => v !== null,
    );

  const processTargets: Array<{
    propertyId: number;
    propertyType: string | null;
    lat: number;
    lng: number;
    job: JobRow | null;
  }> = [
    ...jobTargets.map((t) => ({
      propertyId: t.propertyId,
      propertyType: t.propertyType,
      lat: t.lat,
      lng: t.lng,
      job: t.job,
    })),
    ...dueTargets.map((t) => ({
      propertyId: t.propertyId,
      propertyType: propertyTypeMap.get(t.propertyId) ?? null,
      lat: t.lat,
      lng: t.lng,
      job: null,
    })),
  ];

  await runWithConcurrency(processTargets, concurrency, async (target) => {
    stats.processed += 1;
    try {
      await processProperty({
        supabase,
        propertyId: target.propertyId,
        propertyType: target.propertyType,
        lat: target.lat,
        lng: target.lng,
        kakaoApiKey,
        topN,
        radius,
        stats,
      });
      stats.succeeded += 1;
      if (target.job) {
        await markJobResult({
          supabase,
          job: target.job,
          ok: true,
        });
      }
    } catch (error) {
      stats.failed += 1;
      if (target.job) {
        await markJobResult({
          supabase,
          job: target.job,
          ok: false,
          errorMessage:
            error instanceof Error ? error.message : "unknown_process_error",
        });
      }
    }
  });

  return stats;
}
