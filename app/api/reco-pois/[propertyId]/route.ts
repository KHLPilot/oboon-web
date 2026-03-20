import { NextResponse } from "next/server";
import { fetchRecoPoisByPropertyId } from "@/features/reco/services/recoPoi.server";

type SchoolLevel = "ELEMENTARY" | "MIDDLE" | "HIGH" | "UNIVERSITY" | "OTHER";

function toWalkMin(distanceM: number): number {
  return Math.ceil(distanceM / 80);
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parsePropertyId(value: string): number | null {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) return null;
  return Math.floor(id);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ propertyId: string }> },
) {
  const { propertyId: rawPropertyId } = await params;
  const propertyId = parsePropertyId(rawPropertyId);

  if (!propertyId) {
    return NextResponse.json({ error: "Invalid property id" }, { status: 400 });
  }

  const { data, error } = await fetchRecoPoisByPropertyId(propertyId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch pois", details: error.message },
      { status: 500 },
    );
  }

  const rows = data ?? [];

  const subway = rows
    .filter((r) => r.category === "SUBWAY")
    .map((r) => {
      const distance = toFiniteNumber(r.distance_m) ?? 0;
      return {
        station_name: r.name,
        lines: Array.isArray(r.subway_lines) ? r.subway_lines : [],
        distance_m: distance,
        walk_min: toWalkMin(distance),
      };
    });

  const high_speed_rail = rows
    .filter((r) => r.category === "HIGH_SPEED_RAIL")
    .map((r) => {
      const distance = toFiniteNumber(r.distance_m) ?? 0;
      return {
        station_name: r.name,
        lines: Array.isArray(r.subway_lines) ? r.subway_lines : [],
        distance_m: distance,
        walk_min: toWalkMin(distance),
      };
    });

  const schoolTabs: Record<
    Lowercase<SchoolLevel>,
    Array<{ name: string; distance_m: number }>
  > = {
    elementary: [],
    middle: [],
    high: [],
    university: [],
    other: [],
  };

  rows
    .filter((r) => r.category === "SCHOOL")
    .forEach((r) => {
      const level = (r.school_level ?? "OTHER") as SchoolLevel;
      const key = level.toLowerCase() as Lowercase<SchoolLevel>;
      const distance = toFiniteNumber(r.distance_m) ?? 0;
      schoolTabs[key].push({
        name: r.name ?? "",
        distance_m: distance,
      });
    });

  const mart = rows
    .filter((r) => r.category === "MART")
    .map((r) => ({
      name: r.name,
      distance_m: toFiniteNumber(r.distance_m) ?? 0,
    }));

  const hospital = rows
    .filter((r) => r.category === "HOSPITAL")
    .map((r) => ({
      name: r.name,
      distance_m: toFiniteNumber(r.distance_m) ?? 0,
    }));

  const clinic_daily = rows
    .filter((r) => r.category === "CLINIC_DAILY")
    .map((r) => ({
      name: r.name,
      distance_m: toFiniteNumber(r.distance_m) ?? 0,
    }));

  const department_store = rows
    .filter((r) => r.category === "DEPARTMENT_STORE")
    .map((r) => ({
      name: r.name,
      distance_m: toFiniteNumber(r.distance_m) ?? 0,
    }));

  const shopping_mall = rows
    .filter((r) => r.category === "SHOPPING_MALL")
    .map((r) => ({
      name: r.name,
      distance_m: toFiniteNumber(r.distance_m) ?? 0,
    }));

  const fetchedAt = rows
    .map((r) => r.fetched_at)
    .filter(Boolean)
    .sort()
    .at(-1);

  return NextResponse.json({
    property_id: propertyId,
    fetched_at: fetchedAt ?? null,
    subway,
    high_speed_rail,
    school_tabs: schoolTabs,
    mart,
    hospital,
    clinic_daily,
    department_store,
    shopping_mall,
    _meta: {
      walk_min_formula: "ceil(distance_m / 80)",
      todo: "도보 ETA API 연동으로 교체 예정",
    },
  });
}
