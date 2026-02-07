import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/terms
 * 관리자 전용: 모든 약관 조회 (is_active 무관)
 */
export async function GET() {
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
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    // admin 권한 확인
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다" },
        { status: 403 }
      );
    }

    // 활성 버전만 조회 (버전 관리용 - 각 타입별 활성 버전)
    const { data, error } = await adminSupabase
      .from("terms")
      .select("*")
      .eq("is_active", true)
      .order("type", { ascending: true });

    if (error) {
      console.error("약관 조회 오류:", error);
      return NextResponse.json(
        { error: "약관 조회에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ terms: data || [] });
  } catch (err: unknown) {
    console.error("관리자 약관 API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/terms
 * 관리자 전용: 약관 수정
 * Body: { id: string, title?: string, content?: string, is_active?: boolean }
 */
export async function PATCH(req: Request) {
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
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    // admin 권한 확인
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, title, content, is_active } = body;

    if (!id) {
      return NextResponse.json(
        { error: "약관 ID가 필요합니다" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await adminSupabase
      .from("terms")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("약관 수정 오류:", error);
      return NextResponse.json(
        { error: "약관 수정에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ term: data });
  } catch (err: unknown) {
    console.error("관리자 약관 수정 API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
