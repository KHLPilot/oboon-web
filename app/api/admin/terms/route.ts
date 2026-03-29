import { NextResponse } from "next/server";
import { adminSupabase, requireAdminRoute } from "@/lib/api/admin-route";

/**
 * GET /api/admin/terms
 * 관리자 전용: 모든 약관 조회 (is_active 무관)
 */
export async function GET() {
  try {
    const auth = await requireAdminRoute();
    if (!auth.ok) {
      return auth.response;
    }

    // 활성 버전만 조회 (버전 관리용 - 각 타입별 활성 버전)
    // signup_age_check는 전문이 없으므로 관리자 페이지에서 제외
    const { data, error } = await adminSupabase
      .from("terms")
      .select("*")
      .eq("is_active", true)
      .neq("type", "signup_age_check")
      .order("display_order", { ascending: true })
      .order("type", { ascending: true });

    if (error) {
      console.error("약관 조회 오류:", error);
      return NextResponse.json(
        { error: "약관 조회에 실패했습니다" },
        { status: 500 }
      );
    }

    // 한국 시간(KST)으로 변환하여 반환
    const termsWithKST = (data || []).map((term) => ({
      ...term,
      updated_at_kst: term.updated_at
        ? new Date(term.updated_at).toLocaleString("ko-KR", {
            timeZone: "Asia/Seoul",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        : null,
    }));

    return NextResponse.json({ terms: termsWithKST });
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
 * 관리자 전용: 약관 수정 → 새 버전 생성 (기존 버전 비활성화)
 * Body: { id: string, title?: string, content?: string }
 */
export async function PATCH(req: Request) {
  try {
    const auth = await requireAdminRoute();
    if (!auth.ok) {
      return auth.response;
    }

    const body = await req.json();
    const { id, title, content } = body;

    if (!id) {
      return NextResponse.json(
        { error: "약관 ID가 필요합니다" },
        { status: 400 }
      );
    }

    // 기존 약관 조회
    const { data: existingTerm, error: fetchError } = await adminSupabase
      .from("terms")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existingTerm) {
      return NextResponse.json(
        { error: "약관을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 내용이 변경되지 않았으면 그냥 반환
    const newTitle = title ?? existingTerm.title;
    const newContent = content ?? existingTerm.content;

    if (newTitle === existingTerm.title && newContent === existingTerm.content) {
      return NextResponse.json({ term: existingTerm, message: "변경 사항이 없습니다." });
    }

    // 1. 기존 버전 비활성화
    await adminSupabase
      .from("terms")
      .update({ is_active: false })
      .eq("id", id);

    // 2. 새 버전 생성
    const newVersion = (existingTerm.version || 1) + 1;

    const { data: newTerm, error: insertError } = await adminSupabase
      .from("terms")
      .insert({
        type: existingTerm.type,
        version: newVersion,
        title: newTitle,
        content: newContent,
        is_active: true,
        is_required: existingTerm.is_required,
        display_order: existingTerm.display_order,
        created_by: auth.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: auth.user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("새 약관 버전 생성 오류:", insertError);
      // 롤백: 기존 버전 다시 활성화
      await adminSupabase
        .from("terms")
        .update({ is_active: true })
        .eq("id", id);

      return NextResponse.json(
        { error: "약관 수정에 실패했습니다" },
        { status: 500 }
      );
    }

    // 한국 시간으로 변환하여 반환
    const kstUpdatedAt = new Date(newTerm.updated_at).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    return NextResponse.json({
      term: { ...newTerm, updated_at_kst: kstUpdatedAt },
      message: `v${newVersion}으로 업데이트되었습니다.`,
      previousVersion: existingTerm.version
    });
  } catch (err: unknown) {
    console.error("관리자 약관 수정 API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
