// app/api/map/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    const propertyIds = data
      .map((row) => Number(row.id))
      .filter((id) => Number.isFinite(id) && id > 0);

    const mainImageByPropertyId = new Map<number, string>();
    if (propertyIds.length > 0) {
      const { data: mainAssets, error: mainAssetError } = await supabase
        .from("property_image_assets")
        .select("property_id, image_url, updated_at, created_at")
        .eq("kind", "main")
        .eq("is_active", true)
        .in("property_id", propertyIds)
        .order("updated_at", { ascending: false })
        .order("created_at", { ascending: false });

      if (!mainAssetError) {
        ((mainAssets ?? []) as Array<{ property_id: number; image_url: string }>).forEach(
          (row) => {
            if (!mainImageByPropertyId.has(row.property_id)) {
              mainImageByPropertyId.set(row.property_id, row.image_url);
            }
          },
        );
      }
    }

    const items = data.map((row) => ({
      ...row,
      image_url: mainImageByPropertyId.get(Number(row.id)) ?? null,
    }));

    return NextResponse.json({ items }, { status: 200 });
  } catch {
    // 페이지 크래시 방지: 항상 빈 배열로 반환
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
