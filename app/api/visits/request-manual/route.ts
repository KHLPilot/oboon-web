import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type ConsultationRow = {
  id: string;
  customer_id: string;
  agent_id: string;
  property_id: number;
  status: string;
  visited_at: string | null;
};

export async function POST(req: Request) {
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
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const body = await req.json();
    const consultationId = body?.consultationId as string | undefined;
    const reason = (body?.reason as string | undefined)?.trim() || "GPS 인증 실패";

    if (!consultationId) {
      return NextResponse.json({ error: "consultationId가 필요합니다" }, { status: 400 });
    }

    const { data: consultation } = await adminSupabase
      .from("consultations")
      .select("id, customer_id, agent_id, property_id, status, visited_at")
      .eq("id", consultationId)
      .single();

    if (!consultation) {
      return NextResponse.json({ error: "예약 정보를 찾을 수 없습니다" }, { status: 404 });
    }

    const c = consultation as ConsultationRow;
    if (c.customer_id !== user.id) {
      return NextResponse.json({ error: "본인 예약만 요청할 수 있습니다" }, { status: 403 });
    }
    if (c.status === "visited" || c.visited_at) {
      return NextResponse.json({ error: "이미 방문 인증된 예약입니다" }, { status: 400 });
    }
    if (c.status !== "confirmed") {
      return NextResponse.json({ error: "확정된 예약만 요청할 수 있습니다" }, { status: 400 });
    }

    const { data: existingPending } = await adminSupabase
      .from("visit_confirm_requests")
      .select("id")
      .eq("consultation_id", consultationId)
      .eq("customer_id", user.id)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();

    if (existingPending) {
      return NextResponse.json({ success: true, requestId: existingPending.id });
    }

    const tokenValue = `manual_${randomUUID().replace(/-/g, "")}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { data: token, error: tokenError } = await adminSupabase
      .from("visit_tokens")
      .insert({
        token: tokenValue,
        property_id: c.property_id,
        agent_id: c.agent_id,
        consultation_id: c.id,
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (tokenError || !token) {
      console.error("수동 확인 토큰 생성 오류:", tokenError);
      return NextResponse.json({ error: "요청 생성에 실패했습니다" }, { status: 500 });
    }

    const { data: requestRow, error: requestError } = await adminSupabase
      .from("visit_confirm_requests")
      .insert({
        token_id: token.id,
        customer_id: c.customer_id,
        agent_id: c.agent_id,
        property_id: c.property_id,
        consultation_id: c.id,
        reason,
        status: "pending",
      })
      .select("id")
      .single();

    if (requestError || !requestRow) {
      console.error("수동 확인 요청 생성 오류:", requestError);
      return NextResponse.json({ error: "요청 생성에 실패했습니다" }, { status: 500 });
    }

    return NextResponse.json({ success: true, requestId: requestRow.id });
  } catch (error: any) {
    console.error("수동 확인 요청 API 오류:", error);
    return NextResponse.json({ error: "요청 생성에 실패했습니다" }, { status: 500 });
  }
}

export async function GET(req: Request) {
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
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get("requestId");
    if (!requestId) {
      return NextResponse.json({ error: "requestId가 필요합니다" }, { status: 400 });
    }

    const [{ data: me }, { data: requestRow }] = await Promise.all([
      adminSupabase.from("profiles").select("role").eq("id", user.id).single(),
      adminSupabase
        .from("visit_confirm_requests")
        .select("id, status, customer_id, agent_id, resolved_at, resolved_by")
        .eq("id", requestId)
        .single(),
    ]);

    if (!requestRow) {
      return NextResponse.json({ error: "요청을 찾을 수 없습니다" }, { status: 404 });
    }

    const isAdmin = me?.role === "admin";
    const isOwner =
      requestRow.customer_id === user.id || requestRow.agent_id === user.id;
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "접근 권한이 없습니다" }, { status: 403 });
    }

    return NextResponse.json({ request: requestRow });
  } catch (error: any) {
    console.error("수동 확인 요청 조회 오류:", error);
    return NextResponse.json({ error: "요청 조회에 실패했습니다" }, { status: 500 });
  }
}

