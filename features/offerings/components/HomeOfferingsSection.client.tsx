"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { ArrowRight, BusFront, GraduationCap, PawPrint, Pickaxe } from "lucide-react";

const CREDIT_OPTIONS = [
  { label: "양호", value: "good" },
  { label: "보통", value: "normal" },
  { label: "불안", value: "unstable" },
] as const;

const PURPOSE_OPTIONS = [
  { label: "실거주", value: "residence" },
  { label: "투자", value: "investment" },
  { label: "둘다", value: "both" },
] as const;
import { UXCopy } from "@/shared/uxCopy";

import type { ConditionCategoryGrades } from "@/features/condition-validation/domain/types";
import {
  parseCustomerInput,
  type ParsedCustomerInput,
} from "@/features/condition-validation/domain/validation";
import OfferingCard from "@/features/offerings/components/OfferingCard";
import { fetchPropertiesForOfferings } from "@/features/offerings/services/offering.query";
import {
  mapPropertyRowToOffering,
  type PropertyRow,
} from "@/features/offerings/mappers/offering.mapper";
import { OFFERING_REGION_TABS } from "@/features/offerings/domain/offering.constants";
import type { OfferingRegionTab } from "@/features/offerings/domain/offering.types";

import { formatManwonPreview } from "@/lib/format/currency";
import { createSupabaseClient } from "@/lib/supabaseClient";
import type { Offering } from "@/types/index";
import { toKoreanErrorMessage } from "@/shared/errorMessage";

type HomeOfferingView = "consult" | "condition";

type ConditionValidationRequestRow = {
  id: string | number;
  available_cash_manwon: number;
  monthly_income_manwon: number;
  owned_house_count: number;
  credit_grade: "good" | "normal" | "unstable";
  purchase_purpose: "residence" | "investment" | "both";
};

function formatNumericInput(value: string): string {
  const digitsOnly = value.replace(/[^\d]/g, "");
  if (!digitsOnly) return "";
  return Number(digitsOnly).toLocaleString("ko-KR");
}

