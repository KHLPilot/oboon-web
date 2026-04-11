import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  PropertyValidationProfile,
  RegulationArea,
  UnitTypeValidationProfile,
  ValidationAssetType,
} from "@/features/condition-validation/domain/types";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

type UnitPriceRow = {
  price_min: number | string | null;
  price_max: number | string | null;
  is_price_public?: boolean | null;
};

type ValidationProfileRow = {
  property_id: string;
  asset_type: string;
  list_price_manwon: number | string;
  contract_ratio: number | string;
  regulation_area: string;
  transfer_restriction: boolean | null;
};

type PropertyFallbackRow = {
  id: number;
  name: string | null;
  property_type: string | null;
  property_specs:
    | Array<{
        id: number;
        sale_type: string | null;
        developer: string | null;
        builder: string | null;
        household_total: number | string | null;
        parking_per_household: number | string | null;
        heating_type: string | null;
        amenities: string | null;
        floor_area_ratio: number | string | null;
        building_coverage_ratio: number | string | null;
      }>
    | {
        id: number;
        sale_type: string | null;
        developer: string | null;
        builder: string | null;
        household_total: number | string | null;
        parking_per_household: number | string | null;
        heating_type: string | null;
        amenities: string | null;
        floor_area_ratio: number | string | null;
        building_coverage_ratio: number | string | null;
      }
    | null;
  property_timeline:
    | Array<{
        id: number;
        move_in_date: string | null;
      }>
    | {
        id: number;
        move_in_date: string | null;
      }
    | null;
  property_unit_types: UnitPriceRow[] | null;
};

const CONDITION_PROFILE_CACHE_TTL_SECONDS = 60 * 5;
const PROPERTY_SELECT_FIELDS =
  "id, name, property_type, property_specs(id,sale_type,developer,builder,household_total,parking_per_household,heating_type,amenities,floor_area_ratio,building_coverage_ratio), property_timeline(id,move_in_date), property_unit_types(price_min,price_max,is_price_public)";

function isMissingTableError(error: { code?: string | null; message?: string | null }): boolean {
  const code = error.code ?? "";
  const message = error.message ?? "";
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    message.includes("does not exist") ||
    message.includes("Could not find the table")
  );
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/\s+/g, "");
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

function toPositiveInt(value: unknown): number | null {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return null;
  const asInt = Math.floor(parsed);
  return asInt > 0 ? asInt : null;
}

function parseAssetType(raw: string): ValidationAssetType | null {
  if (
    raw === "apartment" ||
    raw === "officetel" ||
    raw === "commercial" ||
    raw === "knowledge_industry"
  ) {
    return raw;
  }
  return null;
}

function parseRegulationArea(raw: string): RegulationArea | null {
  if (
    raw === "non_regulated" ||
    raw === "adjustment_target" ||
    raw === "speculative_overheated"
  ) {
    return raw;
  }
  return null;
}

function parseContractRatio(raw: unknown): number | null {
  const parsed = toFiniteNumber(raw);
  if (parsed === null) return null;
  const ratio = parsed > 1 ? parsed / 100 : parsed;
  if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1) return null;
  return ratio;
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

function normalizePriceToManwon(value: number): number {
  // Legacy data may contain KRW; normalize to manwon.
  return Math.abs(value) >= 10_000_000 ? value / 10000 : value;
}

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function buildPropertyFields(row: PropertyFallbackRow) {
  const specs = firstRow(row.property_specs);
  const timeline = firstRow(row.property_timeline);

  return {
    propertyType: row.property_type ?? null,
    rooms: null,
    bathrooms: null,
    exclusiveArea: null,
    parkingPerHousehold: toFiniteNumber(specs?.parking_per_household),
    householdTotal: toFiniteNumber(specs?.household_total),
    heatingType: specs?.heating_type ?? null,
    amenities: specs?.amenities ?? null,
    floorAreaRatio: toFiniteNumber(specs?.floor_area_ratio),
    buildingCoverageRatio: toFiniteNumber(specs?.building_coverage_ratio),
    saleType: specs?.sale_type ?? null,
    developer: specs?.developer ?? null,
    builder: specs?.builder ?? null,
    moveInDate: timeline?.move_in_date ?? null,
  };
}

