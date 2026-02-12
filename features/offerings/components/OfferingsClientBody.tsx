// features/offerings/components/OfferingsClientBody.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import FilterBar from "@/features/offerings/components/FilterBar";
import OfferingCard from "@/features/offerings/components/OfferingCard";
import { createSupabaseClient } from "@/lib/supabaseClient";
import type { Offering } from "@/types/index";
import PageContainer from "@/components/shared/PageContainer";
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
  agent?: string;
};

function isRegionTab(v: string): v is OfferingRegionTab {
  return (OFFERING_REGION_TABS as readonly string[]).includes(v);
}

function toUnknownRecord(value: unknown): Record<string, unknown> {
  return (value ?? {}) as Record<string, unknown>;
}

function pickOfferingRegion(o: Offering): string | null {
  const anyO = toUnknownRecord(o);
  const candidates = [
    anyO.regionTab,
    anyO.region,
    anyO.regionShort,
    anyO.regionLabel,
    anyO.topLabel, // 지도/카드에서 쓰는 경우가 있음
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

function pickOfferingStatus(o: Offering): string | null {
  const anyO = toUnknownRecord(o);
  const s = anyO.status;
  return typeof s === "string" && s.trim() ? s.trim() : null;
}

function filterOfferings(
  all: Offering[],
  sp: SearchParams,
  approvedAgentPropertyIds: ReadonlySet<string>
): Offering[] {
  const rawRegion = sp.region ?? "전체";
  const region: OfferingRegionTab =
    rawRegion && isRegionTab(rawRegion) ? rawRegion : "전체";

  const rawStatus = sp.status ?? "";
  const status: OfferingStatusValue | "전체" =
    rawStatus && isOfferingStatusValue(rawStatus) ? rawStatus : "전체";

  const q = (sp.q ?? "").trim().toLowerCase();

  // budgetMin/budgetMax는 “억” 단위 입력 → 원(won) 단위로 변환해서 비교
  const budgetMinEok = sp.budgetMin ? Number(sp.budgetMin) : null;
  const budgetMaxEok = sp.budgetMax ? Number(sp.budgetMax) : null;

  const budgetMinWon =
    budgetMinEok != null && Number.isFinite(budgetMinEok)
      ? Math.max(0, Math.floor(budgetMinEok * 100_000_000))
      : null;

  const budgetMaxWon =
    budgetMaxEok != null && Number.isFinite(budgetMaxEok)
      ? Math.max(0, Math.floor(budgetMaxEok * 100_000_000))
      : null;
  const hasBudgetFilter = budgetMinWon != null || budgetMaxWon != null;

  const rawAgent = (sp.agent ?? "").trim();
  const agentFilter = rawAgent === "has" ? "has" : "전체";

  return all.filter((o) => {
    // region
    if (region !== "전체") {
      const r = pickOfferingRegion(o);
      // “수도권/서울/전체” 같은 탭 문자열이 offering에 직접 있지 않을 수 있어,
      // 후보 필드들에서 부분 일치로 처리(가장 안전한 최소 동작).
      if (!r || !r.includes(region)) return false;
    }

    // status
    if (status !== "전체") {
      const s = pickOfferingStatus(o);
      if (!s || s !== status) return false;
    }

    // agent
    if (agentFilter === "has" && !approvedAgentPropertyIds.has(String(o.id))) {
      return false;
    }

    // budget (o.priceMin/o.priceMax는 원(won) 단위로 가정)
    const anyO = toUnknownRecord(o);
    const priceMin = typeof anyO.priceMin === "number" ? anyO.priceMin : null;
    const priceMax = typeof anyO.priceMax === "number" ? anyO.priceMax : null;

    // budget (o.priceMin/o.priceMax는 원(won) 단위로 가정)
    // 예산 필터가 켜져 있을 때 가격 정보가 전혀 없으면 결과에서 제외한다.
    if (hasBudgetFilter && priceMin == null && priceMax == null) return false;

    if (budgetMinWon != null) {
      const upper = priceMax ?? priceMin;
      if (upper == null || upper < budgetMinWon) return false;
    }
    if (budgetMaxWon != null) {
      const lower = priceMin ?? priceMax;
      if (lower == null || lower > budgetMaxWon) return false;
    }

    // q
    if (q) {
      const title = String(toUnknownRecord(o).title ?? "").toLowerCase();
      if (!title.includes(q)) return false;
    }

    return true;
  });
}

/* ================================
 * Page
 * ================================ */

export default function OfferingsClientBody() {
  const sp = useSearchParams();

  const searchParams: SearchParams = useMemo(() => {
    return {
      region: sp.get("region") ?? undefined,
      status: sp.get("status") ?? undefined,
      q: sp.get("q") ?? undefined,
      budgetMin: sp.get("budgetMin") ?? undefined,
      budgetMax: sp.get("budgetMax") ?? undefined,
      agent: sp.get("agent") ?? undefined,
    };
  }, [sp]);

  const supabase = useMemo(() => createSupabaseClient(), []);
  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [approvedAgentPropertyIds, setApprovedAgentPropertyIds] = useState<
    Set<string>
  >(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);

  /* ---------- fetch ---------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      const [{ data, error }, { data: propertyAgents, error: agentError }] =
        await Promise.all([
          fetchPropertiesForOfferings(supabase, {
            limit: 200,
          }),
          supabase
            .from("property_agents")
            .select("property_id")
            .eq("status", "approved"),
        ]);

      if (!mounted) return;

      if (error) {
        setLoadError(error.message ?? "데이터를 불러오지 못했어요.");
        setRows([]);
        return;
      }

      if (agentError) {
        console.error("상담사 필터 데이터 조회 실패:", agentError);
        setApprovedAgentPropertyIds(new Set());
      } else {
        const ids = new Set(
          (propertyAgents ?? [])
            .map((row) => row.property_id)
            .filter(
              (id): id is number | string =>
                typeof id === "number" || typeof id === "string"
            )
            .map((id) => String(id))
        );
        setApprovedAgentPropertyIds(ids);
      }

      setLoadError(null);
      setRows((data ?? []) as PropertyRow[]);
    })();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const fallback = useMemo(
    () => ({
      addressShort: UXCopy.addressShort,
      regionShort: UXCopy.regionShort,
    }),
    [],
  );

  const offerings = useMemo<Offering[]>(() => {
    return rows.map((row) => mapPropertyRowToOffering(row, fallback));
  }, [rows, fallback]);

  const filtered = useMemo<Offering[]>(
    () => filterOfferings(offerings, searchParams, approvedAgentPropertyIds),
    [offerings, searchParams, approvedAgentPropertyIds],
  );

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer>
        <div className="flex items-center gap-3 mb-1">
          <div className="ob-typo-h1 text-(--oboon-text-title)">
            분양 리스트
          </div>
        </div>
        <p className="ob-typo-body text-(--oboon-text-muted) mb-4">
          조건에 맞는 분양 정보를 빠르게 찾을 수 있어요.
        </p>
        <div className="flex flex-col gap-5">
          <FilterBar />

          {loadError ? (
            <div className="rounded-2xl border border-(--oboon-danger-border) bg-(--oboon-danger-bg) px-4 py-3">
              <p className="ob-typo-body text-(--oboon-danger)">{loadError}</p>
            </div>
          ) : null}

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-6">
              <p className="ob-typo-body text-(--oboon-text-muted)">
                아직 등록된 분양이 없어요.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((offering) => (
                <OfferingCard key={offering.id} offering={offering} />
              ))}
            </div>
          )}

        </div>
      </PageContainer>
    </main>
  );
}
