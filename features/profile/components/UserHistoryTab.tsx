"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { History, Trash2 } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { mapPropertyRowToOffering } from "@/features/offerings/mappers/offering.mapper";
import OfferingCard from "@/features/offerings/components/OfferingCard";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Offering } from "@/types/index";
import { ROUTES } from "@/types/index";
import {
  getLocalHistory,
  removeLocalView,
  clearLocalHistory,
} from "@/features/offerings/hooks/useViewHistory";

interface HistoryItem {
  offering: Offering;
  lastViewedAt: string;
}

interface UserHistoryTabProps {
  /** 로그인된 profile_id. null이면 비로그인(localStorage 사용) */
  profileId: string | null;
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) overflow-hidden">
      {/* 모바일: 가로 레이아웃 */}
      <div className="p-3 sm:hidden space-y-3">
        <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3">
          <Skeleton className="aspect-square w-[72px] rounded-xl" />
          <div className="space-y-2 pt-0.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-4 w-1/3 mt-1" />
          </div>
        </div>
        <Skeleton className="h-px w-full" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-10 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </div>
      {/* 데스크톱: 세로 레이아웃 */}
      <div className="hidden sm:block">
        <Skeleton className="aspect-video w-full" />
        <div className="p-4 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="h-4 w-1/4 mt-2" />
        </div>
      </div>
    </div>
  );
}

export default function UserHistoryTab({ profileId }: UserHistoryTabProps) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setLoading(true);

    if (profileId) {
      const supabase = createSupabaseClient();
      const { data: history, error } = await supabase
        .from("offering_view_history")
        .select("property_id, last_viewed_at")
        .eq("profile_id", profileId)
        .order("last_viewed_at", { ascending: false })
        .limit(20);

      if (error || !history || history.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      const ids = history.map((r: { property_id: number }) => r.property_id);
      const viewedAtMap = new Map<number, string>(
        history.map((r: { property_id: number; last_viewed_at: string }) => [
          r.property_id,
          r.last_viewed_at,
        ]),
      );

      const { data: snapshots } = await supabase
        .from("property_public_snapshots")
        .select("property_id, snapshot")
        .in("property_id", ids);

      const snapshotMap = new Map<number, unknown>(
        (snapshots ?? []).map(
          (s: { property_id: number; snapshot: unknown }) => [
            s.property_id,
            s.snapshot,
          ],
        ),
      );

      const mapped: HistoryItem[] = ids
        .map((id: number) => {
          const snapshot = snapshotMap.get(id);
          if (!snapshot) return null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const offering = mapPropertyRowToOffering(snapshot as any, {
            addressShort: "",
            regionShort: "",
          });
          return { offering, lastViewedAt: viewedAtMap.get(id) ?? "" };
        })
        .filter(Boolean) as HistoryItem[];

      setItems(mapped);
    } else {
      const localItems = getLocalHistory();
      if (localItems.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      const supabase = createSupabaseClient();
      const ids = localItems.map((i) => i.propertyId);
      const viewedAtMap = new Map<number, string>(
        localItems.map((i) => [i.propertyId, i.lastViewedAt]),
      );

      const { data: snapshots } = await supabase
        .from("property_public_snapshots")
        .select("property_id, snapshot")
        .in("property_id", ids);

      const snapshotMap = new Map<number, unknown>(
        (snapshots ?? []).map(
          (s: { property_id: number; snapshot: unknown }) => [
            s.property_id,
            s.snapshot,
          ],
        ),
      );

      const mapped: HistoryItem[] = ids
        .map((id: number) => {
          const snapshot = snapshotMap.get(id);
          if (!snapshot) return null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const offering = mapPropertyRowToOffering(snapshot as any, {
            addressShort: "",
            regionShort: "",
          });
          return { offering, lastViewedAt: viewedAtMap.get(id) ?? "" };
        })
        .filter(Boolean) as HistoryItem[];

      setItems(mapped);
    }

    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadHistory();
  }, [loadHistory]);

  const handleRemove = async (propertyId: string) => {
    const id = Number(propertyId);
    setItems((prev) => prev.filter((i) => i.offering.id !== propertyId));

    if (profileId) {
      await fetch(`/api/offerings/history/${id}`, { method: "DELETE" });
    } else {
      removeLocalView(id);
    }
  };

  const handleClearAll = async () => {
    setItems([]);
    if (profileId) {
      await fetch("/api/offerings/history", { method: "DELETE" });
    } else {
      clearLocalHistory();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {/* 헤더 스켈레톤 */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <History size={36} className="text-(--oboon-text-muted) opacity-40" />
        <p className="ob-typo-body text-(--oboon-text-muted)">최근 본 현장이 없어요</p>
        <Link
          href={ROUTES.offerings.list}
          className="ob-typo-caption text-(--oboon-primary) underline underline-offset-2"
        >
          분양 현장 둘러보기
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 헤더: 건수 + 전체 삭제 */}
      <div className="flex items-center justify-between">
        <p className="ob-typo-caption text-(--oboon-text-muted)">
          최근 본 현장 {items.length}건
          {!profileId && (
            <span className="ml-1.5 opacity-60">· 로그인하면 기기 간 동기화돼요</span>
          )}
        </p>
        <button
          type="button"
          onClick={() => void handleClearAll()}
          className="flex items-center gap-1 ob-typo-caption text-(--oboon-text-muted) hover:text-rose-500 transition-colors"
        >
          <Trash2 size={13} />
          전체 삭제
        </button>
      </div>

      {/* 카드 그리드 */}
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map(({ offering }, index) => (
          <OfferingCard
            key={offering.id}
            offering={offering}
            mobileRecommendationLayout
            isLoggedIn={Boolean(profileId)}
            priority={index === 0}
            onHistoryDelete={() => void handleRemove(offering.id)}
          />
        ))}
      </div>
    </div>
  );
}
