"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  ConditionCategoryGrades,
  CreditGrade,
  FinalGrade,
  PurchasePurpose,
} from "@/features/condition-validation/domain/types";
import { parseCustomerInput } from "@/features/condition-validation/domain/validation";
import {
  normalizeOfferingStatusValue,
  normalizeRegionTab,
  statusLabelOf,
} from "@/features/offerings/domain/offering.constants";
import {
  mapPropertyRowToOffering,
  type PropertyRow,
} from "@/features/offerings/mappers/offering.mapper";
import { fetchPropertiesForOfferings } from "@/features/offerings/services/offering.query";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { toKoreanErrorMessage } from "@/shared/errorMessage";
import { formatPriceRange } from "@/shared/price";
import { UXCopy } from "@/shared/uxCopy";
import type { Offering } from "@/types/index";

export type RecommendationMode = "input" | "sim";
export type OwnedHouseCount = 0 | 1 | 2;

export type RecommendationCondition = {
  availableCash: number;
  monthlyIncome: number;
  ownedHouseCount: OwnedHouseCount;
  creditGrade: CreditGrade;
  purchasePurpose: PurchasePurpose;
};

export type RecommendationProperty = {
  id: number;
  name: string;
  addressShort: string;
  addressFull: string;
  regionLabel: string;
  propertyType: string | null;
  status: string | null;
  statusLabel: string;
  imageUrl: string | null;
  lat: number | null;
  lng: number | null;
  priceLabel: string;
};

export type RecommendationCategory = {
  grade: FinalGrade;
  score: number | null;
  maxScore: number;
};

export type RecommendationEvalResult = {
  finalGrade: FinalGrade;
  totalScore: number | null;
  action: string | null;
  summaryMessage: string;
  reasonMessages: string[];
  showDetailedMetrics: boolean;
  isMasked: boolean;
  categories: {
    cash: RecommendationCategory;
    burden: RecommendationCategory;
    risk: RecommendationCategory;
  };
  metrics: {
    listPrice: number | null;
    minCash: number | null;
    recommendedCash: number | null;
    monthlyPaymentEst: number | null;
    monthlyBurdenPercent: number | null;
  };
};

export type RecommendationItem = {
  offering: Offering;
  property: RecommendationProperty;
  conditionCategories: ConditionCategoryGrades;
  evalResult: RecommendationEvalResult;
};

type RawRecommendationItem = {
  property_id?: number | string;
  property_name?: string | null;
  property_type?: string | null;
  status?: string | null;
  image_url?: string | null;
  final_grade?: FinalGrade;
  total_score?: number | null;
  action?: string | null;
  summary_message?: string | null;
  reason_messages?: string[] | null;
  show_detailed_metrics?: boolean;
  categories?: {
    cash?: {
      grade?: FinalGrade;
      score?: number | null;
    } | null;
    burden?: {
      grade?: FinalGrade;
      score?: number | null;
    } | null;
    risk?: {
      grade?: FinalGrade;
      score?: number | null;
    } | null;
  } | null;
  metrics?: {
    list_price?: number | null;
    min_cash?: number | null;
    recommended_cash?: number | null;
    monthly_payment_est?: number | null;
    monthly_burden_percent?: number | null;
  } | null;
};

type RawRecommendationResponse = {
  ok?: boolean;
  recommendations?: RawRecommendationItem[];
  error?: {
    message?: string;
  };
};

type OfferingMeta = {
  offering: Offering;
  propertyType: string | null;
  rawStatus: string | null;
};

const DEFAULT_CONDITION: RecommendationCondition = {
  availableCash: 8_000,
  monthlyIncome: 400,
  ownedHouseCount: 0,
  creditGrade: "good",
  purchasePurpose: "residence",
};

