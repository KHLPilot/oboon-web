import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { handleServiceError } from "@/lib/api/route-error";
import { unwrapErrorCause } from "@/lib/errors";
import {
  fetchApprovedPropertyAgentsForUser,
  fetchPropertyAgentProfileRole,
  withdrawPropertyAgents,
} from "@/features/agent/services/agent.propertyAgents";

function isWithdrawnSchemaIssue(error: unknown): boolean {
  const source = unwrapErrorCause(error);
  if (!source || typeof source !== "object") return false;
  const message = String(
    (source as { message?: unknown }).message ??
      (source as { details?: unknown }).details ??
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

    if (profileError) {
      return handleServiceError(profileError, "프로필을 찾을 수 없습니다");
    }

    if (!profile) {
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
      return handleServiceError(approvedError, "현재 소속 조회에 실패했습니다");
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
      if (isWithdrawnSchemaIssue(updateError)) {
        return NextResponse.json(
          {
            error:
              "무소속 전환에 실패했습니다. DB 마이그레이션(022_property_agents_add_withdrawn_status.sql) 적용이 필요합니다.",
          },
          { status: 500 },
        );
      }
      return handleServiceError(updateError, "무소속 전환에 실패했습니다");
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
