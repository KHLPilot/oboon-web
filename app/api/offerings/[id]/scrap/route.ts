import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";

const adminSupabase = createSupabaseAdminClient();

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const propertyId = Number(id);
    if (!id || isNaN(propertyId)) {
      return NextResponse.json(
        { error: "유효한 현장 ID가 필요합니다." },
        { status: 400 },
      );
    }

    // 로그인 검증 (쿠키 기반)
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

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    // 현장 존재 여부 확인 (공개 스냅샷 기준)
    const { data: snapshot } = await adminSupabase
      .from("property_public_snapshots")
      .select("property_id")
      .eq("property_id", propertyId)
      .maybeSingle();

    if (!snapshot) {
      return NextResponse.json(
        { error: "존재하지 않는 현장입니다." },
        { status: 404 },
      );
    }

    // 기존 찜 조회 → 토글
    const { data: existing, error: fetchError } = await adminSupabase
      .from("offering_scraps")
      .select("id")
      .eq("profile_id", user.id)
      .eq("property_id", propertyId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json(
        { error: "찜 상태를 확인하지 못했습니다." },
        { status: 500 },
      );
    }

    let scrapped = false;

    if (existing) {
      // 찜 해제
      const { error: deleteError } = await adminSupabase
        .from("offering_scraps")
        .delete()
        .eq("profile_id", user.id)
        .eq("property_id", propertyId);

      if (deleteError) {
        return NextResponse.json(
          { error: "찜 해제에 실패했습니다." },
          { status: 500 },
        );
      }
      scrapped = false;
    } else {
      // 찜 등록
      const { error: insertError } = await adminSupabase
        .from("offering_scraps")
        .insert({ profile_id: user.id, property_id: propertyId });

      if (insertError) {
        return NextResponse.json(
          { error: "찜 등록에 실패했습니다." },
          { status: 500 },
        );
      }
      scrapped = true;
    }

    return NextResponse.json({ success: true, scrapped });
  } catch (error) {
    console.error("POST /api/offerings/[id]/scrap 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
