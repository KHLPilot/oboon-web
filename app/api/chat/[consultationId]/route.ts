import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    const { data: consultation } = await adminSupabase
      .from("consultations")
      .select("customer_id, agent_id")
      .eq("id", consultationId)
      .single();

    if (!consultation) {
      return NextResponse.json({ error: "상담을 찾을 수 없습니다" }, { status: 404 });
    }

    if (consultation.customer_id !== user.id && consultation.agent_id !== user.id) {
      return NextResponse.json({ error: "접근 권한이 없습니다" }, { status: 403 });
    }

    // 채팅방 조회
    const { data: chatRoom } = await adminSupabase
      .from("chat_rooms")
      .select("id")
      .eq("consultation_id", consultationId)
      .single();

    if (!chatRoom) {
      return NextResponse.json({ error: "채팅방을 찾을 수 없습니다" }, { status: 404 });
    }

    // 메시지 조회
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
        sender:profiles!chat_messages_sender_id_fkey(id, name)
      `
      )
      .eq("room_id", chatRoom.id)
      .order("created_at", { ascending: false })
      .limit(limit);

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
          chatRoomId: chatRoom.id,
        });
      }
      return NextResponse.json({ error: "메시지 조회에 실패했습니다" }, { status: 500 });
    }

    return NextResponse.json({
      messages: (messages || []).reverse(),
      chatRoomId: chatRoom.id,
    });
  } catch (err: any) {
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
    const { data: consultation } = await adminSupabase
      .from("consultations")
      .select("customer_id, agent_id")
      .eq("id", consultationId)
      .single();

    if (!consultation) {
      return NextResponse.json({ error: "상담을 찾을 수 없습니다" }, { status: 404 });
    }

    if (consultation.customer_id !== user.id && consultation.agent_id !== user.id) {
      return NextResponse.json({ error: "접근 권한이 없습니다" }, { status: 403 });
    }

    // 채팅방 조회
    const { data: chatRoom } = await adminSupabase
      .from("chat_rooms")
      .select("id")
      .eq("consultation_id", consultationId)
      .single();

    if (!chatRoom) {
      return NextResponse.json({ error: "채팅방을 찾을 수 없습니다" }, { status: 404 });
    }

    // 메시지 저장
    const { data: message, error } = await adminSupabase
      .from("chat_messages")
      .insert({
        room_id: chatRoom.id,
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
          { error: "채팅 기능을 사용하려면 chat_messages 테이블을 생성해주세요" },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: "메시지 전송에 실패했습니다" }, { status: 500 });
    }

    // 채팅방 updated_at 갱신
    await adminSupabase
      .from("chat_rooms")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", chatRoom.id);

    return NextResponse.json({ message });
  } catch (err: any) {
    console.error("채팅 API 오류:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
