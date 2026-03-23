"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select, { type SelectOption } from "@/components/ui/Select";
import { ArrowRight, BusFront, GraduationCap, PawPrint, Pickaxe, SlidersHorizontal } from "lucide-react";
import LtvDsrModal from "@/features/condition-validation/components/LtvDsrModal";
import type {
  EmploymentType,
  FullPurchasePurpose,
  MonthlyLoanRepayment,
  MoveinTiming,
  PurchaseTiming,
} from "@/features/condition-validation/domain/types";

const EMPLOYMENT_TYPE_OPTIONS: Array<{ value: EmploymentType; label: string }> = [
  { value: "employee", label: "직장인" },
  { value: "self_employed", label: "자영업" },
  { value: "freelancer", label: "프리랜서" },
  { value: "other", label: "기타" },
];

const HOUSE_OWNERSHIP_OPTIONS: Array<{
  value: "none" | "one" | "two_or_more";
  label: string;
}> = [
  { value: "none", label: "무주택" },
  { value: "one", label: "1주택" },
  { value: "two_or_more", label: "2주택이상" },
];

const PURPOSE_V2_OPTIONS: Array<{ value: FullPurchasePurpose; label: string }> = [
  { value: "residence", label: "실거주" },
  { value: "investment_rent", label: "투자(임대)" },
  { value: "investment_capital", label: "투자(시세)" },
  { value: "long_term", label: "실거주+투자" },
];

const PURCHASE_TIMING_OPTIONS: Array<SelectOption<PurchaseTiming>> = [
  { value: "within_3months", label: "3개월 이내" },
  { value: "within_6months", label: "6개월 이내" },
  { value: "within_1year", label: "1년 이내" },
  { value: "over_1year", label: "1년 이상" },
  { value: "by_property", label: "현장에 따라" },
];

const MOVEIN_TIMING_OPTIONS: Array<SelectOption<MoveinTiming>> = [
  { value: "immediate", label: "즉시입주" },
  { value: "within_1year", label: "1년 이내" },
  { value: "within_2years", label: "2년 이내" },
  { value: "within_3years", label: "3년 이내" },
  { value: "anytime", label: "언제든지" },
];
import { UXCopy } from "@/shared/uxCopy";
import { Copy } from "@/shared/copy";

import type { ConditionCategoryGrades } from "@/features/condition-validation/domain/types";
import type { ParsedCustomerInput } from "@/features/condition-validation/domain/validation";
import OfferingCard from "@/features/offerings/components/OfferingCard";
import { OfferingCardSkeleton } from "@/features/offerings/components/OfferingCardSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
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

const HOME_OFFERING_LIMIT = 4;

