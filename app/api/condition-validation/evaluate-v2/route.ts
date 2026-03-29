import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { evaluateFullCondition } from "@/features/condition-validation/domain/fullCustomerEvaluator";
import { loadPropertyProfile } from "@/features/condition-validation/server/profile-resolver";
import type { FullCustomerInput } from "@/features/condition-validation/domain/types";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { AppError, ERR } from "@/lib/errors";

function createAdminSupabase() {
  try {
    return createSupabaseAdminClient();
  } catch {
    throw new AppError(
      ERR.CONFIG,
      "조건 검증 처리 중 오류가 발생했습니다.",
      500,
    );
  }
}

async function requireUser(): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const cookieStore = await cookies();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cs) {
        try {
          cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // ignore in middleware contexts
        }
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

const requestSchema = z.object({
  property_id: z.union([z.number().int().positive(), z.string().trim().min(1)]),
  customer: z.object({
    employment_type: z.enum(["employee", "self_employed", "freelancer", "other"]),
    available_cash: z.number().int().nonnegative(),
    monthly_income: z.number().int().nonnegative(),
    monthly_expenses: z.number().int().nonnegative(),
    house_ownership: z.enum(["none", "one", "two_or_more"]),
    purchase_purpose: z.enum(["residence", "investment_rent", "investment_capital", "long_term"]),
    purchase_timing: z.enum([
      "by_property",
      "over_1year",
      "within_1year",
      "within_6months",
      "within_3months",
    ]),
    movein_timing: z.enum([
      "anytime",
      "within_3years",
      "within_2years",
      "within_1year",
      "immediate",
    ]),
    ltv_internal_score: z.number().int().min(0).max(100),
    existing_monthly_repayment: z.enum(["none", "under_50", "50to100", "100to200", "over_200"]),
  }),
});

export async function POST(request: Request) {
  // Login required
  const userId = await requireUser();
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } },
      { status: 401 },
    );
  }

  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "유효하지 않은 요청 형식입니다." } },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "입력값이 올바르지 않습니다.",
        },
      },
      { status: 400 },
    );
  }

  const adminSupabase = createAdminSupabase();
  const propertyIdInput =
    typeof parsed.data.property_id === "number"
      ? String(parsed.data.property_id)
      : parsed.data.property_id.trim();

  try {
    const profile = await loadPropertyProfile({ adminSupabase, propertyIdInput });
    if (!profile) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "PROPERTY_NOT_FOUND",
            message: "현장 기준 정보를 찾을 수 없습니다.",
          },
        },
        { status: 404 },
      );
    }

    const c = parsed.data.customer;
    const customer: FullCustomerInput = {
      employmentType: c.employment_type,
      availableCash: c.available_cash,
      monthlyIncome: c.monthly_income,
      monthlyExpenses: c.monthly_expenses,
      houseOwnership: c.house_ownership,
      purchasePurpose: c.purchase_purpose,
      purchaseTiming: c.purchase_timing,
      moveinTiming: c.movein_timing,
      ltvInternalScore: c.ltv_internal_score,
      existingMonthlyRepayment: c.existing_monthly_repayment,
    };

    const result = evaluateFullCondition({ profile, customer });

    return NextResponse.json({
      ok: true,
      result: {
        final_grade: result.finalGrade,
        total_score: result.totalScore,
        max_score: result.maxScore,
        summary_message: result.summaryMessage,
        grade_label: result.gradeLabel,
      },
      categories: {
        cash: {
          grade: result.categories.cash.grade,
          score: result.categories.cash.score,
          max_score: result.categories.cash.maxScore,
          reason: result.categories.cash.reasonMessage,
        },
        income: {
          grade: result.categories.income.grade,
          score: result.categories.income.score,
          max_score: result.categories.income.maxScore,
          reason: result.categories.income.reasonMessage,
        },
        ltv_dsr: {
          grade: result.categories.ltvDsr.grade,
          score: result.categories.ltvDsr.score,
          max_score: result.categories.ltvDsr.maxScore,
          reason: result.categories.ltvDsr.reasonMessage,
        },
        ownership: {
          grade: result.categories.ownership.grade,
          score: result.categories.ownership.score,
          max_score: result.categories.ownership.maxScore,
          reason: result.categories.ownership.reasonMessage,
        },
        purpose: {
          grade: result.categories.purpose.grade,
          score: result.categories.purpose.score,
          max_score: result.categories.purpose.maxScore,
          reason: result.categories.purpose.reasonMessage,
        },
        timing: {
          grade: result.categories.timing.grade,
          score: result.categories.timing.score,
          max_score: result.categories.timing.maxScore,
          reason: result.categories.timing.reasonMessage,
        },
      },
      metrics: {
        contract_amount: result.metrics.contractAmount,
        loan_amount: result.metrics.loanAmount,
        monthly_payment_est: result.metrics.monthlyPaymentEst,
        monthly_surplus: result.metrics.monthlySurplus,
        dsr_percent: result.metrics.dsrPercent,
      },
      evaluated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("POST /api/condition-validation/evaluate-v2 error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "EVALUATION_FAILED",
          message: "조건 검증 처리 중 오류가 발생했습니다.",
        },
      },
      { status: 500 },
    );
  }
}
