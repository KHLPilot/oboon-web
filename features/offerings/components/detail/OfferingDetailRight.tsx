"use client";

// features/offerings/detail/OfferingDetailRight.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createPortal } from "react-dom";
import { CalendarDays, Check, Clock } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import BookingModal from "@/features/offerings/components/detail/BookingModal";
import ConditionValidationCard, {
  type ProfileAutoFillData,
} from "@/features/offerings/components/detail/ConditionValidationCard";
import type { ConditionRecommendationItem } from "@/features/condition-validation/domain/types";
import { grade5DetailLabel } from "@/features/condition-validation/lib/grade5Labels";
import { formatManwonWithEok, formatPercent } from "@/lib/format/currency";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { trackEvent } from "@/lib/analytics";
import { pickLoggedInConditionSource } from "@/features/condition-validation/lib/conditionSourcePolicy";
import {
  normalizeOfferingStatusValue,
  statusLabelOf,
} from "@/features/offerings/domain/offering.constants";
import ScrapButton from "@/features/offerings/components/ScrapButton";
import type { PropertyTimelineRow } from "@/features/offerings/domain/offeringDetail.types";

interface OfferingDetailRightProps {
  propertyId?: number;
  propertyName?: string;
  propertyImageUrl?: string;
  hasApprovedAgent?: boolean;
  propertyTimeline?: PropertyTimelineRow[] | PropertyTimelineRow | null;
}

interface AgentInfo {
  id: string;
  name: string;
  email?: string | null;
  phone_number?: string | null;
  agent_bio?: string | null;
}

type ConditionValidationPreset = {
  availableCash: number;
  monthlyIncome: number;
  ownedHouseCount: number;
  creditGrade: "good" | "normal" | "unstable";
  purchasePurpose: "residence" | "investment" | "both";
};

type RecommendationCustomerInput = {
  available_cash: number;
  monthly_income: number;
  owned_house_count: number;
  credit_grade: "good" | "normal" | "unstable";
  purchase_purpose: "residence" | "investment" | "both";
};

type ConditionValidationRequestRow = {
  available_cash_manwon: number | null;
  monthly_income_manwon: number | null;
  owned_house_count: number | null;
  credit_grade: "good" | "normal" | "unstable" | null;
  purchase_purpose: "residence" | "investment" | "both" | null;
  input_payload?: unknown;
};

function pickFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toFiniteInteger(value: unknown): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return Math.round(value);
  }
  if (typeof value === "string") {
    const normalized = value.replaceAll(",", "").trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return null;
    return Math.round(parsed);
  }
  return null;
}

function toUnknownRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function houseOwnershipFromOwnedHouseCount(
  ownedHouseCount: number | null | undefined,
): "none" | "one" | "two_or_more" | null {
  if (ownedHouseCount === 1) return "one";
  if ((ownedHouseCount ?? 0) >= 2) return "two_or_more";
  return ownedHouseCount === 0 ? "none" : null;
}

function purchasePurposeV2FromLegacy(
  purchasePurpose: "residence" | "investment" | "both" | null | undefined,
): "residence" | "investment_rent" | "investment_capital" | "long_term" | null {
  if (purchasePurpose === "both") return "long_term";
  if (purchasePurpose === "investment") return "investment_capital";
  if (purchasePurpose === "residence") return "residence";
  return null;
}

function ltvInternalScoreFromCreditGrade(
  creditGrade: "good" | "normal" | "unstable" | null | undefined,
): number | null {
  if (creditGrade === "good") return 80;
  if (creditGrade === "normal") return 55;
  if (creditGrade === "unstable") return 20;
  return null;
}

