import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  fetchOfferingViewSnapshot,
  incrementOfferingViewCount,
} from "@/features/offerings/services/offeringDetail.service";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

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

  // 로그인 사용자이면 열람 히스토리 기록
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // 읽기 전용 컨텍스트 무시
            }
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await adminSupabase.rpc("upsert_offering_view_history", {
        p_profile_id: user.id,
        p_property_id: propertyId,
      });
    }
  } catch {
    // 히스토리 기록 실패는 조회수 응답을 막지 않음
  }

  return NextResponse.json({ ok: true, propertyId, viewCount: nextCount ?? null });
}
