// features/offerings/components/OfferingsClientBody.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import FilterBar from "@/features/offerings/components/FilterBar";
import OfferingCard from "@/features/offerings/components/OfferingCard";
import { EmptyState } from "@/components/ui/EmptyState";
import OfferingsMapView from "@/features/offerings/components/OfferingsMapView";
import { createSupabaseClient } from "@/lib/supabaseClient";
import type { Offering } from "@/types/index";
import PageContainer from "@/components/shared/PageContainer";
import { UXCopy } from "@/shared/uxCopy";
import { toKoreanErrorMessage } from "@/shared/errorMessage";
import { Copy } from "@/shared/copy";
import { fetchPropertiesForOfferings } from "@/features/offerings/services/offering.query";
import {
  mapPropertyRowToOffering,
  type PropertyRow,
} from "@/features/offerings/mappers/offering.mapper";
import { OfferingCardSkeleton } from "@/features/offerings/components/OfferingCardSkeleton";
import {
  GYEONGGI_NORTH_CITIES,
  getGyeonggiSubRegionConfig,
  OFFERING_STATUS_LABEL,
  OFFERING_REGION_TABS,
  isOfferingStatusValue,
  normalizeOfferingStatusValue,
} from "@/features/offerings/domain/offering.constants";
import {
  OFFERING_STATUS_VALUES,
  type OfferingRegionTab,
  type OfferingStatusValue,
} from "@/features/offerings/domain/offering.types";

const [readyStatusValue, openStatusValue, closedStatusValue] =
  OFFERING_STATUS_VALUES;

const compactOfferingStatusAliasMap: Record<string, OfferingStatusValue> = {
  [OFFERING_STATUS_LABEL[readyStatusValue].replace(/\s+/g, "")]:
    readyStatusValue,
  예정: readyStatusValue,
  [OFFERING_STATUS_LABEL[openStatusValue].replace(/\s+/g, "")]:
    openStatusValue,
  진행중: openStatusValue,
  모집중: openStatusValue,
  [OFFERING_STATUS_LABEL[closedStatusValue].replace(/\s+/g, "")]:
    closedStatusValue,
  종료: closedStatusValue,
};

/* ================================
 * Search / Filter
 * ================================ */

type SearchParams = {
  view?: string;
  sort?: string;
  region?: string;
  subRegion?: string;
  status?: string;
  q?: string;
  budgetMin?: string; // 억 단위
  budgetMax?: string; // 억 단위
  agent?: string;
  appraisal?: string;
  exclude?: string;
  recommended?: string;
  recommendedIds?: string;
};

type OfferingsSortKey = "latest" | "priceLow" | "priceHigh";

function isRegionTab(v: string): v is OfferingRegionTab {
  return (OFFERING_REGION_TABS as readonly string[]).includes(v);
}

function isOfferingsSortKey(v: string): v is OfferingsSortKey {
  return v === "latest" || v === "priceLow" || v === "priceHigh";
}

function compareNullableNumber(
  a: number | null | undefined,
  b: number | null | undefined,
  direction: "asc" | "desc" = "asc",
) {
  const left = typeof a === "number" && Number.isFinite(a) ? a : null;
  const right = typeof b === "number" && Number.isFinite(b) ? b : null;

  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return direction === "asc" ? left - right : right - left;
}

function toUnknownRecord(value: unknown): Record<string, unknown> {
  return (value ?? {}) as Record<string, unknown>;
}

function normalizeNonEmptyString(value: string | null | undefined): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function pickOfferingRegion(o: Offering): string | null {
  const candidates = [
    o.region,
    o.regionLabel,
  ];
  for (const c of candidates) {
    const normalized = normalizeNonEmptyString(c);
    if (normalized) return normalized;
  }
  return null;
}

function pickOfferingStatus(o: Offering): string | null {
  const statusValue = o.statusValue;
  if (typeof statusValue === "string" && isOfferingStatusValue(statusValue)) {
    return statusValue;
  }

  const s = normalizeNonEmptyString(o.status);
  if (!s) return null;

  const normalized = normalizeOfferingStatusValue(s);
  if (normalized) return normalized;

  const compact = s.replace(/\s+/g, "");
  return compactOfferingStatusAliasMap[compact] ?? s.trim();
}

