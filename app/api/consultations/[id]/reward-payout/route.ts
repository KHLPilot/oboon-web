import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { consultationIdSchema } from "../../_schemas";
import { recordAdminAuditLog } from "@/lib/adminAudit";
import { getClientIp } from "@/lib/rateLimit";

const adminSupabase = createSupabaseAdminClient();

type RewardPayoutResult = {
  success?: boolean;
  already_processed?: boolean;
  status?: number;
  error?: string;
};

function normalizeRpcResult(data: unknown): RewardPayoutResult | null {
  if (!data) return null;
  if (Array.isArray(data)) {
    const first = data[0];
    if (first && typeof first === "object") {
      return first as RewardPayoutResult;
    }
    return null;
  }
  if (typeof data === "object") {
    return data as RewardPayoutResult;
  }
  return null;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const parsedId = consultationIdSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json(
        { error: "유효하지 않은 예약 ID입니다" },
        { status: 400 },
      );
    }

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
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // 읽기 전용 컨텍스트에서는 무시
            }
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const { data: me } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (me?.role !== "admin") {
      return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });
    }

    const { data: consultation, error: consultationError } = await adminSupabase
      .from("consultations")
      .select("id, status")
      .eq("id", parsedId.data)
      .single();

    if (consultationError || !consultation) {
      return NextResponse.json({ error: "예약을 찾을 수 없습니다" }, { status: 404 });
    }

    if (consultation.status !== "visited" && consultation.status !== "contracted") {
      return NextResponse.json(
        { error: "지급 처리 가능한 상태가 아닙니다" },
        { status: 409 },
      );
    }

    await recordAdminAuditLog(adminSupabase, {
      adminId: user.id,
      action: "trigger_reward_payout",
      targetType: "consultation",
      targetId: parsedId.data,
      metadata: {
        status: consultation.status,
        ip: getClientIp(_req),
        userAgent: _req.headers.get("user-agent"),
      },
    });

    const { data, error } = await adminSupabase.rpc("process_reward_payout", {
      p_consultation_id: parsedId.data,
      p_processed_by: user.id,
    });

    if (error) {
      console.error("보상 지급 처리 RPC 오류:", error);
      return NextResponse.json({ error: "지급 처리에 실패했습니다" }, { status: 500 });
    }

    const result = normalizeRpcResult(data);
    if (!result?.success) {
      return NextResponse.json(
        { error: result?.error ?? "지급 처리에 실패했습니다" },
        { status: result?.status ?? 500 },
      );
    }

    return NextResponse.json({
      success: true,
      already_processed: Boolean(result.already_processed),
    });
  } catch (error: unknown) {
    console.error("보상 지급 처리 API 오류:", error);
    return NextResponse.json({ error: "지급 처리에 실패했습니다" }, { status: 500 });
  }
}
