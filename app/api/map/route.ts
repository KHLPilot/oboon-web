// app/api/map/route.ts
import { NextResponse } from "next/server";
import { fetchMapItemsRouteData } from "@/features/map/services/mapItems.route";

export async function GET() {
  try {
    const items = await fetchMapItemsRouteData();
    return NextResponse.json({ items }, { status: 200 });
  } catch {
    // 페이지 크래시 방지: 항상 빈 배열로 반환
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
