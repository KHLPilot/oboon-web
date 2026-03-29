import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const adminSupabase = createSupabaseAdminClient();

type ConsultationForChat = {
  id: string;
  property_id: number | null;
  customer_id: string;
  agent_id: string;
};

async function getConsultationForChat(consultationId: string) {
  const { data } = await adminSupabase
    .from("consultations")
    .select("id, property_id, customer_id, agent_id")
    .eq("id", consultationId)
    .single();

  return (data ?? null) as ConsultationForChat | null;
}

async function findRoomIdForConsultation(consultation: ConsultationForChat) {
  if (consultation.property_id != null) {
    const { data: roomByTriplet } = await adminSupabase
      .from("chat_rooms")
      .select("id")
      .eq("property_id", consultation.property_id)
      .eq("customer_id", consultation.customer_id)
      .eq("agent_id", consultation.agent_id)
      .limit(1)
      .maybeSingle();

    if (roomByTriplet?.id) return roomByTriplet.id as string;
  }

  const { data: roomByConsultation } = await adminSupabase
    .from("chat_rooms")
    .select("id")
    .eq("consultation_id", consultation.id)
    .limit(1)
    .maybeSingle();

  return (roomByConsultation?.id as string | undefined) ?? null;
}

async function ensureRoomIdForConsultation(consultation: ConsultationForChat) {
  const existingRoomId = await findRoomIdForConsultation(consultation);
  if (existingRoomId) {
    await adminSupabase
      .from("chat_rooms")
      .update({
        consultation_id: consultation.id,
        last_consultation_id: consultation.id,
        property_id: consultation.property_id,
      })
      .eq("id", existingRoomId);
    return existingRoomId;
  }

  const { data: insertedRoom } = await adminSupabase
    .from("chat_rooms")
    .insert({
      consultation_id: consultation.id,
      last_consultation_id: consultation.id,
      property_id: consultation.property_id,
      customer_id: consultation.customer_id,
      agent_id: consultation.agent_id,
    })
    .select("id")
    .single();

  return (insertedRoom?.id as string | undefined) ?? null;
}

