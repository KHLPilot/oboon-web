"use client";

import { useEffect } from "react";

const SESSION_PREFIX = "oboon.briefing.viewed";

export default function BriefingViewTracker({ postId }: { postId: string }) {
  useEffect(() => {
    if (!postId) return;

    const storageKey = `${SESSION_PREFIX}:${postId}`;
    if (window.sessionStorage.getItem(storageKey) === "1") {
      return;
    }

    let cancelled = false;

    async function trackView() {
      try {
        const res = await fetch(`/api/briefing/${postId}/view`, {
          method: "POST",
        });

        if (!cancelled && res.ok) {
          window.sessionStorage.setItem(storageKey, "1");
        }
      } catch {
        // 조회수 실패는 화면 렌더링을 막지 않음
      }
    }

    void trackView();

    return () => {
      cancelled = true;
    };
  }, [postId]);

  return null;
}
