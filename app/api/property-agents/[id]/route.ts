import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function isWithdrawnSchemaIssue(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = String(
    (error as { message?: unknown }).message ??
      (error as { details?: unknown }).details ??
      "",
  ).toLowerCase();
  return (
    message.includes("withdrawn") ||
    message.includes("property_agents_status_check") ||
    message.includes("check constraint") ||
    message.includes("enum")
  );
}

// PATCH - 관리자가 소속 신청 승인/거절
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    // 현재 사용자 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    // 사용자 프로필 조회 (관리자 권한 확인)
    const { data: profile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "프로필을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (profile.role !== "admin") {
      return NextResponse.json(
        { error: "관리자만 승인/거절할 수 있습니다" },
        { status: 403 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();
    const { status, rejection_reason } = body;

    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "유효한 status가 필요합니다 (approved 또는 rejected)" },
        { status: 400 }
      );
    }

    if (status === "rejected" && !rejection_reason) {
      return NextResponse.json(
        { error: "거절 시 사유를 입력해주세요" },
        { status: 400 }
      );
    }

    const { id: propertyAgentId } = await params;

    // 해당 소속 신청 조회
    const { data: existingRequest, error: fetchError } = await adminSupabase
      .from("property_agents")
      .select("*")
      .eq("id", propertyAgentId)
      .single();

    if (fetchError || !existingRequest) {
      return NextResponse.json(
        { error: "소속 신청을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (existingRequest.status !== "pending") {
      return NextResponse.json(
        { error: "이미 처리된 신청입니다" },
        { status: 409 }
      );
    }

    // 상태 업데이트
    const updateData: Record<string, unknown> = {
      status,
    };

    if (status === "approved") {
      updateData.approved_at = new Date().toISOString();
      updateData.approved_by = user.id;
    } else if (status === "rejected") {
      updateData.rejected_at = new Date().toISOString();
      updateData.rejection_reason = rejection_reason;
    }

    const { data: updatedRequest, error: updateError } = await adminSupabase
      .from("property_agents")
      .update(updateData)
      .eq("id", propertyAgentId)
      .select(
        `
        *,
        properties:property_id (id, name),
        profiles:agent_id (id, name, email)
      `
      )
      .single();

    if (updateError) {
      console.error("소속 신청 업데이트 오류:", updateError);
      return NextResponse.json(
        { error: "소속 신청 처리에 실패했습니다" },
        { status: 500 }
      );
    }

    const message =
      status === "approved"
        ? "소속 신청이 승인되었습니다"
        : "소속 신청이 거절되었습니다";

    return NextResponse.json({
      success: true,
      propertyAgent: updatedRequest,
      message,
    });
  } catch (error) {
    console.error("PATCH /api/property-agents/[id] 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// DELETE - 소속 신청 취소 (상담사) 또는 삭제 (관리자)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    // 현재 사용자 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    // 사용자 프로필 조회
    const { data: profile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "프로필을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const { id: propertyAgentId } = await params;

    // 해당 소속 신청 조회
    const { data: existingRequest, error: fetchError } = await adminSupabase
      .from("property_agents")
      .select("*")
      .eq("id", propertyAgentId)
      .single();

    if (fetchError || !existingRequest) {
      return NextResponse.json(
        { error: "소속 신청을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 권한 확인: 본인 신청이거나 관리자
    if (
      existingRequest.agent_id !== user.id &&
      profile.role !== "admin"
    ) {
      return NextResponse.json(
        { error: "삭제 권한이 없습니다" },
        { status: 403 }
      );
    }

    // 상담사 본인 처리
    if (profile.role !== "admin") {
      if (existingRequest.status === "pending") {
        const { data: deletedRows, error: deleteError } = await adminSupabase
          .from("property_agents")
          .delete()
          .eq("id", propertyAgentId)
          .eq("agent_id", user.id)
          .select("id");

        if (deleteError) {
          console.error("소속 신청 삭제 오류:", deleteError);
          return NextResponse.json(
            { error: "소속 신청 삭제에 실패했습니다" },
            { status: 500 }
          );
        }

        if (!deletedRows || deletedRows.length === 0) {
          return NextResponse.json(
            { error: "소속 신청 삭제 반영에 실패했습니다" },
            { status: 409 }
          );
        }

        return NextResponse.json({
          success: true,
          message: "소속 신청이 취소되었습니다",
        });
      }

      if (existingRequest.status !== "approved") {
        return NextResponse.json(
          { error: "승인됨 상태만 소속 해제가 가능합니다" },
          { status: 409 }
        );
      }

      const withdrawnAt = new Date().toISOString();
      const { data: withdrawnRows, error: withdrawError } = await adminSupabase
        .from("property_agents")
        .update({
          status: "withdrawn",
          withdrawn_at: withdrawnAt,
          approved_at: null,
          approved_by: null,
        })
        .eq("id", propertyAgentId)
        .eq("agent_id", user.id)
        .select("id");

      if (withdrawError) {
        console.error("소속 해제 오류:", withdrawError);
        if (isWithdrawnSchemaIssue(withdrawError)) {
          return NextResponse.json(
            {
              error:
                "소속 해제에 실패했습니다. DB 마이그레이션(022_property_agents_add_withdrawn_status.sql) 적용이 필요합니다.",
            },
            { status: 500 }
          );
        }
        return NextResponse.json(
          { error: "소속 해제에 실패했습니다" },
          { status: 500 }
        );
      } else if (!withdrawnRows || withdrawnRows.length === 0) {
        return NextResponse.json(
          { error: "소속 해제 반영에 실패했습니다" },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "소속이 해제되었습니다",
      });
    }

    // 관리자 삭제
    const { data: deletedRows, error: deleteError } = await adminSupabase
      .from("property_agents")
      .delete()
      .eq("id", propertyAgentId)
      .select("id");

    if (deleteError) {
      console.error("소속 신청 삭제 오류:", deleteError);
      return NextResponse.json(
        { error: "소속 신청 삭제에 실패했습니다" },
        { status: 500 }
      );
    }

    if (!deletedRows || deletedRows.length === 0) {
      return NextResponse.json(
        { error: "소속 신청 삭제 반영에 실패했습니다" },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "소속 신청이 취소되었습니다",
    });
  } catch (error) {
    console.error("DELETE /api/property-agents/[id] 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
