import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const BLOCKING_CONSULTATION_STATUSES = ["requested", "pending", "confirmed"];
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function hasBlockingConsultations(
  supabase: SupabaseClient,
  agentId: string,
) {
  const { count, error } = await supabase
    .from("consultations")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", agentId)
    .in("status", BLOCKING_CONSULTATION_STATUSES);

  if (error) {
    throw error;
  }

  return (count ?? 0) > 0;
}

// POST - 상담사가 현재 소속을 무소속으로 전환
export async function POST() {
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
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
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

    if (profile.role !== "agent" && profile.role !== "admin") {
      return NextResponse.json(
        { error: "상담사만 소속을 변경할 수 있습니다" },
        { status: 403 },
      );
    }

    const blocking = await hasBlockingConsultations(supabase, user.id);
    if (blocking) {
      return NextResponse.json(
        { error: "진행중 상담이 있어 무소속 전환이 불가능합니다." },
        { status: 409 },
      );
    }

    const { data: approvedRows, error: approvedError } = await adminSupabase
      .from("property_agents")
      .select("id, property_id")
      .eq("agent_id", user.id)
      .eq("status", "approved")
      .order("approved_at", { ascending: false, nullsFirst: false })
      .order("requested_at", { ascending: false, nullsFirst: false });

    if (approvedError) {
      console.error("승인 소속 조회 오류:", approvedError);
      return NextResponse.json(
        { error: "현재 소속 조회에 실패했습니다" },
        { status: 500 },
      );
    }

    if (!approvedRows || approvedRows.length === 0) {
      return NextResponse.json(
        { error: "현재 소속된 현장이 없습니다." },
        { status: 409 },
      );
    }

    const approvedIds = approvedRows.map((row) => row.id);
    const { data: updatedRows, error: updateError } = await adminSupabase
      .from("property_agents")
      .update({
        status: "withdrawn",
        withdrawn_at: new Date().toISOString(),
        approved_at: null,
        approved_by: null,
      })
      .in("id", approvedIds)
      .select("id");

    if (updateError) {
      console.error("무소속 전환 오류:", updateError);
      return NextResponse.json(
        { error: "무소속 전환에 실패했습니다" },
        { status: 500 },
      );
    }
    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json(
        { error: "무소속 전환 반영에 실패했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "무소속으로 전환되었습니다.",
    });
  } catch (error) {
    console.error("POST /api/property-agents/unassign 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
