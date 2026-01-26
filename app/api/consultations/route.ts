import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { randomUUID } from "crypto";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// 예약 생성
export async function POST(req: Request) {
  try {
    // 현재 로그인 사용자 확인
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
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { agent_id, property_id, scheduled_at } = body;

    // 필수 필드 검증
    if (!agent_id || !property_id || !scheduled_at) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다" },
        { status: 400 },
      );
    }

    // QR 코드 생성 (UUID 기반)
    const qrCode = randomUUID();
    const scheduledDate = new Date(scheduled_at);

    // QR 유효기간: 예약일 + 1일
    const qrExpiresAt = new Date(scheduledDate);
    qrExpiresAt.setDate(qrExpiresAt.getDate() + 1);

    // 예약 생성
    const { data: consultation, error } = await adminSupabase
      .from("consultations")
      .insert({
        customer_id: user.id,
        agent_id,
        property_id,
        scheduled_at: scheduledDate.toISOString(),
        qr_code: qrCode,
        qr_expires_at: qrExpiresAt.toISOString(),
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("예약 생성 오류:", error);
      return NextResponse.json(
        { error: "예약 생성에 실패했습니다" },
        { status: 500 },
      );
    }

    // 채팅방도 함께 생성
    const { error: chatRoomError } = await adminSupabase
      .from("chat_rooms")
      .insert({
        consultation_id: consultation.id,
        customer_id: user.id,
        agent_id,
      });

    if (chatRoomError) {
      console.error("채팅방 생성 오류:", chatRoomError);
      // 채팅방 생성 실패해도 예약은 유지
    }

    return NextResponse.json({
      success: true,
      consultation,
    });
  } catch (err: any) {
    console.error("예약 API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}

// 예약 목록 조회
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
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 },
      );
    }

    // 사용자 역할 확인
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const role = searchParams.get("role") || profile?.role;

    let query = adminSupabase
      .from("consultations")
      .select(
        `
                *,
                customer:profiles!consultations_customer_id_fkey(id, name, email, phone_number),
                agent:profiles!consultations_agent_id_fkey(id, name, email, phone_number),
                property:properties(id, name, image_url)
            `,
      )
      .order("scheduled_at", { ascending: true });

    // 역할에 따라 필터링 + 숨김 처리된 예약 제외
    if (role === "agent") {
      query = query
        .eq("agent_id", user.id)
        .or("hidden_by_agent.is.null,hidden_by_agent.eq.false");
    } else {
      query = query
        .eq("customer_id", user.id)
        .or("hidden_by_customer.is.null,hidden_by_customer.eq.false");
    }

    // 상태 필터
    if (status) {
      query = query.eq("status", status);
    }

    const { data: consultations, error } = await query;

    if (error) {
      console.error("예약 목록 조회 오류:", error);
      return NextResponse.json(
        { error: "예약 목록 조회에 실패했습니다" },
        { status: 500 },
      );
    }

    // 취소된 예약 중 3일 지난 것은 제외하고, 정렬 (활성 예약 먼저, 취소된 예약 나중에)
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    // 3일 지난 취소 예약은 백그라운드에서 삭제 (비동기, 응답 대기 안함)
    const oldCancelledIds = (consultations || [])
      .filter((c: any) => {
        if (c.status === "cancelled" && c.cancelled_at) {
          const cancelledAt = new Date(c.cancelled_at);
          return cancelledAt < threeDaysAgo;
        }
        return false;
      })
      .map((c: any) => c.id);

    if (oldCancelledIds.length > 0) {
      // 비동기로 삭제 (응답 대기 안함)
      void (async () => {
        const { error } = await adminSupabase
          .from("consultations")
          .delete()
          .in("id", oldCancelledIds);

        if (error) throw error;

      })().catch((err) => {
        console.error("오래된 취소 예약 자동 삭제 오류:", err);
      });
    }

    const filteredConsultations = (consultations || [])
      .filter((c: any) => {
        // 취소된 예약이 3일 넘었으면 제외
        if (c.status === "cancelled" && c.cancelled_at) {
          const cancelledAt = new Date(c.cancelled_at);
          if (cancelledAt < threeDaysAgo) {
            return false;
          }
        }
        return true;
      })
      .sort((a: any, b: any) => {
        // 취소된 예약은 맨 아래로
        const aIsCancelled = a.status === "cancelled";
        const bIsCancelled = b.status === "cancelled";

        if (aIsCancelled && !bIsCancelled) return 1;
        if (!aIsCancelled && bIsCancelled) return -1;

        // 같은 그룹 내에서는 예약일시 기준 정렬
        return (
          new Date(a.scheduled_at).getTime() -
          new Date(b.scheduled_at).getTime()
        );
      });

    return NextResponse.json({ consultations: filteredConsultations });
  } catch (err: any) {
    console.error("예약 목록 API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
