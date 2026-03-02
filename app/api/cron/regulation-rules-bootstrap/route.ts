import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RegulationArea =
  | "non_regulated"
  | "adjustment_target"
  | "speculative_overheated";

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

type ExistingRuleRow = {
  region_key: string;
  source: string;
};

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function isAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return req.headers.get("authorization") === `Bearer ${cronSecret}`;
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

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const dryRun = searchParams.get("dryRun") === "true";
    const nowIso = new Date().toISOString();

    const { data: profiles, error: profileError } = await adminSupabase
      .from("property_validation_profiles")
      .select("property_id, regulation_area, updated_at")
      .returns<ValidationProfileRow[]>();

    if (profileError) {
      throw new Error(profileError.message);
    }

    const profileRows = profiles ?? [];
    if (profileRows.length === 0) {
      return NextResponse.json({
        success: true,
        dryRun,
        scanned_profiles: 0,
        prepared_rules: 0,
        upserted_rules: 0,
        skipped_no_location: 0,
        skipped_invalid_area: 0,
        skipped_manual_override: 0,
        started_at: nowIso,
        finished_at: new Date().toISOString(),
      });
    }

    const propertyIds = Array.from(
      new Set(
        profileRows
          .map((row) => Number(row.property_id))
          .filter((id) => Number.isFinite(id) && id > 0)
          .map((id) => Math.floor(id)),
      ),
    );

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

    let skippedNoLocation = 0;
    let skippedInvalidArea = 0;

    const aggregated = new Map<
      string,
      {
        region1: string;
        region2: string | null;
        region3: string | null;
        regulationArea: RegulationArea;
        updatedAt: number;
        count: number;
      }
    >();

    for (const row of profileRows) {
      const propertyId = Number(row.property_id);
      if (!Number.isFinite(propertyId) || propertyId <= 0) continue;

      const location = locationByPropertyId.get(Math.floor(propertyId));
      if (!location) {
        skippedNoLocation += 1;
        continue;
      }

      const region1 = normalizeSegment(location.region_1depth);
      const region2 = normalizeSegment(location.region_2depth);
      const region3 = normalizeSegment(location.region_3depth);
      if (!region1) {
        skippedNoLocation += 1;
        continue;
      }

      const regulationArea = parseRegulationArea(row.regulation_area);
      if (!regulationArea) {
        skippedInvalidArea += 1;
        continue;
      }

      const key = normalizeKey(region1, region2, region3);
      const updatedAt = toTimestamp(row.updated_at);
      const prev = aggregated.get(key);
      if (!prev) {
        aggregated.set(key, {
          region1,
          region2,
          region3,
          regulationArea,
          updatedAt,
          count: 1,
        });
        continue;
      }

      const nextCount = prev.count + 1;
      if (updatedAt >= prev.updatedAt) {
        aggregated.set(key, {
          region1,
          region2,
          region3,
          regulationArea,
          updatedAt,
          count: nextCount,
        });
      } else {
        prev.count = nextCount;
      }
    }

    const preparedRows = Array.from(aggregated.entries()).map(([key, row]) => ({
      region_key: key,
      region_1depth: row.region1,
      region_2depth: row.region2,
      region_3depth: row.region3,
      regulation_area: row.regulationArea,
      source: "derived" as const,
      derived_count: row.count,
      is_active: true,
      updated_at: nowIso,
    }));

    let skippedManualOverride = 0;
    let upsertedRules = 0;

    const keys = preparedRows.map((row) => row.region_key);
    const { data: existingRows, error: existingError } = keys.length
      ? await adminSupabase
          .from("regulation_rules")
          .select("region_key, source")
          .in("region_key", keys)
          .returns<ExistingRuleRow[]>()
      : { data: [], error: null };

    if (existingError) {
      throw new Error(existingError.message);
    }

    const manualKeys = new Set(
      (existingRows ?? [])
        .filter((row) => row.source === "manual")
        .map((row) => row.region_key),
    );

    const upsertRows = preparedRows.filter((row) => {
      const isManual = manualKeys.has(row.region_key);
      if (isManual) skippedManualOverride += 1;
      return !isManual;
    });

    if (!dryRun && upsertRows.length > 0) {
      const { error: upsertError } = await adminSupabase
        .from("regulation_rules")
        .upsert(upsertRows, { onConflict: "region_key,regulation_area" });
      if (upsertError) {
        throw new Error(upsertError.message);
      }
      upsertedRules = upsertRows.length;
    }

    return NextResponse.json({
      success: true,
      dryRun,
      scanned_profiles: profileRows.length,
      prepared_rules: preparedRows.length,
      upserted_rules: upsertedRules,
      skipped_no_location: skippedNoLocation,
      skipped_invalid_area: skippedInvalidArea,
      skipped_manual_override: skippedManualOverride,
      started_at: nowIso,
      finished_at: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "regulation_rules_bootstrap_failed",
        details: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