function inferRepresentativeListPrice(unitTypes: UnitPriceRow[] | null): number | null {
  const rows = unitTypes ?? [];
  const visibleRows = rows.filter((row) => row.is_price_public !== false);
  const sourceRows = visibleRows.length > 0 ? visibleRows : rows;

  const candidates = sourceRows
    .map((row) => {
      const priceMax = toFiniteNumber(row.price_max);
      const priceMin = toFiniteNumber(row.price_min);
      if (priceMax !== null && priceMax > 0) return normalizePriceToManwon(priceMax);
      if (priceMin !== null && priceMin > 0) return normalizePriceToManwon(priceMin);
      return null;
    })
    .filter((value): value is number => value !== null);

  if (candidates.length === 0) return null;
  return Math.max(...candidates);
}

function buildProfileFromValidationRow(
  row: ValidationProfileRow,
  propertyRow?: PropertyFallbackRow | null,
): PropertyValidationProfile | null {
  const matchedPropertyId = toPositiveInt(row.property_id);
  const assetType = parseAssetType(String(row.asset_type));
  const regulationArea = parseRegulationArea(String(row.regulation_area));
  const listPriceRaw = toFiniteNumber(row.list_price_manwon);
  const contractRatio = parseContractRatio(row.contract_ratio);
  if (!matchedPropertyId || !assetType || !regulationArea) return null;
  if (listPriceRaw === null || contractRatio === null) return null;

  const propertyFields = propertyRow
    ? buildPropertyFields(propertyRow)
    : {
        propertyType: null,
        rooms: null,
        bathrooms: null,
        exclusiveArea: null,
        parkingPerHousehold: null,
        householdTotal: null,
        heatingType: null,
        amenities: null,
        floorAreaRatio: null,
        buildingCoverageRatio: null,
        saleType: null,
        developer: null,
        builder: null,
        moveInDate: null,
      };

  return {
    propertyId: String(matchedPropertyId),
    propertyName: propertyRow?.name ?? null,
    assetType,
    listPrice: normalizePriceToManwon(listPriceRaw),
    contractRatio,
    regulationArea,
    transferRestriction: Boolean(row.transfer_restriction),
    transferRestrictionPeriod: null,
    ...propertyFields,
    source: "validation_profile",
    matchedPropertyId,
  };
}

function buildProfileFromPropertyRow(row: PropertyFallbackRow): PropertyValidationProfile | null {
  const listPrice = inferRepresentativeListPrice(row.property_unit_types);
  if (listPrice === null) return null;

  const assetType = inferAssetType(row.property_type);
  const propertyFields = buildPropertyFields(row);
  return {
    propertyId: String(row.id),
    propertyName: row.name,
    assetType,
    listPrice,
    contractRatio: defaultContractRatio(assetType),
    regulationArea: "non_regulated",
    transferRestriction: false,
    transferRestrictionPeriod: null,
    ...propertyFields,
    source: "property_fallback",
    matchedPropertyId: row.id,
  };
}

function getPropertyIdCandidates(propertyIdInput: string): string[] {
  return Array.from(
    new Set([
      propertyIdInput,
      propertyIdInput.trim(),
      String(Number(propertyIdInput)),
    ].filter((value) => value && value !== "NaN")),
  );
}

