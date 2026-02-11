"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Expand, MessageCircleMore, X } from "lucide-react";
import Image from "next/image";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { useNotifications } from "./NotificationProvider.client";
import { NOTIFICATION_TYPES, type Notification } from "../domain/notification.types";

type SenderProfile = {
  id: string;
  name: string | null;
  avatar_url: string | null;
};

type RoomRow = {
  id: string;
  consultation_id: string;
  customer_id: string;
  agent_id: string;
  updated_at: string;
};

type ThreadItem = {
  roomId: string;
  consultationId: string;
  counterpartId: string;
  counterpartName: string;
  counterpartAvatarUrl: string | null;
  lastMessage: string;
  lastMessageAt: string;
  hasLatestMessage: boolean;
  unreadCount: number;
};

type ChatMetadata = {
  sender_id?: string;
  unread_count?: number;
};

function toChatMetadata(value: Notification["metadata"]): ChatMetadata {
  if (!value || typeof value !== "object") return {};
  return value as ChatMetadata;
}

function formatTimeAgo(value: string) {
  const now = Date.now();
  const at = new Date(value).getTime();
  const diffSec = Math.max(1, Math.floor((now - at) / 1000));
  if (diffSec < 60) return "방금";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}일`;
}

function SenderAvatar({
  profile,
  size = 28,
  borderClassName = "border-(--oboon-border-default)",
}: {
  profile: SenderProfile;
  size?: number;
  borderClassName?: string;
}) {
  const fallback = (profile.name ?? "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      className={`relative overflow-hidden rounded-full border bg-(--oboon-bg-subtle) ${borderClassName}`}
      style={{ width: size, height: size }}
    >
      {profile.avatar_url ? (
        <Image
          src={profile.avatar_url}
          alt={profile.name ?? "상대방"}
          fill
          className="object-cover"
          sizes={`${size}px`}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-(--oboon-text-muted)">
          {fallback}
        </div>
      )}
    </div>
  );
}

export default function NotificationToastManager() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createSupabaseClient(), []);
  const { notifications } = useNotifications();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasChatRoom, setHasChatRoom] = useState(false);
  const [roomRows, setRoomRows] = useState<RoomRow[]>([]);
  const [counterpartIds, setCounterpartIds] = useState<string[]>([]);
  const [senderProfiles, setSenderProfiles] = useState<Record<string, SenderProfile>>(
    {},
  );
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);

  const chatNotifications = useMemo(
    () => notifications.filter((n) => n.type === NOTIFICATION_TYPES.NEW_CHAT_MESSAGE),
    [notifications],
  );

  const unreadChatNotifications = useMemo(
    () => chatNotifications.filter((n) => !n.read_at),
    [chatNotifications],
  );

  const unreadMessageCount = useMemo(() => {
    return unreadChatNotifications.reduce((sum, n) => {
      const count = toChatMetadata(n.metadata).unread_count;
      return sum + (typeof count === "number" && Number.isFinite(count) ? count : 1);
    }, 0);
  }, [unreadChatNotifications]);

  const unreadByConsultation = useMemo(() => {
    const map = new Map<string, number>();
    unreadChatNotifications.forEach((n) => {
      if (!n.consultation_id) return;
      const count = toChatMetadata(n.metadata).unread_count;
      const add = typeof count === "number" && Number.isFinite(count) ? count : 1;
      map.set(n.consultation_id, (map.get(n.consultation_id) ?? 0) + add);
    });
    return map;
  }, [unreadChatNotifications]);

  const senderPreview = useMemo(() => {
    return counterpartIds
      .slice(0, 3)
      .map((id) => senderProfiles[id])
      .filter((profile): profile is SenderProfile => Boolean(profile));
  }, [counterpartIds, senderProfiles]);

  useEffect(() => {
    let mounted = true;

    async function fetchChatContext() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted || !user) {
        if (mounted) {
          setCurrentUserId(null);
          setHasChatRoom(false);
          setRoomRows([]);
          setCounterpartIds([]);
        }
        return;
      }

      setCurrentUserId(user.id);

      const { data: rooms, error: roomError } = await supabase
        .from("chat_rooms")
        .select("id, consultation_id, customer_id, agent_id, updated_at")
        .or(`customer_id.eq.${user.id},agent_id.eq.${user.id}`)
        .order("updated_at", { ascending: false })
        .limit(50);

      if (!mounted) return;

      if (roomError) {
        console.error("[chat toast] room load error:", roomError);
        setHasChatRoom(false);
        setRoomRows([]);
        setCounterpartIds([]);
        return;
      }

      const rows = (rooms ?? []) as RoomRow[];
      setRoomRows(rows);
      setHasChatRoom(rows.length > 0);

      const ids = rows
        .map((room) => (room.customer_id === user.id ? room.agent_id : room.customer_id))
        .filter((id): id is string => Boolean(id));
      setCounterpartIds([...new Set(ids)]);
    }

    fetchChatContext();

    return () => {
      mounted = false;
    };
  }, [chatNotifications.length, supabase]);

  useEffect(() => {
    let mounted = true;

    async function fetchSenderProfiles() {
      if (counterpartIds.length === 0) {
        setSenderProfiles({});
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", counterpartIds);

      if (error) {
        console.error("[chat toast] sender profile load error:", error);
        return;
      }
      if (!mounted) return;

      const next: Record<string, SenderProfile> = {};
      (data ?? []).forEach((row) => {
        const id = row.id as string;
        next[id] = {
          id,
          name: (row.name as string | null) ?? null,
          avatar_url: (row.avatar_url as string | null) ?? null,
        };
      });
      setSenderProfiles(next);
    }

    fetchSenderProfiles();

    return () => {
      mounted = false;
    };
  }, [counterpartIds, supabase]);

  useEffect(() => {
    let mounted = true;

    async function fetchThreadItems() {
      if (!currentUserId || roomRows.length === 0) {
        setThreads([]);
        return;
      }
      setThreadLoading(true);

      const roomIds = roomRows.map((r) => r.id);
      const { data: messages, error } = await supabase
        .from("chat_messages")
        .select("room_id, content, created_at")
        .in("room_id", roomIds)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) {
        console.error("[chat toast] latest message load error:", error);
      }
      if (!mounted) return;

      const latestByRoom = new Map<
        string,
        { content: string; created_at: string }
      >();
      (messages ?? []).forEach((msg) => {
        const roomId = msg.room_id as string;
        if (!latestByRoom.has(roomId)) {
          latestByRoom.set(roomId, {
            content: String(msg.content ?? ""),
            created_at: String(msg.created_at ?? ""),
          });
        }
      });

      const items = roomRows
        .map((room) => {
          const counterpartId =
            room.customer_id === currentUserId ? room.agent_id : room.customer_id;
          const profile = senderProfiles[counterpartId];
          const latest = latestByRoom.get(room.id);
          const lastMessageAt = latest?.created_at || room.updated_at;
          const unreadCount = unreadByConsultation.get(room.consultation_id) ?? 0;
          const hasLatestMessage = Boolean(latest?.content?.trim());

          return {
            roomId: room.id,
            consultationId: room.consultation_id,
            counterpartId,
            counterpartName: profile?.name ?? "알 수 없음",
            counterpartAvatarUrl: profile?.avatar_url ?? null,
            lastMessage: latest?.content?.trim() || "대화를 시작해보세요.",
            lastMessageAt,
            hasLatestMessage,
            unreadCount,
          } satisfies ThreadItem;
        })
        .sort(
          (a, b) =>
            new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
        );

      setThreads(items);
      setThreadLoading(false);
    }

    fetchThreadItems();

    return () => {
      mounted = false;
    };
  }, [currentUserId, roomRows, senderProfiles, supabase, unreadByConsultation]);

  useEffect(() => {
    if (!panelOpen) return;

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (wrapperRef.current && !wrapperRef.current.contains(target)) {
        setPanelOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [panelOpen]);

  if (!hasChatRoom) return null;
  if (pathname?.startsWith("/chat")) return null;

  const extraSenderCount = Math.max(0, counterpartIds.length - senderPreview.length);

  return (
    <div ref={wrapperRef} className="fixed bottom-5 right-5 z-[9999] sm:bottom-10 sm:right-10">
      {panelOpen && (
        <div className="absolute bottom-[calc(100%+8px)] right-0 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) shadow-xl">
          <div className="flex items-center justify-between border-b border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="ob-typo-subtitle text-(--oboon-text-title)">메시지</span>
              {unreadMessageCount > 0 ? (
                <span className="rounded-full bg-(--oboon-danger) px-2 py-0.5 text-[11px] font-semibold leading-4 text-(--oboon-on-danger)">
                  {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => router.push("/chat")}
                className="rounded-md p-1.5 text-(--oboon-text-muted) transition-colors hover:bg-(--oboon-bg-surface)"
                aria-label="전체 목록 보기"
              >
                <Expand className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="rounded-md p-1.5 text-(--oboon-text-muted) transition-colors hover:bg-(--oboon-bg-surface)"
                aria-label="패널 닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {threadLoading ? (
              <div className="px-4 py-8 text-center ob-typo-body text-(--oboon-text-muted)">
                불러오는 중...
              </div>
            ) : threads.length === 0 ? (
              <div className="px-4 py-8 text-center ob-typo-body text-(--oboon-text-muted)">
                표시할 메시지가 없습니다.
              </div>
            ) : (
              <ul>
                {threads.map((thread) => (
                  <li key={thread.roomId}>
                    <button
                      type="button"
                      onClick={() => {
                        setPanelOpen(false);
                        router.push(`/chat/${thread.consultationId}`);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-(--oboon-bg-subtle)"
                    >
                      <SenderAvatar
                        profile={{
                          id: thread.counterpartId,
                          name: thread.counterpartName,
                          avatar_url: thread.counterpartAvatarUrl,
                        }}
                        size={46}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="ob-typo-body2 truncate text-(--oboon-text-title)">
                          {thread.counterpartName}
                        </div>
                        <div className="mt-0.5 truncate ob-typo-caption text-(--oboon-text-muted)">
                          {thread.hasLatestMessage
                            ? `${thread.lastMessage} · ${formatTimeAgo(thread.lastMessageAt)}`
                            : thread.lastMessage}
                        </div>
                      </div>

                      {thread.unreadCount > 0 ? (
                        <span className="rounded-full bg-(--oboon-danger) px-1.5 py-0.5 text-[10px] font-semibold leading-4 text-(--oboon-on-danger)">
                          {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setPanelOpen(true)}
        className={`group relative flex h-12 w-12 items-center justify-center rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-surface) shadow-lg backdrop-blur transition-transform hover:scale-[1.01] active:scale-[0.99] sm:h-14 sm:w-auto sm:justify-start sm:gap-3 sm:px-4 ${
          panelOpen ? "invisible pointer-events-none" : ""
        }`}
        aria-label={
          unreadMessageCount > 0 ? `메시지 ${unreadMessageCount}개` : "메시지"
        }
      >
        <div className="relative">
          <MessageCircleMore className="h-5 w-5 text-(--oboon-text-title)" />
          {unreadMessageCount > 0 ? (
            <span className="absolute -right-2 -top-2 min-w-5 rounded-full bg-(--oboon-danger) px-1 text-center text-[11px] font-semibold leading-5 text-(--oboon-on-danger)">
              {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
            </span>
          ) : null}
        </div>

        <span className="hidden ob-typo-subtitle text-(--oboon-text-title) sm:inline">
          메시지
        </span>

        <div className="ml-1 hidden items-center sm:flex">
          {senderPreview.map((profile, idx) => (
            <div
              key={profile.id}
              className={`relative rounded-full ring-2 ring-(--oboon-bg-surface) ${
                idx > 0 ? "-ml-1.5" : ""
              }`}
              style={{ zIndex: senderPreview.length - idx }}
            >
              <SenderAvatar
                profile={profile}
                borderClassName="border-(--oboon-border-default)"
              />
            </div>
          ))}
          {extraSenderCount > 0 ? (
            <div className="-ml-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle) text-[11px] font-semibold text-(--oboon-text-muted) ring-2 ring-(--oboon-bg-surface)">
              +{extraSenderCount}
            </div>
          ) : null}
        </div>
      </button>
    </div>
  );
}
