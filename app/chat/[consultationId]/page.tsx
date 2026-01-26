"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, Loader2, MoreVertical, Trash2 } from "lucide-react";
import { fetchCurrentUserId } from "@/features/chat/services/chat.auth";
import { subscribeToChatRoom } from "@/features/chat/services/chat.realtime";
import PageContainer from "@/components/shared/PageContainer";
import Button from "@/components/ui/Button";
import { showAlert } from "@/shared/alert";

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
  property: {
    id: number;
    name: string;
  };
  customer: {
    id: string;
    name: string;
  };
  agent: {
    id: string;
    name: string;
  };
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
      } catch (err: any) {
        console.error("데이터 로드 오류:", err);
        setError(err.message);
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
    } catch (err: any) {
      console.error("메시지 전송 오류:", err);
      setNewMessage(messageContent); // 실패 시 메시지 복원
      showAlert(err.message);
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
    } catch (err: any) {
      console.error("채팅 삭제 오류:", err);
      showAlert(err.message);
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
  const otherParty =
    currentUserId === consultation?.customer.id
      ? consultation?.agent
      : consultation?.customer;

  if (loading) {
    return (
      <main className="bg-(--oboon-bg-page) min-h-screen">
        <PageContainer className="pb-10">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-(--oboon-primary)" />
          </div>
        </PageContainer>
      </main>
    );
  }

  if (error) {
    return (
      <main className="bg-(--oboon-bg-page) min-h-screen">
        <PageContainer className="pb-10">
          <div className="text-center">
            <p className="text-(--oboon-danger) mb-4">{error}</p>
            <Button variant="secondary" onClick={() => router.back()}>
              돌아가기
            </Button>
          </div>
        </PageContainer>
      </main>
    );
  }

  return (
    <main className="bg-(--oboon-bg-page) h-dvh flex flex-col">
      {/* 채팅 헤더 */}
      <div className="shrink-0 bg-(--oboon-bg-surface) border-b border-(--oboon-border-default) safe-area-top">
        <PageContainer>
          <div className="flex items-center gap-3 py-2 sm:py-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-lg hover:bg-(--oboon-bg-subtle) active:bg-(--oboon-bg-subtle) transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-(--oboon-text-title)" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm sm:text-base font-semibold text-(--oboon-text-title) truncate">
                {otherParty?.name || "채팅"}
              </h1>
              <p className="text-xs text-(--oboon-text-muted) truncate">
                {consultation?.property.name}
              </p>
            </div>
            {/* 메뉴 버튼 */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-lg hover:bg-(--oboon-bg-subtle) active:bg-(--oboon-bg-subtle) transition-colors"
              >
                <MoreVertical className="h-5 w-5 text-(--oboon-text-muted)" />
              </button>
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) shadow-lg overflow-hidden">
                    <button
                      onClick={handleDeleteChat}
                      disabled={deleting}
                      className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deleting ? "삭제 중..." : "채팅 내역 삭제"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </PageContainer>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <PageContainer className="pb-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-(--oboon-text-muted)">
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
                        <div className="px-3 py-1 rounded-full bg-(--oboon-bg-subtle) text-xs text-(--oboon-text-muted)">
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
                          <p className="text-xs text-(--oboon-text-muted) mb-1 ml-1">
                            {message.sender?.name}
                          </p>
                        )}
                        <div
                          className={`rounded-2xl px-4 py-2 ${
                            isMe
                              ? "bg-(--oboon-primary) text-white rounded-br-md"
                              : "bg-(--oboon-bg-surface) border border-(--oboon-border-default) text-(--oboon-text-body) rounded-bl-md"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                        </div>
                        <p
                          className={`text-xs text-(--oboon-text-muted) mt-1 ${
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
        </PageContainer>
      </div>

      {/* 입력 영역 */}
      <div className="shrink-0 bg-(--oboon-bg-surface) border-t border-(--oboon-border-default) safe-area-bottom">
        <PageContainer>
          <div className="flex items-center gap-2 py-2 sm:py-3">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요"
              className="flex-1 px-4 py-2.5 sm:py-3 rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-default) text-(--oboon-text-body) text-sm focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)"
              disabled={sending}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              className="p-2.5 sm:p-3 rounded-full bg-(--oboon-primary) text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-(--oboon-primary-hover) active:scale-95 transition-all"
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
        </PageContainer>
      </div>
    </main>
  );
}
