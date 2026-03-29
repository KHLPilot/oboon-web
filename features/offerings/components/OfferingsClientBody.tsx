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
  GYEONGGI_SUB_REGION_OPTIONS,
  getGyeonggiSubRegionConfig,
  OFFERING_STATUS_LABEL,
  OFFERING_REGION_TABS,
  isOfferingStatusValue,
  normalizeOfferingStatusValue,
  normalizeRegionTab,
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

function pickOfferingAddress(o: Offering): string {
  return normalizeNonEmptyString(o.addressFull ?? o.addressShort) ?? "";
}

const SEOUL_SUB_REGIONS = [
  "전체",
  "강남구",
  "강동구",
  "강북구",
  "강서구",
  "관악구",
  "광진구",
  "구로구",
  "금천구",
  "노원구",
  "도봉구",
  "동대문구",
  "동작구",
  "마포구",
  "서대문구",
  "서초구",
  "성동구",
  "성북구",
  "송파구",
  "양천구",
  "영등포구",
  "용산구",
  "은평구",
  "종로구",
  "중구",
  "중랑구",
] as const;

function listAvailableRegions(items: Offering[]): OfferingRegionTab[] {
  const available = new Set<OfferingRegionTab>(["전체"]);

  for (const item of items) {
    const region = normalizeRegionTab(pickOfferingRegion(item));
    if (region !== "전체") {
      available.add(region);
    }
  }

  return OFFERING_REGION_TABS.filter((region) => available.has(region));
}

function listAvailableSeoulSubRegions(items: Offering[]): string[] {
  const available = new Set<string>(["전체"]);

  for (const item of items) {
    const address = pickOfferingAddress(item);
    const matchedDistrict = SEOUL_SUB_REGIONS.find(
      (district) => district !== "전체" && address.includes(district),
    );

    if (matchedDistrict) {
      available.add(matchedDistrict);
    }
  }

  return SEOUL_SUB_REGIONS.filter((district) => available.has(district));
}

