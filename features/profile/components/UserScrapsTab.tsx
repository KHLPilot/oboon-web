"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { mapPropertyRowToOffering } from "@/features/offerings/mappers/offering.mapper";
import OfferingCard from "@/features/offerings/components/OfferingCard";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Offering } from "@/types/index";
import { ROUTES } from "@/types/index";

interface UserScrapsTabProps {
  profileId: string;
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

export default function UserScrapsTab({ profileId }: UserScrapsTabProps) {
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseClient();
    let mounted = true;

    (async () => {
      const { data: scraps, error: scrapError } = await supabase
        .from("offering_scraps")
        .select("property_id, created_at")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false });

      if (scrapError || !scraps || scraps.length === 0) {
        if (mounted) setLoading(false);
        return;
      }

      const ids = scraps.map((r: { property_id: number }) => r.property_id);

      const { data: snapshots } = await supabase
        .from("property_public_snapshots")
        .select("property_id, snapshot")
        .in("property_id", ids);

      if (!mounted) return;

      const snapshotMap = new Map<number, unknown>(
        (snapshots ?? []).map(
          (s: { property_id: number; snapshot: unknown }) => [
            s.property_id,
            s.snapshot,
          ],
        ),
      );

      const mapped = ids
        .map((id: number) => snapshotMap.get(id))
        .filter(Boolean)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((row: any) =>
          mapPropertyRowToOffering(row, { addressShort: "", regionShort: "" }),
        );

      setOfferings(mapped);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [profileId]);

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (offerings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Heart size={36} className="text-(--oboon-text-muted) opacity-40" />
        <p className="ob-typo-body text-(--oboon-text-muted)">찜한 현장이 없어요</p>
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
    <div className="grid gap-3 sm:grid-cols-2">
      {offerings.map((offering, index) => (
        <OfferingCard
          key={offering.id}
          offering={offering}
          mobileRecommendationLayout
          initialScrapped={true}
          isLoggedIn={true}
          priority={index === 0}
        />
      ))}
    </div>
  );
}
