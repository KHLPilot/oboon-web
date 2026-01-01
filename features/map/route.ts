// app/api/map/route.ts
import { NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabaseClient";
type PropertyLocationRow = {
  lat: number | null;
  lng: number | null;
  road_address: string | null;
  jibun_address: string | null;
  region_1depth: string | null;
  region_2depth: string | null;
  region_3depth: string | null;
};

type PropertyRow = {
  id: number;
  name: string | null;
  status: string | null;
  property_locations?: PropertyLocationRow[] | null;
};

type MapItem = {
  id: string;
  title: string;
  status: string | null;
  lat: number;
  lng: number;
  address: string | null;
  region: string | null;
};

export async function GET() {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("properties")
    .select(
      `
      id,
      name,
      status,
      created_at,
      property_locations (
        lat,
        lng,
        road_address,
        jibun_address,
        region_1depth,
        region_2depth,
        region_3depth
      )
    `
    )
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = ((data ?? []) as PropertyRow[])
      .map((p): MapItem | null => {
        const loc = p.property_locations?.[0];
        const lat = loc?.lat;
        const lng = loc?.lng;

        if (lat == null || lng == null) return null;

        const address =
          loc?.road_address ||
          loc?.jibun_address ||
          [loc?.region_1depth, loc?.region_2depth, loc?.region_3depth]
            .filter(Boolean)
            .join(" ");

        return {
          id: String(p.id),
          title: p.name ?? "?œëª© ?†ìŒ",
          status: p.status ?? null,
          lat,
          lng,
          address: address || null,
          region: loc?.region_1depth ?? null,
        };
      }).filter((item): item is MapItem => item !== null);

  return NextResponse.json({ items });
}
