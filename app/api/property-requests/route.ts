import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

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
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await req.json();
    const propertyId = Number(body?.propertyId);
    const force = Boolean(body?.force);

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId가 필요합니다." }, { status: 400 });
    }

    const { data: me } = await adminSupabase
      .from("profiles")
      .select("role, name")
      .eq("id", user.id)
      .single();

    if (!me || (me.role !== "agent" && me.role !== "admin")) {
      return NextResponse.json({ error: "요청 권한이 없습니다." }, { status: 403 });
    }

    const { data: existing, error: existingError } = await adminSupabase
      .from("property_requests")
      .select("id, status")
      .eq("property_id", propertyId)
      .eq("agent_id", user.id)
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: "요청 상태 확인에 실패했습니다." }, { status: 500 });
    }

    if (existing && (existing.status === "pending" || existing.status === "approved")) {
      if (!(force && existing.status === "approved")) {
        return NextResponse.json({ error: "이미 처리 중인 요청이 있습니다." }, { status: 409 });
      }
    }

    const nextStatus = me.role === "admin" ? "approved" : "pending";

    const { data: inserted, error: insertError } = await adminSupabase
      .from("property_requests")
      .insert({
        property_id: propertyId,
        agent_id: user.id,
        status: nextStatus,
      })
      .select("id, status, requested_at")
      .single();

    if (insertError || !inserted) {
      return NextResponse.json({ error: "게시 요청 생성에 실패했습니다." }, { status: 500 });
    }

    const [{ data: property }, { data: admins }] = await Promise.all([
      adminSupabase
        .from("properties")
        .select("id, name")
        .eq("id", propertyId)
        .single(),
      adminSupabase.from("profiles").select("id").eq("role", "admin"),
    ]);

    if (nextStatus === "pending" && admins && admins.length > 0) {
      const notifications = admins.map((admin) => ({
        recipient_id: admin.id,
        type: "admin_property_review_request",
        title: "새 현장 검토 요청",
        message: `${me.name ?? "요청자"}님이 ${property?.name ?? "현장"} 게시를 요청했습니다.`,
        consultation_id: null,
        metadata: {
          tab: "properties",
          property_id: propertyId,
          property_request_id: inserted.id,
        },
      }));
      await adminSupabase.from("notifications").insert(notifications);
    }

    return NextResponse.json({ success: true, propertyRequest: inserted });
  } catch (error) {
    console.error("POST /api/property-requests 오류:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
