import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// POST - 상담사가 현장 소속 신청
export async function POST(request: NextRequest) {
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
    const { data: profile, error: profileError } = await supabase
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

    // agent 권한 확인
    if (profile.role !== "agent" && profile.role !== "admin") {
      return NextResponse.json(
        { error: "상담사만 현장 소속을 신청할 수 있습니다" },
        { status: 403 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();
    const { property_id, change_request } = body;

    if (!property_id) {
      return NextResponse.json(
        { error: "현장 ID가 필요합니다" },
        { status: 400 }
      );
    }

    // 현장 존재 여부 확인
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("id, name")
      .eq("id", property_id)
      .single();

    if (propertyError || !property) {
      return NextResponse.json(
        { error: "현장을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 이미 다른 현장에 소속되어 있는지 확인 (한 명당 한 곳만 가능)
    const { data: existingApproved, error: approvedCheckError } = await supabase
      .from("property_agents")
      .select("id, property_id, status, properties:property_id(id, name)")
      .eq("agent_id", user.id)
      .eq("status", "approved")
      .maybeSingle();

    if (approvedCheckError) {
      console.error("기존 승인 조회 오류:", approvedCheckError);
      return NextResponse.json(
        { error: "소속 확인 중 오류가 발생했습니다" },
        { status: 500 }
      );
    }

    if (existingApproved && existingApproved.property_id === property_id) {
      return NextResponse.json(
        { error: "이미 해당 현장에 소속되어 있습니다" },
        { status: 409 }
      );
    }

    if (existingApproved && !change_request) {
      const propertyName = (existingApproved as any).properties?.name || "다른 현장";
      return NextResponse.json(
        { error: `이미 ${propertyName}에 소속되어 있습니다. 한 명의 상담사는 한 곳의 현장에만 소속될 수 있습니다.` },
        { status: 409 }
      );
    }

    // 기존 pending 이력 정리 (즉시 승인 정책)
    const { error: clearPendingError } = await supabase
      .from("property_agents")
      .delete()
      .eq("agent_id", user.id)
      .eq("status", "pending");

    if (clearPendingError) {
      console.error("기존 pending 정리 오류:", clearPendingError);
      return NextResponse.json(
        { error: "기존 요청 정리 중 오류가 발생했습니다" },
        { status: 500 }
      );
    }

    // 이미 신청/소속했는지 확인
    const { data: existing, error: existingError } = await supabase
      .from("property_agents")
      .select("id, status")
      .eq("property_id", property_id)
      .eq("agent_id", user.id)
      .maybeSingle();

    if (existingError) {
      console.error("기존 신청 조회 오류:", existingError);
      return NextResponse.json(
        { error: "신청 확인 중 오류가 발생했습니다" },
        { status: 500 }
      );
    }

    if (existing?.status === "approved") {
      return NextResponse.json(
        { error: "이미 해당 현장에 소속되어 있습니다" },
        { status: 409 }
      );
    }

    if (existing?.status === "pending") {
      const { error: deletePendingError } = await supabase
        .from("property_agents")
        .delete()
        .eq("id", existing.id);

      if (deletePendingError) {
        console.error("기존 pending 정리 오류:", deletePendingError);
        return NextResponse.json(
          { error: "기존 요청 정리 중 오류가 발생했습니다" },
          { status: 500 }
        );
      }
    }

    if (existing?.status === "rejected") {
      const { error: deleteRejectedError } = await supabase
        .from("property_agents")
        .delete()
        .eq("id", existing.id);

      if (deleteRejectedError) {
        console.error("기존 rejected 정리 오류:", deleteRejectedError);
        return NextResponse.json(
          { error: "기존 요청 정리 중 오류가 발생했습니다" },
          { status: 500 }
        );
      }
    }

    if (existingApproved && change_request) {
      const { error: deleteApprovedError } = await supabase
        .from("property_agents")
        .delete()
        .eq("id", existingApproved.id);

      if (deleteApprovedError) {
        console.error("기존 승인 소속 정리 오류:", deleteApprovedError);
        return NextResponse.json(
          { error: "기존 소속 정리 중 오류가 발생했습니다" },
          { status: 500 }
        );
      }
    }

    // 소속 즉시 승인 생성
    const { data: propertyAgent, error: insertError } = await supabase
      .from("property_agents")
      .insert({
        property_id,
        agent_id: user.id,
        status: "approved",
        requested_at: new Date().toISOString(),
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("소속 신청 생성 오류:", insertError);
      return NextResponse.json(
        { error: "소속 신청에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      propertyAgent,
      message: change_request
        ? "소속이 변경되었습니다."
        : "현장 소속이 등록되었습니다.",
    });
  } catch (error) {
    console.error("POST /api/property-agents 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// GET - 소속 신청 목록 조회
export async function GET(request: NextRequest) {
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
    const { data: profile, error: profileError } = await supabase
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

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") || profile.role;
    const status = searchParams.get("status");

    let query = supabase
      .from("property_agents")
      .select(
        `
        id,
        property_id,
        agent_id,
        status,
        requested_at,
        approved_at,
        approved_by,
        rejected_at,
        rejection_reason,
        created_at,
        properties:property_id (
          id,
          name,
          image_url,
          property_type
        ),
        profiles:agent_id (
          id,
          name,
          email,
          phone_number
        )
      `
      )
      .order("requested_at", { ascending: false });

    // 관리자가 아니면 본인 신청만 조회
    if (role !== "admin") {
      query = query.eq("agent_id", user.id);
    }

    // status 필터
    if (status) {
      query = query.eq("status", status);
    }

    const { data: propertyAgents, error: fetchError } = await query;

    if (fetchError) {
      console.error("소속 신청 조회 오류:", fetchError);
      return NextResponse.json(
        { error: "소속 신청 조회에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ propertyAgents });
  } catch (error) {
    console.error("GET /api/property-agents 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
