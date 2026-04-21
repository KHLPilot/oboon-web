import { NextRequest, NextResponse } from "next/server";
import { adminSupabase, requireAdminRoute } from "@/lib/api/admin-route";
import { recordAdminAuditLog } from "@/lib/adminAudit";
import { parseJsonBody } from "@/lib/api/route-security";
import { getClientIp } from "@/lib/rateLimit";
import { adminApproveAgentRequestSchema } from "../_schemas";

export async function POST(req: NextRequest) {
  const auth = await requireAdminRoute();
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await parseJsonBody(req, adminApproveAgentRequestSchema, {
    invalidInputMessage: "유효하지 않은 입력",
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const { userId } = parsed.data;

  const { data: target, error: targetError } = await adminSupabase
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();

  if (targetError) {
    console.error("[admin/approve-agent] 대상 조회 실패:", {
      adminId: auth.user.id,
      targetId: userId,
      code: targetError.code,
    });
    return NextResponse.json({ error: "처리 중 오류 발생" }, { status: 500 });
  }

  if (!target) {
    return NextResponse.json({ error: "대상 없음" }, { status: 404 });
  }

  if (target.role !== "agent_pending") {
    return NextResponse.json(
      { error: `변경 불가: 현재 역할이 '${target.role}'입니다` },
      { status: 409 },
    );
  }

  await recordAdminAuditLog(adminSupabase, {
    adminId: auth.user.id,
    action: "approve_agent",
    targetType: "profile",
    targetId: userId,
    metadata: {
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      previousRole: target.role,
    },
  });

  const { data: updatedTarget, error: updateError } = await adminSupabase
    .from("profiles")
    .update({ role: "agent" })
    .eq("id", userId)
    .eq("role", "agent_pending")
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("[admin/approve-agent] 역할 변경 실패:", {
      adminId: auth.user.id,
      targetId: userId,
      code: updateError.code,
    });
    return NextResponse.json({ error: "처리 중 오류 발생" }, { status: 500 });
  }

  if (!updatedTarget) {
    return NextResponse.json(
      { error: "변경 불가: 대상 상태가 이미 변경되었습니다" },
      { status: 409 },
    );
  }

  console.info("[admin/approve-agent] 역할 승인:", {
    adminId: auth.user.id,
    targetId: userId,
  });

  return NextResponse.json({ success: true });
}
