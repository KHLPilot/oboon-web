import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function isDynamicServerUsageError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    (error as { digest?: string }).digest === "DYNAMIC_SERVER_USAGE"
  );
}

type RoomRow = {
  id: string;
  consultation_id: string | null;
  last_consultation_id: string | null;
  property_id: number | null;
  customer_id: string;
  agent_id: string;
  updated_at: string;
};

type ConsultationJoinRow = {
  id: string;
  status: string | null;
  scheduled_at: string | null;
  property:
    | {
        id: number;
        name: string;
      }
    | {
        id: number;
        name: string;
      }[]
    | null;
  customer:
    | {
        id: string;
        name: string | null;
        avatar_url: string | null;
      }
    | {
        id: string;
        name: string | null;
        avatar_url: string | null;
      }[]
    | null;
  agent:
    | {
        id: string;
        name: string | null;
        avatar_url: string | null;
      }
    | {
        id: string;
        name: string | null;
        avatar_url: string | null;
      }[]
    | null;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function GET() {
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
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const db =
      process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
          )
        : supabase;

    const { data: roomsData, error: roomError } = await db
      .from("chat_rooms")
      .select(
        "id, consultation_id, last_consultation_id, property_id, customer_id, agent_id, updated_at",
      )
      .or(`customer_id.eq.${user.id},agent_id.eq.${user.id}`)
      .order("updated_at", { ascending: false })
      .limit(100);

    if (roomError) {
      console.error("[chat rooms] load error:", roomError);
      return NextResponse.json({ error: "채팅방을 불러오지 못했습니다" }, { status: 500 });
    }

    const rooms = (roomsData ?? []) as RoomRow[];
    if (rooms.length === 0) {
      return NextResponse.json({ rooms: [] });
    }

    const consultationIds = [
      ...new Set(
        rooms
          .map((r) => r.last_consultation_id ?? r.consultation_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const roomIds = [...new Set(rooms.map((r) => r.id))];

    if (consultationIds.length === 0) {
      return NextResponse.json({ rooms: [] });
    }

    const [{ data: consultationsData, error: consultationError }, { data: messageData, error: messageError }] =
      await Promise.all([
        db
          .from("consultations")
          .select(
            `
            id,
            status,
            scheduled_at,
            property:properties(id, name),
            customer:profiles!consultations_customer_id_fkey(id, name, avatar_url),
            agent:profiles!consultations_agent_id_fkey(id, name, avatar_url)
          `,
          )
          .in("id", consultationIds),
        db
          .from("chat_messages")
          .select("room_id, content, created_at")
          .in("room_id", roomIds)
          .order("created_at", { ascending: false })
          .limit(1000),
      ]);

    if (consultationError) {
      console.error("[chat rooms] consultation load error:", consultationError);
      return NextResponse.json({ error: "상담 정보를 불러오지 못했습니다" }, { status: 500 });
    }
    if (messageError) {
      console.error("[chat rooms] message load error:", messageError);
      return NextResponse.json({ error: "메시지 정보를 불러오지 못했습니다" }, { status: 500 });
    }

    const consultationMap = new Map<string, ConsultationJoinRow>();
    ((consultationsData ?? []) as ConsultationJoinRow[]).forEach((row) => {
      consultationMap.set(row.id, row);
    });

    const latestByRoom = new Map<string, { content: string; created_at: string }>();
    (messageData ?? []).forEach((row) => {
      const roomId = String(row.room_id ?? "");
      if (!roomId || latestByRoom.has(roomId)) return;
      latestByRoom.set(roomId, {
        content: String(row.content ?? ""),
        created_at: String(row.created_at ?? ""),
      });
    });

    const payload = rooms.map((room) => {
      const activeConsultationId = room.last_consultation_id ?? room.consultation_id;
      if (!activeConsultationId) return null;

      const consultation = consultationMap.get(activeConsultationId);
      if (!consultation) return null;
      if (consultation.status === "cancelled") return null;

      const customer = first(consultation?.customer);
      const agent = first(consultation?.agent);
      const property = first(consultation?.property);
      const counterpart = room.customer_id === user.id ? agent : customer;
      const latest = latestByRoom.get(room.id);
      return {
        room_id: room.id,
        consultation_id: activeConsultationId,
        updated_at: room.updated_at,
        status: consultation?.status ?? null,
        scheduled_at: consultation?.scheduled_at ?? null,
        property: property
          ? { id: property.id, name: property.name }
          : null,
        counterpart: counterpart
          ? {
              id: counterpart.id,
              name: counterpart.name,
              avatar_url: counterpart.avatar_url,
            }
          : null,
        latest_message: latest?.content ?? null,
        latest_message_at: latest?.created_at ?? room.updated_at,
      };
    }).filter((room): room is NonNullable<typeof room> => Boolean(room));

    return NextResponse.json({ rooms: payload });
  } catch (error: unknown) {
    if (isDynamicServerUsageError(error)) {
      throw error;
    }
    console.error("[chat rooms] api error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
