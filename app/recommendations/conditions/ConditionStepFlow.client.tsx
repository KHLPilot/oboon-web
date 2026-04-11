"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

import Button from "@/components/ui/Button";
import { createSupabaseClient } from "@/lib/supabaseClient";
import {
  clearConditionSession,
  loadConditionSession,
  saveConditionSession,
  type ConditionSessionSnapshot,
} from "@/features/condition-validation/lib/sessionCondition";
import { saveRecommendationPrefetchCache } from "@/features/recommendations/lib/recommendationPrefetchCache";
import ConditionWizardStep1 from "@/features/recommendations/components/ConditionWizardStep1";
import ConditionWizardStep2 from "@/features/recommendations/components/ConditionWizardStep2";
import ConditionWizardStep3 from "@/features/recommendations/components/ConditionWizardStep3";
import type { RecommendationCondition } from "@/features/recommendations/hooks/useRecommendations";
import {
  createEmptyRecommendationCondition,
  creditGradeFromLtvInternalScore,
} from "@/features/condition-validation/domain/conditionState";

const DEFAULT_CONDITION: RecommendationCondition =
  createEmptyRecommendationCondition();

type SavedConditionPresetState = {
  availableCash: number | null;
  monthlyIncome: number | null;
  monthlyExpenses: number | null;
  employmentType: RecommendationCondition["employmentType"];
  houseOwnership: RecommendationCondition["houseOwnership"];
  purchasePurposeV2: RecommendationCondition["purchasePurposeV2"];
  purchaseTiming: RecommendationCondition["purchaseTiming"];
  moveinTiming: RecommendationCondition["moveinTiming"];
  ltvInternalScore: number;
  existingLoan: RecommendationCondition["existingLoan"];
  recentDelinquency: RecommendationCondition["recentDelinquency"];
  cardLoanUsage: RecommendationCondition["cardLoanUsage"];
  loanRejection: RecommendationCondition["loanRejection"];
  monthlyIncomeRange: RecommendationCondition["monthlyIncomeRange"];
  existingMonthlyRepayment: RecommendationCondition["existingMonthlyRepayment"];
};

function conditionFromSession(
  snapshot: ConditionSessionSnapshot,
  prev: RecommendationCondition = DEFAULT_CONDITION,
): RecommendationCondition {
  return {
    ...prev,
    availableCash: Number.parseInt(snapshot.availableCash.replaceAll(",", ""), 10) || 0,
    monthlyIncome: Number.parseInt(snapshot.monthlyIncome.replaceAll(",", ""), 10) || 0,
    monthlyExpenses: Number.parseInt(snapshot.monthlyExpenses.replaceAll(",", ""), 10) || 0,
    employmentType: snapshot.employmentType,
    houseOwnership: snapshot.houseOwnership,
    purchasePurposeV2: snapshot.purchasePurposeV2,
    purchaseTiming: snapshot.purchaseTiming,
    moveinTiming: snapshot.moveinTiming,
    ltvInternalScore: snapshot.ltvInternalScore,
    creditGrade: creditGradeFromLtvInternalScore(snapshot.ltvInternalScore),
    existingLoan: snapshot.existingLoan,
    recentDelinquency: snapshot.recentDelinquency,
    cardLoanUsage: snapshot.cardLoanUsage,
    loanRejection: snapshot.loanRejection,
    monthlyIncomeRange: snapshot.monthlyIncomeRange,
    existingMonthlyRepayment: snapshot.existingMonthlyRepayment,
    regions: prev.regions,
  };
}

