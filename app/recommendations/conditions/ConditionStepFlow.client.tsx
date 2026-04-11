"use client";

import { useCallback, useEffect, useState } from "react";
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

  useEffect(() => {
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
  }, []);

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

  if (step === 1) {
    return (
      <ConditionWizardStep1
        condition={condition}
        isLoggedIn={isLoggedIn}
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
      onChange={handleChange}
      onBack={() => router.push("/recommendations/conditions/step/2")}
      onFinish={() => router.push("/recommendations/conditions/done")}
      onReset={handleReset}
      onSave={handleGoLogin}
      progressive={progressive}
    />
  );
}

type DoneFlowProps = {
  onSaved?: () => void;
};

function buildProfilePayload(condition: RecommendationCondition) {
  return {
    cv_available_cash_manwon: condition.availableCash || null,
    cv_monthly_income_manwon: condition.monthlyIncome || null,
    cv_employment_type: condition.employmentType,
    cv_monthly_expenses_manwon: condition.monthlyExpenses || null,
    cv_house_ownership: condition.houseOwnership,
    cv_purchase_purpose_v2: condition.purchasePurposeV2,
    cv_purchase_timing: condition.purchaseTiming,
    cv_movein_timing: condition.moveinTiming,
    cv_ltv_internal_score: condition.ltvInternalScore > 0 ? condition.ltvInternalScore : null,
    cv_existing_loan_amount: condition.existingLoan,
    cv_recent_delinquency: condition.recentDelinquency,
    cv_card_loan_usage: condition.cardLoanUsage,
    cv_loan_rejection: condition.loanRejection,
    cv_monthly_income_range: condition.monthlyIncomeRange,
    cv_existing_monthly_repayment: condition.existingMonthlyRepayment,
  };
}

export function ConditionDoneFlow({ onSaved }: DoneFlowProps) {
  const router = useRouter();
  const [condition] = useState<RecommendationCondition | null>(() => {
    const snapshot = loadConditionSession();
    return snapshot ? conditionFromSession(snapshot) : null;
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
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
    }

    void loadAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setIsLoggedIn(Boolean(session?.user));
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [condition, router]);

  useEffect(() => {
    if (!condition || !isLoggedIn || isFinished || isSaving) return;

    let alive = true;
    const supabase = createSupabaseClient();
    const currentCondition = condition;

    async function persistProfile() {
      setIsSaving(true);
      setErrorMessage(null);

      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData.user;
        if (!user) {
          if (alive) setIsFinished(true);
          return;
        }

        const { error } = await supabase
          .from("profiles")
          .update(buildProfilePayload(currentCondition))
          .eq("id", user.id)
          .select("id");

        if (error) {
          throw error;
        }

        if (alive) {
          setIsFinished(true);
          onSaved?.();
        }
      } catch (error) {
        if (!alive) return;
        setErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : "조건 저장에 실패했습니다.",
        );
        setIsFinished(true);
      } finally {
        if (alive) setIsSaving(false);
      }
    }

    void persistProfile();

    return () => {
      alive = false;
    };
  }, [condition, isFinished, isLoggedIn, isSaving, onSaved]);

  useEffect(() => {
    if (!condition || isSaving) return;
    const timer = window.setTimeout(() => {
      router.replace("/recommendations");
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [condition, isSaving, router]);

  if (!condition) {
    return null;
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 rounded-3xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-5 py-10 text-center shadow-sm">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-(--oboon-primary)/10 text-(--oboon-primary)">
        <Check className="h-7 w-7" />
      </div>
      <div className="space-y-1">
        <div className="ob-typo-h2 text-(--oboon-text-title)">조건이 저장됐어요</div>
        <p className="ob-typo-body text-(--oboon-text-muted)">
          {isLoggedIn
            ? "로그인된 계정 기준으로 맞춤 조건을 반영했습니다."
            : "조건 입력은 저장됐고, 다음에도 이어서 사용할 수 있어요."}
        </p>
        {errorMessage ? (
          <p className="ob-typo-caption text-(--oboon-danger)">{errorMessage}</p>
        ) : null}
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
  );
}