async function loadPropertyProfileFromSource(params: {
  adminSupabase: SupabaseClient;
  propertyIdInput: string;
}): Promise<PropertyValidationProfile | null> {
  const { adminSupabase, propertyIdInput } = params;
  const candidates = getPropertyIdCandidates(propertyIdInput);
  let validationProfileRow: ValidationProfileRow | null = null;

  for (const candidate of candidates) {
    const { data, error } = await adminSupabase
      .from("property_validation_profiles")
      .select(
        "property_id, asset_type, list_price_manwon, contract_ratio, regulation_area, transfer_restriction",
      )
      .eq("property_id", candidate)
      .maybeSingle<ValidationProfileRow>();

    if (error) {
      if (!isMissingTableError(error)) {
        throw new Error(error.message);
      }
      break;
    }
    if (!data) continue;
    validationProfileRow = data;
    break;
  }

  const parsedId = Number(propertyIdInput);

  let row: PropertyFallbackRow | null = null;
  if (Number.isFinite(parsedId) && parsedId > 0) {
    const { data } = await adminSupabase
      .from("properties")
      .select(PROPERTY_SELECT_FIELDS)
      .eq("id", Math.floor(parsedId))
      .maybeSingle<PropertyFallbackRow>();
    if (data) row = data;
  }

  if (!row) {
    const { data: exactName } = await adminSupabase
      .from("properties")
      .select(PROPERTY_SELECT_FIELDS)
      .eq("name", propertyIdInput)
      .maybeSingle<PropertyFallbackRow>();
    if (exactName) row = exactName;
  }

  if (!row) {
    const { data: fuzzyRows } = await adminSupabase
      .from("properties")
      .select(PROPERTY_SELECT_FIELDS)
      .ilike("name", `%${propertyIdInput}%`)
      .limit(1)
      .returns<PropertyFallbackRow[]>();
    if (Array.isArray(fuzzyRows) && fuzzyRows.length > 0) {
      row = fuzzyRows[0] ?? null;
    }
  }

  if (validationProfileRow) {
    const profile = buildProfileFromValidationRow(validationProfileRow, row);
    if (profile) return profile;
  }

  if (!row) return null;
  return buildProfileFromPropertyRow(row);
}

const loadPropertyProfileCached = unstable_cache(
  async (propertyIdInput: string) =>
    loadPropertyProfileFromSource({
      adminSupabase: createSupabaseAdminClient(),
      propertyIdInput,
    }),
  ["condition-validation-property-profile"],
  { revalidate: CONDITION_PROFILE_CACHE_TTL_SECONDS },
);

export async function loadPropertyProfile(params: {
  adminSupabase: SupabaseClient;
  propertyIdInput: string;
}): Promise<PropertyValidationProfile | null> {
  const normalizedPropertyIdInput = params.propertyIdInput.trim();

  if (process.env.NODE_ENV === "test") {
    return loadPropertyProfileFromSource({
      adminSupabase: params.adminSupabase,
      propertyIdInput: normalizedPropertyIdInput,
    });
  }

  return loadPropertyProfileCached(normalizedPropertyIdInput);
}

type UnitValidationProfileRow = {
  property_id: string;
  unit_type_id: number;
  unit_type_name: string | null;
  exclusive_area: number | string | null;
  list_price_manwon: number | string;
  asset_type: string;
  contract_ratio: number | string;
  regulation_area: string;
  transfer_restriction: boolean | null;
  is_price_public: boolean | null;
};