function buildConditionSession(condition: RecommendationCondition): ConditionSessionSnapshot {
  return {
    availableCash: condition.availableCash > 0 ? condition.availableCash.toLocaleString("ko-KR") : "",
    monthlyIncome: condition.monthlyIncome > 0 ? condition.monthlyIncome.toLocaleString("ko-KR") : "",
    monthlyExpenses: condition.monthlyExpenses > 0 ? condition.monthlyExpenses.toLocaleString("ko-KR") : "",
    employmentType: condition.employmentType,
    houseOwnership: condition.houseOwnership,
    purchasePurposeV2: condition.purchasePurposeV2,
    purchaseTiming: condition.purchaseTiming,
    moveinTiming: condition.moveinTiming,
    ltvInternalScore: condition.ltvInternalScore,
    existingLoan: condition.existingLoan,
    recentDelinquency: condition.recentDelinquency,
    cardLoanUsage: condition.cardLoanUsage,
    loanRejection: condition.loanRejection,
    monthlyIncomeRange: condition.monthlyIncomeRange,
    existingMonthlyRepayment: condition.existingMonthlyRepayment,
  };
}

function saveCondition(nextCondition: RecommendationCondition) {
  saveConditionSession(buildConditionSession(nextCondition));
}

function sanitizeGuestCondition(condition: RecommendationCondition): RecommendationCondition {
  return {
    ...condition,
    employmentType: null,
    monthlyExpenses: 0,
    purchaseTiming: null,
    moveinTiming: null,
    ltvInternalScore: condition.ltvInternalScore > 0 ? condition.ltvInternalScore : 0,
    existingLoan: null,
    recentDelinquency: null,
    cardLoanUsage: null,
    loanRejection: null,
    monthlyIncomeRange: null,
    existingMonthlyRepayment: null,
    regions: [],
    creditGrade: creditGradeFromLtvInternalScore(condition.ltvInternalScore),
  };
}

function buildSavedConditionPreset(
  profile: SavedConditionPresetState | null,
): RecommendationCondition | null {
  if (!profile) return null;

  return {
    ...DEFAULT_CONDITION,
    availableCash: profile.availableCash ?? 0,
    monthlyIncome: profile.monthlyIncome ?? 0,
    monthlyExpenses: profile.monthlyExpenses ?? 0,
    employmentType: profile.employmentType,
    houseOwnership: profile.houseOwnership,
    purchasePurposeV2: profile.purchasePurposeV2,
    purchaseTiming: profile.purchaseTiming,
    moveinTiming: profile.moveinTiming,
    ltvInternalScore: profile.ltvInternalScore,
    creditGrade: creditGradeFromLtvInternalScore(profile.ltvInternalScore),
    existingLoan: profile.existingLoan,
    recentDelinquency: profile.recentDelinquency,
    cardLoanUsage: profile.cardLoanUsage,
    loanRejection: profile.loanRejection,
    monthlyIncomeRange: profile.monthlyIncomeRange,
    existingMonthlyRepayment: profile.existingMonthlyRepayment,
    regions: [],
  };
}

function isSameSavedCondition(
  current: RecommendationCondition,
  saved: RecommendationCondition | null,
): boolean {
  if (!saved) return false;

  return (
    current.availableCash === saved.availableCash &&
    current.monthlyIncome === saved.monthlyIncome &&
    current.monthlyExpenses === saved.monthlyExpenses &&
    current.employmentType === saved.employmentType &&
    current.houseOwnership === saved.houseOwnership &&
    current.purchasePurposeV2 === saved.purchasePurposeV2 &&
    current.purchaseTiming === saved.purchaseTiming &&
    current.moveinTiming === saved.moveinTiming &&
    current.ltvInternalScore === saved.ltvInternalScore &&
    current.existingLoan === saved.existingLoan &&
    current.recentDelinquency === saved.recentDelinquency &&
    current.cardLoanUsage === saved.cardLoanUsage &&
    current.loanRejection === saved.loanRejection &&
    current.monthlyIncomeRange === saved.monthlyIncomeRange &&
    current.existingMonthlyRepayment === saved.existingMonthlyRepayment
  );
}

function resolveLoginNext(step: 1 | 2 | 3) {
  return `/recommendations/conditions/step/${step}`;
}

type StepFlowProps = {
  step: 1 | 2 | 3;
  progressive?: boolean;
};