function passesExcludeAndRecommended(
  o: Offering,
  excludeIds: ReadonlySet<string>,
  recommendedMode: boolean,
  recommendedIds: ReadonlySet<string>,
): boolean {
  if (excludeIds.has(String(o.id))) return false;
  if (!recommendedMode) return true;
  if (recommendedIds.size === 0) return false;
  return recommendedIds.has(String(o.id));
}

function passesRegion(
  o: Offering,
  region: OfferingRegionTab,
  subRegion: string,
): boolean {
  if (region !== "전체") {
    const r = pickOfferingRegion(o);
    if (!r || !r.includes(region)) return false;
  }

  if (!subRegion) return true;

  const addressSource = o.addressFull ?? o.addressShort;

  if (region === "서울") {
    return addressSource.includes(subRegion);
  }

  if (region === "경기") {
    const gyeonggiSubRegion = getGyeonggiSubRegionConfig(subRegion);
    if (gyeonggiSubRegion) {
      return gyeonggiSubRegion.matchers.some((matcher) =>
        addressSource.includes(matcher),
      );
    }

    const isNorth = GYEONGGI_NORTH_CITIES.some((matcher) =>
      addressSource.includes(matcher),
    );
    if (subRegion === "north") return isNorth;
    if (subRegion === "south") return !isNorth;
  }

  return true;
}

function passesStatus(
  o: Offering,
  status: OfferingStatusValue | "전체",
): boolean {
  if (status === "전체") return true;
  const s = pickOfferingStatus(o);
  return Boolean(s && s === status);
}

function passesAgent(
  o: Offering,
  agentFilter: "has" | "전체",
  approvedAgentPropertyIds: ReadonlySet<string>,
): boolean {
  if (agentFilter !== "has") return true;
  return approvedAgentPropertyIds.has(String(o.id));
}

function passesAppraisal(
  o: Offering,
  appraisalFilter: "done" | "전체",
): boolean {
  if (appraisalFilter !== "done") return true;
  return Boolean(o.hasAppraiserComment);
}

function passesBudget(
  o: Offering,
  budgetMinWon: number | null,
  budgetMaxWon: number | null,
  hasBudgetFilter: boolean,
): boolean {
  const anyO = toUnknownRecord(o);
  const priceMin =
    typeof anyO.priceMin억 === "number" ? anyO.priceMin억 : null;
  const priceMax =
    typeof anyO.priceMax억 === "number" ? anyO.priceMax억 : null;

  if (hasBudgetFilter && priceMin == null && priceMax == null) return false;

  if (budgetMinWon != null) {
    const upper = priceMax ?? priceMin;
    if (upper == null || upper < budgetMinWon) return false;
  }
  if (budgetMaxWon != null) {
    const lower = priceMin ?? priceMax;
    if (lower == null || lower > budgetMaxWon) return false;
  }

  return true;
}