// 메시지 조회
export async function GET(
  req: Request,
  { params }: { params: Promise<{ consultationId: string }> }
) {
  try {
    const { consultationId } = await params;
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
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    // 해당 상담 예약의 참여자인지 확인
    const consultation = await getConsultationForChat(consultationId);

    if (!consultation) {
      return NextResponse.json({ error: "상담을 찾을 수 없습니다" }, { status: 404 });
    }

    const isCustomer = consultation.customer_id === user.id;
    const isAgent = consultation.agent_id === user.id;

    if (!isCustomer && !isAgent) {
      return NextResponse.json({ error: "접근 권한이 없습니다" }, { status: 403 });
    }

    // 채팅방 조회
    const chatRoomId = await findRoomIdForConsultation(consultation);
    if (!chatRoomId) {
      return NextResponse.json({ error: "채팅방을 찾을 수 없습니다" }, { status: 404 });
    }

    // 메시지 조회 (삭제된 메시지 필터링)
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const before = searchParams.get("before"); // 이전 메시지 로드용

    let query = adminSupabase
      .from("chat_messages")
      .select(
        `
        id,
        content,
        sender_id,
        created_at,
        deleted_by_customer,
        deleted_by_agent,
        sender:profiles!chat_messages_sender_id_fkey(id, name)
      `
      )
      .eq("room_id", chatRoomId)
      .order("created_at", { ascending: false })
      .limit(limit);

    // 본인이 삭제한 메시지는 제외
    if (isCustomer) {
      query = query.or("deleted_by_customer.is.null,deleted_by_customer.eq.false");
    } else if (isAgent) {
      query = query.or("deleted_by_agent.is.null,deleted_by_agent.eq.false");
    }

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data: messages, error } = await query;

    if (error) {
      // 테이블이 없는 경우에도 빈 배열 반환
      console.error("메시지 조회 오류:", error);
      if (error.code === "42P01") {
        // relation does not exist
        return NextResponse.json({
          messages: [],
          chatRoomId,
        });
      }
      return NextResponse.json({ error: "메시지 조회에 실패했습니다" }, { status: 500 });
    }

    return NextResponse.json({
      messages: (messages || []).reverse(),
      chatRoomId,
      userRole: isCustomer ? "customer" : "agent",
    });
  } catch (err: unknown) {
    console.error("채팅 API 오류:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}

// 메시지 전송
export async function POST(
  req: Request,
  { params }: { params: Promise<{ consultationId: string }> }
) {
  try {
    const { consultationId } = await params;
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
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const body = await req.json();
    const { content } = body;

    if (!content || content.trim() === "") {
      return NextResponse.json({ error: "메시지 내용이 필요합니다" }, { status: 400 });
    }

    // 해당 상담 예약의 참여자인지 확인
    const consultation = await getConsultationForChat(consultationId);

    if (!consultation) {
      return NextResponse.json({ error: "상담을 찾을 수 없습니다" }, { status: 404 });
    }

    if (consultation.customer_id !== user.id && consultation.agent_id !== user.id) {
      return NextResponse.json({ error: "접근 권한이 없습니다" }, { status: 403 });
    }

    // 채팅방 조회
    const chatRoomId = await ensureRoomIdForConsultation(consultation);
    if (!chatRoomId) {
      return NextResponse.json({ error: "채팅방을 찾을 수 없습니다" }, { status: 404 });
    }

    // 메시지 저장
    const { data: message, error } = await adminSupabase
      .from("chat_messages")
      .insert({
        room_id: chatRoomId,
        sender_id: user.id,
        content: content.trim(),
      })
      .select(
        `
        id,
        content,
        sender_id,
        created_at,
        sender:profiles!chat_messages_sender_id_fkey(id, name)
      `
      )
      .single();

    if (error) {
      console.error("메시지 저장 오류:", error);
      if (error.code === "42P01") {
        return NextResponse.json(
          { error: "메시지 전송에 실패했습니다" },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: "메시지 전송에 실패했습니다" }, { status: 500 });
    }

    // 채팅방 updated_at 갱신
    await adminSupabase
      .from("chat_rooms")
      .update({
        updated_at: new Date().toISOString(),
        consultation_id: consultationId,
        last_consultation_id: consultationId,
      })
      .eq("id", chatRoomId);

    // 상대방에게 알림 전송
    const isCustomer = consultation.customer_id === user.id;
    const recipientId = isCustomer ? consultation.agent_id : consultation.customer_id;

    // 발신자 이름 조회
    const { data: senderProfile } = await adminSupabase
      .from("profiles")
      .select("name, nickname")
      .eq("id", user.id)
      .single();

    const senderName = senderProfile?.nickname || senderProfile?.name || "알 수 없음";

    // 기존 읽지 않은 채팅 알림이 있는지 확인
    const { data: existingNotification } = await adminSupabase
      .from("notifications")
      .select("id, metadata")
      .eq("recipient_id", recipientId)
      .eq("consultation_id", consultationId)
      .eq("type", "new_chat_message")
      .is("read_at", null)
      .single();

    // 기존 메시지 목록 가져오기
    const existingMessages: string[] =
      (existingNotification?.metadata as { messages?: string[] })?.messages || [];
    const newMessage =
      content.trim().length > 30
        ? content.trim().slice(0, 30) + "..."
        : content.trim();

    // 기존 알림이 있으면 삭제 (새로 INSERT해야 Realtime 이벤트 발생)
    if (existingNotification) {
      await adminSupabase
        .from("notifications")
        .delete()
        .eq("id", existingNotification.id);
    }

    // 새 알림 생성 (메시지 누적)
    const allMessages = [...existingMessages, newMessage].slice(-5); // 최근 5개만 유지
    const messageCount = allMessages.length;

    await adminSupabase.from("notifications").insert({
      recipient_id: recipientId,
      type: "new_chat_message",
      title:
        messageCount > 1
          ? `${senderName}님의 새 메시지 ${messageCount}개`
          : `${senderName}님의 새 메시지`,
      message: allMessages.join(" | "),
      consultation_id: consultationId,
      metadata: {
        sender_id: user.id,
        sender_name: senderName,
        unread_count: messageCount,
        messages: allMessages,
      },
    });

    return NextResponse.json({ message });
  } catch (err: unknown) {
    console.error("채팅 API 오류:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}

// 채팅 내역 삭제 (본인에게만 안보이게 - soft delete)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ consultationId: string }> }
) {
  try {
    const { consultationId } = await params;
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
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    // 해당 상담 예약의 참여자인지 확인
    const consultation = await getConsultationForChat(consultationId);

    if (!consultation) {
      return NextResponse.json({ error: "상담을 찾을 수 없습니다" }, { status: 404 });
    }

    const isCustomer = consultation.customer_id === user.id;
    const isAgent = consultation.agent_id === user.id;

    if (!isCustomer && !isAgent) {
      return NextResponse.json({ error: "접근 권한이 없습니다" }, { status: 403 });
    }

    // 채팅방 조회
    const chatRoomId = await findRoomIdForConsultation(consultation);
    if (!chatRoomId) {
      return NextResponse.json({ error: "채팅방을 찾을 수 없습니다" }, { status: 404 });
    }

    // 본인 쪽에서만 삭제 표시 (soft delete)
    const updateField = isCustomer ? "deleted_by_customer" : "deleted_by_agent";

    const { error: updateError } = await adminSupabase
      .from("chat_messages")
      .update({ [updateField]: true })
      .eq("room_id", chatRoomId);

    if (updateError) {
      console.error("채팅 삭제 오류:", updateError);
      return NextResponse.json({ error: "채팅 삭제에 실패했습니다" }, { status: 500 });
    }

    // 양쪽 모두 삭제한 메시지는 실제로 DB에서 삭제
    const { error: hardDeleteError } = await adminSupabase
      .from("chat_messages")
      .delete()
      .eq("room_id", chatRoomId)
      .eq("deleted_by_customer", true)
      .eq("deleted_by_agent", true);

    if (hardDeleteError) {
      console.error("실제 삭제 오류:", hardDeleteError);
      // 실제 삭제 실패해도 soft delete는 성공했으므로 계속 진행
    }

    return NextResponse.json({
      success: true,
      message: "채팅 내역이 삭제되었습니다",
    });
  } catch (err: unknown) {
    console.error("채팅 삭제 API 오류:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
