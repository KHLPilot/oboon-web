// features/offerings/services/offering.compare.ts
import { createSupabaseServer } from "@/lib/supabaseServer";
import {
  normalizeOfferingStatusValue,
  OFFERING_STATUS_VALUES,
} from "@/features/offerings/domain/offering.constants";
import type { OfferingCompareItem } from "../domain/offering.types";
import type { PropertyRow } from "../domain/offeringDetail.types";
import { formatPriceRange } from "@/shared/price";
import { formatManwonWithEok } from "@/lib/format/currency";

type RecoPoiQueryRow = {
  property_id: number;
  category: string;
  rank: number;
  name: string;
  distance_m: number | string | null;
  school_level: string | null;
};

function pickFirst<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function toArray<T>(v: T | T[] | null | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function mapToCompareItem(
  row: PropertyRow,
  pois: RecoPoiQueryRow[],
): OfferingCompareItem {
  const loc = pickFirst(row.property_locations);
  const spec = pickFirst(row.property_specs);
  const timeline = pickFirst(row.property_timeline);
  const unitTypes = toArray(row.property_unit_types);

  const publicUnits = unitTypes.filter(
    (u) => u.is_price_public !== false && u.is_public !== false,
  );

  // Price range (DB 원 단위)
  const prices = publicUnits
    .flatMap((u) => [u.price_min, u.price_max])
    .filter((p): p is number => p !== null && p > 0);
  const priceRange =
    prices.length > 0
      ? formatPriceRange(Math.min(...prices), Math.max(...prices))
      : "미정";

  // Price per pyeong (3.3㎡) — DB 원 단위 → 만원/평으로 변환
  const firstWithData = publicUnits.find(
    (u) => (u.price_min ?? u.price_max) !== null && u.exclusive_area,
  );
  const pricePerPyeong = firstWithData
    ? (() => {
        const priceWon = firstWithData.price_min ?? firstWithData.price_max ?? 0;
        const pyeong = (firstWithData.exclusive_area ?? 0) / 3.3058;
        if (!pyeong) return "미정";
        const manwonPerPyeong = Math.round(priceWon / pyeong / 10_000);
        return `3.3㎡당 ${formatManwonWithEok(manwonPerPyeong)}`;
      })()
    : "미정";

  // Floors
  const floorParts = [
    spec?.floor_underground ? `지하${spec.floor_underground}` : null,
    spec?.floor_ground ? `지상${spec.floor_ground}층` : null,
  ].filter(Boolean);
  const floors = floorParts.length > 0 ? floorParts.join(" / ") : "미정";

  // Parking
  const parking =
    spec?.parking_per_household != null
      ? `세대당 ${spec.parking_per_household}대`
      : "미정";

  // Status
  const raw = (row.status ?? "").trim().toUpperCase();
  const status: OfferingCompareItem["status"] =
    normalizeOfferingStatusValue(raw) ?? OFFERING_STATUS_VALUES[2];

  // Location
  const locationParts = [
    loc?.region_1depth,
    loc?.region_2depth,
    loc?.region_3depth,
  ].filter(Boolean);
  const location =
    locationParts.length > 0
      ? locationParts.join(" ")
      : (loc?.road_address ?? "위치 미정");

  // Unit types string
  const unitTypeStr =
    publicUnits
      .filter((u) => u.type_name)
      .map((u) => u.type_name!)
      .join(" · ") || "미정";

  // Nearest station
  const subwayPoi = pois.find((p) => p.category === "SUBWAY");
  const nearestStation = subwayPoi
    ? `${subwayPoi.name}${subwayPoi.distance_m != null ? ` (${Number(subwayPoi.distance_m)}m)` : ""}`
    : "정보 없음";

  // Distance to CBD (via nearest subway as proxy)
  const distanceToCbd =
    subwayPoi?.distance_m != null
      ? `${(Number(subwayPoi.distance_m) / 1000).toFixed(1)}km`
      : "정보 없음";

  // School grade
  const highSchoolDistances = pois
    .filter((p) => p.category === "SCHOOL" && p.school_level === "HIGH")
    .map((p) =>
      p.distance_m == null || !Number.isFinite(Number(p.distance_m))
        ? null
        : Number(p.distance_m),
    )
    .filter((distance): distance is number => distance !== null);
  const nearestHighSchoolDistance =
    highSchoolDistances.length > 0 ? Math.min(...highSchoolDistances) : null;
  const schoolGrade: "우수" | "보통" | "미흡" =
    nearestHighSchoolDistance == null
      ? "미흡"
      : nearestHighSchoolDistance <= 1000
        ? "우수"
        : "보통";

  // Image — 대표 이미지 우선, 없으면 갤러리 첫 번째
  const galleryImages = toArray(row.property_gallery_images);
  const imageUrl =
    row.image_url ||
    (galleryImages[0] as { image_url?: string | null } | undefined)?.image_url ||
    null;

  return {
    id: String(row.id),
    name: row.name,
    location,
    imageUrl,
    priceRange,
    pricePerPyeong,
    totalUnits: spec?.household_total ?? 0,
    unitTypes: unitTypeStr,
    floors,
    parking,
    status,
    announcementDate: timeline?.announcement_date ?? null,
    applicationStart: timeline?.application_start ?? null,
    applicationEnd: timeline?.application_end ?? null,
    winnerAnnounce: timeline?.winner_announce ?? null,
    contractStart: timeline?.contract_start ?? null,
    contractEnd: timeline?.contract_end ?? null,
    moveInDate: timeline?.move_in_date ?? null,
    moveInText: timeline?.move_in_text ?? null,
    nearestStation,
    distanceToCbd,
    schoolGrade,
    conditionResult: null,
  };
}

export async function getOfferingsForCompare(
  ids: string[],
): Promise<OfferingCompareItem[]> {
  if (!ids.length) return [];

  const numericIds = ids
    .map(Number)
    .filter((id) => Number.isFinite(id) && id > 0);
  if (!numericIds.length) return [];

  const supabase = await createSupabaseServer();

  const [snapshotResult, poisResult] = await Promise.all([
    supabase
      .from("property_public_snapshots")
      .select("property_id, snapshot")
      .in("property_id", numericIds),
    supabase
      .from("property_reco_pois")
      .select("property_id, category, rank, name, distance_m, school_level")
      .in("property_id", numericIds)
      .order("rank", { ascending: true }),
  ]);

  const snapshots = snapshotResult.data ?? [];
  const allPois = (poisResult.data ?? []) as unknown as RecoPoiQueryRow[];

  // Group pois by property_id
  const poisByPropertyId = new Map<number, RecoPoiQueryRow[]>();
  for (const poi of allPois) {
    const key = Number(poi.property_id);
    const existing = poisByPropertyId.get(key) ?? [];
    existing.push(poi);
    poisByPropertyId.set(key, existing);
  }

  // Build snapshot map
  const snapshotMap = new Map<string, PropertyRow>(
    snapshots
      .filter((row) => row.snapshot && typeof row.snapshot === "object")
      .map((row) => [
        String(row.property_id),
        row.snapshot as unknown as PropertyRow,
      ]),
  );

  // Return in the requested order
  return ids
    .map((id) => {
      const snapshot = snapshotMap.get(id);
      if (!snapshot) return null;
      const pois = poisByPropertyId.get(Number(id)) ?? [];
      return mapToCompareItem(snapshot, pois);
    })
    .filter((item): item is OfferingCompareItem => item !== null);
}

// 선택 드롭다운용 기본 현장 목록 (최근 발행 순)
export async function getAvailableOfferingsBasic(): Promise<
  { id: string; name: string; location: string }[]
> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("property_public_snapshots")
    .select("property_id, snapshot")
    .order("published_at", { ascending: false })
    .limit(50);

  if (!data) return [];

  return data
    .map((row) => {
      const snap = row.snapshot as unknown as PropertyRow | null;
      if (!snap || typeof snap !== "object") return null;
      const loc = Array.isArray(snap.property_locations)
        ? (snap.property_locations[0] ?? null)
        : (snap.property_locations ?? null);
      const locationParts = [
        loc?.region_1depth,
        loc?.region_2depth,
      ].filter(Boolean);
      return {
        id: String(row.property_id),
        name: snap.name ?? `현장 #${row.property_id}`,
        location:
          locationParts.length > 0
            ? locationParts.join(" ")
            : (loc?.road_address ?? "위치 미정"),
      };
    })
    .filter(
      (item): item is { id: string; name: string; location: string } =>
        item !== null,
    );
}
