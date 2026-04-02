import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { verifyBearerToken } from "@/lib/api/internal-auth";
import { handleApiError } from "@/lib/api/route-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ValidationAssetType =
  | "apartment"
  | "officetel"
  | "commercial"
  | "knowledge_industry";

type RegulationArea =
  | "non_regulated"
  | "adjustment_target"
  | "speculative_overheated";

type UnitPriceRow = {
  id: number;
  type_name: string | null;
  exclusive_area: number | string | null;
  price_min: number | string | null;
  price_max: number | string | null;
  is_price_public?: boolean | null;
};

type LocationRow = {
  region_1depth: string | null;
  region_2depth: string | null;
  region_3depth: string | null;
};

type PropertyRow = {
  id: number;
  property_type: string | null;
  property_locations: LocationRow[] | null;
  property_unit_types: UnitPriceRow[] | null;
};

type ExistingProfileRow = {
  property_id: string;
  list_price_manwon: number | string;
  contract_ratio: number | string;
  regulation_area: string;
  transfer_restriction: boolean | null;
};

type RegulationRule = {
  region1: string;
  region2: string | null;
  region3: string | null;
  regulationArea: RegulationArea;
};

const adminSupabase = createSupabaseAdminClient();

function isAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  return verifyBearerToken(req.headers.get("authorization"), cronSecret);
}

function toPositiveInt(
  value: string | null,
  fallback: number,
  max: number,
): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const normalized = value.replaceAll(",", "").trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizePriceToManwon(value: number): number {
  return Math.abs(value) >= 10_000_000 ? value / 10_000 : value;
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

function parseRegulationArea(raw: unknown): RegulationArea | null {
  if (
    raw === "non_regulated" ||
    raw === "adjustment_target" ||
    raw === "speculative_overheated"
  ) {
    return raw;
  }
  return null;
}

function inferAssetType(raw: string | null): ValidationAssetType {
  const normalized = normalizeText(raw);
  if (normalized.includes("오피스텔") || normalized.includes("officetel")) {
    return "officetel";
  }
  if (normalized.includes("아파트") || normalized.includes("apartment")) {
    return "apartment";
  }
  if (normalized.includes("지식산업")) {
    return "knowledge_industry";
  }
  if (normalized.includes("상가") || normalized.includes("상업")) {
    return "commercial";
  }
  return "apartment";
}

function defaultContractRatio(assetType: ValidationAssetType): number {
  if (assetType === "apartment") return 0.1;
  if (assetType === "officetel") return 0.1;
  return 0.1;
}

function inferRepresentativeListPrice(unitTypes: UnitPriceRow[] | null): number | null {
  const rows = unitTypes ?? [];
  const visibleRows = rows.filter((row) => row.is_price_public !== false);
  const sourceRows = visibleRows.length > 0 ? visibleRows : rows;

  const candidates = sourceRows
    .map((row) => {
      const max = toFiniteNumber(row.price_max);
      const min = toFiniteNumber(row.price_min);
      if (max !== null && max > 0) return normalizePriceToManwon(max);
      if (min !== null && min > 0) return normalizePriceToManwon(min);
      return null;
    })
    .filter((value): value is number => value !== null);

  if (candidates.length === 0) return null;
  return Math.max(...candidates);
}

function readString(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  return raw.length > 0 ? raw : null;
}

function readBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;
    if (["true", "1", "y", "yes"].includes(normalized)) return true;
    if (["false", "0", "n", "no"].includes(normalized)) return false;
  }
  return null;
}

