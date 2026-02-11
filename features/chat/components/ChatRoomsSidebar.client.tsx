"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import Button from "@/components/ui/Button";
import { getAvatarUrlOrDefault } from "@/shared/imageUrl";

type ChatRoomItem = {
  room_id: string;
  consultation_id: string;
  updated_at: string;
  status: string | null;
  scheduled_at: string | null;
  property: {
    id: number;
    name: string;
  } | null;
  counterpart: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  } | null;
  latest_message: string | null;
  latest_message_at: string;
};

type ChatRoomsSidebarProps = {
  activeConsultationId?: string | null;
  onSelect?: () => void;
  mode?: "sidebar" | "page";
};

function formatMessageTimestamp(value: string) {
  const iso = String(value ?? "");
  if (!iso.includes("T")) return "-";

  const [datePart, timePartRaw] = iso.split("T");
  const timePart = (timePartRaw ?? "").replace("Z", "");
  if (!datePart || !timePart || timePart.length < 5) return "-";

  const mmdd = datePart.slice(5).replace("-", ".");
  const hhmm = timePart.slice(0, 5);
  return `${mmdd} ${hhmm}`;
}

export default function ChatRoomsSidebar({
  activeConsultationId = null,
  onSelect,
  mode = "sidebar",
}: ChatRoomsSidebarProps) {
  const router = useRouter();
  const [rooms, setRooms] = useState<ChatRoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/chat/rooms", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "채팅방 목록을 불러오지 못했습니다.");
      }
      setRooms((data?.rooms ?? []) as ChatRoomItem[]);
    } catch (err: unknown) {
      console.error("[chat rooms sidebar] load error:", err);
      setError(err instanceof Error ? err.message : "채팅방 목록을 불러오지 못했습니다.");
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const containerClassName = useMemo(() => {
    if (mode === "page") {
      return "flex h-full flex-col overflow-hidden rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)";
    }
    return "flex h-full flex-col overflow-hidden border-r border-(--oboon-border-default) bg-(--oboon-bg-surface)";
  }, [mode]);

  return (
    <aside className={containerClassName}>
      <div className="flex h-20 items-center justify-between border-b border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-4">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            shape="pill"
            onClick={() => router.push("/")}
            aria-label="홈으로 이동"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="ob-typo-h3 text-(--oboon-text-title)">메시지</div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="px-4 py-8 ob-typo-body text-(--oboon-text-muted)">
            불러오는 중...
          </div>
        ) : error ? (
          <div className="space-y-3 px-4 py-8">
            <div className="ob-typo-body text-(--oboon-danger)">{error}</div>
            <button
              type="button"
              onClick={loadRooms}
              className="rounded-full border border-(--oboon-border-default) px-3 py-1.5 ob-typo-caption text-(--oboon-text-title) hover:bg-(--oboon-bg-subtle)"
            >
              다시 시도
            </button>
          </div>
        ) : rooms.length === 0 ? (
          <div className="px-4 py-8 ob-typo-body text-(--oboon-text-muted)">
            채팅방이 없습니다.
          </div>
        ) : (
          <ul>
            {rooms.map((room) => {
              const isActive = activeConsultationId === room.consultation_id;
              const counterpartAvatarUrl = getAvatarUrlOrDefault(
                room.counterpart?.avatar_url,
              );

              return (
                <li key={room.room_id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect?.();
                      router.push(`/chat/${room.consultation_id}`);
                    }}
                    className={`flex w-full items-center gap-3 border-b border-(--oboon-border-default) px-4 py-3 text-left transition-colors ${
                      isActive
                        ? "bg-(--oboon-bg-subtle)"
                        : "hover:bg-(--oboon-bg-subtle)"
                    }`}
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-page)">
                      <Image
                        src={counterpartAvatarUrl}
                        alt={room.counterpart?.name ?? "상대방"}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate ob-typo-h3 text-(--oboon-text-title)">
                        {room.counterpart?.name ?? "알 수 없음"}
                      </div>
                      <div className="mt-0.5 truncate ob-typo-body text-(--oboon-text-muted)">
                        {room.property?.name ?? "현장 정보 없음"}
                      </div>
                      <div className="mt-0.5 truncate ob-typo-caption text-(--oboon-text-muted)">
                        {room.latest_message?.trim() || "대화를 시작해보세요."}
                        {" · "}
                        {formatMessageTimestamp(room.latest_message_at)}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
