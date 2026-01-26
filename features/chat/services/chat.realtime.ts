import { createSupabaseClient } from "@/lib/supabaseClient";

export type ChatRealtimeMessage = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender: {
    id: string;
    name: string;
  };
};

export function subscribeToChatRoom(args: {
  roomId: string;
  currentUserId: string | null;
  onMessage: (message: ChatRealtimeMessage) => void;
}) {
  const { roomId, currentUserId, onMessage } = args;
  const supabase = createSupabaseClient();

  const channel = supabase
    .channel(`chat_room_${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `room_id=eq.${roomId}`,
      },
      async (payload) => {
        const newMsg = payload.new as any;

        if (currentUserId && newMsg.sender_id === currentUserId) {
          return;
        }

        const { data: sender } = await supabase
          .from("profiles")
          .select("id, name")
          .eq("id", newMsg.sender_id)
          .single();

        const message: ChatRealtimeMessage = {
          id: newMsg.id,
          content: newMsg.content,
          sender_id: newMsg.sender_id,
          created_at: newMsg.created_at,
          sender: sender || { id: newMsg.sender_id, name: "알 수 없음" },
        };

        onMessage(message);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
