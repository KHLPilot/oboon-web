"use client";

import { useCallback } from "react";
import type { LocalViewHistoryItem } from "@/features/offerings/domain/offeringHistory.types";

const LS_KEY = "oboon:view-history";
const MAX_ITEMS = 20;

function readLocalHistory(): LocalViewHistoryItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as LocalViewHistoryItem[];
  } catch {
    return [];
  }
}

function writeLocalHistory(items: LocalViewHistoryItem[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  } catch {
    // 스토리지 쓰기 실패 무시
  }
}

/** localStorage에 열람 기록 추가/갱신 (최대 20건) */
export function recordLocalView(propertyId: number) {
  const items = readLocalHistory().filter((i) => i.propertyId !== propertyId);
  const updated: LocalViewHistoryItem[] = [
    { propertyId, lastViewedAt: new Date().toISOString() },
    ...items,
  ].slice(0, MAX_ITEMS);
  writeLocalHistory(updated);
}

/** localStorage에서 특정 현장 삭제 */
export function removeLocalView(propertyId: number) {
  const items = readLocalHistory().filter((i) => i.propertyId !== propertyId);
  writeLocalHistory(items);
}

/** localStorage 전체 히스토리 삭제 */
export function clearLocalHistory() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    // 무시
  }
}

/** localStorage에서 propertyId 목록 반환 (최신순) */
export function getLocalHistoryIds(): number[] {
  return readLocalHistory().map((i) => i.propertyId);
}

/** localStorage 열람 기록 반환 */
export function getLocalHistory(): LocalViewHistoryItem[] {
  return readLocalHistory();
}

/**
 * localStorage → DB 병합 훅
 * 로그인 시점에 ProfilePage 등에서 한 번 호출하면
 * localStorage에 쌓인 열람 기록을 /api/offerings/[id]/view로 재전송한다.
 */
export function useSyncLocalHistoryToDB() {
  const sync = useCallback(async () => {
    const items = readLocalHistory();
    if (items.length === 0) return;

    // 병렬 전송 (실패해도 무시)
    await Promise.allSettled(
      items.map((item) =>
        fetch(`/api/offerings/${item.propertyId}/view`, {
          method: "POST",
          keepalive: true,
        }),
      ),
    );

    // 병합 완료 후 로컬 기록 삭제
    clearLocalHistory();
  }, []);

  return { sync };
}
