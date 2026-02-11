"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, Loader2, MoreVertical, Trash2, CalendarDays } from "lucide-react";
import Image from "next/image";
import { fetchCurrentUserId } from "@/features/chat/services/chat.auth";
import { subscribeToChatRoom } from "@/features/chat/services/chat.realtime";
import Button from "@/components/ui/Button";
import { showAlert } from "@/shared/alert";
import ChatRoomsSidebar from "@/features/chat/components/ChatRoomsSidebar.client";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender: {
    id: string;
    name: string;
  };
}

interface ConsultationInfo {
  id: string;
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
        name: string;
        avatar_url?: string | null;
      }
    | {
        id: string;
        name: string;
        avatar_url?: string | null;
      }[]
    | null;
  agent:
    | {
        id: string;
        name: string;
        avatar_url?: string | null;
      }
    | {
        id: string;
        name: string;
        avatar_url?: string | null;
      }[]
    | null;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const consultationId = params.consultationId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [consultation, setConsultation] = useState<ConsultationInfo | null>(
    null,
  );
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // 초기 데이터 로드
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        // 현재 사용자 확인
        const userId = await fetchCurrentUserId();
        if (!userId) {
          router.push("/auth/login");
          return;
        }
        setCurrentUserId(userId);

        // 상담 정보 조회
        const consultationRes = await fetch(
          `/api/consultations/${consultationId}`,
        );
        if (!consultationRes.ok) {
          const data = await consultationRes.json();
          throw new Error(data.error || "상담 정보를 불러올 수 없습니다");
        }
        const { consultation: consultationData } = await consultationRes.json();
        setConsultation(consultationData);

        // 메시지 조회
        const messagesRes = await fetch(`/api/chat/${consultationId}`);
        if (!messagesRes.ok) {
          const data = await messagesRes.json();
          throw new Error(data.error || "메시지를 불러올 수 없습니다");
        }
        const { messages: messagesData, chatRoomId: roomId } =
          await messagesRes.json();
        setMessages(messagesData);
        setChatRoomId(roomId);

        // 해당 상담의 모든 채팅 알림을 읽음 처리
        fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            consultationId,
            type: "new_chat_message",
          }),
        }).catch(() => {
          // 알림 읽음 처리 실패해도 무시
        });
      } catch (err: unknown) {
        console.error("데이터 로드 오류:", err);
        setError(getErrorMessage(err, "데이터를 불러오는 중 오류가 발생했습니다."));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [consultationId, router]);

  // 스크롤 처리
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Supabase Realtime 구독
  useEffect(() => {
    if (!chatRoomId) return;

    const unsubscribe = subscribeToChatRoom({
      roomId: chatRoomId,
      currentUserId,
      onMessage: (message) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });
      },
    });

    return () => {
      unsubscribe();
    };
  }, [chatRoomId, currentUserId]);

  // 메시지 전송
  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage("");
    setSending(true);

    try {
      const res = await fetch(`/api/chat/${consultationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageContent }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "메시지 전송에 실패했습니다");
      }

      const { message } = await res.json();
      setMessages((prev) => [...prev, message]);
      inputRef.current?.focus();
    } catch (err: unknown) {
      console.error("메시지 전송 오류:", err);
      setNewMessage(messageContent); // 실패 시 메시지 복원
      showAlert(getErrorMessage(err, "메시지 전송에 실패했습니다."));
    } finally {
      setSending(false);
    }
  };

  // 키보드 이벤트 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 채팅 내역 삭제
  const handleDeleteChat = async () => {
    if (
      !confirm(
        "채팅 내역을 삭제하시겠습니까?\n\n삭제된 내역은 본인에게만 보이지 않으며, 상대방에게는 계속 표시됩니다.",
      )
    ) {
      return;
    }

    setDeleting(true);
    setShowMenu(false);

    try {
      const res = await fetch(`/api/chat/${consultationId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "삭제에 실패했습니다");
      }

      setMessages([]);
      showAlert("채팅 내역이 삭제되었습니다.");
    } catch (err: unknown) {
      console.error("채팅 삭제 오류:", err);
      showAlert(getErrorMessage(err, "채팅 삭제에 실패했습니다."));
    } finally {
      setDeleting(false);
    }
  };

  // 시간 포맷
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  };

  // 날짜 구분선 표시 여부
  const shouldShowDateDivider = (
    currentMsg: Message,
    prevMsg: Message | null,
  ) => {
    if (!prevMsg) return true;
    const currentDate = new Date(currentMsg.created_at).toDateString();
    const prevDate = new Date(prevMsg.created_at).toDateString();
    return currentDate !== prevDate;
  };

  // 상대방 정보
  const customer = first(consultation?.customer);
  const agent = first(consultation?.agent);
  const property = first(consultation?.property);
  const otherParty = currentUserId === customer?.id ? agent : customer;

  if (loading) {
    return (
      <main className="bg-(--oboon-bg-page) h-dvh lg:p-6">
        <div className="mx-auto h-full w-full lg:grid lg:max-w-[1360px] lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-4">
          <aside className="hidden lg:block h-full">
            <ChatRoomsSidebar mode="page" activeConsultationId={consultationId} />
          </aside>
          <div className="flex h-full items-center justify-center lg:rounded-2xl lg:border lg:border-(--oboon-border-default) lg:bg-(--oboon-bg-surface)">
            <Loader2 className="h-8 w-8 animate-spin text-(--oboon-primary)" />
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="bg-(--oboon-bg-page) h-dvh lg:p-6">
        <div className="mx-auto h-full w-full lg:grid lg:max-w-[1360px] lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-4">
          <aside className="hidden lg:block h-full">
            <ChatRoomsSidebar mode="page" activeConsultationId={consultationId} />
          </aside>
          <div className="flex h-full items-center justify-center text-center lg:rounded-2xl lg:border lg:border-(--oboon-border-default) lg:bg-(--oboon-bg-surface)">
            <p className="ob-typo-body mb-4 text-(--oboon-danger)">{error}</p>
            <Button variant="secondary" onClick={() => router.back()}>
              돌아가기
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-(--oboon-bg-page) h-dvh lg:p-6">
      <div className="mx-auto h-full w-full lg:grid lg:max-w-[1360px] lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-4">
        <aside className="hidden lg:block h-full">
          <ChatRoomsSidebar mode="page" activeConsultationId={consultationId} />
        </aside>

        <section className="min-h-0 flex h-full flex-col lg:rounded-2xl lg:border lg:border-(--oboon-border-default) lg:bg-(--oboon-bg-surface) lg:overflow-hidden">
          {/* 채팅 헤더 */}
          <div className="relative shrink-0 bg-(--oboon-bg-subtle) border-b border-(--oboon-border-default) safe-area-top px-4 sm:px-6 lg:px-8">
            <div className="flex h-20 items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-lg hover:bg-(--oboon-bg-subtle) active:bg-(--oboon-bg-subtle) transition-colors lg:hidden"
            >
              <ArrowLeft className="h-5 w-5 text-(--oboon-text-title)" />
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle)">
                {otherParty?.avatar_url ? (
                  <Image
                    src={otherParty.avatar_url}
                    alt={otherParty.name || "상대방"}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center ob-typo-caption text-(--oboon-text-muted)">
                    {(otherParty?.name ?? "?").trim().charAt(0).toUpperCase() || "?"}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="ob-typo-h2 text-(--oboon-text-title) truncate">
                  {otherParty?.name || "채팅"}
                </div>
                <p className="ob-typo-body text-(--oboon-text-muted) truncate">
                  {property?.name ?? "현장 정보 없음"}
                </p>
              </div>
            </div>
            {/* 메뉴 버튼 */}
            <div>
              <Button
                size="sm"
                variant="ghost"
                shape="pill"
                onClick={() => setShowMenu(!showMenu)}
                className="h-9 w-9 p-0"
                aria-label="메뉴 열기"
              >
                <MoreVertical className="h-5 w-5 text-(--oboon-text-muted)" />
              </Button>
            </div>
            </div>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-4 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) shadow-lg sm:right-6 lg:right-8">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      router.push("/profile?consultations=1");
                    }}
                    className="flex w-full items-center gap-2 px-4 py-3 ob-typo-body text-(--oboon-text-body) hover:bg-(--oboon-bg-subtle) transition-colors"
                  >
                    <CalendarDays className="h-4 w-4" />
                    상담예약 내역
                  </button>
                  <button
                    onClick={handleDeleteChat}
                    disabled={deleting}
                    className="flex w-full items-center gap-2 px-4 py-3 ob-typo-body text-(--oboon-danger) hover:bg-(--oboon-danger-bg) transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deleting ? "삭제 중..." : "채팅 내역 삭제"}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* 메시지 영역 */}
          <div className="flex-1 overflow-y-auto min-h-0 px-4 pb-4 sm:px-6 lg:px-8">
            <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-10">
                <p className="ob-typo-body text-(--oboon-text-muted)">
                  아직 메시지가 없습니다.
                  <br />첫 메시지를 보내보세요!
                </p>
              </div>
            ) : (
              messages.map((message, index) => {
                const isMe = message.sender_id === currentUserId;
                const prevMessage = index > 0 ? messages[index - 1] : null;
                const showDateDivider = shouldShowDateDivider(
                  message,
                  prevMessage,
                );

                return (
                  <div key={message.id}>
                    {showDateDivider && (
                      <div className="flex items-center justify-center my-4">
                        <div className="rounded-full bg-(--oboon-bg-subtle) px-3 py-1 ob-typo-caption text-(--oboon-text-muted)">
                          {formatDate(message.created_at)}
                        </div>
                      </div>
                    )}
                    <div
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] ${isMe ? "order-2" : "order-1"}`}
                      >
                        {!isMe && (
                          <p className="mb-1 ml-1 ob-typo-caption text-(--oboon-text-muted)">
                            {message.sender?.name}
                          </p>
                        )}
                        <div
                          className={`rounded-2xl px-4 py-2 ${
                            isMe
                              ? "bg-(--oboon-primary) text-(--oboon-on-primary) rounded-br-md"
                              : "bg-(--oboon-bg-surface) border border-(--oboon-border-default) text-(--oboon-text-body) rounded-bl-md"
                          }`}
                        >
                          <p className="ob-typo-body whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                        </div>
                        <p
                          className={`mt-1 ob-typo-caption text-(--oboon-text-muted) ${
                            isMe ? "text-right mr-1" : "ml-1"
                          }`}
                        >
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
            </div>
          </div>

          {/* 입력 영역 */}
          <div className="shrink-0 bg-(--oboon-bg-surface) border-t border-(--oboon-border-default) safe-area-bottom px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 py-2 sm:py-3">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요"
              className="flex-1 rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-default) px-4 py-2.5 ob-typo-body text-(--oboon-text-body) sm:py-3 focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)"
              disabled={sending}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              className="p-2.5 sm:p-3 rounded-full bg-(--oboon-primary) text-(--oboon-on-primary) disabled:opacity-50 disabled:cursor-not-allowed hover:bg-(--oboon-primary-hover) active:scale-95 transition-all"
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
