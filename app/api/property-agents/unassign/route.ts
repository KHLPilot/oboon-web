import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  fetchApprovedPropertyAgentsForUser,
  fetchPropertyAgentProfileRole,
  withdrawPropertyAgents,
} from "@/features/agent/services/agent.propertyAgents";

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

    const { data: profile, error: profileError } =
      await fetchPropertyAgentProfileRole(user.id);

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

    const { data: approvedRows, error: approvedError } =
      await fetchApprovedPropertyAgentsForUser(user.id);

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
    const withdrawnAt = new Date().toISOString();

    const { data: updatedRows, error: updateError } =
      await withdrawPropertyAgents(approvedIds, withdrawnAt);

    const finalUpdatedRows = updatedRows;
    if (updateError) {
      console.error("무소속 전환 오류:", updateError);
      if (isWithdrawnSchemaIssue(updateError)) {
        return NextResponse.json(
          {
            error:
              "무소속 전환에 실패했습니다. DB 마이그레이션(022_property_agents_add_withdrawn_status.sql) 적용이 필요합니다.",
          },
          { status: 500 },
        );
      }
      return NextResponse.json(
        { error: "무소속 전환에 실패했습니다" },
        { status: 500 },
      );
    }

    if (!finalUpdatedRows || finalUpdatedRows.length === 0) {
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