const CASH_MAX_SCORE = 40;
const BURDEN_MAX_SCORE = 35;
const RISK_MAX_SCORE = 25;
const SIMULATOR_AVAILABLE_CASH_MAX = 1_000_000;
const SIMULATOR_MONTHLY_INCOME_MAX = 10_000;
const SIMULATOR_AVAILABLE_CASH_STEPS = [
  ...Array.from({ length: 11 }, (_, index) => index * 1_000),
  ...Array.from({ length: 9 }, (_, index) => (index + 2) * 10_000),
  ...Array.from({ length: 9 }, (_, index) => (index + 2) * 100_000),
];
const SIMULATOR_MONTHLY_INCOME_STEPS = [
  ...Array.from({ length: 11 }, (_, index) => index * 100),
  ...Array.from({ length: 8 }, (_, index) => 1_500 + index * 500),
  ...Array.from({ length: 5 }, (_, index) => 6_000 + index * 1_000),
];

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const normalized = value.replaceAll(",", "").trim();
    if (!normalized) return null;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toPositiveInt(value: unknown): number | null {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return null;

  const normalized = Math.round(parsed);
  return normalized > 0 ? normalized : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sanitizeAmount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function snapSimulatorAvailableCash(value: number): number {
  const normalized = clamp(
    sanitizeAmount(value),
    0,
    SIMULATOR_AVAILABLE_CASH_MAX,
  );

  return SIMULATOR_AVAILABLE_CASH_STEPS.reduce((closest, current) =>
    Math.abs(current - normalized) < Math.abs(closest - normalized)
      ? current
      : closest,
  );
}

function snapSimulatorMonthlyIncome(value: number): number {
  const normalized = clamp(
    sanitizeAmount(value),
    0,
    SIMULATOR_MONTHLY_INCOME_MAX,
  );

  return SIMULATOR_MONTHLY_INCOME_STEPS.reduce((closest, current) =>
    Math.abs(current - normalized) < Math.abs(closest - normalized)
      ? current
      : closest,
  );
}

function normalizeOwnedHouseCount(value: number): OwnedHouseCount {
  if (value >= 2) return 2;
  if (value <= 0) return 0;
  return 1;
}

function normalizeInputCondition(condition: RecommendationCondition): RecommendationCondition {
  return {
    availableCash: sanitizeAmount(condition.availableCash),
    monthlyIncome: sanitizeAmount(condition.monthlyIncome),
    ownedHouseCount: normalizeOwnedHouseCount(condition.ownedHouseCount),
    creditGrade: condition.creditGrade,
    purchasePurpose: condition.purchasePurpose,
  };
}

function normalizeSimulatorCondition(
  condition: RecommendationCondition,
): RecommendationCondition {
  return {
    availableCash: snapSimulatorAvailableCash(condition.availableCash),
    monthlyIncome: snapSimulatorMonthlyIncome(condition.monthlyIncome),
    ownedHouseCount: normalizeOwnedHouseCount(condition.ownedHouseCount),
    creditGrade: condition.creditGrade,
    purchasePurpose: condition.purchasePurpose,
  };
}

function getStatusLabel(status: string | null): string {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (normalized === "OPEN" || normalized === "ONGOING") return "분양 중";
  if (normalized === "READY") return "분양 예정";
  if (normalized === "CLOSED") return "분양 종료";
  return "확인 중";
}

function buildPriceLabel(args: {
  offering: Offering | null;
  listPrice: number | null;
  showDetailedMetrics: boolean;
}): string {
  const { offering, listPrice, showDetailedMetrics } = args;

  if (!showDetailedMetrics) {
    return UXCopy.pricePrivateShort;
  }

  if (offering && (offering.priceMin억 !== null || offering.priceMax억 !== null)) {
    return formatPriceRange(offering.priceMin억, offering.priceMax억, {
      unknownLabel: offering.isPricePrivate
        ? UXCopy.pricePrivateShort
        : UXCopy.priceRangeShort,
    });
  }

  if (listPrice !== null) {
    const singlePrice = Math.round((listPrice / 10_000) * 10) / 10;
    return formatPriceRange(singlePrice, singlePrice, {
      unknownLabel: UXCopy.priceRangeShort,
    });
  }

  return UXCopy.priceRangeShort;
}

function toConditionCategoryGrades(args: {
  totalScore: number | null;
  cashScore: number | null;
  cashGrade: FinalGrade;
  burdenScore: number | null;
  burdenGrade: FinalGrade;
  riskScore: number | null;
  riskGrade: FinalGrade;
}): ConditionCategoryGrades {
  const {
    totalScore,
    cashScore,
    cashGrade,
    burdenScore,
    burdenGrade,
    riskScore,
    riskGrade,
  } = args;

  return {
    cash: { grade: cashGrade, score: cashScore ?? undefined },
    burden: { grade: burdenGrade, score: burdenScore ?? undefined },
    risk: { grade: riskGrade, score: riskScore ?? undefined },
    totalScore: totalScore ?? undefined,
  };
}

function manwonToEok(value: number | null): number | null {
  if (value === null) return null;
  return Math.round((value / 10_000) * 10) / 10;
}

function buildRecommendationOffering(args: {
  id: number;
  offering: Offering | null;
  propertyName: string;
  addressShort: string;
  addressFull: string;
  regionLabel: string;
  status: string | null;
  imageUrl: string | null;
  lat: number | null;
  lng: number | null;
  listPrice: number | null;
  showDetailedMetrics: boolean;
}): Offering {
  const {
    id,
    offering,
    propertyName,
    addressShort,
    addressFull,
    regionLabel,
    status,
    imageUrl,
    lat,
    lng,
    listPrice,
    showDetailedMetrics,
  } = args;

  const normalizedStatusValue = normalizeOfferingStatusValue(status);
  const singlePriceInEok = manwonToEok(listPrice);

  const fallbackOffering: Offering = {
    id: String(id),
    title: propertyName,
    addressShort,
    addressFull,
    region: normalizeRegionTab(regionLabel),
    regionLabel,
    status: statusLabelOf(normalizedStatusValue),
    statusValue: normalizedStatusValue,
    hasAppraiserComment: false,
    imageUrl,
    priceMin억: showDetailedMetrics ? singlePriceInEok : null,
    priceMax억: showDetailedMetrics ? singlePriceInEok : null,
    isPricePrivate: !showDetailedMetrics,
    lat,
    lng,
  };

  if (!offering) {
    return fallbackOffering;
  }

  if (!showDetailedMetrics) {
    return {
      ...offering,
      priceMin억: null,
      priceMax억: null,
      isPricePrivate: true,
    };
  }

  if (offering.priceMin억 !== null || offering.priceMax억 !== null) {
    return offering;
  }

  return {
    ...offering,
    priceMin억: singlePriceInEok,
    priceMax억: singlePriceInEok,
    isPricePrivate: false,
  };
}

function isMaskedRecommendation(item: RawRecommendationItem): boolean {
  return (
    toFiniteNumber(item.total_score) === null ||
    toFiniteNumber(item.categories?.cash?.score) === null ||
    toFiniteNumber(item.categories?.burden?.score) === null ||
    toFiniteNumber(item.categories?.risk?.score) === null ||
    toFiniteNumber(item.metrics?.min_cash) === null
  );
}

function mergeRecommendationItem(
  item: RawRecommendationItem,
  metadataById: Map<number, OfferingMeta>,
): RecommendationItem | null {
  const id = toPositiveInt(item.property_id);
  const finalGrade = item.final_grade;
  if (!id || !finalGrade) return null;

  const metadata = metadataById.get(id);
  const offering = metadata?.offering ?? null;
  const showDetailedMetrics = item.show_detailed_metrics !== false;
  const totalScore = toFiniteNumber(item.total_score);
  const listPrice = toFiniteNumber(item.metrics?.list_price);
  const minCash = toFiniteNumber(item.metrics?.min_cash);
  const recommendedCash = toFiniteNumber(item.metrics?.recommended_cash);
  const monthlyPaymentEst = toFiniteNumber(item.metrics?.monthly_payment_est);
  const monthlyBurdenPercent = toFiniteNumber(item.metrics?.monthly_burden_percent);
  const isMasked = isMaskedRecommendation(item);
  const propertyName = offering?.title ?? item.property_name ?? `현장 #${id}`;
  const addressShort = offering?.addressShort ?? UXCopy.addressShort;
  const addressFull = offering?.addressFull ?? offering?.addressShort ?? UXCopy.addressShort;
  const regionLabel = offering?.regionLabel ?? offering?.region ?? UXCopy.regionShort;
  const rawStatus = metadata?.rawStatus ?? item.status ?? null;
  const statusLabel = getStatusLabel(rawStatus);
  const cashGrade = item.categories?.cash?.grade ?? finalGrade;
  const burdenGrade = item.categories?.burden?.grade ?? finalGrade;
  const riskGrade = item.categories?.risk?.grade ?? finalGrade;
  const cashScore = toFiniteNumber(item.categories?.cash?.score);
  const burdenScore = toFiniteNumber(item.categories?.burden?.score);
  const riskScore = toFiniteNumber(item.categories?.risk?.score);
  const recommendationOffering = buildRecommendationOffering({
    id,
    offering,
    propertyName,
    addressShort,
    addressFull,
    regionLabel,
    status: rawStatus,
    imageUrl: offering?.imageUrl ?? item.image_url ?? null,
    lat: toFiniteNumber(offering?.lat),
    lng: toFiniteNumber(offering?.lng),
    listPrice,
    showDetailedMetrics,
  });

  const property: RecommendationProperty = {
    id,
    name: propertyName,
    addressShort,
    addressFull,
    regionLabel,
    propertyType: metadata?.propertyType ?? item.property_type ?? null,
    status: rawStatus,
    statusLabel,
    imageUrl: recommendationOffering.imageUrl ?? null,
    lat: recommendationOffering.lat ?? null,
    lng: recommendationOffering.lng ?? null,
    priceLabel: buildPriceLabel({
      offering: recommendationOffering,
      listPrice,
      showDetailedMetrics,
    }),
  };

  return {
    offering: recommendationOffering,
    property,
    conditionCategories: toConditionCategoryGrades({
      totalScore,
      cashScore,
      cashGrade,
      burdenScore,
      burdenGrade,
      riskScore,
      riskGrade,
    }),
    evalResult: {
      finalGrade,
      totalScore,
      action: item.action ?? null,
      summaryMessage: item.summary_message ?? "조건을 다시 확인해주세요.",
      reasonMessages: Array.isArray(item.reason_messages)
        ? item.reason_messages.filter(
            (reason): reason is string =>
              typeof reason === "string" && reason.trim().length > 0,
          )
        : [],
      showDetailedMetrics,
      isMasked,
      categories: {
        cash: {
          grade: cashGrade,
          score: cashScore,
          maxScore: CASH_MAX_SCORE,
        },
        burden: {
          grade: burdenGrade,
          score: burdenScore,
          maxScore: BURDEN_MAX_SCORE,
        },
        risk: {
          grade: riskGrade,
          score: riskScore,
          maxScore: RISK_MAX_SCORE,
        },
      },
      metrics: {
        listPrice,
        minCash,
        recommendedCash,
        monthlyPaymentEst,
        monthlyBurdenPercent,
      },
    },
  };
}

export function useRecommendations() {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const requestSeqRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const initialEvaluationRequestedRef = useRef(false);

  const [condition, setCondition] = useState<RecommendationCondition>(
    DEFAULT_CONDITION,
  );
  const [mode, setMode] = useState<RecommendationMode>("input");
  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [rawRecommendations, setRawRecommendations] = useState<
    RawRecommendationItem[]
  >([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        setIsLoggedIn(Boolean(session?.user));
      },
    );

    async function load() {
      setIsBootstrapping(true);

      const [{ data, error }, authResult] = await Promise.all([
        fetchPropertiesForOfferings(supabase, { limit: 200 }),
        supabase.auth.getUser(),
      ]);

      if (!active) return;

      if (error) {
        setCatalogError(
          toKoreanErrorMessage(
            error,
            "추천 현장 기본 데이터를 불러오지 못했습니다.",
          ),
        );
        setRows([]);
      } else {
        setCatalogError(null);
        setRows(((data ?? []) as PropertyRow[]).filter(Boolean));
      }

      setIsLoggedIn(Boolean(authResult.data.user));
      setIsBootstrapping(false);
    }

    void load();

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
      abortControllerRef.current?.abort();
    };
  }, [supabase]);

  const metadataById = useMemo(() => {
    const map = new Map<number, OfferingMeta>();

    for (const row of rows) {
      const offering = mapPropertyRowToOffering(row, {
        addressShort: UXCopy.addressShort,
        regionShort: UXCopy.regionShort,
      });

      map.set(row.id, {
        offering,
        propertyType: row.property_type ?? null,
        rawStatus: row.status ?? null,
      });
    }

    return map;
  }, [rows]);

  const results = useMemo(
    () =>
      rawRecommendations
        .map((item) => mergeRecommendationItem(item, metadataById))
        .filter((item): item is RecommendationItem => Boolean(item)),
    [metadataById, rawRecommendations],
  );

  const selectedItem = useMemo(
    () =>
      selectedId === null
        ? null
        : results.find((item) => item.property.id === selectedId) ?? null,
    [results, selectedId],
  );

  useEffect(() => {
    if (selectedId === null) return;

    const exists = results.some((item) => item.property.id === selectedId);
    if (!exists) {
      setSelectedId(null);
    }
  }, [results, selectedId]);

  const runEvaluate = useCallback(async (nextCondition: RecommendationCondition) => {
    const seq = requestSeqRef.current + 1;
    requestSeqRef.current = seq;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setRequestError(null);
    setIsEvaluating(true);

    try {
      const response = await fetch("/api/condition-validation/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          customer: {
            available_cash: nextCondition.availableCash,
            monthly_income: nextCondition.monthlyIncome,
            owned_house_count: nextCondition.ownedHouseCount,
            credit_grade: nextCondition.creditGrade,
            purchase_purpose: nextCondition.purchasePurpose,
          },
          options: {
            include_red: false,
            limit: 60,
          },
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | RawRecommendationResponse
        | null;

      if (controller.signal.aborted || seq !== requestSeqRef.current) {
        return false;
      }

      if (!response.ok || !payload?.ok) {
        setRequestError(
          payload?.error?.message ??
            "추천 현장 계산 중 오류가 발생했습니다.",
        );
        return false;
      }

      setRawRecommendations(
        Array.isArray(payload.recommendations) ? payload.recommendations : [],
      );
      return true;
    } catch (error) {
      if (
        controller.signal.aborted ||
        seq !== requestSeqRef.current
      ) {
        return false;
      }

      const message =
        error instanceof Error && error.message
          ? error.message
          : "추천 현장 계산 중 네트워크 오류가 발생했습니다.";
      setRequestError(message);
      return false;
    } finally {
      if (seq === requestSeqRef.current) {
        setIsEvaluating(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isBootstrapping || initialEvaluationRequestedRef.current) {
      return;
    }

    initialEvaluationRequestedRef.current = true;
    void runEvaluate(condition);
  }, [condition, isBootstrapping, runEvaluate]);

  useEffect(() => {
    if (
      isBootstrapping ||
      !initialEvaluationRequestedRef.current ||
      mode !== "sim"
    ) {
      return;
    }

    void runEvaluate(condition);
  }, [condition, isBootstrapping, mode, runEvaluate]);

  const updateCondition = useCallback(
    (patch: Partial<RecommendationCondition>) => {
      setValidationError(null);
      setCondition((prev) => {
        const nextCondition = {
          ...prev,
          ...patch,
        };

        return mode === "sim"
          ? normalizeSimulatorCondition(nextCondition)
          : normalizeInputCondition(nextCondition);
      });
    },
    [mode],
  );

  const evaluate = useCallback(async () => {
    const parsed = parseCustomerInput(
      {
        availableCash: String(condition.availableCash),
        monthlyIncome: String(condition.monthlyIncome),
        ownedHouseCount: String(condition.ownedHouseCount),
        creditGrade: condition.creditGrade,
        purchasePurpose: condition.purchasePurpose,
      },
      {
        availableCash: {
          invalid: "가용 현금을 확인해주세요.",
          nonInteger: "가용 현금은 만원 단위 정수로 입력해주세요.",
        },
        monthlyIncome: {
          invalid: "월 소득을 확인해주세요.",
          nonInteger: "월 소득은 만원 단위 정수로 입력해주세요.",
        },
        ownedHouseCount: {
          invalid: "보유 주택 수는 0, 1, 2 중에서 선택해주세요.",
        },
      },
    );

    if (!parsed.ok) {
      setValidationError(parsed.error);
      return false;
    }

    setValidationError(null);
    return runEvaluate(condition);
  }, [condition, runEvaluate]);

  const changeMode = useCallback((nextMode: RecommendationMode) => {
    setValidationError(null);
    if (nextMode === "sim") {
      setCondition((prev) => normalizeSimulatorCondition(prev));
    }
    setMode(nextMode);
  }, []);

  return {
    condition,
    mode,
    results,
    selectedId,
    selectedItem,
    isBootstrapping,
    isEvaluating,
    isLoggedIn,
    catalogError,
    requestError,
    validationError,
    changeMode,
    updateCondition,
    evaluate,
    setSelectedId,
  };
}
