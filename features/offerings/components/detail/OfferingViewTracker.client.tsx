"use client";

import { useEffect } from "react";
import { recordLocalView } from "@/features/offerings/hooks/useViewHistory";

const VIEW_TRACKER_STORAGE_PREFIX = "oboon:offering-view:";

export default function OfferingViewTracker({ propertyId }: { propertyId: number }) {
  useEffect(() => {
    if (!Number.isFinite(propertyId) || propertyId <= 0) return;

    // localStorage에 열람 기록 저장 (비로그인 포함)
    recordLocalView(propertyId);

    const storageKey = `${VIEW_TRACKER_STORAGE_PREFIX}${propertyId}`;
    try {
      if (window.sessionStorage.getItem(storageKey) === "1") return;
      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      // sessionStorage 사용 불가 환경에서는 그대로 1회 요청 시도
    }

    const controller = new AbortController();
    void fetch(`/api/offerings/${propertyId}/view`, {
      method: "POST",
      keepalive: true,
      signal: controller.signal,
    }).catch(() => {
      // 조회수 집계 실패는 사용자 플로우를 막지 않음
    });

    return () => controller.abort();
  }, [propertyId]);

  return null;
}
