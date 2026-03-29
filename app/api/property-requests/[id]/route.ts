import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { handleServiceError } from "@/lib/api/route-error";
import {
  fetchPropertyRequestById,
  fetchPropertyRequestProfile,
  updatePropertyRequestById,
} from "@/features/company/services/property.request";

const adminSupabase = createSupabaseAdminClient();

// PATCH - 관리자가 삭제 요청 승인/반려
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
              cookieStore.set(name, value, options),
            );
          },
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 },
      );
    }

    const { data: profile, error: profileError } =
      await fetchPropertyRequestProfile(supabase, user.id);

    if (profileError) {
      return handleServiceError(profileError, "프로필을 찾을 수 없습니다");
    }

    if (!profile) {
      return NextResponse.json(
        { error: "프로필을 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    if (profile.role !== "admin") {
      return NextResponse.json(
        { error: "관리자만 승인/반려할 수 있습니다" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { status, rejection_reason } = body;

    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "유효한 status가 필요합니다 (approved 또는 rejected)" },
        { status: 400 },
      );
    }

    const { id: requestId } = await params;

    const { data: existingRequest, error: fetchError } =
      await fetchPropertyRequestById(supabase, requestId);

    if (fetchError) {
      return handleServiceError(fetchError, "게시 요청을 찾을 수 없습니다");
    }

    if (!existingRequest) {
      return NextResponse.json(
        { error: "게시 요청을 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    if (existingRequest.status !== "pending") {
      return NextResponse.json(
        { error: "이미 처리된 요청입니다" },
        { status: 409 },
      );
    }

    if (status === "rejected" && !rejection_reason) {
      return NextResponse.json(
        { error: "반려 시 사유를 입력해주세요" },
        { status: 400 },
      );
    }

    const updatePayload: Record<string, unknown> = { status };
    if (status === "rejected") {
      updatePayload.rejection_reason = rejection_reason;
    } else {
      updatePayload.rejection_reason = null;
    }

    const { data: updatedRequest, error: updateError } =
      await updatePropertyRequestById(supabase, requestId, updatePayload);

    if (updateError) {
      return handleServiceError(updateError, "게시 요청 처리에 실패했습니다");
    }
    if (!updatedRequest) {
      return NextResponse.json(
        { error: "게시 요청 처리 결과를 찾을 수 없습니다" },
        { status: 500 },
      );
    }

    if (status === "approved" && updatedRequest.request_type === "delete") {
      const { error: deleteError } = await adminSupabase
        .from("properties")
        .delete()
        .eq("id", updatedRequest.property_id);

      if (deleteError) {
        console.error("삭제 요청 승인 후 현장 삭제 오류:", deleteError);
        return NextResponse.json(
          { error: "삭제 요청은 승인되었지만 현장 삭제에 실패했습니다." },
          { status: 500 },
        );
      }
    }

    if (updatedRequest.request_type === "publish") {
      return NextResponse.json(
        { error: "게시 승인 플로우는 비활성화되었습니다." },
        { status: 410 },
      );
    }

    const message =
      status === "approved"
        ? updatedRequest.request_type === "delete"
          ? "현장 삭제 요청이 승인되었습니다"
          : "요청이 승인되었습니다"
        : updatedRequest.request_type === "delete"
          ? "현장 삭제 요청이 반려되었습니다"
          : "요청이 반려되었습니다";

    return NextResponse.json({
      success: true,
      propertyRequest: updatedRequest,
      message,
    });
  } catch (error) {
    console.error("PATCH /api/property-requests/[id] 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}

// DELETE - 요청 철회 (요청자 본인 또는 관리자)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
              cookieStore.set(name, value, options),
            );
          },
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 },
      );
    }

    const { data: profile, error: profileError } =
      await fetchPropertyRequestProfile(supabase, user.id);

    if (profileError) {
      return handleServiceError(profileError, "프로필을 찾을 수 없습니다");
    }

    if (!profile) {
      return NextResponse.json(
        { error: "프로필을 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    const { id: requestId } = await params;
    const { data: existingRequest, error: fetchError } = await adminSupabase
      .from("property_requests")
      .select("id, agent_id, request_type, status")
      .eq("id", requestId)
      .single();

    if (fetchError || !existingRequest) {
      return NextResponse.json(
        { error: "요청을 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    const isOwner = existingRequest.agent_id === user.id;
    const isAdmin = profile.role === "admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "요청 철회 권한이 없습니다" },
        { status: 403 },
      );
    }

    if (existingRequest.request_type !== "delete") {
      return NextResponse.json(
        { error: "삭제 요청만 철회할 수 있습니다" },
        { status: 400 },
      );
    }

    if (existingRequest.status !== "pending") {
      return NextResponse.json(
        { error: "검토 대기 상태에서만 철회할 수 있습니다" },
        { status: 409 },
      );
    }

    const { error: deleteError } = await adminSupabase
      .from("property_requests")
      .delete()
      .eq("id", requestId);

    if (deleteError) {
      return NextResponse.json(
        { error: "요청 철회에 실패했습니다" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      propertyRequest: existingRequest,
      message: "삭제 요청이 철회되었습니다",
    });
  } catch (error) {
    console.error("DELETE /api/property-requests/[id] 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
