// app/api/map/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function normalizeUrl(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      return NextResponse.json(
        { items: [], error: "Missing supabase env" },
        { status: 200 }
      );
    }

    const supabase = createClient(url, anonKey);

    const { data, error } = await supabase
      .from("properties")
      .select(
        `
        id,
        name,
        status,
        property_locations (
          lat,
          lng,
          road_address,
          jibun_address,
          region_1depth,
          region_2depth,
          region_3depth
        ),
        property_unit_types (
          price_min,
          price_max
        )
      `
      )
      .order("id", { ascending: false })
      .limit(200);

    if (error || !data) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const propertyIds = (data || []).map((row) => row.id);
    const { data: mainAssets } = propertyIds.length
      ? await supabase
          .from("property_image_assets")
          .select("property_id, image_url, sort_order, created_at")
          .in("property_id", propertyIds)
          .eq("kind", "main")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true })
      : { data: [] };

    const mainImageMap = new Map<number, string>();
    for (const row of mainAssets ?? []) {
      const url = normalizeUrl(row.image_url);
      if (!url) continue;
      if (!mainImageMap.has(row.property_id)) {
        mainImageMap.set(row.property_id, url);
      }
    }

    const items = (data || []).map((row) => ({
      ...row,
      image_url: mainImageMap.get(row.id) ?? null,
    }));

    return NextResponse.json({ items }, { status: 200 });
  } catch {
    // 페이지 크래시 방지: 항상 빈 배열로 반환
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
