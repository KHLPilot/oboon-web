import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return NextResponse.json({ error: "missing supabase env" }, { status: 500 });
  }

  const supabase = createClient(url, serviceRoleKey);

  const { data: snapshot, error: snapshotError } = await supabase
    .from("property_public_snapshots")
    .select("property_id")
    .eq("property_id", propertyId)
    .maybeSingle();

  if (snapshotError) {
    return NextResponse.json(
      { error: "snapshot lookup failed", details: snapshotError.message },
      { status: 500 },
    );
  }

  if (!snapshot) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { data: nextCount, error: incrementError } = await supabase.rpc(
    "increment_property_view_count",
    { p_property_id: propertyId },
  );

  if (incrementError) {
    return NextResponse.json(
      { error: "increment failed", details: incrementError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, propertyId, viewCount: nextCount ?? null });
}