function profileAutoFillFromRequest(
  request: ConditionValidationRequestRow | null,
): ProfileAutoFillData | null {
  if (!request) return null;

  const payloadRecord = toUnknownRecord(request.input_payload);
  const payloadCustomer = toUnknownRecord(payloadRecord?.customer);

  const employmentType =
    payloadCustomer?.employment_type === "employee" ||
    payloadCustomer?.employment_type === "self_employed" ||
    payloadCustomer?.employment_type === "freelancer" ||
    payloadCustomer?.employment_type === "other"
      ? payloadCustomer.employment_type
      : null;

  const houseOwnership =
    payloadCustomer?.house_ownership === "none" ||
    payloadCustomer?.house_ownership === "one" ||
    payloadCustomer?.house_ownership === "two_or_more"
      ? payloadCustomer.house_ownership
      : houseOwnershipFromOwnedHouseCount(request.owned_house_count);

  const purchasePurposeV2 =
    payloadCustomer?.purchase_purpose_v2 === "residence" ||
    payloadCustomer?.purchase_purpose_v2 === "investment_rent" ||
    payloadCustomer?.purchase_purpose_v2 === "investment_capital" ||
    payloadCustomer?.purchase_purpose_v2 === "long_term"
      ? payloadCustomer.purchase_purpose_v2
      : purchasePurposeV2FromLegacy(request.purchase_purpose);

  const purchaseTiming =
    payloadCustomer?.purchase_timing === "within_3months" ||
    payloadCustomer?.purchase_timing === "within_6months" ||
    payloadCustomer?.purchase_timing === "within_1year" ||
    payloadCustomer?.purchase_timing === "over_1year" ||
    payloadCustomer?.purchase_timing === "by_property"
      ? payloadCustomer.purchase_timing
      : null;

  const moveinTiming =
    payloadCustomer?.movein_timing === "immediate" ||
    payloadCustomer?.movein_timing === "within_1year" ||
    payloadCustomer?.movein_timing === "within_2years" ||
    payloadCustomer?.movein_timing === "within_3years" ||
    payloadCustomer?.movein_timing === "anytime"
      ? payloadCustomer.movein_timing
      : null;

  const existingMonthlyRepayment =
    payloadCustomer?.existing_monthly_repayment === "none" ||
    payloadCustomer?.existing_monthly_repayment === "under_50" ||
    payloadCustomer?.existing_monthly_repayment === "50to100" ||
    payloadCustomer?.existing_monthly_repayment === "100to200" ||
    payloadCustomer?.existing_monthly_repayment === "over_200"
      ? payloadCustomer.existing_monthly_repayment
      : null;

  return {
    availableCashManwon: toFiniteInteger(payloadCustomer?.available_cash) ?? toFiniteInteger(request.available_cash_manwon),
    monthlyIncomeManwon: toFiniteInteger(payloadCustomer?.monthly_income) ?? toFiniteInteger(request.monthly_income_manwon),
    monthlyExpensesManwon: toFiniteInteger(payloadCustomer?.monthly_expenses),
    employmentType,
    houseOwnership,
    purchasePurposeV2,
    purchaseTiming,
    moveinTiming,
    ltvInternalScore:
      toFiniteInteger(payloadCustomer?.ltv_internal_score) ??
      ltvInternalScoreFromCreditGrade(request.credit_grade),
    existingLoan:
      payloadCustomer?.existing_loan === "none" ||
      payloadCustomer?.existing_loan === "under_1eok" ||
      payloadCustomer?.existing_loan === "1to3eok" ||
      payloadCustomer?.existing_loan === "over_3eok"
        ? payloadCustomer.existing_loan
        : null,
    recentDelinquency:
      payloadCustomer?.recent_delinquency === "none" ||
      payloadCustomer?.recent_delinquency === "once" ||
      payloadCustomer?.recent_delinquency === "twice_or_more"
        ? payloadCustomer.recent_delinquency
        : null,
    cardLoanUsage:
      payloadCustomer?.card_loan_usage === "none" ||
      payloadCustomer?.card_loan_usage === "1to2" ||
      payloadCustomer?.card_loan_usage === "3_or_more"
        ? payloadCustomer.card_loan_usage
        : null,
    loanRejection:
      payloadCustomer?.loan_rejection === "none" ||
      payloadCustomer?.loan_rejection === "yes"
        ? payloadCustomer.loan_rejection
        : null,
    monthlyIncomeRange:
      payloadCustomer?.monthly_income_range === "under_200" ||
      payloadCustomer?.monthly_income_range === "200to300" ||
      payloadCustomer?.monthly_income_range === "300to500" ||
      payloadCustomer?.monthly_income_range === "500to700" ||
      payloadCustomer?.monthly_income_range === "over_700"
        ? payloadCustomer.monthly_income_range
        : null,
    existingMonthlyRepayment,
  };
}

function gradeMeta(grade: ConditionRecommendationItem["final_grade"]): {
  label: string;
  badgeVariant: "success" | "warning" | "danger";
} {
  if (grade === "GREEN") return { label: grade5DetailLabel(grade), badgeVariant: "success" };
  if (grade === "LIME") return { label: grade5DetailLabel(grade), badgeVariant: "success" };
  if (grade === "YELLOW") return { label: grade5DetailLabel(grade), badgeVariant: "warning" };
  if (grade === "ORANGE") return { label: grade5DetailLabel(grade), badgeVariant: "warning" };
  return { label: grade5DetailLabel(grade), badgeVariant: "danger" };
}

function statusLabel(status: string | null): string {
  return statusLabelOf(normalizeOfferingStatusValue(status));
}

function isLikelyImageUrl(url: string | null | undefined) {
  if (!url) return false;
  if (url.startsWith("data:image/")) return true;
  return /\.(jpg|jpeg|png|webp|gif|avif|svg)(\?.*)?$/i.test(url);
}