function parseNullableNumericInput(value: string): number | null {
  const normalized = value.replaceAll(",", "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export default function HomeOfferingsSection() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseClient(), []);

  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [consultablePropertyIds, setConsultablePropertyIds] = useState<number[]>(
    [],
  );
  const [selectedRegion, setSelectedRegion] =
    useState<OfferingRegionTab>("전체");
  const [view, setView] = useState<HomeOfferingView>("consult");
  const [conditionModalOpen, setConditionModalOpen] = useState(false);
  const [availableCash, setAvailableCash] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [ownedHouseCount, setOwnedHouseCount] = useState("0");
  const [creditGrade, setCreditGrade] = useState<"good" | "normal" | "unstable">("good");
  const [purchasePurpose, setPurchasePurpose] = useState<
    "residence" | "investment" | "both"
  >("residence");
  const [conditionError, setConditionError] = useState<string | null>(null);
  const [conditionApplyLoading, setConditionApplyLoading] = useState(false);
  const [recommendedPropertyIds, setRecommendedPropertyIds] = useState<number[] | null>(null);
  const [recommendedCategoriesById, setRecommendedCategoriesById] = useState<
    Map<number, ConditionCategoryGrades>
  >(new Map());
  const [appliedCustomerSummary, setAppliedCustomerSummary] = useState<string | null>(null);
  const [showConditionSetupCard, setShowConditionSetupCard] = useState(true);
  const availableCashPreview = useMemo(() => {
    const parsed = parseNullableNumericInput(availableCash);
    return parsed === null ? "" : formatManwonPreview(parsed);
  }, [availableCash]);
  const monthlyIncomePreview = useMemo(() => {
    const parsed = parseNullableNumericInput(monthlyIncome);
    return parsed === null ? "" : formatManwonPreview(parsed);
  }, [monthlyIncome]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await fetchPropertiesForOfferings(supabase, {
        limit: 120,
      });

      if (!mounted) return;

      if (error) {
        setLoadError(toKoreanErrorMessage(error, "데이터를 불러오지 못했어요."));
        setRows([]);
        return;
      }

      setLoadError(null);
      const nextRows = (data ?? []) as PropertyRow[];
      setRows(nextRows);

      const propertyIds = nextRows
        .map((row) => Number(row.id))
        .filter((id) => Number.isFinite(id));

      if (propertyIds.length === 0) {
        setConsultablePropertyIds([]);
        return;
      }

      const agentResult = await supabase
        .from("property_agents")
        .select("property_id")
        .in("property_id", propertyIds)
        .eq("status", "approved");

      if (agentResult.error) {
        console.error("[home consultable properties] load error:", agentResult.error);
        setConsultablePropertyIds([]);
      } else {
        const uniqueIds = [
          ...new Set(
            (agentResult.data ?? [])
              .map((row) => Number(row.property_id))
              .filter((id) => Number.isFinite(id)),
          ),
        ];
        setConsultablePropertyIds(uniqueIds);
      }
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

  const offerings: Offering[] = useMemo(
    () => rows.map((row) => mapPropertyRowToOffering(row, fallback)),
    [rows, fallback],
  );

  const rowById = useMemo(() => {
    const map = new Map<number, PropertyRow>();
    for (const row of rows) {
      const id = Number(row.id);
      if (Number.isFinite(id)) map.set(id, row);
    }
    return map;
  }, [rows]);

  const consultableOfferings: Offering[] = useMemo(() => {
    const idSet = new Set(consultablePropertyIds);
    return offerings.filter((offering) => idSet.has(Number(offering.id)));
  }, [consultablePropertyIds, offerings]);

  const regionCounts = useMemo(() => {
    const counts = OFFERING_REGION_TABS.reduce(
      (acc, region) => {
        acc[region] = 0;
        return acc;
      },
      {} as Record<OfferingRegionTab, number>,
    );
    counts.전체 = offerings.length;

    for (const offering of offerings) {
      if (offering.region !== "전체") {
        counts[offering.region] += 1;
      }
    }

    return counts;
  }, [offerings]);

  const enabledRegions = useMemo(
    () => OFFERING_REGION_TABS.filter((region) => regionCounts[region] > 0),
    [regionCounts],
  );

  const effectiveSelectedRegion = useMemo(
    () =>
      enabledRegions.includes(selectedRegion)
        ? selectedRegion
        : (enabledRegions[0] ?? "전체"),
    [enabledRegions, selectedRegion],
  );

  const getClickScore = useCallback(
    (offering: Offering) => {
      const id = Number(offering.id);
      const row = rowById.get(id);
      if (!row) return 0;

      const raw =
        row.click_count ?? row.total_click_count ?? row.view_count ?? 0;
      const value = Number(raw);
      return Number.isFinite(value) ? value : 0;
    },
    [rowById],
  );

  const popularOfferings: Offering[] = useMemo(() => {
    const base =
      effectiveSelectedRegion === "전체"
        ? offerings
        : offerings.filter((o) => o.region === effectiveSelectedRegion);

    return [...base]
      .sort((a, b) => {
        const scoreDiff = getClickScore(b) - getClickScore(a);
        if (scoreDiff !== 0) return scoreDiff;

        const aCreated = new Date(rowById.get(Number(a.id))?.created_at ?? 0).getTime();
        const bCreated = new Date(rowById.get(Number(b.id))?.created_at ?? 0).getTime();
        return bCreated - aCreated;
      })
      .slice(0, 8);
  }, [effectiveSelectedRegion, getClickScore, offerings, rowById]);

  const offeringById = useMemo(() => {
    const map = new Map<number, Offering>();
    for (const offering of offerings) {
      const id = Number(offering.id);
      if (Number.isFinite(id)) map.set(id, offering);
    }
    return map;
  }, [offerings]);

  const conditionMatchedOfferings: Offering[] = useMemo(() => {
    if (!recommendedPropertyIds) return [];

    const ordered = recommendedPropertyIds
      .map((id) => offeringById.get(id))
      .filter((offering): offering is Offering => Boolean(offering));

    return ordered.slice(0, 8);
  }, [offeringById, recommendedPropertyIds]);

  const parseCustomerInputFromState = useCallback((): ParsedCustomerInput | null => {
    const parsed = parseCustomerInput(
      {
        availableCash,
        monthlyIncome,
        ownedHouseCount,
        creditGrade,
        purchasePurpose,
      },
      {
        availableCash: {
          invalid: "가용 현금은 만원 단위 정수로 입력해주세요.",
          nonInteger: "가용 현금은 만원 단위 정수로 입력해주세요.",
        },
        monthlyIncome: {
          invalid: "월 소득은 만원 단위 정수로 입력해주세요.",
          nonInteger: "월 소득은 만원 단위 정수로 입력해주세요.",
        },
        ownedHouseCount: {
          invalid: "보유 주택 수는 0 이상의 정수로 입력해주세요.",
        },
      },
    );

    if (!parsed.ok) {
      setConditionError(parsed.error);
      return null;
    }

    return parsed.data;
  }, [availableCash, creditGrade, monthlyIncome, ownedHouseCount, purchasePurpose]);

  const applyRecommendationByCustomer = useCallback(
    async (customer: ParsedCustomerInput, options?: { closeModal?: boolean }) => {
      setConditionError(null);
      setConditionApplyLoading(true);
      try {
        const response = await fetch("/api/condition-validation/recommend", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customer,
            options: {
              include_red: false,
              limit: 60,
            },
          }),
        });

        const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            property_ids?: Array<number | string>;
            recommendations?: Array<{
              property_id?: number | string;
              categories?: ConditionCategoryGrades;
              total_score?: number;
            }>;
            error?: { message?: string };
          }
        | null;

        if (!response.ok || !payload?.ok) {
          setConditionError(payload?.error?.message ?? "조건 추천을 불러오지 못했습니다.");
          return;
        }

        const ids = (payload.property_ids ?? [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id));
        const nextCategories = new Map<number, ConditionCategoryGrades>();
        for (const item of payload.recommendations ?? []) {
          const id = Number(item.property_id);
          if (!Number.isFinite(id) || !item.categories) continue;
          nextCategories.set(id, {
            ...item.categories,
            totalScore: item.total_score,
          });
        }
        setRecommendedPropertyIds(ids);
        setRecommendedCategoriesById(nextCategories);
        const creditLabel =
          customer.credit_grade === "good"
            ? "양호"
            : customer.credit_grade === "normal"
              ? "보통"
              : "불안";
        const purposeLabel =
          customer.purchase_purpose === "residence"
            ? "실거주"
            : customer.purchase_purpose === "investment"
              ? "투자"
              : "둘다";
        setAppliedCustomerSummary(
          `가용 현금 ${Number(customer.available_cash).toLocaleString("ko-KR")}만원 · 월 소득 ${Number(customer.monthly_income).toLocaleString("ko-KR")}만원 · 보유 주택 ${customer.owned_house_count}채 · 신용 ${creditLabel} · 목적 ${purposeLabel}`,
        );
        if (options?.closeModal !== false) {
          setConditionModalOpen(false);
        }
      } catch {
        setConditionError("조건 추천 요청 중 네트워크 오류가 발생했습니다.");
      } finally {
        setConditionApplyLoading(false);
      }
    },
    [],
  );

  const handleApplyCondition = useCallback(async () => {
    setConditionError(null);
    const customer = parseCustomerInputFromState();
    if (!customer) return;
    await applyRecommendationByCustomer(customer, { closeModal: true });
  }, [applyRecommendationByCustomer, parseCustomerInputFromState]);

  const handleLoginAndSaveCondition = useCallback(() => {
    setConditionError(null);
    const customer = parseCustomerInputFromState();
    if (!customer) return;

    try {
      const payload = {
        customer,
        saved_at: new Date().toISOString(),
      };
      localStorage.setItem("oboon:home-condition-draft", JSON.stringify(payload));
    } catch {
      // Ignore storage failure and continue to login.
    }

    router.push("/login?next=/");
  }, [parseCustomerInputFromState, router]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;
      if (!user) {
        setShowConditionSetupCard(true);
        return;
      }

      const { data, error } = await supabase
        .from("condition_validation_requests")
        .select(
          "id, available_cash_manwon, monthly_income_manwon, owned_house_count, credit_grade, purchase_purpose",
        )
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!mounted) return;
      if (error) {
        console.error("[home condition request] load error:", error);
        setShowConditionSetupCard(true);
        return;
      }

      const latest = (data?.[0] ?? null) as ConditionValidationRequestRow | null;
      if (!latest) {
        setShowConditionSetupCard(true);
        return;
      }

      const customer: ParsedCustomerInput = {
        available_cash: Math.max(0, Math.round(Number(latest.available_cash_manwon) || 0)),
        monthly_income: Math.max(0, Math.round(Number(latest.monthly_income_manwon) || 0)),
        owned_house_count: Math.max(0, Math.round(Number(latest.owned_house_count) || 0)),
        credit_grade:
          latest.credit_grade === "good" ||
          latest.credit_grade === "normal" ||
          latest.credit_grade === "unstable"
            ? latest.credit_grade
            : "good",
        purchase_purpose:
          latest.purchase_purpose === "residence" ||
          latest.purchase_purpose === "investment" ||
          latest.purchase_purpose === "both"
            ? latest.purchase_purpose
            : "residence",
      };

      setAvailableCash(customer.available_cash.toLocaleString("ko-KR"));
      setMonthlyIncome(customer.monthly_income.toLocaleString("ko-KR"));
      setOwnedHouseCount(String(customer.owned_house_count));
      setCreditGrade(customer.credit_grade);
      setPurchasePurpose(customer.purchase_purpose);
      setShowConditionSetupCard(false);
      await applyRecommendationByCustomer(customer, { closeModal: false });
    })();

    return () => {
      mounted = false;
    };
  }, [applyRecommendationByCustomer, supabase]);

  return (
    <>
      <div className="flex justify-end" role="tablist" aria-label="홈 현장 전환">
        <div className="relative inline-grid grid-cols-2 rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-default) p-1 shadow-(--oboon-shadow-card)">
          <span
            aria-hidden="true"
            className={[
              "pointer-events-none absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-full bg-(--oboon-primary) transition-transform duration-300 ease-out",
              view === "consult" ? "translate-x-0 left-1" : "translate-x-full left-1",
            ].join(" ")}
          />
        <button
          type="button"
          role="tab"
          aria-selected={view === "consult"}
          className={[
            "relative z-10 rounded-full px-4 py-1.5 ob-typo-body2 transition-colors",
            view === "consult"
              ? "text-(--oboon-on-primary)"
              : "text-(--oboon-text-muted) hover:text-(--oboon-text-title)",
          ].join(" ")}
          onClick={() => setView("consult")}
        >
          상담 현장
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "condition"}
          className={[
            "relative z-10 rounded-full px-4 py-1.5 ob-typo-body2 transition-colors",
            view === "condition"
              ? "text-(--oboon-on-primary)"
              : "text-(--oboon-text-muted) hover:text-(--oboon-text-title)",
          ].join(" ")}
          onClick={() => setView("condition")}
        >
          맞춤 현장
        </button>
        </div>
      </div>

      {view === "consult" ? (
        <>
          {/* 상담 신청 가능 현장 */}
          <section className="mt-3 flex flex-col gap-2">
            <SectionHeader
              title="상담 신청 가능 현장"
              caption="상담사 연결이 완료되어 바로 상담 예약이 가능한 현장입니다."
              rightLink={{ href: "/offerings", label: "전체보기" }}
            />

            {consultableOfferings.length === 0 ? (
              <Card className="p-6 ob-typo-body text-(--oboon-text-muted)">
                지금은 상담 신청 가능한 현장이 아직 없어요.
              </Card>
            ) : (
              <ResponsiveOfferingRow items={consultableOfferings} />
            )}
          </section>

          {/* 지역별 인기 분양 */}
          <section className="mt-8 sm:mt-10 flex flex-col gap-2">
            <SectionHeader
              title="지역별 인기 분양"
              caption="지역별로 인기있는 분양 현장을 확인해보세요."
            />
            {loadError && (
              <div className="ob-typo-caption text-(--oboon-danger)">
                데이터를 불러오지 못했어요. ({loadError})
              </div>
            )}
            <div>
              <RegionFilterRow
                value={effectiveSelectedRegion}
                onChange={setSelectedRegion}
                enabledRegions={enabledRegions}
              />
            </div>

            {popularOfferings.length === 0 ? (
              <Card className="p-6 ob-typo-body text-(--oboon-text-muted)">
                선택한 지역에서 보여줄 분양이 아직 없어요.
              </Card>
            ) : (
              <ResponsiveOfferingRow items={popularOfferings} />
            )}
          </section>
        </>
      ) : (
        <>
          {/* 조건 설정 카드 */}
          {showConditionSetupCard ? (
            <section className="-mt-1">
              <Card className="overflow-hidden border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4 shadow-(--oboon-shadow-card) md:p-6">
                <div className="grid gap-5 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-6">
                  <div className="p-2">
                    <h2 className="ob-typo-h2 text-(--oboon-text-title)">
                      교통·학군·개발호재
                      <br />
                      반려동물 여부까지
                    </h2>
                    <p className="mt-3 ob-typo-subtitle text-(--oboon-text-muted)">
                      관심 현장의 모든 조건을 한눈에 검증합니다.
                      <br />
                      기존 조건 검증 기준으로 자동 추천해 드려요.
                    </p>

                    <Button
                      type="button"
                      size="lg"
                      variant="primary"
                      className="mt-5 h-11 px-5 !bg-(--oboon-primary) !text-(--oboon-on-primary) shadow-(--oboon-shadow-card)"
                      onClick={() => setConditionModalOpen(true)}
                    >
                      현장 조건 검증하기
                      <ArrowRight className="h-4 w-4 text-(--oboon-on-primary)" />
                    </Button>
                    <p className="mt-3 ob-typo-body text-(--oboon-text-muted)">
                      {appliedCustomerSummary ?? "조건 미적용: 현재는 기본 정렬 결과를 보여줍니다."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-1">
                    <ConditionFeatureItem
                      title="교통 접근성"
                      description="지하철·버스 접근성과 이동 편의 기준을 확인합니다."
                      icon={<BusFront className="h-5 w-5" />}
                      iconToneClass="bg-[color-mix(in_srgb,var(--oboon-primary)_16%,transparent)] text-(--oboon-primary)"
                    />
                    <ConditionFeatureItem
                      title="학군 정보"
                      description="학군 배정·통학 생활권 관련 기준을 반영합니다."
                      icon={<GraduationCap className="h-5 w-5" />}
                      iconToneClass="bg-(--oboon-safe-bg) text-(--oboon-safe-text)"
                    />
                    <ConditionFeatureItem
                      title="개발 호재"
                      description="주요 개발 계획과 생활 인프라 변화 요소를 반영합니다."
                      icon={<Pickaxe className="h-5 w-5" />}
                      iconToneClass="bg-[color-mix(in_srgb,var(--oboon-warning-text)_16%,transparent)] text-(--oboon-warning-text)"
                    />
                    <ConditionFeatureItem
                      title="반려동물"
                      description="반려동물 생활 적합성 관련 조건을 함께 검토합니다."
                      icon={<PawPrint className="h-5 w-5" />}
                      iconToneClass="bg-[color-mix(in_srgb,var(--oboon-text-muted)_14%,transparent)] text-(--oboon-text-muted)"
                    />
                  </div>
                </div>
              </Card>
            </section>
          ) : null}

          {/* 맞춤 현장 리스트 */}
          <section className={[showConditionSetupCard ? "mt-4 sm:mt-5" : "mt-1", "flex flex-col gap-2"].join(" ")}>
            <SectionHeader
              title="맞춤 현장 리스트"
              caption="조건 검증과 함께 확인하기 좋은 현장을 모아봤어요."
              rightLink={{ href: "/offerings", label: "전체보기" }}
            />
            {loadError && (
              <div className="ob-typo-caption text-(--oboon-danger)">
                데이터를 불러오지 못했어요. ({loadError})
              </div>
            )}

            {conditionMatchedOfferings.length === 0 ? (
              <Card className="p-6 ob-typo-body text-(--oboon-text-muted)">
                {recommendedPropertyIds
                  ? "선택한 조건에 맞는 분양이 아직 없어요."
                  : "맞춤 조건을 설정하면 추천 현장을 보여드려요."}
              </Card>
            ) : (
              <ResponsiveOfferingRow
                items={conditionMatchedOfferings}
                recommendedCategoriesById={recommendedCategoriesById}
              />
            )}
          </section>
        </>
      )}

      <Modal
        open={conditionModalOpen}
        onClose={() => setConditionModalOpen(false)}
        size="sm"
      >
        <div>
          <h3 className="ob-typo-h3 text-(--oboon-text-title)">맞춤 조건 설정</h3>
          <p className="mt-1 ob-typo-subtitle text-(--oboon-text-muted)">
            기존 조건 검증과 같은 항목을 입력하면 맞춤 현장을 다시 계산해요.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-2.5">
            <div>
              <label className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                가용 현금 (만원)
              </label>
              <div className="relative">
                <Input
                  value={availableCash}
                  onChange={(e) => setAvailableCash(formatNumericInput(e.target.value))}
                  inputMode="numeric"
                  placeholder="예: 8,000"
                  className={availableCashPreview ? "pr-28" : undefined}
                />
                {availableCashPreview ? (
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center ob-typo-caption text-(--oboon-text-muted)">
                    {availableCashPreview}
                  </div>
                ) : null}
              </div>
            </div>
            <div>
              <label className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                월 소득 (만원)
              </label>
              <div className="relative">
                <Input
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(formatNumericInput(e.target.value))}
                  inputMode="numeric"
                  placeholder="예: 400"
                  className={monthlyIncomePreview ? "pr-28" : undefined}
                />
                {monthlyIncomePreview ? (
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center ob-typo-caption text-(--oboon-text-muted)">
                    {monthlyIncomePreview}
                  </div>
                ) : null}
              </div>
            </div>
            <div>
              <label className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                보유 주택 수
              </label>
              <Input
                value={ownedHouseCount}
                onChange={(e) => setOwnedHouseCount(formatNumericInput(e.target.value))}
                inputMode="numeric"
                placeholder="0"
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                  신용
                </label>
                <Select
                  value={creditGrade}
                  onChange={setCreditGrade}
                  options={CREDIT_OPTIONS}
                />
              </div>
              <div>
                <label className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                  목적
                </label>
                <Select
                  value={purchasePurpose}
                  onChange={setPurchasePurpose}
                  options={PURPOSE_OPTIONS}
                />
              </div>
            </div>
          </div>

          {conditionError ? (
            <p className="mt-3 ob-typo-caption text-(--oboon-danger)">{conditionError}</p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setAvailableCash("");
                setMonthlyIncome("");
                setOwnedHouseCount("0");
                setCreditGrade("good");
                setPurchasePurpose("residence");
                setConditionError(null);
                setRecommendedPropertyIds(null);
                setRecommendedCategoriesById(new Map());
                setAppliedCustomerSummary(null);
              }}
            >
              초기화
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleLoginAndSaveCondition}
              >
                로그인하고 조건 저장하기
              </Button>
              <Button
                type="button"
                size="sm"
                variant="primary"
                loading={conditionApplyLoading}
                onClick={() => void handleApplyCondition()}
              >
                적용하기
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}

