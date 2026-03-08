import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  PropertyValidationProfile,
  RegulationArea,
  ValidationAssetType,
} from "@/features/condition-validation/domain/types";

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
  property_unit_types: UnitPriceRow[] | null;
};

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
  if (!Number.isFinite(ratio) || ratio <= 0 || ratio > 1) return null;
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

function buildProfileFromValidationRow(row: ValidationProfileRow): PropertyValidationProfile | null {
  const matchedPropertyId = toPositiveInt(row.property_id);
  const assetType = parseAssetType(String(row.asset_type));
  const regulationArea = parseRegulationArea(String(row.regulation_area));
  const listPriceRaw = toFiniteNumber(row.list_price_manwon);
  const contractRatio = parseContractRatio(row.contract_ratio);
  if (!matchedPropertyId || !assetType || !regulationArea) return null;
  if (listPriceRaw === null || contractRatio === null) return null;

  return {
    propertyId: String(matchedPropertyId),
    propertyName: null,
    assetType,
    listPrice: normalizePriceToManwon(listPriceRaw),
    contractRatio,
    regulationArea,
    transferRestriction: Boolean(row.transfer_restriction),
    source: "validation_profile",
    matchedPropertyId,
  };
}

function buildProfileFromPropertyRow(row: PropertyFallbackRow): PropertyValidationProfile | null {
  const listPrice = inferRepresentativeListPrice(row.property_unit_types);
  if (listPrice === null) return null;

  const assetType = inferAssetType(row.property_type);
  return {
    propertyId: String(row.id),
    propertyName: row.name,
    assetType,
    listPrice,
    contractRatio: defaultContractRatio(assetType),
    regulationArea: "non_regulated",
    transferRestriction: false,
    source: "property_fallback",
    matchedPropertyId: row.id,
  };
}

export async function loadPropertyProfile(params: {
  adminSupabase: SupabaseClient;
  propertyIdInput: string;
}): Promise<PropertyValidationProfile | null> {
  const { adminSupabase, propertyIdInput } = params;
  const candidates = Array.from(
    new Set([
      propertyIdInput,
      propertyIdInput.trim(),
      String(Number(propertyIdInput)),
    ].filter((value) => value && value !== "NaN")),
  );

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

    const profile = buildProfileFromValidationRow(data);
    if (profile) return profile;
  }

  const selectFields =
    "id, name, property_type, property_unit_types(price_min,price_max,is_price_public)";
  const parsedId = Number(propertyIdInput);

  let row: PropertyFallbackRow | null = null;
  if (Number.isFinite(parsedId) && parsedId > 0) {
    const { data } = await adminSupabase
      .from("properties")
      .select(selectFields)
      .eq("id", Math.floor(parsedId))
      .maybeSingle<PropertyFallbackRow>();
    if (data) row = data;
  }

  if (!row) {
    const { data: exactName } = await adminSupabase
      .from("properties")
      .select(selectFields)
      .eq("name", propertyIdInput)
      .maybeSingle<PropertyFallbackRow>();
    if (exactName) row = exactName;
  }

  if (!row) {
    const { data: fuzzyRows } = await adminSupabase
      .from("properties")
      .select(selectFields)
      .ilike("name", `%${propertyIdInput}%`)
      .limit(1)
      .returns<PropertyFallbackRow[]>();
    if (Array.isArray(fuzzyRows) && fuzzyRows.length > 0) {
      row = fuzzyRows[0] ?? null;
    }
  }

  if (!row) return null;
  return buildProfileFromPropertyRow(row);
}

export function resolveProfileForRecommendation(params: {
  property: PropertyFallbackRow;
  profileRow: ValidationProfileRow | null | undefined;
}): PropertyValidationProfile | null {
  const { property, profileRow } = params;
  const fromProfile = profileRow ? buildProfileFromValidationRow(profileRow) : null;
  if (fromProfile) return fromProfile;
  return buildProfileFromPropertyRow(property);
}
