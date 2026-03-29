"use client";

// features/offerings/detail/OfferingDetailRight.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createPortal } from "react-dom";
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
import {
  normalizeOfferingStatusValue,
  statusLabelOf,
} from "@/features/offerings/domain/offering.constants";
import ScrapButton from "@/features/offerings/components/ScrapButton";

interface OfferingDetailRightProps {
  propertyId?: number;
  propertyName?: string;
  propertyImageUrl?: string;
  hasApprovedAgent?: boolean;
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

export default function OfferingDetailRight({
  propertyId,
  propertyName,
  propertyImageUrl,
  hasApprovedAgent = false,
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
  const [mobileConditionSlot, setMobileConditionSlot] = useState<HTMLElement | null>(null);
  const [initialScrapped, setInitialScrapped] = useState(false);
  const isLoggedIn = Boolean(user);
  const isBookingBlockedRole = userRole === "agent" || userRole === "admin";
  const hasBookableAgent = hasApprovedAgent && agents.length > 0;

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

          const { data: profileWithPreset } = await supabase
            .from("profiles")
            .select(
              "role, cv_available_cash_manwon, cv_monthly_income_manwon, cv_owned_house_count, cv_credit_grade, cv_purchase_purpose, cv_employment_type, cv_monthly_expenses_manwon, cv_house_ownership, cv_purchase_purpose_v2, cv_purchase_timing, cv_movein_timing, cv_ltv_internal_score, cv_existing_loan_amount, cv_recent_delinquency, cv_card_loan_usage, cv_loan_rejection, cv_monthly_income_range, cv_existing_monthly_repayment",
            )
            .eq("id", currentUser.id)
            .maybeSingle();
          const { data: profileRoleOnly } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", currentUser.id)
            .maybeSingle();
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
          setConditionValidationPreset(
            hasPreset
              ? {
                  availableCash,
                  monthlyIncome,
                  ownedHouseCount,
                  creditGrade,
                  purchasePurpose,
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

          setProfileAutoFill({
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
          });
        } else {
          setUserRole(null);
          setConditionValidationPreset(null);
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
    setMobileConditionSlot(
      document.getElementById("offering-mobile-condition-validation-slot"),
    );
  }, []);

  const conditionValidationCard = (
    <ConditionValidationCard
      propertyId={propertyId}
      propertyName={propertyName}
      presetCustomer={resolvedConditionPreset}
      profileAutoFill={isLoggedIn && userRole === "user" ? profileAutoFill : null}
      isLoggedIn={isLoggedIn}
      hasBookableAgent={hasBookableAgent}
      isBookingBlockedRole={isBookingBlockedRole}
      onConsultationRequest={openConsultationFlow}
      onAlternativeRecommendRequest={openAlternativeOfferings}
      onLoginRequest={() => router.push("/auth/login")}
    />
  );

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

        {conditionValidationCard}
      </div>

      {mobileConditionSlot
        ? createPortal(conditionValidationCard, mobileConditionSlot)
        : <div className="mt-4 lg:hidden">{conditionValidationCard}</div>}

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