export function ConditionStepFlow({ step, progressive = true }: StepFlowProps) {
  const router = useRouter();
  const [condition, setCondition] = useState<RecommendationCondition>(() => {
    const snapshot = loadConditionSession();
    return snapshot ? conditionFromSession(snapshot) : DEFAULT_CONDITION;
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthResolved, setIsAuthResolved] = useState(false);
  const [savedConditionPreset, setSavedConditionPreset] =
    useState<RecommendationCondition | null>(null);

  useEffect(() => {
    const supabase = createSupabaseClient();
    let alive = true;

    async function loadAuth() {
      const { data } = await supabase.auth.getUser();
      if (!alive) return;
      const loggedIn = Boolean(data.user);
      setIsLoggedIn(loggedIn);
      setIsAuthResolved(true);
      if (!loggedIn) {
        setSavedConditionPreset(null);
      }
    }

    void loadAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      const loggedIn = Boolean(session?.user);
      setIsLoggedIn(loggedIn);
      setIsAuthResolved(true);
      if (!loggedIn) {
        setSavedConditionPreset(null);
      }
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isAuthResolved || !isLoggedIn) return;

    const supabase = createSupabaseClient();
    let alive = true;

    async function loadSavedPreset() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!alive || !user) {
        setSavedConditionPreset(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "cv_available_cash_manwon, cv_monthly_income_manwon, cv_monthly_expenses_manwon, cv_employment_type, cv_house_ownership, cv_purchase_purpose_v2, cv_purchase_timing, cv_movein_timing, cv_ltv_internal_score, cv_existing_loan_amount, cv_recent_delinquency, cv_card_loan_usage, cv_loan_rejection, cv_monthly_income_range, cv_existing_monthly_repayment",
        )
        .eq("id", user.id)
        .maybeSingle();

      if (!alive || error || !data) {
        setSavedConditionPreset(null);
        return;
      }

      const hasAnyPreset =
        data.cv_available_cash_manwon != null ||
        data.cv_monthly_income_manwon != null ||
        data.cv_monthly_expenses_manwon != null ||
        data.cv_employment_type != null ||
        data.cv_house_ownership != null ||
        data.cv_purchase_purpose_v2 != null ||
        data.cv_purchase_timing != null ||
        data.cv_movein_timing != null ||
        (data.cv_ltv_internal_score ?? 0) > 0 ||
        data.cv_existing_loan_amount != null ||
        data.cv_recent_delinquency != null ||
        data.cv_card_loan_usage != null ||
        data.cv_loan_rejection != null ||
        data.cv_monthly_income_range != null ||
        data.cv_existing_monthly_repayment != null;

      if (!hasAnyPreset) {
        setSavedConditionPreset(null);
        return;
      }

      setSavedConditionPreset(
        buildSavedConditionPreset({
          availableCash: data.cv_available_cash_manwon ?? null,
          monthlyIncome: data.cv_monthly_income_manwon ?? null,
          monthlyExpenses: data.cv_monthly_expenses_manwon ?? null,
          employmentType: data.cv_employment_type ?? null,
          houseOwnership: data.cv_house_ownership ?? null,
          purchasePurposeV2: data.cv_purchase_purpose_v2 ?? null,
          purchaseTiming: data.cv_purchase_timing ?? null,
          moveinTiming: data.cv_movein_timing ?? null,
          ltvInternalScore: data.cv_ltv_internal_score ?? 0,
          existingLoan: data.cv_existing_loan_amount ?? null,
          recentDelinquency: data.cv_recent_delinquency ?? null,
          cardLoanUsage: data.cv_card_loan_usage ?? null,
          loanRejection: data.cv_loan_rejection ?? null,
          monthlyIncomeRange: data.cv_monthly_income_range ?? null,
          existingMonthlyRepayment: data.cv_existing_monthly_repayment ?? null,
        }),
      );
    }

    void loadSavedPreset();

    return () => {
      alive = false;
    };
  }, [isAuthResolved, isLoggedIn]);

  const handleChange = useCallback((patch: Partial<RecommendationCondition>) => {
    setCondition((prev) => {
      const next = { ...prev, ...patch };
      saveCondition(next);
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setCondition(DEFAULT_CONDITION);
    clearConditionSession();
    router.push("/recommendations/conditions/step/1");
  }, [router]);

  const handleGoLogin = useCallback(() => {
    saveCondition(condition);
    router.push(`/auth/login?next=${encodeURIComponent(resolveLoginNext(step))}`);
  }, [condition, router, step]);

  const isConditionDirty = useMemo(
    () => !isSameSavedCondition(condition, savedConditionPreset),
    [condition, savedConditionPreset],
  );

  const hasSavedConditionPreset = savedConditionPreset !== null;

  const handleRestoreDefaultCondition = useCallback(() => {
    if (!savedConditionPreset) return false;
    setCondition(savedConditionPreset);
    saveCondition(savedConditionPreset);
    return true;
  }, [savedConditionPreset]);

  if (step === 1) {
    return (
      <ConditionWizardStep1
        condition={condition}
        isLoggedIn={isLoggedIn}
        hasSavedConditionPreset={hasSavedConditionPreset}
        isConditionDirty={isConditionDirty}
        onRestoreDefault={handleRestoreDefaultCondition}
        onChange={handleChange}
        onNext={() => router.push("/recommendations/conditions/step/2")}
        onReset={handleReset}
        progressive={progressive}
      />
    );
  }

  if (step === 2) {
    return (
      <ConditionWizardStep2
        condition={condition}
        isLoggedIn={isLoggedIn}
        isAuthResolved={isAuthResolved}
        hasSavedConditionPreset={hasSavedConditionPreset}
        isConditionDirty={isConditionDirty}
        onRestoreDefault={handleRestoreDefaultCondition}
        onChange={handleChange}
        onNext={() => router.push("/recommendations/conditions/step/3")}
        onBack={() => router.push("/recommendations/conditions/step/1")}
        onLoginAndSave={handleGoLogin}
        onReset={handleReset}
        progressive={progressive}
      />
    );
  }

  return (
    <ConditionWizardStep3
      condition={condition}
      isLoggedIn={isLoggedIn}
      isAuthResolved={isAuthResolved}
      hasSavedConditionPreset={hasSavedConditionPreset}
      isConditionDirty={isConditionDirty}
      onRestoreDefault={handleRestoreDefaultCondition}
      onChange={handleChange}
      onBack={() => router.push("/recommendations/conditions/step/2")}
      onFinish={() => router.push("/recommendations/conditions/done")}
      onReset={handleReset}
      onSave={handleGoLogin}
      progressive={progressive}
    />
  );
}

export function ConditionDoneFlow() {
  const router = useRouter();
  const [condition, setCondition] = useState<RecommendationCondition | null>(null);
  const [hasLoadedCondition, setHasLoadedCondition] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthResolved, setIsAuthResolved] = useState(false);
  const autoRedirectTimerRef = useRef<number | null>(null);
  const prefetchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let alive = true;

    async function loadCondition() {
      const snapshot = loadConditionSession();
      if (!alive) return;
      setCondition(snapshot ? conditionFromSession(snapshot) : null);
      setHasLoadedCondition(true);
    }

    void loadCondition();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedCondition) return;

    if (!condition) {
      router.replace("/recommendations/conditions/step/1");
      return;
    }

    const supabase = createSupabaseClient();
    let alive = true;

    async function loadAuth() {
      const { data } = await supabase.auth.getUser();
      if (!alive) return;
      setIsLoggedIn(Boolean(data.user));
      setIsAuthResolved(true);
    }

    void loadAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setIsLoggedIn(Boolean(session?.user));
      setIsAuthResolved(true);
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [condition, hasLoadedCondition, router]);

  useEffect(() => {
    if (!hasLoadedCondition || !isAuthResolved || !condition) return;

    prefetchAbortRef.current?.abort();
    const controller = new AbortController();
    prefetchAbortRef.current = controller;
    let alive = true;
    const currentCondition = condition;

    async function prefetchRecommendations() {
      const prefetchCondition = isLoggedIn
        ? currentCondition
        : sanitizeGuestCondition(currentCondition);
      const resolvedCreditGrade =
        prefetchCondition.creditGrade ??
        creditGradeFromLtvInternalScore(prefetchCondition.ltvInternalScore);
      if (resolvedCreditGrade === null) return;

      try {
        const response = await fetch("/api/condition-validation/recommend", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            customer: {
              available_cash: prefetchCondition.availableCash,
              monthly_income: prefetchCondition.monthlyIncome,
              credit_grade: resolvedCreditGrade,
              monthly_expenses: prefetchCondition.monthlyExpenses,
              employment_type: prefetchCondition.employmentType ?? "employee",
              house_ownership: prefetchCondition.houseOwnership ?? "none",
              purchase_purpose_v2: prefetchCondition.purchasePurposeV2 ?? "residence",
              purchase_timing: prefetchCondition.purchaseTiming ?? "over_1year",
              movein_timing: prefetchCondition.moveinTiming ?? "anytime",
              ltv_internal_score: prefetchCondition.ltvInternalScore,
              existing_monthly_repayment:
                prefetchCondition.existingMonthlyRepayment ?? "none",
            },
            options: {
              guest_mode: !isLoggedIn,
              include_red: false,
              limit: 60,
            },
          }),
        });

        const payload = (await response.json().catch(() => null)) as
          | { ok?: boolean; recommendations?: unknown[] }
          | null;

        if (
          !alive ||
          controller.signal.aborted ||
          !response.ok ||
          !payload?.ok ||
          !Array.isArray(payload.recommendations)
        ) {
          return;
        }

        saveRecommendationPrefetchCache(
          prefetchCondition,
          isLoggedIn,
          payload.recommendations,
        );
      } catch {
        // Prefetch is best-effort only.
      }
    }

    void prefetchRecommendations();

    return () => {
      alive = false;
      controller.abort();
    };
  }, [condition, hasLoadedCondition, isAuthResolved, isLoggedIn]);

  useEffect(() => {
    if (!condition || !hasLoadedCondition || !isAuthResolved) return;

    if (autoRedirectTimerRef.current !== null) {
      window.clearTimeout(autoRedirectTimerRef.current);
    }

    autoRedirectTimerRef.current = window.setTimeout(() => {
      window.location.replace("/recommendations");
    }, 3000);

    return () => {
      if (autoRedirectTimerRef.current !== null) {
        window.clearTimeout(autoRedirectTimerRef.current);
        autoRedirectTimerRef.current = null;
      }
    };
  }, [condition, hasLoadedCondition, isAuthResolved]);

  if (!hasLoadedCondition || !condition) {
    return (
      <div className="absolute inset-0 flex items-center justify-center px-4 text-center">
        <div className="flex max-w-md flex-col items-center gap-4 -translate-y-6" aria-busy="true" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center px-4 text-center">
      <div className="flex max-w-md flex-col items-center gap-4 -translate-y-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-(--oboon-primary)/10 text-(--oboon-primary)">
          <Check className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <div className="ob-typo-h2 text-(--oboon-text-title)">조건이 입력되었어요</div>
          <p className="ob-typo-body text-(--oboon-text-muted)">
            {isLoggedIn
              ? "로그인된 계정 기준으로 맞춤 조건을 반영했습니다."
              : "조건 입력은 저장됐고, 다음에도 이어서 사용할 수 있어요."}
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          shape="pill"
          onClick={() => router.replace("/recommendations")}
        >
          추천 결과 보기
        </Button>
        <p className="ob-typo-caption text-(--oboon-text-muted)">
          3초 뒤 자동으로 이동합니다.
        </p>
      </div>
    </div>
  );
}