function listAvailableGyeonggiSubRegions(items: Offering[]): string[] {
  const available = new Set<string>(["전체"]);

  for (const item of items) {
    const address = pickOfferingAddress(item);

    for (const option of GYEONGGI_SUB_REGION_OPTIONS) {
      if (option.value === "전체") continue;

      const config = getGyeonggiSubRegionConfig(option.value);
      if (config?.matchers.some((matcher) => address.includes(matcher))) {
        available.add(option.value);
      }
    }
  }

  return GYEONGGI_SUB_REGION_OPTIONS
    .map((option) => option.value)
    .filter((value) => available.has(value));
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
  const [userId, setUserId] = useState<string | null>(null);
  const [scrapedPropertyIds, setScrapedPropertyIds] = useState<Set<number>>(new Set());

  /* ---------- fetch ---------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      const [
        { data, error },
        { data: propertyAgents, error: agentError },
        { data: { user } },
      ] = await Promise.all([
        fetchPropertiesForOfferings(supabase, { limit: 200 }),
        supabase
          .from("property_agents")
          .select("property_id")
          .eq("status", "approved"),
        supabase.auth.getUser(),
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

      // 로그인 사용자라면 찜한 현장 ID 목록 조회
      if (user) {
        setUserId(user.id);
        const { data: scraps } = await supabase
          .from("offering_scraps")
          .select("property_id")
          .eq("profile_id", user.id);
        if (mounted && scraps) {
          setScrapedPropertyIds(
            new Set(
              scraps.map((r: { property_id: number }) => r.property_id)
            )
          );
        }
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

  const searchParamsWithoutRegion = useMemo<SearchParams>(
    () => ({
      ...searchParams,
      region: undefined,
      subRegion: undefined,
    }),
    [searchParams],
  );

  const regionCandidateOfferings = useMemo<Offering[]>(
    () => filterOfferings(offerings, searchParamsWithoutRegion, approvedAgentPropertyIds),
    [offerings, searchParamsWithoutRegion, approvedAgentPropertyIds],
  );

  const availableRegions = useMemo<OfferingRegionTab[]>(
    () => listAvailableRegions(regionCandidateOfferings),
    [regionCandidateOfferings],
  );

  const normalizedRegion =
    searchParams.region &&
    isRegionTab(searchParams.region) &&
    availableRegions.includes(searchParams.region)
      ? searchParams.region
      : undefined;

  const seoulSubRegionCandidateOfferings = useMemo<Offering[]>(
    () =>
      filterOfferings(
        offerings,
        {
          ...searchParamsWithoutRegion,
          region: "서울",
        },
        approvedAgentPropertyIds,
      ),
    [offerings, searchParamsWithoutRegion, approvedAgentPropertyIds],
  );

  const availableSeoulSubRegions = useMemo<string[]>(
    () => listAvailableSeoulSubRegions(seoulSubRegionCandidateOfferings),
    [seoulSubRegionCandidateOfferings],
  );

  const gyeonggiSubRegionCandidateOfferings = useMemo<Offering[]>(
    () =>
      filterOfferings(
        offerings,
        {
          ...searchParamsWithoutRegion,
          region: "경기",
        },
        approvedAgentPropertyIds,
      ),
    [offerings, searchParamsWithoutRegion, approvedAgentPropertyIds],
  );

  const availableGyeonggiSubRegions = useMemo<string[]>(
    () => listAvailableGyeonggiSubRegions(gyeonggiSubRegionCandidateOfferings),
    [gyeonggiSubRegionCandidateOfferings],
  );

  const normalizedSubRegion =
    normalizedRegion === "서울"
      ? searchParams.subRegion &&
        searchParams.subRegion !== "전체" &&
        availableSeoulSubRegions.includes(searchParams.subRegion)
        ? searchParams.subRegion
        : undefined
      : normalizedRegion === "경기"
        ? searchParams.subRegion &&
          searchParams.subRegion !== "전체" &&
          availableGyeonggiSubRegions.includes(searchParams.subRegion)
          ? searchParams.subRegion
          : undefined
        : undefined;

  const normalizedSearchParams = useMemo<SearchParams>(
    () => ({
      ...searchParams,
      region: normalizedRegion,
      subRegion: normalizedSubRegion,
    }),
    [normalizedRegion, normalizedSubRegion, searchParams],
  );

  const filtered = useMemo<Offering[]>(
    () => filterOfferings(offerings, normalizedSearchParams, approvedAgentPropertyIds),
    [offerings, normalizedSearchParams, approvedAgentPropertyIds],
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
  const view = searchParams.view === "list" ? "list" : "map";

  function handleViewChange(nextView: "list" | "map") {
    const next = new URLSearchParams(sp.toString());
    if (nextView === "list") next.set("view", "list");
    else next.delete("view");

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
        <div className="space-y-4">
          <FilterBar
            view={view}
            onViewChange={handleViewChange}
            availableRegions={availableRegions}
            availableSeoulSubRegions={availableSeoulSubRegions}
            availableGyeonggiSubRegions={availableGyeonggiSubRegions}
          />

          {loadError ? (
            <div className="rounded-2xl border border-(--oboon-danger-border) bg-(--oboon-danger-bg) px-4 py-3">
              <p className="ob-typo-body text-(--oboon-danger)">{loadError}</p>
            </div>
          ) : null}

          {!rowsLoaded ? (
            <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <OfferingCardSkeleton key={i} mobileRecommendationLayout seed={i} />
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
            <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0 lg:grid-cols-3">
              {sortedOfferings.map((offering, index) => (
                <OfferingCard
                  key={offering.id}
                  offering={offering}
                  mobileRecommendationLayout
                  isConsultable={approvedAgentPropertyIds.has(String(offering.id))}
                  initialScrapped={scrapedPropertyIds.has(Number(offering.id))}
                  isLoggedIn={userId !== null}
                  priority={index === 0}
                />
              ))}
            </div>
          )}

        </div>
      </PageContainer>
    </main>
  );
}
