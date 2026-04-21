import { NextResponse } from "next/server";
import { z } from "zod";
import { adminSupabase, requireAdminRoute } from "@/lib/api/admin-route";
import { parseJsonBody, uuidV4Schema } from "@/lib/api/route-security";

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
      .select("id, type, version, title, content, is_active, is_required, display_order, updated_at, updated_by, created_at, created_by")
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

const adminTermsPatchSchema = z.object({
  id: uuidV4Schema,
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(50000).optional(),
}).refine((value) => value.title !== undefined || value.content !== undefined, {
  message: "title 또는 content 중 하나는 필요합니다.",
});

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

    const parsed = await parseJsonBody(req, adminTermsPatchSchema, {
      invalidInputMessage: "유효하지 않은 약관 수정 요청입니다.",
    });
    if (!parsed.ok) {
      return parsed.response;
    }

    const { id, title, content } = parsed.data;
    const updatedAt = new Date().toISOString();

    const { data, error } = await adminSupabase.rpc("update_term_version", {
      p_term_id: id,
      p_title: title ?? null,
      p_content: content ?? null,
      p_updated_by: auth.user.id,
      p_updated_at: updatedAt,
    });

    if (error) {
      console.error("새 약관 버전 생성 오류:", error);
      return NextResponse.json(
        { error: "약관 수정에 실패했습니다" },
        { status: 500 }
      );
    }

    const result = data as
      | {
          success: boolean;
          already_processed?: boolean;
          term?: Record<string, unknown> | null;
          status?: number;
          error?: string;
        }
      | null;

    if (!result?.success) {
      return NextResponse.json(
        { error: result?.error || "약관 수정에 실패했습니다" },
        { status: result?.status ?? 500 }
      );
    }

    const term = result.term ?? null;
    if (!term) {
      return NextResponse.json(
        { error: "약관 수정에 실패했습니다" },
        { status: 500 }
      );
    }

    const kstUpdatedAt = term.updated_at
      ? new Date(String(term.updated_at)).toLocaleString("ko-KR", {
          timeZone: "Asia/Seoul",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : null;

    return NextResponse.json({
      term: { ...term, updated_at_kst: kstUpdatedAt },
      message: result.already_processed
        ? "변경 사항이 없습니다."
        : "약관이 업데이트되었습니다.",
    });
  } catch (err: unknown) {
    console.error("관리자 약관 수정 API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