function ConditionFeatureItem({
  title,
  description,
  icon,
  iconToneClass,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  iconToneClass: string;
}) {
  return (
    <div
      className={[
        "flex items-center gap-3 rounded-2xl border bg-(--oboon-bg-surface) border-(--oboon-border-default) px-3.5 py-3"
      ].join(" ")}
    >
      <div className={["inline-flex h-10 w-10 items-center justify-center rounded-full", iconToneClass].join(" ")}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="ob-typo-subtitle text-(--oboon-text-title)">{title}</p>
        </div>
        <p className="mt-0.5 hidden sm:block ob-typo-body text-(--oboon-text-muted)">
          {description}
        </p>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  caption,
  rightLink,
}: {
  title: string;
  caption?: string;
  rightLink?: { href: string; label: string };
}) {
  return (
    <div className="mb-3 sm:mb-4 flex items-baseline justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="ob-typo-h2 text-(--oboon-text-title)">{title}</h2>
        {caption && (
          <p className="ob-typo-caption text-(--oboon-text-muted)">{caption}</p>
        )}
      </div>

      {rightLink ? (
        <Link
          href={rightLink.href}
          className="shrink-0 ob-typo-caption text-(--oboon-text-muted) hover:text-(--oboon-primary)"
        >
          {rightLink.label}
        </Link>
      ) : null}
    </div>
  );
}

