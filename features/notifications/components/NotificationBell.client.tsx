"use client";

import { Bell } from "lucide-react";
import { useNotifications } from "./NotificationProvider.client";
import NotificationPanel from "./NotificationPanel.client";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/DropdownMenu";

export default function NotificationBell() {
  const { unreadCount, loading } = useNotifications();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative flex h-8 w-8 items-center justify-center rounded-full border border-(--oboon-border-default) bg-white/5 text-(--oboon-text-muted) transition hover:bg-white/10"
          aria-label={`알림 ${unreadCount > 0 ? `${unreadCount}개` : ""}`}
        >
          <Bell className="h-4 w-4" />
          {!loading && unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 ob-typo-caption bg-(--oboon-primary) text-(--oboon-on-primary)">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="mt-4 w-80 !min-w-0 !p-0 !border-0 !bg-transparent !shadow-none"
      >
        <NotificationPanel onClose={() => {}} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
