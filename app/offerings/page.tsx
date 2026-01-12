"use client";
// app/offerings/page.tsx
import { useEffect, useMemo, useState } from "react";
import FilterBar from "@/features/offerings/FilterBar";
import OfferingCard from "@/features/offerings/OfferingCard";
import { createSupabaseClient } from "@/lib/supabaseClient";
import type { Offering } from "@/types/index";
import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import { UXCopy } from "@/shared/uxCopy";
import { fetchPropertiesForOfferings } from "@/features/offerings/services/offering.query";
import {
  mapPropertyRowToOffering,
  type PropertyRow,
} from "@/features/offerings/mappers/offering.mapper";
import {
  OFFERING_REGION_TABS,
  isOfferingStatusValue,
} from "@/features/offerings/domain/offering.constants";
import type {
  OfferingRegionTab,
  OfferingStatusValue,
} from "@/features/offerings/domain/offering.types";

/* ================================
 * Search / Filter
 * ================================ */

type SearchParams = {
  region?: string;
  status?: string;
  q?: string;
  budgetMin?: string; // 억 단위
  budgetMax?: string; // 억 단위
};

function isRegionTab(v: string): v is OfferingRegionTab {
  return (OFFERING_REGION_TABS as readonly string[]).includes(v);
}

function filterOfferings(all: Offering[], sp: SearchParams) {
  const rawRegion = sp.region ?? "전체";
  const region: OfferingRegionTab =
    rawRegion && isRegionTab(rawRegion) ? rawRegion : "전체";

  const rawStatus = sp.status ?? "";
  const status: OfferingStatusValue | "전체" =
    rawStatus && isOfferingStatusValue(rawStatus) ? rawStatus : "전체";
  const q = (sp.q ?? "").trim();

  const budgetMin = sp.budgetMin ? Number(sp.budgetMin) : null;
  const budgetMax = sp.budgetMax ? Number(sp.budgetMax) : null;
  const budgetMinWon =
    budgetMin != null ? Math.round(budgetMin * 100_000_000) : null;
  const budgetMaxWon =
    budgetMax != null ? Math.round(budgetMax * 100_000_000) : null;

  return all.filter((o) => {
    if (region !== "전체" && o.region !== region) return false;
    if (status !== "전체" && o.statusValue !== status) return false;

    if (q) {
      const hay = `${o.title} ${o.addressShort} ${
        o.regionLabel ?? o.region
      }`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }

    // 예산 필터
    if (
      budgetMinWon != null &&
      o.priceMax억 != null &&
      o.priceMax억 < budgetMinWon
    )
      return false;
    if (
      budgetMaxWon != null &&
      o.priceMin억 != null &&
      o.priceMin억 > budgetMaxWon
    )
      return false;

    return true;
  });
}

/* ================================
 * Page
 * ================================ */

export default function OfferingsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  /* ---------- fetch ---------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await fetchPropertiesForOfferings(supabase, {
        limit: 200,
      });

      if (!mounted) return;

      if (error) {
        setLoadError(error.message ?? "데이터를 불러오지 못했어요.");
        setRows([]);
        return;
      }

      setLoadError(null);
      setRows((data ?? []) as PropertyRow[]);
    })();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  /* ---------- map to Offering ---------- */
  const fallback = useMemo(
    () => ({
      addressShort: UXCopy.addressShort,
      regionShort: UXCopy.regionShort,
    }),
    []
  );

  const allOfferings: Offering[] = useMemo(() => {
    return rows.map((row) => mapPropertyRowToOffering(row, fallback));
  }, [rows, fallback]);

  const items = useMemo(
    () => filterOfferings(allOfferings, searchParams ?? {}),
    [allOfferings, searchParams]
  );

  /* ---------- render ---------- */
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-16 pt-6">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-(--oboon-text-title)">
            분양 리스트
          </h1>
          <p className="mt-1 text-[14px] leading-[1.6] text-(--oboon-text-muted)">
            조건에 맞는 분양 정보를 빠르게 찾을 수 있어요.
          </p>
        </div>

        {/* Filter */}
        <Card className="p-5 mb-6">
          <FilterBar />
        </Card>

        {/* Meta */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-[14px] text-(--oboon-text-muted)">
            총{" "}
            <span className="font-semibold text-(--oboon-text-title)">
              {items.length}
            </span>
            개
          </div>

          {loadError && (
            <div className="text-[12px] text-red-500">
              데이터를 불러오지 못했어요. ({loadError})
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((offering) => (
            <OfferingCard key={offering.id} offering={offering} />
          ))}
        </div>
      </PageContainer>
    </main>
  );
}