function passesQuery(o: Offering, q: string): boolean {
  if (!q) return true;
  const title = String(toUnknownRecord(o).title ?? "").toLowerCase();
  return title.includes(q);
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
  const subRegion = (sp.subRegion ?? "").trim();

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
  const rawAppraisal = (sp.appraisal ?? "").trim();
  const appraisalFilter = rawAppraisal === "done" ? "done" : "전체";
  const excludeIds = new Set(
    String(sp.exclude ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const recommendedMode = String(sp.recommended ?? "") === "1";
  const recommendedIds = new Set(
    String(sp.recommendedIds ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );

  return all.filter((o) =>
    passesExcludeAndRecommended(o, excludeIds, recommendedMode, recommendedIds) &&
    passesRegion(o, region, subRegion) &&
    passesStatus(o, status) &&
    passesAgent(o, agentFilter, approvedAgentPropertyIds) &&
    passesAppraisal(o, appraisalFilter) &&
    passesBudget(o, budgetMinWon, budgetMaxWon, hasBudgetFilter) &&
    passesQuery(o, q)
  );
}

function sortOfferings(items: Offering[], sortKey: OfferingsSortKey) {
  if (sortKey === "latest") return items;

  const next = [...items];

  if (sortKey === "priceLow") {
    return next.sort((a, b) =>
      compareNullableNumber(a.priceMin억, b.priceMin억, "asc") ||
      compareNullableNumber(a.priceMax억, b.priceMax억, "asc"),
    );
  }

  return next.sort((a, b) =>
    compareNullableNumber(a.priceMax억, b.priceMax억, "desc") ||
    compareNullableNumber(a.priceMin억, b.priceMin억, "desc"),
  );
}

/* ================================
 * Page
 * ================================ */

export default function OfferingsClientBody() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const searchParams: SearchParams = useMemo(() => {
    return {
      view: sp.get("view") ?? undefined,
      sort: sp.get("sort") ?? undefined,
      region: sp.get("region") ?? undefined,
      subRegion: sp.get("subRegion") ?? undefined,
      status: sp.get("status") ?? undefined,
      q: sp.get("q") ?? undefined,
      budgetMin: sp.get("budgetMin") ?? undefined,
      budgetMax: sp.get("budgetMax") ?? undefined,
      agent: sp.get("agent") ?? undefined,
      appraisal: sp.get("appraisal") ?? undefined,
      exclude: sp.get("exclude") ?? undefined,
      recommended: sp.get("recommended") ?? undefined,
      recommendedIds: sp.get("recommendedIds") ?? undefined,
    };
  }, [sp]);

  const supabase = useMemo(() => createSupabaseClient(), []);
  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [rowsLoaded, setRowsLoaded] = useState(false);
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
        setLoadError(toKoreanErrorMessage(error, "데이터를 불러오지 못했어요."));
        setRows([]);
        setRowsLoaded(true);
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
      setRowsLoaded(true);
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
  const sortKey: OfferingsSortKey =
    searchParams.sort && isOfferingsSortKey(searchParams.sort)
      ? searchParams.sort
      : "latest";
  const sortedOfferings = useMemo<Offering[]>(
    () => sortOfferings(filtered, sortKey),
    [filtered, sortKey],
  );
  const isRecommendedMode = searchParams.recommended === "1";
  const view = searchParams.view === "map" ? "map" : "list";

  function handleViewChange(nextView: "list" | "map") {
    const next = new URLSearchParams(sp.toString());
    if (nextView === "map") {
      next.set("view", "map");
    } else {
      next.delete("view");
    }

    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

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
          <FilterBar view={view} onViewChange={handleViewChange} />

          {loadError ? (
            <div className="rounded-2xl border border-(--oboon-danger-border) bg-(--oboon-danger-bg) px-4 py-3">
              <p className="ob-typo-body text-(--oboon-danger)">{loadError}</p>
            </div>
          ) : null}

          {!rowsLoaded ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <OfferingCardSkeleton key={i} />
              ))}
            </div>
          ) : sortedOfferings.length === 0 ? (
            <EmptyState
              icon={
                <svg viewBox="0 0 56 56" fill="none" aria-hidden="true" className="h-14 w-14">
                  <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="2.5" />
                  <line x1="34.8" y1="34.8" x2="48" y2="48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  {isRecommendedMode && (
                    <>
                      <line x1="20" y1="24" x2="28" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <line x1="24" y1="20" x2="24" y2="28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </>
                  )}
                </svg>
              }
              title={isRecommendedMode ? Copy.offerings.list.empty.recommended.title : Copy.offerings.list.empty.general.title}
              description={isRecommendedMode ? Copy.offerings.list.empty.recommended.subtitle : Copy.offerings.list.empty.general.subtitle}
              actions={isRecommendedMode ? [
                { label: "필터 초기화", onClick: () => router.replace(pathname), variant: "secondary" },
                { label: "전체 보기", onClick: () => router.push("/offerings"), variant: "primary" },
              ] : undefined}
            />
          ) : view === "map" ? (
            <OfferingsMapView offerings={sortedOfferings} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedOfferings.map((offering) => (
                <OfferingCard
                  key={offering.id}
                  offering={offering}
                  mobileRecommendationLayout
                  isConsultable={approvedAgentPropertyIds.has(String(offering.id))}
                />
              ))}
            </div>
          )}

        </div>
      </PageContainer>
    </main>
  );
}
