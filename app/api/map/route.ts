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
        image_url,
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

    return NextResponse.json({ items: data }, { status: 200 });
  } catch {
    // 페이지 크래시 방지: 항상 빈 배열로 반환
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