function ProjectRow({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
  );
}

function ResponsiveOfferingRow({
  items,
  recommendedCategoriesById,
}: {
  items: Offering[];
  recommendedCategoriesById?: Map<number, ConditionCategoryGrades>;
}) {
  return (
    <>
      {/* Mobile */}
      <div className="sm:hidden">
        {/* PageContainer(px-4) 밖으로 빼서 스크롤이 화면 끝까지 자연스럽게 */}
        <div className="-mx-4">
          <div className="relative">
            <div
              className={[
                "flex gap-3 overflow-x-auto pb-3 px-4",
                "snap-x snap-mandatory",
                "[-webkit-overflow-scrolling:touch]",
                "scrollbar-none",
                "scroll-pl-4 scroll-pr-4",
              ].join(" ")}
            >
              {items.map((offering) => (
                <div key={offering.id} className="w-70 shrink-0 snap-start">
                  <OfferingCard
                    offering={offering}
                    conditionCategories={recommendedCategoriesById?.get(Number(offering.id))}
                  />
                </div>
              ))}

              <div className="shrink-0 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop/Tablets: grid */}
      <div className="hidden sm:block">
        <ProjectRow>
          {items.map((offering) => (
            <OfferingCard
              key={offering.id}
              offering={offering}
              conditionCategories={recommendedCategoriesById?.get(Number(offering.id))}
            />
          ))}
        </ProjectRow>
      </div>
    </>
  );
}

