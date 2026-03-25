import type { SupabaseClient } from "@supabase/supabase-js";

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

type ChatRoomMessageRow = {
  room_id: string | null;
  content: string | null;
  created_at: string | null;
};

export type ChatRoomsLoadErrorCode = "rooms" | "consultations" | "messages";

export type ChatRoomListItem = {
  room_id: string;
  consultation_id: string;
  updated_at: string;
  status: string | null;
  scheduled_at: string | null;
  property: { id: number; name: string } | null;
  counterpart: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  } | null;
  latest_message: string | null;
  latest_message_at: string;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function fetchChatRoomsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<
  | { rooms: ChatRoomListItem[]; errorCode?: undefined }
  | { rooms?: undefined; errorCode: ChatRoomsLoadErrorCode }
> {
  const { data: roomsData, error: roomError } = await supabase
    .from("chat_rooms")
    .select(
      "id, consultation_id, last_consultation_id, property_id, customer_id, agent_id, updated_at",
    )
    .or(`customer_id.eq.${userId},agent_id.eq.${userId}`)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (roomError) {
    console.error("[chat rooms] load error:", roomError);
    return { errorCode: "rooms" };
  }

  const rooms = (roomsData ?? []) as RoomRow[];
  if (rooms.length === 0) {
    return { rooms: [] };
  }

  const consultationIds = [
    ...new Set(
      rooms
        .map((room) => room.last_consultation_id ?? room.consultation_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const roomIds = [...new Set(rooms.map((room) => room.id))];

  if (consultationIds.length === 0) {
    return { rooms: [] };
  }

  const [
    { data: consultationsData, error: consultationError },
    { data: messageData, error: messageError },
  ] = await Promise.all([
    supabase
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
    supabase
      .from("chat_messages")
      .select("room_id, content, created_at")
      .in("room_id", roomIds)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  if (consultationError) {
    console.error("[chat rooms] consultation load error:", consultationError);
    return { errorCode: "consultations" };
  }
  if (messageError) {
    console.error("[chat rooms] message load error:", messageError);
    return { errorCode: "messages" };
  }

  const consultationMap = new Map<string, ConsultationJoinRow>();
  ((consultationsData ?? []) as ConsultationJoinRow[]).forEach((row) => {
    consultationMap.set(row.id, row);
  });

  const latestByRoom = new Map<string, { content: string; created_at: string }>();
  ((messageData ?? []) as ChatRoomMessageRow[]).forEach((row) => {
    const roomId = String(row.room_id ?? "");
    if (!roomId || latestByRoom.has(roomId)) return;
    latestByRoom.set(roomId, {
      content: String(row.content ?? ""),
      created_at: String(row.created_at ?? ""),
    });
  });

  const payload = rooms
    .map((room) => {
      const activeConsultationId = room.last_consultation_id ?? room.consultation_id;
      if (!activeConsultationId) return null;

      const consultation = consultationMap.get(activeConsultationId);
      if (!consultation || consultation.status === "cancelled") return null;

      const customer = first(consultation.customer);
      const agent = first(consultation.agent);
      const property = first(consultation.property);
      const counterpart = room.customer_id === userId ? agent : customer;
      const latest = latestByRoom.get(room.id);

      return {
        room_id: room.id,
        consultation_id: activeConsultationId,
        updated_at: room.updated_at,
        status: consultation.status ?? null,
        scheduled_at: consultation.scheduled_at ?? null,
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
      } satisfies ChatRoomListItem;
    })
    .filter((room): room is ChatRoomListItem => Boolean(room));

  return { rooms: payload };
}
