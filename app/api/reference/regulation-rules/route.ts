import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RegulationArea =
  | "non_regulated"
  | "adjustment_target"
  | "speculative_overheated";

type RegulationRuleRow = {
  region_key: string;
  region_1depth: string;
  region_2depth: string | null;
  region_3depth: string | null;
  regulation_area: string;
  is_active: boolean;
  effective_from: string | null;
  effective_to: string | null;
  updated_at: string | null;
};

type ValidationProfileRow = {
  property_id: string;
  regulation_area: string;
  updated_at: string | null;
};

type LocationRow = {
  properties_id: number;
  region_1depth: string | null;
  region_2depth: string | null;
  region_3depth: string | null;
};

type RulePayload = {
  region_1depth: string;
  region_2depth: string | null;
  region_3depth: string | null;
  regulation_area: RegulationArea;
  is_active: true;
};

const adminSupabase = createSupabaseAdminClient();

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

function regulationAreaPriority(value: RegulationArea): number {
  if (value === "speculative_overheated") return 3;
  if (value === "adjustment_target") return 2;
  return 1;
}

function normalizeSegment(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function normalizeKey(
  region1: string,
  region2: string | null,
  region3: string | null,
): string {
  return [region1, region2, region3]
    .filter((segment): segment is string => Boolean(segment))
    .map((segment) => segment.toLowerCase().replace(/\s+/g, ""))
    .join("|");
}

function toTimestamp(raw: string | null): number {
  if (!raw) return 0;
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : 0;
}

function isDateActive(
  now: Date,
  effectiveFromRaw: string | null,
  effectiveToRaw: string | null,
): boolean {
  const from = effectiveFromRaw ? new Date(effectiveFromRaw) : null;
  const to = effectiveToRaw ? new Date(effectiveToRaw) : null;
  if (from && Number.isFinite(from.getTime()) && from.getTime() > now.getTime()) {
    return false;
  }
  if (to && Number.isFinite(to.getTime()) && to.getTime() < now.getTime()) {
    return false;
  }
  return true;
}

async function loadFromMasterTable(now: Date) {
  const { data, error } = await adminSupabase
    .from("regulation_rules")
    .select(
      "region_key, region_1depth, region_2depth, region_3depth, regulation_area, is_active, effective_from, effective_to, updated_at",
    )
    .eq("is_active", true)
    .returns<RegulationRuleRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  const deduped = new Map<
    string,
    { updatedAt: number; priority: number; rule: RulePayload }
  >();
  for (const row of data ?? []) {
    if (!row.is_active) continue;
    if (!isDateActive(now, row.effective_from, row.effective_to)) continue;

    const region1 = normalizeSegment(row.region_1depth);
    const region2 = normalizeSegment(row.region_2depth);
    const region3 = normalizeSegment(row.region_3depth);
    if (!region1) continue;

    const regulationArea = parseRegulationArea(row.regulation_area);
    if (!regulationArea) continue;

    const key = row.region_key || normalizeKey(region1, region2, region3);
    const updatedAt = toTimestamp(row.updated_at);
    const priority = regulationAreaPriority(regulationArea);
    const prev = deduped.get(key);
    if (prev) {
      if (priority < prev.priority) continue;
      if (priority === prev.priority && prev.updatedAt > updatedAt) continue;
    }

    deduped.set(key, {
      updatedAt,
      priority,
      rule: {
        region_1depth: region1,
        region_2depth: region2,
        region_3depth: region3,
        regulation_area: regulationArea,
        is_active: true,
      },
    });
  }

  return Array.from(deduped.values()).map((entry) => entry.rule);
}

async function loadFromValidationProfilesFallback() {
  const { data: profiles, error: profileError } = await adminSupabase
    .from("property_validation_profiles")
    .select("property_id, regulation_area, updated_at")
    .returns<ValidationProfileRow[]>();

  if (profileError) {
    throw new Error(profileError.message);
  }

  const profileRows = profiles ?? [];
  if (profileRows.length === 0) {
    return [] as RulePayload[];
  }

  const propertyIds = Array.from(
    new Set(
      profileRows
        .map((row) => Number(row.property_id))
        .filter((id) => Number.isFinite(id) && id > 0)
        .map((id) => Math.floor(id)),
    ),
  );

  if (propertyIds.length === 0) {
    return [] as RulePayload[];
  }

  const { data: locations, error: locationError } = await adminSupabase
    .from("property_locations")
    .select("properties_id, region_1depth, region_2depth, region_3depth")
    .in("properties_id", propertyIds)
    .returns<LocationRow[]>();

  if (locationError) {
    throw new Error(locationError.message);
  }

  const locationByPropertyId = new Map<number, LocationRow>();
  for (const row of locations ?? []) {
    if (locationByPropertyId.has(row.properties_id)) continue;
    const region1 = normalizeSegment(row.region_1depth);
    if (!region1) continue;
    locationByPropertyId.set(row.properties_id, row);
  }

  const ruleByKey = new Map<
    string,
    { updatedAt: number; priority: number; rule: RulePayload }
  >();

  for (const row of profileRows) {
    const propertyId = Number(row.property_id);
    if (!Number.isFinite(propertyId) || propertyId <= 0) continue;

    const location = locationByPropertyId.get(Math.floor(propertyId));
    if (!location) continue;

    const region1 = normalizeSegment(location.region_1depth);
    const region2 = normalizeSegment(location.region_2depth);
    const region3 = normalizeSegment(location.region_3depth);
    if (!region1) continue;

    const regulationArea = parseRegulationArea(row.regulation_area);
    if (!regulationArea) continue;

    const key = normalizeKey(region1, region2, region3);
    const updatedAt = toTimestamp(row.updated_at);
    const priority = regulationAreaPriority(regulationArea);
    const existing = ruleByKey.get(key);
    if (existing) {
      if (priority < existing.priority) continue;
      if (priority === existing.priority && existing.updatedAt > updatedAt) continue;
    }

    ruleByKey.set(key, {
      updatedAt,
      priority,
      rule: {
        region_1depth: region1,
        region_2depth: region2,
        region_3depth: region3,
        regulation_area: regulationArea,
        is_active: true,
      },
    });
  }

  return Array.from(ruleByKey.values()).map((entry) => entry.rule);
}

export async function GET() {
  try {
    const now = new Date();
    const masterRules = await loadFromMasterTable(now);
    if (masterRules.length > 0) {
      return NextResponse.json({
        rules: masterRules,
        source: "regulation_rules",
        generated_at: now.toISOString(),
      });
    }

    const fallbackRules = await loadFromValidationProfilesFallback();
    return NextResponse.json({
      rules: fallbackRules,
      source: "property_validation_profiles_fallback",
      generated_at: now.toISOString(),
    });
  } catch (error) {
    console.error("GET /api/reference/regulation-rules error:", error);
    return NextResponse.json(
      { error: "regulation_rules_fetch_failed" },
      { status: 500 },
    );
  }
}
