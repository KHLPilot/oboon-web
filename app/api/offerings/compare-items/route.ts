// app/api/offerings/compare-items/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getOfferingsForCompare } from "@/features/offerings/services/offering.compare";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const items = await getOfferingsForCompare([id]);
  const item = items[0] ?? null;
  return NextResponse.json({ item });
}
