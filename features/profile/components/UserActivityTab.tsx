"use client";

import { useState } from "react";
import { Heart, History } from "lucide-react";
import UserHistoryTab from "./UserHistoryTab";
import UserScrapsTab from "./UserScrapsTab";

type SubTab = "history" | "scraps";

interface UserActivityTabProps {
  profileId: string | null;
}

export default function UserActivityTab({ profileId }: UserActivityTabProps) {
  const isLoggedIn = Boolean(profileId);

  // 비로그인이면 찜 서브탭 없으므로 history 고정
  const [subTab, setSubTab] = useState<SubTab>(isLoggedIn ? "scraps" : "history");

  return (
    <div className="flex flex-col gap-4">
      {/* 서브탭 토글 */}
      <div className="flex gap-2">
        {isLoggedIn && (
          <button
            type="button"
            onClick={() => setSubTab("scraps")}
            className={[
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 ob-typo-body-sm transition-colors",
              subTab === "scraps"
                ? "bg-(--oboon-primary) text-(--oboon-on-primary)"
                : "bg-(--oboon-bg-subtle) text-(--oboon-text-muted) hover:text-(--oboon-text-title)",
            ].join(" ")}
          >
            <Heart size={13} className={subTab === "scraps" ? "fill-current" : ""} />
            찜한 현장
          </button>
        )}
        <button
          type="button"
          onClick={() => setSubTab("history")}
          className={[
            "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 ob-typo-body-sm transition-colors",
            subTab === "history"
              ? "bg-(--oboon-primary) text-(--oboon-on-primary)"
              : "bg-(--oboon-bg-subtle) text-(--oboon-text-muted) hover:text-(--oboon-text-title)",
          ].join(" ")}
        >
          <History size={13} />
          최근 본 현장
        </button>
      </div>

      {/* 서브탭 콘텐츠 */}
      {subTab === "scraps" && isLoggedIn && profileId ? (
        <UserScrapsTab profileId={profileId} />
      ) : null}

      {subTab === "history" ? (
        <UserHistoryTab profileId={profileId} />
      ) : null}
    </div>
  );
}
