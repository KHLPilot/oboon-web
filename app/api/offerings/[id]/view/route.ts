import { NextResponse } from "next/server";
import {
  fetchOfferingViewSnapshot,
  incrementOfferingViewCount,
} from "@/features/offerings/services/offeringDetail.service";

function parsePropertyId(raw: string): number | null {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;
  const propertyId = parsePropertyId(rawId);
  if (!propertyId) {
    return NextResponse.json({ error: "invalid property id" }, { status: 400 });
  }

  const { data: snapshot, error: snapshotError } =
    await fetchOfferingViewSnapshot(propertyId);

  if (snapshotError) {
    return NextResponse.json(
      { error: "snapshot lookup failed", details: snapshotError.message },
      { status: 500 },
    );
  }

  if (!snapshot) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { data: nextCount, error: incrementError } =
    await incrementOfferingViewCount(propertyId);

  if (incrementError) {
    return NextResponse.json(
      { error: "increment failed", details: incrementError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, propertyId, viewCount: nextCount ?? null });
}
