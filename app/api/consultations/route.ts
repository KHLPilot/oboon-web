import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const DEPOSIT_AMOUNT = 1000;

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
    const { agent_id, property_id, scheduled_at, agreed_to_terms } = body;

    // 필수 필드 검증
    if (!agent_id || !property_id || !scheduled_at) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다" },
        { status: 400 },
      );
    }

    // 약관 동의 필수 검증 (서버 사이드)
    if (agreed_to_terms !== true) {
      return NextResponse.json(
        { error: "약관 동의가 필요합니다" },
        { status: 400 },
      );
    }

    const scheduledDate = new Date(scheduled_at);

    // 예약 생성
    const { data: consultation, error } = await adminSupabase
      .from("consultations")
      .insert({
        customer_id: user.id,
        agent_id,
        property_id,
        scheduled_at: scheduledDate.toISOString(),
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

    // 예약 생성과 함께 예약금 결제 이벤트 기록
    const { error: ledgerError } = await adminSupabase
      .from("consultation_money_ledger")
      .insert({
        consultation_id: consultation.id,
        event_type: "deposit_paid",
        bucket: "deposit",
        amount: DEPOSIT_AMOUNT,
        actor_id: user.id,
        admin_id: null,
        note: "reservation_created",
      });

    if (ledgerError) {
      console.error("예약금 원장 기록 오류:", ledgerError);
      // 정합성 보호: 금전 원장 기록 실패 시 예약도 롤백
      await adminSupabase.from("consultations").delete().eq("id", consultation.id);
      return NextResponse.json(
        { error: "예약금 기록에 실패했습니다" },
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

    // 약관 동의 기록 저장 (법적 증거용)
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const userAgent = req.headers.get("user-agent") || null;

    // customer_reservation 약관 조회
    const { data: term } = await adminSupabase
      .from("terms")
      .select("id, type, version, title, content")
      .eq("type", "customer_reservation")
      .eq("is_active", true)
      .single();

    if (term) {
      const { error: consentError } = await adminSupabase
        .from("term_consents")
        .insert({
          user_id: user.id,
          term_id: term.id,
          term_type: term.type,
          term_version: term.version,
          ip_address: ipAddress,
          user_agent: userAgent,
          context: "reservation",
          context_id: consultation.id,
          term_title_snapshot: term.title,
          term_content_snapshot: term.content,
        });

      if (consentError) {
        console.error("약관 동의 기록 저장 오류:", consentError);
        // 동의 기록 실패해도 예약은 유지 (나중에 재시도 가능)
      }
    }

    // 관리자 알림: 신규 예약 접수
    {
      const [{ data: admins }, { data: property }] = await Promise.all([
        adminSupabase.from("profiles").select("id").eq("role", "admin"),
        adminSupabase
          .from("properties")
          .select("id, name")
          .eq("id", property_id)
          .single(),
      ]);

      if (admins && admins.length > 0) {
        const notifications = admins.map((admin) => ({
          recipient_id: admin.id,
          type: "admin_new_reservation",
          title: "신규 예약 접수",
          message: `${property?.name ?? "현장"} 예약이 새로 접수되었습니다.`,
          consultation_id: consultation.id,
          metadata: {
            tab: "reservations",
            reservation_id: consultation.id,
            property_id,
            deposit_amount: DEPOSIT_AMOUNT,
          },
        }));
        await adminSupabase.from("notifications").insert(notifications);
      }
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
    const roleParam = searchParams.get("role");
    // 기본값은 항상 "내 예약(customer)" 조회로 둔다.
    // 관리자 전체 조회는 ?role=admin을 명시적으로 전달한 경우에만 허용한다.
    const role =
      roleParam === "admin" || roleParam === "agent" ? roleParam : "customer";

    let query = adminSupabase
      .from("consultations")
      .select(
        `
                *,
                customer:profiles!consultations_customer_id_fkey(id, name, email, phone_number, avatar_url),
                agent:profiles!consultations_agent_id_fkey(id, name, email, phone_number, avatar_url),
                property:properties(id, name, image_url)
            `,
      )
      .order("scheduled_at", { ascending: true });

    // 역할에 따라 필터링 + 숨김 처리된 예약 제외
    if (role === "admin") {
      if (profile?.role !== "admin") {
        return NextResponse.json(
          { error: "관리자 권한이 필요합니다" },
          { status: 403 },
        );
      }
    } else if (role === "agent") {
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

    const profileIds = Array.from(
      new Set(
        filteredConsultations
          .flatMap((c: any) => [c.customer_id, c.agent_id])
          .filter(Boolean),
      ),
    );

    let publicProfilesMap = new Map<string, { name: string | null; avatar_url: string | null }>();
    if (profileIds.length > 0) {
      const { data: publicProfiles } = await adminSupabase
        .from("public_profiles")
        .select("id, name, avatar_url")
        .in("id", profileIds);

      publicProfilesMap = new Map(
        (publicProfiles || []).map((p: any) => [p.id, p]),
      );
    }

    const enrichedConsultations = filteredConsultations.map((c: any) => {
      const customer = publicProfilesMap.get(c.customer_id);
      const agent = publicProfilesMap.get(c.agent_id);
      return {
        ...c,
        customer_avatar_url:
          customer?.avatar_url ?? c.customer?.avatar_url ?? null,
        agent_avatar_url: agent?.avatar_url ?? c.agent?.avatar_url ?? null,
      };
    });

    return NextResponse.json({ consultations: enrichedConsultations });
  } catch (err: any) {
    console.error("예약 목록 API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