async function loadUnitValidationProfilesFromSource(params: {
  adminSupabase: SupabaseClient;
  propertyId: string;
}): Promise<UnitTypeValidationProfile[]> {
  const { adminSupabase, propertyId } = params;

  const candidates = getPropertyIdCandidates(propertyId);

  for (const candidate of candidates) {
    const { data, error } = await adminSupabase
      .from("property_unit_validation_profiles")
      .select(
        "property_id,unit_type_id,unit_type_name,exclusive_area,list_price_manwon,asset_type,contract_ratio,regulation_area,transfer_restriction,is_price_public",
      )
      .eq("property_id", candidate)
      .returns<UnitValidationProfileRow[]>();

    if (error) {
      if (!isMissingTableError(error)) throw new Error(error.message);
      break;
    }
    if (!data || data.length === 0) continue;

    return data
      .map((row): UnitTypeValidationProfile | null => {
        const assetType = parseAssetType(String(row.asset_type));
        const regulationArea = parseRegulationArea(String(row.regulation_area));
        const listPriceRaw = toFiniteNumber(row.list_price_manwon);
        const contractRatio = parseContractRatio(row.contract_ratio);
        if (!assetType || !regulationArea || listPriceRaw === null || contractRatio === null) {
          return null;
        }
        return {
          propertyId: candidate,
          unitTypeId: row.unit_type_id,
          unitTypeName: row.unit_type_name ?? null,
          exclusiveArea: toFiniteNumber(row.exclusive_area),
          listPriceManwon: normalizePriceToManwon(listPriceRaw),
          isPricePublic: row.is_price_public !== false,
          assetType,
          contractRatio,
          regulationArea,
          transferRestriction: Boolean(row.transfer_restriction),
        };
      })
      .filter((v): v is UnitTypeValidationProfile => v !== null);
  }

  // 폴백: property_unit_types에서 동적 계산
  const parsedId = Number(propertyId);
  if (!Number.isFinite(parsedId) || parsedId <= 0) return [];

  const { data: property } = await adminSupabase
    .from("properties")
    .select(
      "id, property_type, property_unit_types(id,type_name,exclusive_area,price_min,price_max,is_price_public)",
    )
    .eq("id", Math.floor(parsedId))
    .maybeSingle<{
      id: number;
      property_type: string | null;
      property_unit_types: Array<{
        id: number;
        type_name: string | null;
        exclusive_area: number | string | null;
        price_min: number | string | null;
        price_max: number | string | null;
        is_price_public?: boolean | null;
      }> | null;
    }>();

  if (!property) return [];

  const assetType = inferAssetType(property.property_type);
  const contractRatio = defaultContractRatio(assetType);

  return (property.property_unit_types ?? [])
    .map((unit): UnitTypeValidationProfile | null => {
      const priceMax = toFiniteNumber(unit.price_max);
      const priceMin = toFiniteNumber(unit.price_min);
      const rawPrice =
        priceMax !== null && priceMax > 0
          ? priceMax
          : priceMin !== null && priceMin > 0
            ? priceMin
            : null;
      if (rawPrice === null) return null;

      const listPriceManwon = normalizePriceToManwon(rawPrice);
      if (listPriceManwon <= 0) return null;

      return {
        propertyId: String(property.id),
        unitTypeId: unit.id,
        unitTypeName: unit.type_name ?? null,
        exclusiveArea: toFiniteNumber(unit.exclusive_area),
        listPriceManwon,
        isPricePublic: unit.is_price_public !== false,
        assetType,
        contractRatio,
        regulationArea: "non_regulated",
        transferRestriction: false,
      };
    })
    .filter((v): v is UnitTypeValidationProfile => v !== null);
}

const loadUnitValidationProfilesCached = unstable_cache(
  async (propertyId: string) =>
    loadUnitValidationProfilesFromSource({
      adminSupabase: createSupabaseAdminClient(),
      propertyId,
    }),
  ["condition-validation-unit-profiles"],
  { revalidate: CONDITION_PROFILE_CACHE_TTL_SECONDS },
);

export async function loadUnitValidationProfiles(params: {
  adminSupabase: SupabaseClient;
  propertyId: string;
}): Promise<UnitTypeValidationProfile[]> {
  const normalizedPropertyId = params.propertyId.trim();

  if (process.env.NODE_ENV === "test") {
    return loadUnitValidationProfilesFromSource({
      adminSupabase: params.adminSupabase,
      propertyId: normalizedPropertyId,
    });
  }

  return loadUnitValidationProfilesCached(normalizedPropertyId);
}

export function resolveProfileForRecommendation(params: {
  property: PropertyFallbackRow;
  profileRow: ValidationProfileRow | null | undefined;
}): PropertyValidationProfile | null {
  const { property, profileRow } = params;
  const fromProfile = profileRow ? buildProfileFromValidationRow(profileRow, property) : null;
  if (fromProfile) return fromProfile;
  return buildProfileFromPropertyRow(property);
}
