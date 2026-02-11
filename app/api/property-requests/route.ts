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
      status,
      description,
      image_url,
      confirmed_comment,
      estimated_comment,
      property_gallery_images (
        id,
        property_id,
        image_url,
        sort_order,
        created_at
      ),
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

  const maskedUnitTypes = Array.isArray(property.property_unit_types)
    ? property.property_unit_types.map((unit) =>
        unit?.is_price_public === false
          ? { ...unit, price_min: null, price_max: null }
          : unit,
      )
    : [];

  const snapshot = {
    ...property,
    property_unit_types: maskedUnitTypes,
  };

  const now = new Date().toISOString();
  const { error: snapshotError } = await adminSupabase
    .from("property_public_snapshots")
    .upsert(
      {
        property_id: propertyId,
        snapshot,
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

    if (requestType === "publish") {
      try {
        await syncPublicSnapshot(propertyId);
      } catch (snapshotError) {
        console.error("즉시 공개 반영 오류:", snapshotError);
        return NextResponse.json(
          { error: "공개 반영에 실패했습니다." },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        propertyRequest: null,
        message: "즉시 반영되었습니다.",
      });
    }

    if (requestType === "delete" && property.created_by !== user.id) {
      return NextResponse.json(
        { error: "본인이 등록한 현장만 삭제 요청할 수 있습니다." },
        { status: 403 },
      );
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

    if (existing && existing.status === "pending") {
      return NextResponse.json(
        { error: "이미 처리 중인 요청이 있습니다." },
        { status: 409 },
      );
    }

    const nextStatus = me.role === "admin" ? "approved" : "pending";

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
      return NextResponse.json({ error: "삭제 요청 생성에 실패했습니다." }, { status: 500 });
    }

    const { data: admins } = await adminSupabase
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    if (nextStatus === "pending" && admins && admins.length > 0) {
      const notifications = admins.map((admin) => ({
        recipient_id: admin.id,
        type: "admin_property_delete_request",
        title: "현장 삭제 요청 접수",
        message: `${me.name ?? "요청자"}님이 ${property?.name ?? "현장"} 삭제를 요청했습니다.`,
        consultation_id: null,
        metadata: {
          tab: "properties",
          property_id: propertyId,
          property_request_id: inserted.id,
          request_type: "delete",
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