function RegionFilterRow({
  value,
  onChange,
  enabledRegions,
}: {
  value: OfferingRegionTab;
  onChange: (v: OfferingRegionTab) => void;
  enabledRegions: OfferingRegionTab[];
}) {
  return (
    <>
      {/* Mobile: horizontal scroll chips */}
      <div className="sm:hidden -mx-4 pl-4">
        <div className="flex gap-2 overflow-x-auto pb-2 pr-4 [-webkit-overflow-scrolling:touch] scrollbar-none">
          {enabledRegions.map((region) => {
            const isActive = value === region;
            return (
              <Button
                key={region}
                type="button"
                size="sm"
                shape="pill"
                variant={isActive ? "primary" : "secondary"}
                onClick={() => onChange(region)}
                className="shrink-0"
                aria-pressed={isActive}
              >
                {region}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Tablet/Desktop: 기존 버튼 UI 유지 */}
      <div className="hidden sm:flex flex-wrap gap-2">
        {enabledRegions.map((region) => {
          const isActive = value === region;
          return (
            <Button
              key={region}
              type="button"
              size="sm"
              shape="pill"
              variant={isActive ? "primary" : "secondary"}
              onClick={() => onChange(region)}
            >
              {region}
            </Button>
          );
        })}
      </div>
    </>
  );
}
