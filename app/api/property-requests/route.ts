import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function syncPublicSnapshot(propertyId: number) {
  const { data: property, error: propertyError } = await adminSupabase
    .from("properties")
    .select(
      `
      id,
      created_at,
      name,
      property_type,
      phone_number,
      status,
      description,
      image_url,
      confirmed_comment,
      estimated_comment,
      pending_comment,
      property_locations (*),
      property_specs (*),
      property_timeline (*),
      property_unit_types (*)
    `,
    )
    .eq("id", propertyId)
    .single();

  if (propertyError || !property) {
    throw propertyError ?? new Error("현장 데이터를 찾을 수 없습니다.");
  }

  const now = new Date().toISOString();
  const { error: snapshotError } = await adminSupabase
    .from("property_public_snapshots")
    .upsert(
      {
        property_id: propertyId,
        snapshot: property,
        published_at: now,
        updated_at: now,
      },
      { onConflict: "property_id" },
    );

  if (snapshotError) {
    throw snapshotError;
  }
}

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
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await req.json();
    const propertyId = Number(body?.propertyId);
    const force = Boolean(body?.force);
    const requestType = body?.requestType === "delete" ? "delete" : "publish";
    const reason = String(body?.reason ?? "").trim();

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId가 필요합니다." }, { status: 400 });
    }
    if (requestType === "delete" && !reason) {
      return NextResponse.json(
        { error: "삭제 요청 사유를 입력해주세요." },
        { status: 400 },
      );
    }

    const { data: me } = await adminSupabase
      .from("profiles")
      .select("role, name")
      .eq("id", user.id)
      .single();

    if (!me || (me.role !== "agent" && me.role !== "admin")) {
      return NextResponse.json({ error: "요청 권한이 없습니다." }, { status: 403 });
    }

    const { data: property } = await adminSupabase
      .from("properties")
      .select("id, name, created_by")
      .eq("id", propertyId)
      .single();

    if (!property) {
      return NextResponse.json({ error: "현장을 찾을 수 없습니다." }, { status: 404 });
    }

    if (requestType === "delete" && property.created_by !== user.id) {
      return NextResponse.json(
        { error: "본인이 등록한 현장만 삭제 요청할 수 있습니다." },
        { status: 403 },
      );
    }

    if (requestType === "publish") {
      const { data: pendingDeleteRequest, error: pendingDeleteError } =
        await adminSupabase
          .from("property_requests")
          .select("id")
          .eq("property_id", propertyId)
          .eq("request_type", "delete")
          .eq("status", "pending")
          .limit(1)
          .maybeSingle();

      if (pendingDeleteError) {
        return NextResponse.json(
          { error: "삭제 요청 상태 확인에 실패했습니다." },
          { status: 500 },
        );
      }

      if (pendingDeleteRequest) {
        return NextResponse.json(
          { error: "삭제 요청 처리 중에는 게시 요청을 할 수 없습니다." },
          { status: 409 },
        );
      }
    }

    const { data: existing, error: existingError } = await adminSupabase
      .from("property_requests")
      .select("id, status")
      .eq("property_id", propertyId)
      .eq("agent_id", user.id)
      .eq("request_type", requestType)
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: "요청 상태 확인에 실패했습니다." }, { status: 500 });
    }

    if (existing) {
      if (requestType === "delete") {
        if (existing.status === "pending") {
          return NextResponse.json(
            { error: "이미 처리 중인 요청이 있습니다." },
            { status: 409 },
          );
        }
      } else if (existing.status === "pending" || existing.status === "approved") {
        if (!(requestType === "publish" && force && existing.status === "approved")) {
          return NextResponse.json(
            { error: "이미 처리 중인 요청이 있습니다." },
            { status: 409 },
          );
        }
      }
    }

    const nextStatus =
      requestType === "publish" && me.role === "admin" ? "approved" : "pending";

    const { data: inserted, error: insertError } = await adminSupabase
      .from("property_requests")
      .insert({
        property_id: propertyId,
        agent_id: user.id,
        request_type: requestType,
        reason: requestType === "delete" ? reason : null,
        status: nextStatus,
      })
      .select("id, status, request_type, reason, requested_at")
      .single();

    if (insertError || !inserted) {
      return NextResponse.json({ error: "게시 요청 생성에 실패했습니다." }, { status: 500 });
    }

    if (requestType === "publish" && nextStatus === "approved") {
      try {
        await syncPublicSnapshot(propertyId);
      } catch (snapshotError) {
        console.error("즉시 게시 스냅샷 동기화 오류:", snapshotError);
        return NextResponse.json(
          { error: "게시는 승인되었지만 게시본 반영에 실패했습니다." },
          { status: 500 },
        );
      }
    }

    const { data: admins } = await adminSupabase
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    if (nextStatus === "pending" && admins && admins.length > 0) {
      const isDeleteRequest = requestType === "delete";
      const notifications = admins.map((admin) => ({
        recipient_id: admin.id,
        type: isDeleteRequest
          ? "admin_property_delete_request"
          : "admin_property_review_request",
        title: isDeleteRequest ? "현장 삭제 요청 접수" : "새 현장 검토 요청",
        message: isDeleteRequest
          ? `${me.name ?? "요청자"}님이 ${property?.name ?? "현장"} 삭제를 요청했습니다.`
          : `${me.name ?? "요청자"}님이 ${property?.name ?? "현장"} 게시를 요청했습니다.`,
        consultation_id: null,
        metadata: {
          tab: "properties",
          property_id: propertyId,
          property_request_id: inserted.id,
          request_type: requestType,
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
