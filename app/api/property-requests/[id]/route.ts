import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// PATCH - 관리자가 게시 요청 승인/반려
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
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

    const requestId = params.id;

    const { data: existingRequest, error: fetchError } = await supabase
      .from("property_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (fetchError || !existingRequest) {
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

    const updatePayload: Record<string, any> = { status };
    if (status === "rejected") {
      updatePayload.rejection_reason = rejection_reason;
    } else {
      updatePayload.rejection_reason = null;
    }

    const { data: updatedRequest, error: updateError } = await supabase
      .from("property_requests")
      .update(updatePayload)
      .eq("id", requestId)
      .select("id, status, requested_at, property_id, agent_id, rejection_reason")
      .single();

    if (updateError) {
      console.error("게시 요청 업데이트 오류:", updateError);
      return NextResponse.json(
        { error: "게시 요청 처리에 실패했습니다" },
        { status: 500 },
      );
    }

    const message =
      status === "approved" ? "게시 요청이 승인되었습니다" : "게시 요청이 반려되었습니다";

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
