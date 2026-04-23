import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils/cn";

function ChatRoomsSidebarSkeleton({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)",
        className,
      )}
    >
      <div className="flex h-20 items-center justify-between border-b border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-lg" />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 border-b border-(--oboon-border-default) px-4 py-3"
          >
            <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-3/5 rounded-lg" />
              <Skeleton className="h-4 w-4/5 rounded-lg" />
              <Skeleton className="h-3 w-2/3 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

export function ChatRoomsPageSkeleton() {
  return (
    <main className="bg-(--oboon-bg-page) h-dvh p-3 lg:p-4">
      <div className="mx-auto h-full w-full max-w-[1360px] lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-4">
        <ChatRoomsSidebarSkeleton className="lg:rounded-none lg:border-r" />
        <section className="hidden h-full items-center justify-center rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) lg:flex">
          <div className="w-full max-w-md space-y-4 px-8 text-center">
            <Skeleton className="mx-auto h-8 w-40 rounded-lg" />
            <Skeleton className="mx-auto h-4 w-72 max-w-full rounded-lg" />
          </div>
        </section>
      </div>
    </main>
  );
}

function ChatBubbleSkeleton({ align }: { align: "left" | "right" }) {
  return (
    <div className={cn("flex", align === "right" ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] sm:max-w-[75%]", align === "right" ? "order-2" : "order-1")}>
        {align === "left" ? <Skeleton className="mb-1 ml-1 h-3 w-16 rounded-lg" /> : null}
        <Skeleton
          className={cn(
            "h-12 rounded-2xl",
            align === "right" ? "rounded-br-md bg-(--oboon-primary)" : "rounded-bl-md",
          )}
        />
        <Skeleton className={cn("mt-1 h-3 w-12 rounded-lg", align === "right" ? "ml-auto mr-1" : "ml-1")} />
      </div>
    </div>
  );
}

export function ChatConversationPageSkeleton() {
  return (
    <main className="bg-(--oboon-bg-page) h-dvh lg:p-6">
      <div className="mx-auto h-full w-full lg:grid lg:max-w-[1360px] lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-4">
        <aside className="hidden h-full lg:block">
          <ChatRoomsSidebarSkeleton className="rounded-2xl" />
        </aside>

        <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)">
          <div className="border-b border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-4 sm:px-6 lg:px-8">
            <div className="flex h-20 items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg lg:hidden" />
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-6 w-32 rounded-lg" />
                  <Skeleton className="h-4 w-48 rounded-lg" />
                  <Skeleton className="h-3 w-56 rounded-lg" />
                </div>
              </div>
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6 lg:px-8">
            <div className="space-y-4 py-6">
              <div className="flex justify-center">
                <Skeleton className="h-8 w-40 rounded-full" />
              </div>
              <ChatBubbleSkeleton align="left" />
              <ChatBubbleSkeleton align="right" />
              <ChatBubbleSkeleton align="left" />
              <ChatBubbleSkeleton align="right" />
            </div>
          </div>

          <div className="border-t border-(--oboon-border-default) bg-(--oboon-bg-surface) px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-end gap-3">
              <Skeleton className="h-12 flex-1 rounded-2xl" />
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
