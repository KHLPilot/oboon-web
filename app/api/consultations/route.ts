import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const DEPOSIT_AMOUNT = 1000;
const BLOCKING_BOOKING_STATUSES = ["requested", "pending", "confirmed"] as const;

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
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { agent_id, property_id, scheduled_at, agreed_to_terms } = body;
    const isPointReservation =
      body?.payment_method === "point" ||
      body?.use_points === true ||
      body?.is_point_booking === true;

    // 필수 필드 검증
    if (!agent_id || !property_id || !scheduled_at) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다" },
        { status: 400 },
      );
    }

    if (agent_id === user.id) {
      return NextResponse.json(
        { error: "본인에게는 상담을 신청할 수 없습니다" },
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

    // 정산 계좌 정보 필수 검증 (서버 사이드)
    const { data: customerProfile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("role, bank_name, bank_account_number, bank_account_holder")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("고객 프로필 조회 오류:", profileError);
      return NextResponse.json(
        { error: "프로필 정보를 확인하지 못했습니다" },
        { status: 500 },
      );
    }

    if (customerProfile?.role === "agent") {
      return NextResponse.json(
        { error: "상담사 계정은 상담 예약을 할 수 없습니다" },
        { status: 403 },
      );
    }

    const bankName = customerProfile?.bank_name?.trim() ?? "";
    const bankAccountNumber = customerProfile?.bank_account_number?.trim() ?? "";
    const bankAccountHolder = customerProfile?.bank_account_holder?.trim() ?? "";
    if (!bankName || !bankAccountNumber || !bankAccountHolder) {
      return NextResponse.json(
        {
          error: "예약 전 은행, 계좌번호, 입금자명을 입력해주세요",
          error_code: "BANK_INFO_REQUIRED",
        },
        { status: 400 },
      );
    }

    const scheduledDate = new Date(scheduled_at);
    const scheduledAtIso = scheduledDate.toISOString();

    // 동일 상담사/동일 시간대 중복 예약 사전 차단
    const { data: existingBooking, error: duplicateCheckError } = await adminSupabase
      .from("consultations")
      .select("id")
      .eq("agent_id", agent_id)
      .eq("scheduled_at", scheduledAtIso)
      .in("status", [...BLOCKING_BOOKING_STATUSES])
      .limit(1)
      .maybeSingle();

    if (duplicateCheckError) {
      console.error("중복 예약 확인 오류:", duplicateCheckError);
      return NextResponse.json(
        { error: "예약 가능 여부 확인에 실패했습니다" },
        { status: 500 },
      );
    }

    if (existingBooking) {
      return NextResponse.json(
        { error: "해당 시간은 이미 예약이 완료되었습니다. 다른 시간을 선택해주세요." },
        { status: 409 },
      );
    }

    // 포인트 예약은 관리자 승인 없이 즉시 상담사에게 배정한다.
    const initialStatus = isPointReservation ? "pending" : "requested";

    // 예약 생성
    const { data: consultation, error } = await adminSupabase
      .from("consultations")
      .insert({
        customer_id: user.id,
        agent_id,
        property_id,
        scheduled_at: scheduledAtIso,
        status: initialStatus,
      })
      .select()
      .single();

    if (error) {
      console.error("예약 생성 오류:", error);
      if ((error as { code?: string }).code === "23505") {
        return NextResponse.json(
          { error: "해당 시간은 이미 예약이 완료되었습니다. 다른 시간을 선택해주세요." },
          { status: 409 },
        );
      }
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
        bucket: isPointReservation ? "point" : "deposit",
        amount: DEPOSIT_AMOUNT,
        actor_id: user.id,
        admin_id: null,
        note: isPointReservation
          ? "reservation_created_with_point"
          : "reservation_created",
      });

    if (ledgerError) {
      console.error("예약금 원장 기록 오류:", ledgerError);
      // 정합성 보호: 금전 원장 기록 실패 시 예약은 소프트 삭제 처리
      await adminSupabase
        .from("consultations")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancelled_by: "customer",
          hidden_by_customer: true,
          hidden_by_agent: true,
        })
        .eq("id", consultation.id);
      return NextResponse.json(
        { error: "예약금 기록에 실패했습니다" },
        { status: 500 },
      );
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

    // 포인트 예약은 즉시 배정 처리: 채팅방 생성 + 상담사 알림
    if (isPointReservation) {
      const { data: existingRoom } = await adminSupabase
        .from("chat_rooms")
        .select("id")
        .eq("consultation_id", consultation.id)
        .limit(1)
        .maybeSingle();

      if (!existingRoom) {
        await adminSupabase.from("chat_rooms").insert({
          consultation_id: consultation.id,
          customer_id: user.id,
          agent_id,
        });
      }

      const { data: property } = await adminSupabase
        .from("properties")
        .select("id, name")
        .eq("id", property_id)
        .single();

      await adminSupabase.from("notifications").insert({
        recipient_id: agent_id,
        type: "consultation_request",
        title: "상담 예약이 배정되었어요",
        message: `${property?.name ?? "현장"} 예약이 포인트 결제로 즉시 확정되어 배정되었어요.`,
        consultation_id: consultation.id,
        metadata: {
          tab: "consultations",
          reservation_id: consultation.id,
          property_id,
          deposit_amount: DEPOSIT_AMOUNT,
          payment_method: "point",
        },
      });
    }

    // 현금 예약은 관리자 승인 대상: 관리자 알림 발송
    if (!isPointReservation) {
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
          title: "새 예약 요청이 들어왔어요",
          message: `${property?.name ?? "현장"} 예약 요청이 접수되었어요. 예약 관리에서 확인해 주세요.`,
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
  } catch (err: unknown) {
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
      query = query.or(
        "hidden_by_customer.is.null,hidden_by_customer.eq.false,hidden_by_agent.is.null,hidden_by_agent.eq.false",
      );
    } else if (role === "agent") {
      query = query
        .eq("agent_id", user.id)
        .neq("status", "requested")
        .or("hidden_by_agent.is.null,hidden_by_agent.eq.false");
    } else {
      query = query
        .eq("customer_id", user.id)
        .neq("hidden_by_customer", true);
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

    type ConsultationListRow = {
      id: string;
      status: string;
      cancelled_at: string | null;
      scheduled_at: string;
      customer_id: string | null;
      agent_id: string | null;
      customer?: { avatar_url?: string | null } | null;
      agent?: { avatar_url?: string | null } | null;
    };
    const consultationRows = (consultations || []) as ConsultationListRow[];

    const filteredConsultations = consultationRows
      .filter((c) => {
        // 취소된 예약이 3일 넘었으면 제외
        if (c.status === "cancelled" && c.cancelled_at) {
          const cancelledAt = new Date(c.cancelled_at);
          if (cancelledAt < threeDaysAgo) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
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
          .flatMap((c) => [c.customer_id, c.agent_id])
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
        (publicProfiles || []).map((p) => [p.id, p]),
      );
    }

    const enrichedConsultations = filteredConsultations.map((c) => {
      const customer = c.customer_id ? publicProfilesMap.get(c.customer_id) : undefined;
      const agent = c.agent_id ? publicProfilesMap.get(c.agent_id) : undefined;
      return {
        ...c,
        customer_avatar_url:
          customer?.avatar_url ?? c.customer?.avatar_url ?? null,
        agent_avatar_url: agent?.avatar_url ?? c.agent?.avatar_url ?? null,
      };
    });

    return NextResponse.json({ consultations: enrichedConsultations });
  } catch (err: unknown) {
    console.error("예약 목록 API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