function readIsoDate(value: unknown): Date | null {
  const raw = readString(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeRuleKey(
  region1: string,
  region2: string | null,
  region3: string | null,
): string {
  return [region1, region2, region3]
    .filter((segment): segment is string => Boolean(segment))
    .map((segment) => normalizeText(segment))
    .join("|");
}

function pickPrimaryLocation(locations: LocationRow[] | null): LocationRow | null {
  const rows = locations ?? [];
  if (rows.length === 0) return null;

  const withRegion = rows.find((row) => row.region_1depth);
  return withRegion ?? rows[0] ?? null;
}

function resolveRegulationRule(
  ruleMap: Map<string, RegulationRule>,
  location: LocationRow | null,
): RegulationRule | null {
  if (!location?.region_1depth) return null;

  const keys = [
    normalizeRuleKey(
      location.region_1depth,
      location.region_2depth,
      location.region_3depth,
    ),
    normalizeRuleKey(location.region_1depth, location.region_2depth, null),
    normalizeRuleKey(location.region_1depth, null, null),
  ];

  for (const key of keys) {
    const rule = ruleMap.get(key);
    if (rule) return rule;
  }

  return null;
}

async function loadRegulationRuleMap(
  now: Date,
  defaultSourceUrl: string | null,
): Promise<{
  ruleMap: Map<string, RegulationRule>;
  sourceUrl: string | null;
  loadedCount: number;
}> {
  const sourceUrl =
    readString(process.env.REGULATION_SYNC_SOURCE_URL) ??
    readString(defaultSourceUrl);
  if (!sourceUrl) {
    return {
      ruleMap: new Map<string, RegulationRule>(),
      sourceUrl: null,
      loadedCount: 0,
    };
  }

  const token = readString(process.env.REGULATION_SYNC_SOURCE_TOKEN);
  const response = await fetch(sourceUrl, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`regulation source fetch failed: ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { rules?: unknown[] } | null)?.rules)
      ? ((payload as { rules: unknown[] }).rules ?? [])
      : [];

  const nextMap = new Map<string, RegulationRule>();

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;

    const regulationArea = parseRegulationArea(
      row.regulation_area ?? row.regulationArea,
    );
    if (!regulationArea) continue;

    const region1 = readString(
      row.region_1depth ?? row.region1Depth ?? row.sido ?? row.province,
    );
    const region2 = readString(
      row.region_2depth ?? row.region2Depth ?? row.sigungu ?? row.city,
    );
    const region3 = readString(
      row.region_3depth ?? row.region3Depth ?? row.dong ?? row.town,
    );
    if (!region1) continue;

    const isActive = readBoolean(row.is_active ?? row.isActive);
    if (isActive === false) continue;

    const effectiveFrom = readIsoDate(row.effective_from ?? row.effectiveFrom);
    const effectiveTo = readIsoDate(row.effective_to ?? row.effectiveTo);

    if (effectiveFrom && effectiveFrom.getTime() > now.getTime()) {
      continue;
    }
    if (effectiveTo && effectiveTo.getTime() < now.getTime()) {
      continue;
    }

    const key = normalizeRuleKey(region1, region2, region3);
    nextMap.set(key, {
      region1,
      region2,
      region3,
      regulationArea,
    });
  }

  return {
    ruleMap: nextMap,
    sourceUrl,
    loadedCount: nextMap.size,
  };
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams, origin } = new URL(req.url);
    const chunkSize = toPositiveInt(searchParams.get("chunk"), 200, 1000);
    const maxRows = toPositiveInt(searchParams.get("maxRows"), 0, 100_000);
    const dryRun = searchParams.get("dryRun") === "true";

    const now = new Date();
    const defaultSourceUrl = `${origin}/api/reference/regulation-rules`;
    const { ruleMap, sourceUrl, loadedCount } = await loadRegulationRuleMap(
      now,
      defaultSourceUrl,
    );

    let from = 0;
    let scanned = 0;
    let prepared = 0;
    let upserted = 0;
    let skippedNoPrice = 0;
    let syncedFromRule = 0;

    while (true) {
      const { data: properties, error: propertiesError } = await adminSupabase
        .from("properties")
        .select(
          "id, property_type, property_locations(region_1depth,region_2depth,region_3depth), property_unit_types(id,type_name,exclusive_area,price_min,price_max,is_price_public)",
        )
        .order("id", { ascending: true })
        .range(from, from + chunkSize - 1)
        .returns<PropertyRow[]>();

      if (propertiesError) {
        throw new Error(propertiesError.message);
      }

      if (!properties || properties.length === 0) {
        break;
      }

      const propertyIds = properties.map((property) => String(property.id));
      const { data: existingProfiles, error: profileError } = await adminSupabase
        .from("property_validation_profiles")
        .select(
          "property_id, list_price_manwon, contract_ratio, regulation_area, transfer_restriction",
        )
        .in("property_id", propertyIds)
        .returns<ExistingProfileRow[]>();

      if (profileError) {
        throw new Error(profileError.message);
      }

      const profileByPropertyId = new Map<string, ExistingProfileRow>();
      for (const row of existingProfiles ?? []) {
        profileByPropertyId.set(String(row.property_id), row);
      }

      const payload = properties
        .map((property) => {
          const propertyId = String(property.id);
          const existing = profileByPropertyId.get(propertyId);
          const listPriceFromUnits = inferRepresentativeListPrice(
            property.property_unit_types,
          );
          const listPriceFromExistingRaw = toFiniteNumber(
            existing?.list_price_manwon,
          );
          const listPriceFromExisting =
            listPriceFromExistingRaw === null
              ? null
              : normalizePriceToManwon(listPriceFromExistingRaw);
          const listPriceManwon = listPriceFromUnits ?? listPriceFromExisting;

          if (listPriceManwon === null || listPriceManwon <= 0) {
            skippedNoPrice += 1;
            return null;
          }

          const assetType = inferAssetType(property.property_type);
          const contractRatio =
            toFiniteNumber(existing?.contract_ratio) ??
            defaultContractRatio(assetType);
          const location = pickPrimaryLocation(property.property_locations);
          const rule = resolveRegulationRule(ruleMap, location);
          const regulationArea =
            rule?.regulationArea ??
            parseRegulationArea(existing?.regulation_area) ??
            "non_regulated";
          const transferRestriction = Boolean(existing?.transfer_restriction);

          if (rule) {
            syncedFromRule += 1;
          }

          return {
            property_id: propertyId,
            asset_type: assetType,
            list_price_manwon: listPriceManwon,
            contract_ratio: contractRatio,
            regulation_area: regulationArea,
            transfer_restriction: transferRestriction,
            updated_at: now.toISOString(),
          };
        })
        .filter(
          (
            row,
          ): row is {
            property_id: string;
            asset_type: ValidationAssetType;
            list_price_manwon: number;
            contract_ratio: number;
            regulation_area: RegulationArea;
            transfer_restriction: boolean;
            updated_at: string;
          } => row !== null,
        );

      scanned += properties.length;
      prepared += payload.length;

      if (!dryRun && payload.length > 0) {
        const { error: upsertError } = await adminSupabase
          .from("property_validation_profiles")
          .upsert(payload, { onConflict: "property_id" });

        if (upsertError) {
          throw new Error(upsertError.message);
        }

        upserted += payload.length;
      }

      // 타입별 프로파일 upsert
      const unitPayload = properties.flatMap((property) => {
        const propertyId = String(property.id);
        const assetType = inferAssetType(property.property_type);
        const contractRatio = defaultContractRatio(assetType);
        const location = pickPrimaryLocation(property.property_locations);
        const rule = resolveRegulationRule(ruleMap, location);
        const regulationArea =
          rule?.regulationArea ?? "non_regulated";
        const transferRestriction = Boolean(
          profileByPropertyId.get(propertyId)?.transfer_restriction,
        );

        return (property.property_unit_types ?? []).flatMap((unit) => {
          const priceMax = toFiniteNumber(unit.price_max);
          const priceMin = toFiniteNumber(unit.price_min);
          const rawPrice =
            priceMax !== null && priceMax > 0
              ? priceMax
              : priceMin !== null && priceMin > 0
                ? priceMin
                : null;
          if (rawPrice === null) return [];

          const listPriceManwon = normalizePriceToManwon(rawPrice);
          if (listPriceManwon <= 0) return [];

          const exclusiveArea = toFiniteNumber(unit.exclusive_area);

          return [
            {
              property_id: propertyId,
              unit_type_id: unit.id,
              unit_type_name: unit.type_name ?? null,
              exclusive_area: exclusiveArea,
              list_price_manwon: listPriceManwon,
              asset_type: assetType,
              contract_ratio: contractRatio,
              regulation_area: regulationArea,
              transfer_restriction: transferRestriction,
              is_price_public: unit.is_price_public !== false,
              updated_at: now.toISOString(),
            },
          ];
        });
      });

      if (!dryRun && unitPayload.length > 0) {
        const { error: unitUpsertError } = await adminSupabase
          .from("property_unit_validation_profiles")
          .upsert(unitPayload, { onConflict: "property_id,unit_type_id" });

        if (unitUpsertError && !unitUpsertError.message.includes("does not exist")) {
          throw new Error(unitUpsertError.message);
        }
      }

      if (maxRows > 0 && scanned >= maxRows) {
        break;
      }

      if (properties.length < chunkSize) {
        break;
      }

      from += chunkSize;
    }

    return NextResponse.json({
      success: true,
      dryRun,
      scanned,
      prepared,
      upserted,
      skipped_no_price: skippedNoPrice,
      synced_from_regulation_rule: syncedFromRule,
      regulation_source: sourceUrl,
      regulation_rules_loaded: loadedCount,
      chunk_size: chunkSize,
      max_rows: maxRows > 0 ? maxRows : null,
      started_at: now.toISOString(),
      finished_at: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError("condition-validation-profiles 재동기화", error, {
      clientMessage: "조건검증 프로필 동기화 중 오류가 발생했습니다",
    });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
