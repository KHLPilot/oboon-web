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
          className="relative flex h-8 w-8 items-center justify-center rounded-full border bg-white/5 transition hover:bg-white/10"
          style={{
            borderColor: "var(--oboon-border-default)",
            color: "var(--oboon-text-muted)",
          }}
          aria-label={`알림 ${unreadCount > 0 ? `${unreadCount}개` : ""}`}
        >
          <Bell className="h-4 w-4" />
          {!loading && unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 ob-typo-caption text-white"
              style={{ backgroundColor: "var(--oboon-primary)" }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 mt-4">
        <NotificationPanel onClose={() => {}} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