type ConditionValidationProfilePresetRow = {
  cv_available_cash_manwon: number | null;
  cv_monthly_income_manwon: number | null;
  cv_owned_house_count: number | null;
  cv_credit_grade: "good" | "normal" | "unstable" | null;
  cv_purchase_purpose: "residence" | "investment" | "both" | null;
  // New v2 fields
  cv_employment_type: EmploymentType | null;
  cv_monthly_expenses_manwon: number | null;
  cv_house_ownership: "none" | "one" | "two_or_more" | null;
  cv_purchase_purpose_v2: FullPurchasePurpose | null;
  cv_purchase_timing: PurchaseTiming | null;
  cv_movein_timing: MoveinTiming | null;
  cv_ltv_internal_score: number | null;
  cv_existing_monthly_repayment: MonthlyLoanRepayment | null;
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

function isValidCreditGrade(value: unknown): value is "good" | "normal" | "unstable" {
  return value === "good" || value === "normal" || value === "unstable";
}

function isValidPurchasePurpose(
  value: unknown,
): value is "residence" | "investment" | "both" {
  return value === "residence" || value === "investment" || value === "both";
}

function buildCustomerFromSavedRow(
  source:
    | ConditionValidationRequestRow
    | ConditionValidationProfilePresetRow
    | null,
): ParsedCustomerInput | null {
  if (!source) return null;

  const availableCash =
    "available_cash_manwon" in source
      ? source.available_cash_manwon
      : source.cv_available_cash_manwon;
  const monthlyIncome =
    "monthly_income_manwon" in source
      ? source.monthly_income_manwon
      : source.cv_monthly_income_manwon;
  const ownedHouseCount =
    "owned_house_count" in source
      ? source.owned_house_count
      : source.cv_owned_house_count;
  const creditGrade =
    "credit_grade" in source ? source.credit_grade : source.cv_credit_grade;
  const purchasePurpose =
    "purchase_purpose" in source
      ? source.purchase_purpose
      : source.cv_purchase_purpose;

  if (
    availableCash === null ||
    monthlyIncome === null ||
    ownedHouseCount === null ||
    !isValidCreditGrade(creditGrade) ||
    !isValidPurchasePurpose(purchasePurpose)
  ) {
    return null;
  }

  return {
    available_cash: Math.max(0, Math.round(Number(availableCash) || 0)),
    monthly_income: Math.max(0, Math.round(Number(monthlyIncome) || 0)),
    owned_house_count: Math.max(0, Math.round(Number(ownedHouseCount) || 0)),
    credit_grade: creditGrade,
    purchase_purpose: purchasePurpose,
  };
}

export default function HomeOfferingsSection() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseClient(), []);

  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [rowsLoaded, setRowsLoaded] = useState(false);
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
  const [monthlyExpenses, setMonthlyExpenses] = useState("");
  const [employmentType, setEmploymentType] = useState<EmploymentType | null>(null);
  const [houseOwnership, setHouseOwnership] = useState<"none" | "one" | "two_or_more" | null>(null);
  const [purchasePurposeV2, setPurchasePurposeV2] = useState<FullPurchasePurpose | null>(null);
  const [purchaseTiming, setPurchaseTiming] = useState<PurchaseTiming | null>(null);
  const [moveinTiming, setMoveinTiming] = useState<MoveinTiming | null>(null);
  const [ltvInternalScore, setLtvInternalScore] = useState(0);
  const [existingMonthlyRepayment, setExistingMonthlyRepayment] = useState<MonthlyLoanRepayment>("none");
  const [ltvModalOpen, setLtvModalOpen] = useState(false);
  const [conditionError, setConditionError] = useState<string | null>(null);
  const [conditionNotice, setConditionNotice] = useState<string | null>(null);
  const [conditionApplyLoading, setConditionApplyLoading] = useState(false);
  const [conditionSaveLoading, setConditionSaveLoading] = useState(false);
  const [recommendedPropertyIds, setRecommendedPropertyIds] = useState<number[] | null>(null);
  const [recommendedCategoriesById, setRecommendedCategoriesById] = useState<
    Map<number, ConditionCategoryGrades>
  >(new Map());
  const [appliedCustomerSummary, setAppliedCustomerSummary] = useState<string | null>(null);
  const [showConditionSetupCard, setShowConditionSetupCard] = useState(true);
  const [homeUserId, setHomeUserId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [hasSavedConditionPreset, setHasSavedConditionPreset] = useState(false);
  const [scrapedPropertyIds, setScrapedPropertyIds] = useState<Set<number>>(new Set());
  const availableCashPreview = useMemo(() => {
    const parsed = parseNullableNumericInput(availableCash);
    return parsed === null ? "" : formatManwonPreview(parsed);
  }, [availableCash]);
  const monthlyIncomePreview = useMemo(() => {
    const parsed = parseNullableNumericInput(monthlyIncome);
    return parsed === null ? "" : formatManwonPreview(parsed);
  }, [monthlyIncome]);
  const monthlyExpensesPreview = useMemo(() => {
    const parsed = parseNullableNumericInput(monthlyExpenses);
    return parsed === null ? "" : formatManwonPreview(parsed);
  }, [monthlyExpenses]);

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
        setRowsLoaded(true);
        return;
      }

      setLoadError(null);
      const nextRows = (data ?? []) as PropertyRow[];
      setRows(nextRows);
      setRowsLoaded(true);

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
    return offerings
      .filter((offering) => idSet.has(Number(offering.id)))
      .slice(0, HOME_OFFERING_LIMIT);
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
      .slice(0, HOME_OFFERING_LIMIT);
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

    return ordered.slice(0, HOME_OFFERING_LIMIT);
  }, [offeringById, recommendedPropertyIds]);
  const consultableOfferingsHref = "/offerings?agent=has";
  const popularOfferingsHref = useMemo(() => {
    if (effectiveSelectedRegion === "전체") {
      return "/offerings";
    }

    return `/offerings?region=${encodeURIComponent(effectiveSelectedRegion)}`;
  }, [effectiveSelectedRegion]);

  const parseCustomerInputFromState = useCallback((): ParsedCustomerInput | null => {
    const parsedCash = parseNullableNumericInput(availableCash);
    if (parsedCash === null) {
      setConditionError("가용 현금은 만원 단위 정수로 입력해주세요.");
      return null;
    }
    const parsedIncome = parseNullableNumericInput(monthlyIncome);
    if (parsedIncome === null) {
      setConditionError("월 소득은 만원 단위 정수로 입력해주세요.");
      return null;
    }

    // Derive creditGrade from ltvInternalScore
    const derivedCreditGrade: "good" | "normal" | "unstable" =
      ltvInternalScore >= 70 ? "good" : ltvInternalScore >= 40 ? "normal" : "unstable";

    // Map houseOwnership to count
    const derivedOwnedHouseCount =
      houseOwnership === "one" ? 1 : houseOwnership === "two_or_more" ? 2 : 0;

    // Map purchasePurposeV2 to old format
    const derivedPurchasePurpose: "residence" | "investment" | "both" =
      purchasePurposeV2 === "long_term"
        ? "both"
        : purchasePurposeV2 === "investment_rent" || purchasePurposeV2 === "investment_capital"
          ? "investment"
          : "residence";

    return {
      available_cash: Math.max(0, Math.round(parsedCash)),
      monthly_income: Math.max(0, Math.round(parsedIncome)),
      owned_house_count: derivedOwnedHouseCount,
      credit_grade: derivedCreditGrade,
      purchase_purpose: derivedPurchasePurpose,
    };
  }, [availableCash, houseOwnership, ltvInternalScore, monthlyIncome, purchasePurposeV2]);

  const applyRecommendationByCustomer = useCallback(
    async (customer: ParsedCustomerInput, options?: { closeModal?: boolean }) => {
      setConditionError(null);
      setConditionNotice(null);
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

        type RawCategory = { grade?: string; score?: number } | null | undefined;
        type RawRecommendation = {
          property_id?: number | string;
          total_score?: number;
          categories?: {
            cash?: RawCategory;
            income?: RawCategory;
            ltv_dsr?: RawCategory;
            [key: string]: RawCategory | undefined;
          } | null;
        };
        const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            property_ids?: Array<number | string>;
            recommendations?: RawRecommendation[];
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
          const cats = item.categories;
          const toGrade = (g?: string): "GREEN" | "YELLOW" | "RED" =>
            g === "GREEN" ? "GREEN" : g === "YELLOW" ? "YELLOW" : "RED";
          nextCategories.set(id, {
            cash: { grade: toGrade(cats.cash?.grade), score: cats.cash?.score },
            burden: { grade: toGrade(cats.income?.grade), score: cats.income?.score },
            risk: { grade: toGrade(cats.ltv_dsr?.grade), score: cats.ltv_dsr?.score },
            totalScore: item.total_score,
          });
        }
        setRecommendedPropertyIds(ids);
        setRecommendedCategoriesById(nextCategories);
        setShowConditionSetupCard(false);
        const summaryParts: string[] = [];
        const empOpt = EMPLOYMENT_TYPE_OPTIONS.find(o => o.value === employmentType);
        if (empOpt) summaryParts.push(empOpt.label);
        const parsedCash = parseNullableNumericInput(availableCash);
        if (parsedCash && parsedCash > 0) summaryParts.push(`현금 ${parsedCash.toLocaleString("ko-KR")}만원`);
        const parsedIncome = parseNullableNumericInput(monthlyIncome);
        if (parsedIncome && parsedIncome > 0) summaryParts.push(`소득 ${parsedIncome.toLocaleString("ko-KR")}만원`);
        const parsedExpenses = parseNullableNumericInput(monthlyExpenses);
        if (parsedExpenses && parsedExpenses > 0) summaryParts.push(`지출 ${parsedExpenses.toLocaleString("ko-KR")}만원`);
        if (ltvInternalScore > 0) summaryParts.push(`신용 ${ltvInternalScore}점`);
        const houseOpt = HOUSE_OWNERSHIP_OPTIONS.find(o => o.value === houseOwnership);
        if (houseOpt) summaryParts.push(houseOpt.label);
        const purposeOpt = PURPOSE_V2_OPTIONS.find(o => o.value === purchasePurposeV2);
        if (purposeOpt) summaryParts.push(purposeOpt.label);
        const timingOpt = PURCHASE_TIMING_OPTIONS.find(o => o.value === purchaseTiming);
        if (timingOpt) summaryParts.push(timingOpt.label);
        const moveinOpt = MOVEIN_TIMING_OPTIONS.find(o => o.value === moveinTiming);
        if (moveinOpt) summaryParts.push(moveinOpt.label);
        setAppliedCustomerSummary(summaryParts.length > 0 ? summaryParts.join(" · ") : null);
        if (options?.closeModal !== false) {
          setConditionModalOpen(false);
        }
      } catch {
        setConditionError("조건 추천 요청 중 네트워크 오류가 발생했습니다.");
      } finally {
        setConditionApplyLoading(false);
      }
    },
    [availableCash, employmentType, houseOwnership, ltvInternalScore, monthlyExpenses, monthlyIncome, moveinTiming, purchasePurposeV2, purchaseTiming],
  );

  const handleApplyCondition = useCallback(async () => {
    setConditionError(null);
    setConditionNotice(null);
    const customer = parseCustomerInputFromState();
    if (!customer) return;
    await applyRecommendationByCustomer(customer, { closeModal: true });
  }, [applyRecommendationByCustomer, parseCustomerInputFromState]);

  const handleLoginAndSaveCondition = useCallback(() => {
    setConditionError(null);
    setConditionNotice(null);
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

  const handleSaveConditionPreset = useCallback(async () => {
    setConditionError(null);
    setConditionNotice(null);
    const customer = parseCustomerInputFromState();
    if (!customer || !homeUserId) return;

    setConditionSaveLoading(true);
    const parsedExpenses = parseNullableNumericInput(monthlyExpenses);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          cv_available_cash_manwon: customer.available_cash,
          cv_monthly_income_manwon: customer.monthly_income,
          cv_owned_house_count: customer.owned_house_count,
          cv_credit_grade: customer.credit_grade,
          cv_purchase_purpose: customer.purchase_purpose,
          // New v2 fields
          cv_employment_type: employmentType,
          cv_monthly_expenses_manwon: parsedExpenses !== null ? Math.max(0, Math.round(parsedExpenses)) : null,
          cv_house_ownership: houseOwnership,
          cv_purchase_purpose_v2: purchasePurposeV2,
          cv_purchase_timing: purchaseTiming,
          cv_movein_timing: moveinTiming,
          cv_ltv_internal_score: ltvInternalScore,
          cv_existing_monthly_repayment: existingMonthlyRepayment,
        })
        .eq("id", homeUserId);

      if (error) {
        setConditionError("조건 저장 중 오류가 발생했습니다.");
        return;
      }

      setHasSavedConditionPreset(true);
      setConditionNotice("맞춤 정보에 현재 조건을 저장했습니다.");
    } catch {
      setConditionError("조건 저장 중 네트워크 오류가 발생했습니다.");
    } finally {
      setConditionSaveLoading(false);
    }
  }, [employmentType, existingMonthlyRepayment, homeUserId, houseOwnership, ltvInternalScore, monthlyExpenses, moveinTiming, parseCustomerInputFromState, purchasePurposeV2, purchaseTiming, supabase]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;
      if (!user) {
        setHomeUserId(null);
        setIsLoggedIn(false);
        setHasSavedConditionPreset(false);
        setShowConditionSetupCard(true);
        return;
      }
      setHomeUserId(user.id);
      setIsLoggedIn(true);

      // 찜한 현장 ID 목록 로드
      const { data: scraps } = await supabase
        .from("offering_scraps")
        .select("property_id")
        .eq("profile_id", user.id);
      if (mounted && scraps) {
        setScrapedPropertyIds(
          new Set(scraps.map((r: { property_id: number }) => r.property_id))
        );
      }

      let draftCustomer: ParsedCustomerInput | null = null;
      try {
        const rawDraft = localStorage.getItem("oboon:home-condition-draft");
        if (rawDraft) {
          const parsedDraft = JSON.parse(rawDraft) as {
            customer?: ParsedCustomerInput;
          };
          if (parsedDraft?.customer) {
            const draft = parsedDraft.customer;
            if (
              Number.isFinite(Number(draft.available_cash)) &&
              Number.isFinite(Number(draft.monthly_income)) &&
              Number.isFinite(Number(draft.owned_house_count)) &&
              isValidCreditGrade(draft.credit_grade) &&
              isValidPurchasePurpose(draft.purchase_purpose)
            ) {
              draftCustomer = {
                available_cash: Math.max(0, Math.round(Number(draft.available_cash) || 0)),
                monthly_income: Math.max(0, Math.round(Number(draft.monthly_income) || 0)),
                owned_house_count: Math.max(
                  0,
                  Math.round(Number(draft.owned_house_count) || 0),
                ),
                credit_grade: draft.credit_grade,
                purchase_purpose: draft.purchase_purpose,
              };
            }
          }
        }
      } catch {
        draftCustomer = null;
      }

      if (draftCustomer) {
        setAvailableCash(draftCustomer.available_cash.toLocaleString("ko-KR"));
        setMonthlyIncome(draftCustomer.monthly_income.toLocaleString("ko-KR"));
        setShowConditionSetupCard(false);
        await applyRecommendationByCustomer(draftCustomer, { closeModal: false });
        try {
          localStorage.removeItem("oboon:home-condition-draft");
        } catch {
          // ignore storage cleanup failures
        }
        return;
      }

      const [requestResult, profileResult] = await Promise.all([
        supabase
          .from("condition_validation_requests")
          .select(
            "id, available_cash_manwon, monthly_income_manwon, owned_house_count, credit_grade, purchase_purpose",
          )
          .eq("customer_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("profiles")
          .select(
            "cv_available_cash_manwon, cv_monthly_income_manwon, cv_owned_house_count, cv_credit_grade, cv_purchase_purpose, cv_employment_type, cv_monthly_expenses_manwon, cv_house_ownership, cv_purchase_purpose_v2, cv_purchase_timing, cv_movein_timing, cv_ltv_internal_score, cv_existing_monthly_repayment",
          )
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      if (!mounted) return;
      const presetCustomer = buildCustomerFromSavedRow(
        (profileResult.data ?? null) as ConditionValidationProfilePresetRow | null,
      );
      setHasSavedConditionPreset(Boolean(presetCustomer));

      if (requestResult.error) {
        console.error("[home condition request] load error:", requestResult.error);
      } else {
        const latest = (requestResult.data?.[0] ?? null) as ConditionValidationRequestRow | null;
        const latestCustomer = latest ? buildCustomerFromSavedRow(latest) : null;
        if (latestCustomer) {
          setAvailableCash(latestCustomer.available_cash.toLocaleString("ko-KR"));
          setMonthlyIncome(latestCustomer.monthly_income.toLocaleString("ko-KR"));
          setShowConditionSetupCard(false);
          await applyRecommendationByCustomer(latestCustomer, { closeModal: false });
          return;
        }
      }

      if (profileResult.error) {
        console.error("[home condition preset] load error:", profileResult.error);
        setShowConditionSetupCard(true);
        return;
      }

      if (!presetCustomer) {
        setShowConditionSetupCard(true);
        return;
      }

      setAvailableCash(presetCustomer.available_cash.toLocaleString("ko-KR"));
      setMonthlyIncome(presetCustomer.monthly_income.toLocaleString("ko-KR"));
      const profileData = profileResult.data as ConditionValidationProfilePresetRow | null;
      if (profileData) {
        if (profileData.cv_employment_type) setEmploymentType(profileData.cv_employment_type);
        if (profileData.cv_monthly_expenses_manwon !== null && profileData.cv_monthly_expenses_manwon !== undefined) {
          setMonthlyExpenses(profileData.cv_monthly_expenses_manwon.toLocaleString("ko-KR"));
        }
        if (profileData.cv_house_ownership) setHouseOwnership(profileData.cv_house_ownership);
        if (profileData.cv_purchase_purpose_v2) setPurchasePurposeV2(profileData.cv_purchase_purpose_v2);
        if (profileData.cv_purchase_timing) setPurchaseTiming(profileData.cv_purchase_timing);
        if (profileData.cv_movein_timing) setMoveinTiming(profileData.cv_movein_timing);
        if (profileData.cv_ltv_internal_score !== null && profileData.cv_ltv_internal_score !== undefined) {
          setLtvInternalScore(profileData.cv_ltv_internal_score);
        }
        if (profileData.cv_existing_monthly_repayment) setExistingMonthlyRepayment(profileData.cv_existing_monthly_repayment);
      }
      setShowConditionSetupCard(false);
      await applyRecommendationByCustomer(presetCustomer, { closeModal: false });
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
              title={Copy.home.consultable.title}
              caption={Copy.home.consultable.subtitle}
              rightLink={{ href: consultableOfferingsHref, label: "전체보기" }}
            />

            {!rowsLoaded ? (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {[0, 1, 2].map((i) => <OfferingCardSkeleton key={i} />)}
              </div>
            ) : consultableOfferings.length === 0 ? (
              <EmptyState
                title={Copy.home.consultable.empty.title}
                description={Copy.home.consultable.empty.subtitle}
              />
            ) : (
              <ResponsiveOfferingRow items={consultableOfferings} scrapedPropertyIds={scrapedPropertyIds} isLoggedIn={isLoggedIn === true} />
            )}
          </section>

          {/* 지역별 인기 분양 */}
          <section className="mt-8 sm:mt-10 flex flex-col gap-2">
            <SectionHeader
              title={Copy.home.regional.title}
              caption={Copy.home.regional.subtitle}
              rightLink={{ href: popularOfferingsHref, label: "전체보기" }}
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

            {!rowsLoaded ? (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {[0, 1, 2].map((i) => <OfferingCardSkeleton key={i} />)}
              </div>
            ) : popularOfferings.length === 0 ? (
              <EmptyState
                title={Copy.home.regional.empty.title}
                description={Copy.home.regional.empty.subtitle}
              />
            ) : (
              <ResponsiveOfferingRow items={popularOfferings} scrapedPropertyIds={scrapedPropertyIds} isLoggedIn={isLoggedIn === true} />
            )}
          </section>
        </>
      ) : (
        <>
          {showConditionSetupCard ? (
            /* ── 조건 미설정: 소개 카드만 표시 ── */
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
                      {Copy.home.customMatch.cta}
                      <ArrowRight className="h-4 w-4 text-(--oboon-on-primary)" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-1">
                    <ConditionFeatureItem
                      title={Copy.home.customMatch.conditions.traffic.label}
                      description={Copy.home.customMatch.conditions.traffic.description}
                      icon={<BusFront className="h-5 w-5" />}
                      iconToneClass="bg-[color-mix(in_srgb,var(--oboon-primary)_16%,transparent)] text-(--oboon-primary)"
                    />
                    <ConditionFeatureItem
                      title={Copy.home.customMatch.conditions.school.label}
                      description={Copy.home.customMatch.conditions.school.description}
                      icon={<GraduationCap className="h-5 w-5" />}
                      iconToneClass="bg-(--oboon-safe-bg) text-(--oboon-safe-text)"
                    />
                    <ConditionFeatureItem
                      title={Copy.home.customMatch.conditions.development.label}
                      description={Copy.home.customMatch.conditions.development.description}
                      icon={<Pickaxe className="h-5 w-5" />}
                      iconToneClass="bg-[color-mix(in_srgb,var(--oboon-warning-text)_16%,transparent)] text-(--oboon-warning-text)"
                    />
                    <ConditionFeatureItem
                      title={Copy.home.customMatch.conditions.pets.label}
                      description={Copy.home.customMatch.conditions.pets.description}
                      icon={<PawPrint className="h-5 w-5" />}
                      iconToneClass="bg-[color-mix(in_srgb,var(--oboon-text-muted)_14%,transparent)] text-(--oboon-text-muted)"
                    />
                  </div>
                </div>
              </Card>
            </section>
          ) : (
            /* ── 조건 적용 후: 리스트 + 수정 버튼 ── */
            <section className="mt-1 flex flex-col gap-2">
              <div className="mb-3 sm:mb-4 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="ob-typo-h2 text-(--oboon-text-title)">{Copy.home.customMatch.listTitle}</h2>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConditionModalOpen(true)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-(--oboon-border-default) px-3 ob-typo-caption text-(--oboon-text-muted) transition-colors hover:border-(--oboon-primary)/60 hover:text-(--oboon-primary)"
                    >
                      <SlidersHorizontal className="h-3 w-3" />
                      조건 수정
                    </button>
                    <Link
                      href="/recommendations"
                      className="shrink-0 ob-typo-body text-(--oboon-text-muted) hover:text-(--oboon-primary)"
                    >
                      전체보기
                    </Link>
                  </div>
                </div>
                {appliedCustomerSummary ? (
                  <p className="ob-typo-caption text-(--oboon-text-muted)">
                    {appliedCustomerSummary}
                  </p>
                ) : (
                  <p className="ob-typo-caption text-(--oboon-text-muted)">
                    {Copy.home.customMatch.listSubtitle}
                  </p>
                )}
              </div>

              {loadError && (
                <div className="ob-typo-caption text-(--oboon-danger)">
                  데이터를 불러오지 못했어요. ({loadError})
                </div>
              )}

              {conditionMatchedOfferings.length === 0 ? (
                <Card className="p-6 ob-typo-body text-(--oboon-text-muted)">
                  선택한 조건에 맞는 분양이 아직 없어요.
                </Card>
              ) : (
                <ResponsiveOfferingRow
                  items={conditionMatchedOfferings}
                  recommendedCategoriesById={recommendedCategoriesById}
                  scrapedPropertyIds={scrapedPropertyIds}
                  isLoggedIn={isLoggedIn === true}
                />
              )}
            </section>
          )}
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
            조건을 입력하면 맞춤 현장을 계산해요.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4">
            {/* 직업 */}
            <div>
              <div className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">직업</div>
              <Select<EmploymentType>
                value={(employmentType ?? "") as EmploymentType}
                onChange={setEmploymentType}
                options={EMPLOYMENT_TYPE_OPTIONS}
              />
            </div>

            {/* 가용 현금 */}
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
                  className={availableCashPreview ? "pr-24" : undefined}
                />
                {availableCashPreview ? (
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center ob-typo-caption text-(--oboon-text-muted)">
                    {availableCashPreview}
                  </div>
                ) : null}
              </div>
            </div>

            {/* 월 소득 + 월 고정지출 */}
            <div className="grid grid-cols-2 gap-2.5">
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
                    className={monthlyIncomePreview ? "pr-24" : undefined}
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
                  월 고정지출 (만원)
                </label>
                <div className="relative">
                  <Input
                    value={monthlyExpenses}
                    onChange={(e) => setMonthlyExpenses(formatNumericInput(e.target.value))}
                    inputMode="numeric"
                    placeholder="예: 150"
                    className={monthlyExpensesPreview ? "pr-24" : undefined}
                  />
                  {monthlyExpensesPreview ? (
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center ob-typo-caption text-(--oboon-text-muted)">
                      {monthlyExpensesPreview}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* 신용 상태 (LTV+DSR) */}
            <div>
              <div className="mb-1 ob-typo-caption text-(--oboon-text-muted)">신용 상태 (LTV+DSR)</div>
              <button
                type="button"
                onClick={() => setLtvModalOpen(true)}
                className="flex w-full items-center justify-between rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-3 py-2.5 hover:border-(--oboon-primary) transition-colors"
              >
                <span className="ob-typo-caption text-(--oboon-text-muted)">대출 가능성 평가</span>
                <div className="flex items-center gap-2">
                  {ltvInternalScore > 0 ? (
                    <span className="ob-typo-body font-semibold text-(--oboon-primary)">
                      {ltvInternalScore}점
                    </span>
                  ) : (
                    <span className="ob-typo-caption text-(--oboon-text-muted)">미평가</span>
                  )}
                  <span className="ob-typo-caption text-(--oboon-text-muted)">수정 →</span>
                </div>
              </button>
            </div>

            {/* 보유 주택 / 분양 목적 */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <div className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">보유 주택</div>
                <Select<"none" | "one" | "two_or_more">
                  value={(houseOwnership ?? "") as "none" | "one" | "two_or_more"}
                  onChange={setHouseOwnership}
                  options={HOUSE_OWNERSHIP_OPTIONS}
                />
              </div>
              <div>
                <div className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">분양 목적</div>
                <Select<FullPurchasePurpose>
                  value={(purchasePurposeV2 ?? "") as FullPurchasePurpose}
                  onChange={setPurchasePurposeV2}
                  options={PURPOSE_V2_OPTIONS}
                />
              </div>
            </div>

            {/* 분양 시점 + 희망 입주 */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                  분양 시점
                </label>
                <Select<PurchaseTiming>
                  value={(purchaseTiming ?? "") as PurchaseTiming}
                  onChange={setPurchaseTiming}
                  options={PURCHASE_TIMING_OPTIONS}
                />
              </div>
              <div>
                <label className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
                  희망 입주
                </label>
                <Select<MoveinTiming>
                  value={(moveinTiming ?? "") as MoveinTiming}
                  onChange={setMoveinTiming}
                  options={MOVEIN_TIMING_OPTIONS}
                />
              </div>
            </div>
          </div>

          {conditionError ? (
            <p className="mt-3 ob-typo-caption text-(--oboon-danger)">{conditionError}</p>
          ) : null}
          {!conditionError && conditionNotice ? (
            <p className="mt-3 ob-typo-caption text-(--oboon-primary)">{conditionNotice}</p>
          ) : null}

          <hr className="mt-4 border-(--oboon-border-default)" />

          <div className="mt-4 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setAvailableCash("");
                  setMonthlyIncome("");
                  setMonthlyExpenses("");
                  setEmploymentType(null);
                  setHouseOwnership(null);
                  setPurchasePurposeV2(null);
                  setPurchaseTiming(null);
                  setMoveinTiming(null);
                  setLtvInternalScore(0);
                  setExistingMonthlyRepayment("none");
                  setConditionError(null);
                  setConditionNotice(null);
                  setRecommendedPropertyIds(null);
                  setRecommendedCategoriesById(new Map());
                  setAppliedCustomerSummary(null);
                }}
              >
                초기화
              </Button>
              {isLoggedIn === false ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleLoginAndSaveCondition}
                >
                  로그인하고 조건 저장하기
                </Button>
              ) : isLoggedIn && !hasSavedConditionPreset ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  loading={conditionSaveLoading}
                  onClick={() => void handleSaveConditionPreset()}
                >
                  조건 저장하기
                </Button>
              ) : null}
            </div>
            <Button
              type="button"
              size="md"
              variant="primary"
              loading={conditionApplyLoading}
              disabled={
                parseNullableNumericInput(availableCash) === null ||
                parseNullableNumericInput(monthlyIncome) === null ||
                houseOwnership === null ||
                purchasePurposeV2 === null
              }
              onClick={() => void handleApplyCondition()}
              className="w-full"
            >
              적용하기
            </Button>
          </div>
        </div>
      </Modal>

      <LtvDsrModal
        open={ltvModalOpen}
        onClose={() => setLtvModalOpen(false)}
        onConfirm={({ ltvInternalScore: score, existingMonthlyRepayment: repayment }) => {
          setLtvInternalScore(score);
          setExistingMonthlyRepayment(repayment);
        }}
        initialEmploymentType={employmentType ?? "employee"}
        initialHouseOwnership={houseOwnership ?? "none"}
      />
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
    <div className="mb-1.5 sm:mb-2 flex items-baseline justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="ob-typo-h2 text-(--oboon-text-title)">{title}</h2>
        {caption && (
          <p className="ob-typo-body text-(--oboon-text-muted)">{caption}</p>
        )}
      </div>

      {rightLink ? (
        <Link
          href={rightLink.href}
          className="shrink-0 ob-typo-body text-(--oboon-text-muted) hover:text-(--oboon-primary)"
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
  scrapedPropertyIds,
  isLoggedIn,
}: {
  items: Offering[];
  recommendedCategoriesById?: Map<number, ConditionCategoryGrades>;
  scrapedPropertyIds?: Set<number>;
  isLoggedIn?: boolean;
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
              {items.map((offering, index) => (
                <div key={offering.id} className="w-70 shrink-0 snap-start">
                  <OfferingCard
                    offering={offering}
                    conditionCategories={recommendedCategoriesById?.get(Number(offering.id))}
                    initialScrapped={scrapedPropertyIds?.has(Number(offering.id)) ?? false}
                    isLoggedIn={isLoggedIn ?? false}
                    priority={index === 0}
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
          {items.map((offering, index) => (
            <OfferingCard
              key={offering.id}
              offering={offering}
              conditionCategories={recommendedCategoriesById?.get(Number(offering.id))}
              initialScrapped={scrapedPropertyIds?.has(Number(offering.id)) ?? false}
              isLoggedIn={isLoggedIn ?? false}
              priority={index === 0}
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
