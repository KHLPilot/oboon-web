"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import ChatRoomsSidebar from "@/features/chat/components/ChatRoomsSidebar.client";

export default function ChatRoomsPage() {
  const router = useRouter();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (isDesktop) {
    return (
      <main className="bg-(--oboon-bg-page) h-dvh p-4 lg:p-6">
        <div className="mx-auto grid h-full w-full max-w-[1360px] grid-cols-[360px_minmax(0,1fr)] gap-4">
          <ChatRoomsSidebar mode="page" />
          <section className="flex h-full items-center justify-center rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)">
            <div className="text-center">
              <p className="ob-typo-h3 text-(--oboon-text-title)">채팅방을 선택하세요</p>
              <p className="mt-1 ob-typo-body text-(--oboon-text-muted)">
                좌측 목록에서 대화를 선택하면 메시지를 볼 수 있습니다.
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-(--oboon-bg-page) h-dvh p-3">
      <ChatRoomsSidebar mode="page" onSelect={() => router.refresh()} />
    </main>
  );
}