function pickFirstNonEmpty(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  return asArray(value)[0] ?? null;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const normalized = value.trim();
  if (/^\d{4}-\d{2}$/.test(normalized)) return new Date(`${normalized}-01`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return new Date(normalized);
  return null;
}

function getStepStatus(
  startDate: string | null | undefined,
  endDate?: string | null | undefined,
): "done" | "active" | "upcoming" {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const effectiveEnd = end ?? start;
  if (!start) return "upcoming";
  if (effectiveEnd && effectiveEnd < today) return "done";
  if (start <= today) return "active";
  return "upcoming";
}

function fmtDateTbd(value: string | null | undefined): string {
  if (!value) return "미정";
  const normalized = value.trim();
  if (/^\d{4}-\d{2}$/.test(normalized) || /^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }
  return "미정";
}

function fmtRangeTbd(a: string | null | undefined, b: string | null | undefined): string {
  return `${fmtDateTbd(a)} ~ ${fmtDateTbd(b)}`;
}

export default function OfferingDetailRight({
  propertyId,
  propertyName,
  propertyImageUrl,
  hasApprovedAgent = false,
  propertyTimeline = null,
}: OfferingDetailRightProps) {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [conditionValidationPreset, setConditionValidationPreset] =
    useState<ConditionValidationPreset | null>(null);
  const [profileAutoFill, setProfileAutoFill] = useState<ProfileAutoFillData | null>(null);
  const [isRecommendModalOpen, setIsRecommendModalOpen] = useState(false);
  const [recommendItems, setRecommendItems] = useState<ConditionRecommendationItem[]>([]);
  const [conditionValidationSlot, setConditionValidationSlot] = useState<HTMLElement | null>(null);
  const [initialScrapped, setInitialScrapped] = useState(false);
  const isLoggedIn = Boolean(user);
  const isBookingBlockedRole = userRole === "agent" || userRole === "admin";
  const hasBookableAgent = hasApprovedAgent && agents.length > 0;
  const timeline = firstRow(propertyTimeline);

  const resolvedConditionPreset = useMemo(() => {
    if (!isLoggedIn || userRole !== "user") return null;
    return conditionValidationPreset;
  }, [conditionValidationPreset, isLoggedIn, userRole]);

  const handleConsultationClick = useCallback(() => {
    trackEvent(
      "consultation_request",
      propertyId ? { property_id: propertyId } : undefined,
    );
    setIsBookingOpen(true);
  }, [propertyId]);

  const openConsultationFlow = useCallback(() => {
    if (!isLoggedIn) {
      router.push("/auth/login");
      return;
    }
    if (isBookingBlockedRole || !hasBookableAgent) return;
    handleConsultationClick();
  }, [
    handleConsultationClick,
    hasBookableAgent,
    isBookingBlockedRole,
    isLoggedIn,
    router,
  ]);

  const openAlternativeOfferings = useCallback(
    async (customer: RecommendationCustomerInput) => {
      const response = await fetch("/api/condition-validation/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer,
          options: {
            exclude_property_id: propertyId,
            include_red: false,
            limit: 24,
          },
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            recommendations?: ConditionRecommendationItem[];
            error?: { message?: string };
          }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "추천 현장 조회에 실패했습니다.");
      }

      setRecommendItems(
        Array.isArray(payload.recommendations) ? payload.recommendations : [],
      );
      setIsRecommendModalOpen(true);
    },
    [propertyId],
  );

  useEffect(() => {
    let isMounted = true;
    async function fetchAgents() {
      if (!propertyId) return;
      setLoadingAgents(true);
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        if (!isMounted) return;
        setUser(currentUser);

        if (currentUser) {
          // 찜 상태 초기값 로드
          if (propertyId) {
            const { data: scrapRow } = await supabase
              .from("offering_scraps")
              .select("id")
              .eq("profile_id", currentUser.id)
              .eq("property_id", propertyId)
              .maybeSingle();
            if (isMounted) setInitialScrapped(scrapRow !== null);
          }

          const [
            { data: profileWithPreset },
            { data: profileRoleOnly },
            { data: requestRows },
          ] = await Promise.all([
            supabase
              .from("profiles")
              .select(
                "role, cv_available_cash_manwon, cv_monthly_income_manwon, cv_owned_house_count, cv_credit_grade, cv_purchase_purpose, cv_employment_type, cv_monthly_expenses_manwon, cv_house_ownership, cv_purchase_purpose_v2, cv_purchase_timing, cv_movein_timing, cv_ltv_internal_score, cv_existing_loan_amount, cv_recent_delinquency, cv_card_loan_usage, cv_loan_rejection, cv_monthly_income_range, cv_existing_monthly_repayment",
              )
              .eq("id", currentUser.id)
              .maybeSingle(),
            supabase
              .from("profiles")
              .select("role")
              .eq("id", currentUser.id)
              .maybeSingle(),
            supabase
              .from("condition_validation_requests")
              .select(
                "available_cash_manwon, monthly_income_manwon, owned_house_count, credit_grade, purchase_purpose, input_payload",
              )
              .eq("customer_id", currentUser.id)
              .order("requested_at", { ascending: false })
              .limit(1),
          ]);
          if (!isMounted) return;
          const role = (profileWithPreset?.role ??
            profileRoleOnly?.role) as string | null;
          setUserRole(role ?? null);
          const availableCash = toFiniteInteger(
            profileWithPreset?.cv_available_cash_manwon,
          );
          const monthlyIncome = toFiniteInteger(
            profileWithPreset?.cv_monthly_income_manwon,
          );
          const ownedHouseCount =
            toFiniteInteger(profileWithPreset?.cv_owned_house_count) ?? 0;
          const creditGrade =
            profileWithPreset?.cv_credit_grade === "normal" ||
            profileWithPreset?.cv_credit_grade === "unstable"
              ? profileWithPreset.cv_credit_grade
              : "good";
          const purchasePurpose =
            profileWithPreset?.cv_purchase_purpose === "investment" ||
            profileWithPreset?.cv_purchase_purpose === "both"
              ? profileWithPreset.cv_purchase_purpose
              : "residence";
          const hasPreset =
            availableCash !== null &&
            availableCash >= 0 &&
            monthlyIncome !== null &&
            monthlyIncome >= 0 &&
            ownedHouseCount >= 0;
          const latestRequest =
            ((requestRows?.[0] ?? null) as ConditionValidationRequestRow | null) ?? null;
          const requestAutoFill = profileAutoFillFromRequest(latestRequest);
          const requestAvailableCash = requestAutoFill?.availableCashManwon ?? null;
          const requestMonthlyIncome = requestAutoFill?.monthlyIncomeManwon ?? null;
          const requestHouseOwnership = requestAutoFill?.houseOwnership;
          const requestLtvScore = requestAutoFill?.ltvInternalScore ?? null;
          const source = pickLoggedInConditionSource({
            hasProfile: hasPreset,
            hasRequest: Boolean(requestAutoFill),
            hasDraft: false,
            hasSession: false,
          });

          setConditionValidationPreset(
            source === "profile" && hasPreset
              ? {
                  availableCash,
                  monthlyIncome,
                  ownedHouseCount,
                  creditGrade,
                  purchasePurpose,
                }
              : source === "request" &&
                  requestAvailableCash !== null &&
                  requestMonthlyIncome !== null &&
                  requestHouseOwnership
                ? {
                    availableCash: requestAvailableCash,
                    monthlyIncome: requestMonthlyIncome,
                    ownedHouseCount:
                      requestHouseOwnership === "one"
                        ? 1
                        : requestHouseOwnership === "two_or_more"
                          ? 2
                          : 0,
                    creditGrade:
                      requestLtvScore !== null && requestLtvScore < 40
                        ? "unstable"
                        : requestLtvScore !== null && requestLtvScore < 70
                          ? "normal"
                          : "good",
                    purchasePurpose:
                      requestAutoFill?.purchasePurposeV2 === "long_term"
                        ? "both"
                        : requestAutoFill?.purchasePurposeV2 === "investment_capital" ||
                            requestAutoFill?.purchasePurposeV2 === "investment_rent"
                          ? "investment"
                          : "residence",
                  }
                : null,
          );

          // v2 맞춤 정보 — 자동 채움 + 자동 검증용
          const validEmploymentTypes = ["employee", "self_employed", "freelancer", "other"] as const;
          const validHouseOwnerships = ["none", "one", "two_or_more"] as const;
          const validPurchasePurposes = ["residence", "investment_rent", "investment_capital", "long_term"] as const;
          const validPurchaseTimings = ["within_3months", "within_6months", "within_1year", "over_1year", "by_property"] as const;
          const validMoveinTimings = ["immediate", "within_1year", "within_2years", "within_3years", "anytime"] as const;
          const validExistingLoans = ["none", "under_1eok", "1to3eok", "over_3eok"] as const;
          const validDelinquencies = ["none", "once", "twice_or_more"] as const;
          const validCardLoanUsages = ["none", "1to2", "3_or_more"] as const;
          const validLoanRejections = ["none", "yes"] as const;
          const validIncomeRanges = ["under_200", "200to300", "300to500", "500to700", "over_700"] as const;
          const validRepayments = ["none", "under_50", "50to100", "100to200", "over_200"] as const;

          const profileBasedAutoFill: ProfileAutoFillData = {
            availableCashManwon: toFiniteInteger(profileWithPreset?.cv_available_cash_manwon),
            monthlyIncomeManwon: toFiniteInteger(profileWithPreset?.cv_monthly_income_manwon),
            monthlyExpensesManwon: toFiniteInteger(profileWithPreset?.cv_monthly_expenses_manwon),
            employmentType: validEmploymentTypes.includes(profileWithPreset?.cv_employment_type as typeof validEmploymentTypes[number])
              ? (profileWithPreset?.cv_employment_type as typeof validEmploymentTypes[number])
              : null,
            houseOwnership: validHouseOwnerships.includes(profileWithPreset?.cv_house_ownership as typeof validHouseOwnerships[number])
              ? (profileWithPreset?.cv_house_ownership as typeof validHouseOwnerships[number])
              : null,
            purchasePurposeV2: validPurchasePurposes.includes(profileWithPreset?.cv_purchase_purpose_v2 as typeof validPurchasePurposes[number])
              ? (profileWithPreset?.cv_purchase_purpose_v2 as typeof validPurchasePurposes[number])
              : null,
            purchaseTiming: validPurchaseTimings.includes(profileWithPreset?.cv_purchase_timing as typeof validPurchaseTimings[number])
              ? (profileWithPreset?.cv_purchase_timing as typeof validPurchaseTimings[number])
              : null,
            moveinTiming: validMoveinTimings.includes(profileWithPreset?.cv_movein_timing as typeof validMoveinTimings[number])
              ? (profileWithPreset?.cv_movein_timing as typeof validMoveinTimings[number])
              : null,
            ltvInternalScore: toFiniteInteger(profileWithPreset?.cv_ltv_internal_score),
            existingLoan: validExistingLoans.includes(profileWithPreset?.cv_existing_loan_amount as typeof validExistingLoans[number])
              ? (profileWithPreset?.cv_existing_loan_amount as typeof validExistingLoans[number])
              : null,
            recentDelinquency: validDelinquencies.includes(profileWithPreset?.cv_recent_delinquency as typeof validDelinquencies[number])
              ? (profileWithPreset?.cv_recent_delinquency as typeof validDelinquencies[number])
              : null,
            cardLoanUsage: validCardLoanUsages.includes(profileWithPreset?.cv_card_loan_usage as typeof validCardLoanUsages[number])
              ? (profileWithPreset?.cv_card_loan_usage as typeof validCardLoanUsages[number])
              : null,
            loanRejection: validLoanRejections.includes(profileWithPreset?.cv_loan_rejection as typeof validLoanRejections[number])
              ? (profileWithPreset?.cv_loan_rejection as typeof validLoanRejections[number])
              : null,
            monthlyIncomeRange: validIncomeRanges.includes(profileWithPreset?.cv_monthly_income_range as typeof validIncomeRanges[number])
              ? (profileWithPreset?.cv_monthly_income_range as typeof validIncomeRanges[number])
              : null,
            existingMonthlyRepayment: validRepayments.includes(profileWithPreset?.cv_existing_monthly_repayment as typeof validRepayments[number])
              ? (profileWithPreset?.cv_existing_monthly_repayment as typeof validRepayments[number])
              : null,
          };

          setProfileAutoFill(
            source === "profile" ? profileBasedAutoFill : requestAutoFill,
          );
        } else {
          setUserRole(null);
          setConditionValidationPreset(null);
          setProfileAutoFill(null);
        }

        const { data: propertyAgents } = await supabase
          .from("property_agents")
          .select(
            `
            profiles:agent_id (
              id,
              name,
              email,
              phone_number,
              agent_bio
            )
          `,
          )
          .eq("property_id", propertyId)
          .eq("status", "approved");

        if (!isMounted) return;
        const agentList = (propertyAgents || [])
          .map((pa) => {
            const row = pa as { profiles: AgentInfo | AgentInfo[] | null };
            return pickFirst(row.profiles);
          })
          .filter((profile): profile is AgentInfo => profile !== null);
        setAgents(agentList);
      } catch (err) {
        console.error("상담사 목록 조회 오류:", err);
      } finally {
        if (isMounted) setLoadingAgents(false);
      }
    }

    fetchAgents();
    return () => {
      isMounted = false;
    };
  }, [propertyId, supabase]);

  useEffect(() => {
    if (!propertyId) return;

    const handleOpenConsultation = (event: Event) => {
      const customEvent = event as CustomEvent<{ propertyId?: number }>;
      const targetPropertyId = customEvent.detail?.propertyId;
      if (targetPropertyId !== propertyId) return;

      if (!isLoggedIn) {
        router.push("/auth/login");
        return;
      }
      if (isBookingBlockedRole || !hasBookableAgent) return;
      handleConsultationClick();
    };

    window.addEventListener("oboon:open-consultation", handleOpenConsultation);
    return () => {
      window.removeEventListener(
        "oboon:open-consultation",
        handleOpenConsultation,
      );
    };
  }, [
    handleConsultationClick,
    hasBookableAgent,
    isBookingBlockedRole,
    isLoggedIn,
    propertyId,
    router,
  ]);

  useEffect(() => {
    const findSlot = () =>
      document.getElementById("offering-condition-validation-slot");

    const initialSlot = findSlot();
    if (initialSlot) {
      setConditionValidationSlot(initialSlot);
      return;
    }

    const observer = new MutationObserver(() => {
      const nextSlot = findSlot();
      if (!nextSlot) return;
      setConditionValidationSlot(nextSlot);
      observer.disconnect();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  const conditionValidationCard = (
    <ConditionValidationCard
      propertyId={propertyId}
      propertyName={propertyName}
      presetCustomer={resolvedConditionPreset}
      profileAutoFill={isLoggedIn ? profileAutoFill : null}
      isLoggedIn={isLoggedIn}
      onAlternativeRecommendRequest={openAlternativeOfferings}
      onLoginRequest={() => router.push("/auth/login")}
    />
  );

  const timelineSummarySteps = useMemo(() => {
    if (!timeline) return [];

    return [
      {
        label: "모집공고",
        value: fmtDateTbd(timeline.announcement_date),
        status: getStepStatus(timeline.announcement_date),
      },
      {
        label: "청약 접수",
        value: fmtRangeTbd(timeline.application_start, timeline.application_end),
        status: getStepStatus(timeline.application_start, timeline.application_end),
      },
      {
        label: "당첨자 발표",
        value: fmtDateTbd(timeline.winner_announce),
        status: getStepStatus(timeline.winner_announce),
      },
      {
        label: "계약",
        value: fmtRangeTbd(timeline.contract_start, timeline.contract_end),
        status: getStepStatus(timeline.contract_start, timeline.contract_end),
      },
      {
        label: "입주 예정",
        value: pickFirstNonEmpty(timeline.move_in_text) ?? fmtDateTbd(timeline.move_in_date),
        status: getStepStatus(timeline.move_in_date),
      },
    ];
  }, [timeline]);

  return (
    <>
      {/* =========================
          Desktop (lg+) sticky card
         ========================= */}
      <div className="hidden lg:block space-y-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="ob-typo-h3 text-(--oboon-text-title)">
              상담 예약하기
            </div>
            <div className="flex items-center gap-2">
              {propertyId ? (
                <ScrapButton
                  propertyId={propertyId}
                  initialScrapped={initialScrapped}
                  isLoggedIn={isLoggedIn}
                  variant="full"
                />
              ) : null}
            </div>
          </div>
          {loadingAgents ? (
            <div className="mt-4 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4 animate-pulse">
              <div className="h-4 w-28 rounded-full bg-(--oboon-bg-subtle)" />
              <div className="mt-3 h-9 w-full rounded-full bg-(--oboon-bg-subtle)" />
            </div>
          ) : hasBookableAgent ? (
            <div className="mt-2 space-y-1">
              <div className="ob-typo-body text-(--oboon-primary)">
                상담 가능 상담사 {agents.length}명
              </div>
              <div className="ob-typo-body text-(--oboon-text-title)">
                예약 버튼을 누른 뒤 상담사와 시간을 선택해주세요.
              </div>
              <Button
                className="mt-2 w-full"
                variant="primary"
                size="md"
                shape="pill"
                disabled={isBookingBlockedRole}
                onClick={openConsultationFlow}
              >
                {!isLoggedIn
                  ? "로그인 후 예약하기"
                  : isBookingBlockedRole
                    ? "일반 회원만 예약 가능"
                    : "예약하기"}
              </Button>
              {isBookingBlockedRole ? (
                <div className="ob-typo-caption text-(--oboon-text-muted)">
                  관리자/상담사 계정은 상담 예약을 할 수 없습니다.
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-4 py-6 text-center ob-typo-caption text-(--oboon-text-muted)">
              현재 상담 가능한 상담사가 없습니다
            </div>
          )}
        </Card>

        {timelineSummarySteps.length > 0 ? (
          <Card className="hidden p-4 lg:block">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 text-(--oboon-text-muted)">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <div className="ob-typo-h3 text-(--oboon-text-title)">분양 일정</div>
                <div className="ob-typo-caption text-(--oboon-text-muted)">
                  공고부터 계약, 입주 예정까지 핵심 일정만 요약합니다.
                </div>
              </div>
            </div>

            <div className="mt-3">
              {(() => {
                const dotStyle = (status: "done" | "active" | "upcoming") =>
                  status === "done"
                    ? {
                        backgroundColor: "transparent",
                        borderColor: "var(--oboon-safe)",
                        color: "var(--oboon-safe)",
                      }
                    : status === "active"
                      ? {
                          backgroundColor: "transparent",
                          borderColor: "var(--oboon-primary)",
                          color: "var(--oboon-primary)",
                        }
                      : {
                          backgroundColor: "transparent",
                          borderColor: "var(--oboon-border-default)",
                          color: "var(--oboon-text-muted)",
                        };

                const lineColor = (status: "done" | "active" | "upcoming") =>
                  status === "done"
                    ? "var(--oboon-safe)"
                    : "var(--oboon-border-default)";

                const labelColor = (status: "done" | "active" | "upcoming") =>
                  status === "active"
                    ? "var(--oboon-primary)"
                    : status === "done"
                      ? "var(--oboon-text-primary)"
                      : "var(--oboon-text-muted)";

                const dateColor = (status: "done" | "active" | "upcoming") =>
                  status === "upcoming"
                    ? "var(--oboon-text-muted)"
                    : "var(--oboon-text-secondary)";

                const DotIcon = ({
                  status,
                  idx,
                }: {
                  status: "done" | "active" | "upcoming";
                  idx: number;
                }) =>
                  status === "done" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : status === "active" ? (
                    <Clock className="h-3.5 w-3.5" />
                  ) : (
                    <span className="ob-typo-caption font-bold">{idx + 1}</span>
                  );

                return (
                  <div>
                    {timelineSummarySteps.map((step, idx) => (
                      <div key={step.label} className="flex gap-3">
                        <div className="flex w-6 flex-col items-center shrink-0">
                          <div
                            className="grid h-6 w-6 place-items-center rounded-full border-2"
                            style={dotStyle(step.status)}
                          >
                            <DotIcon status={step.status} idx={idx} />
                          </div>
                          {idx < timelineSummarySteps.length - 1 ? (
                            <div
                              className="mt-1 w-px flex-1"
                              style={{ backgroundColor: lineColor(step.status), minHeight: 28 }}
                            />
                          ) : null}
                        </div>

                        <div className={idx < timelineSummarySteps.length - 1 ? "min-w-0 flex-1 pb-5" : "min-w-0 flex-1"}>
                          <div
                            className="ob-typo-body2"
                            style={{ color: labelColor(step.status) }}
                          >
                            {step.label}
                          </div>
                          <div
                            className="mt-0.5 ob-typo-caption"
                            style={{ color: dateColor(step.status) }}
                          >
                            {step.value}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </Card>
        ) : null}
      </div>

      {conditionValidationSlot
        ? createPortal(conditionValidationCard, conditionValidationSlot)
        : null}

      {/* =========================
          Mobile bottom fixed CTA
         ========================= */}
      <div className="lg:hidden">
        <div
          className={[
            "fixed inset-x-0 bottom-0 z-50",
            "border-t border-(--oboon-border-default)",
            "bg-(--oboon-bg-surface)/90 backdrop-blur",
            "pb-[env(safe-area-inset-bottom)]",
          ].join(" ")}
        >
          <div className="mx-auto w-full max-w-300 px-5 py-3">
            <div className="flex items-center gap-2">
              {propertyId ? (
                <ScrapButton
                  propertyId={propertyId}
                  initialScrapped={initialScrapped}
                  isLoggedIn={isLoggedIn}
                  variant="icon"
                />
              ) : null}
              {hasBookableAgent ? (
                <Button
                  className="flex-1"
                  variant="primary"
                  disabled={isBookingBlockedRole}
                  onClick={openConsultationFlow}
                >
                  {!isLoggedIn
                    ? "로그인 후 상담 신청"
                    : isBookingBlockedRole
                      ? "일반 회원만 예약 가능"
                      : "상담 신청"}
                </Button>
              ) : (
                <div className="flex-1 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-2.5 text-center ob-typo-caption text-(--oboon-text-muted)">
                  상담 가능 상담사 없음
                </div>
              )}
            </div>
            {hasBookableAgent && isBookingBlockedRole ? (
              <div className="mt-2 text-center ob-typo-caption text-(--oboon-text-muted)">
                관리자/상담사 계정은 예약할 수 없습니다.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 상담 신청 모달 */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => {
          setIsBookingOpen(false);
        }}
        propertyId={propertyId}
        propertyName={propertyName}
        propertyImageUrl={propertyImageUrl}
      />

      <Modal
        open={isRecommendModalOpen}
        onClose={() => setIsRecommendModalOpen(false)}
        size="lg"
        panelClassName="w-[min(100%-2rem,520px)]"
      >
        <div className="space-y-3">
          <div className="pr-8">
            <h3 className="ob-typo-h3 text-(--oboon-text-title)">조건 맞춤 추천 현장</h3>
            <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
              입력한 조건을 기준으로 역산한 추천 결과입니다.
            </p>
          </div>

          {recommendItems.length === 0 ? (
            <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-4 py-5 text-center">
              <p className="ob-typo-body text-(--oboon-text-muted)">
                조건에 맞는 추천 현장을 찾지 못했어요.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div
                className={
                  recommendItems.length <= 2
                    ? "pb-1"
                    : "overflow-x-auto overscroll-x-contain pb-1 [touch-action:pan-x] [-webkit-overflow-scrolling:touch]"
                }
              >
                <div className={recommendItems.length <= 2 ? "grid grid-cols-2 gap-3" : "flex gap-3"}>
                  {recommendItems.map((item) => {
                    const grade = gradeMeta(item.final_grade);
                    const imageUrl = item.image_url;
                    const hasImage = isLikelyImageUrl(imageUrl);
                    return (
                      <Card
                        key={item.property_id}
                        className={
                          recommendItems.length <= 2
                            ? "w-full overflow-hidden p-0"
                            : "w-60 shrink-0 overflow-hidden p-0"
                        }
                      >
                        <div className="flex h-full flex-col">
                          <div className="relative h-40 w-full border-b border-(--oboon-border-default) bg-(--oboon-bg-subtle)">
                            {hasImage && imageUrl ? (
                              <Image
                                src={imageUrl}
                                alt={item.property_name ?? `현장 ${item.property_id}`}
                                fill
                                sizes="220px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-(--oboon-bg-subtle) to-(--oboon-bg-surface) ob-typo-caption text-(--oboon-text-muted)">
                                이미지 없음
                              </div>
                            )}
                            <div className="absolute left-2 top-2">
                              <Badge
                                variant={grade.badgeVariant}
                                className={`px-2 py-0.5 ob-typo-caption ${
                                  item.final_grade === "GREEN"
                                    ? "border-(--oboon-safe-border) bg-(--oboon-safe-bg) text-(--oboon-safe)"
                                    : ""
                                }`}
                              >
                                {grade.label}
                              </Badge>
                              {typeof item.total_score === "number" ? (
                                <Badge variant="primary" className="ml-1 px-2 py-0.5 ob-typo-caption">
                                  매칭률 {Math.round(item.total_score)}%
                                </Badge>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex min-h-0 flex-1 flex-col px-2.5 pt-2.5 pb-1.5">
                            <div className="min-w-0 min-h-[3.25rem]">
                              <h4
                                className="ob-typo-h3 block overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-(--oboon-text-title)"
                                title={item.property_name ?? `현장 #${item.property_id}`}
                              >
                                {item.property_name ?? `현장 #${item.property_id}`}
                              </h4>
                              <p className="mt-0.5 ob-typo-caption text-(--oboon-text-muted)">
                                {statusLabel(item.status)}
                                {item.property_type ? ` · ${item.property_type}` : ""}
                              </p>
                            </div>

                            {item.show_detailed_metrics !== false ? (
                              <div className="mt-2 grid auto-rows-fr grid-cols-2 gap-1.5">
                                <div className="rounded-md border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-1.5">
                                  <div className="ob-typo-caption text-(--oboon-text-muted)">최소 현금</div>
                                  <div className="mt-0.5 ob-typo-body2 font-semibold text-(--oboon-text-title)">
                                    {formatManwonWithEok(item.metrics.min_cash)}
                                  </div>
                                </div>
                                <div className="rounded-md border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-1.5">
                                  <div className="ob-typo-caption text-(--oboon-text-muted)">권장 현금</div>
                                  <div className="mt-0.5 ob-typo-body2 font-semibold text-(--oboon-text-title)">
                                    {formatManwonWithEok(item.metrics.recommended_cash)}
                                  </div>
                                </div>
                                <div className="rounded-md border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-1.5">
                                  <div className="ob-typo-caption text-(--oboon-text-muted)">예상 월상환</div>
                                  <div className="mt-0.5 ob-typo-body2 font-semibold text-(--oboon-text-title)">
                                    {formatManwonWithEok(item.metrics.monthly_payment_est)}
                                  </div>
                                </div>
                                <div className="rounded-md border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-1.5">
                                  <div className="ob-typo-caption text-(--oboon-text-muted)">월 부담률</div>
                                  <div className="mt-0.5 ob-typo-body2 font-semibold text-(--oboon-text-title)">
                                    {item.metrics.monthly_burden_percent == null
                                      ? "계산 불가"
                                      : formatPercent(item.metrics.monthly_burden_percent)}
                                  </div>
                                </div>
                              </div>
                            ) : null}

                            <Button
                              className={`${item.show_detailed_metrics !== false ? "mt-3" : "mt-2"} w-full`}
                              size="sm"
                              onClick={() => {
                                setIsRecommendModalOpen(false);
                                router.push(`/offerings/${item.property_id}`);
                              }}
                            >
                              현장 보기
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
