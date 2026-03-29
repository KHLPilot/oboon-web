import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { evaluateGuestCondition } from "@/features/condition-validation/domain/guestEvaluator";
import { loadPropertyProfile } from "@/features/condition-validation/server/profile-resolver";
import type { GuestCustomerInput } from "@/features/condition-validation/domain/types";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { AppError, ERR } from "@/lib/errors";
import { handleStructuredApiError } from "@/lib/api/route-error";
import { parseJsonBody } from "@/lib/api/route-security";
import {
  checkAuthRateLimit,
  getClientIp,
  guestConditionEvaluationIpLimiter,
} from "@/lib/rateLimit";

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

const requestSchema = z.object({
  property_id: z.union([z.number().int().positive(), z.string().trim().min(1)]),
  customer: z.object({
    available_cash: z.number().int().nonnegative(),
    monthly_income: z.number().int().nonnegative(),
    credit_grade: z.enum(["good", "normal", "unstable"]),
    house_ownership: z.enum(["none", "one", "two_or_more"]),
    purchase_purpose: z.enum(["residence", "investment_rent", "investment_capital", "long_term"]),
  }),
});

export async function POST(request: NextRequest) {
  const rateLimitRes = await checkAuthRateLimit(
    guestConditionEvaluationIpLimiter,
    getClientIp(request),
    { windowMs: 60 * 1000 },
  );
  if (rateLimitRes) return rateLimitRes;

  const parsed = await parseJsonBody(request, requestSchema);
  if (!parsed.ok) {
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

  const propertyIdInput =
    typeof parsed.data.property_id === "number"
      ? String(parsed.data.property_id)
      : parsed.data.property_id.trim();

  try {
    const adminSupabase = createAdminSupabase();
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
    const customer: GuestCustomerInput = {
      availableCash: c.available_cash,
      monthlyIncome: c.monthly_income,
      creditGrade: c.credit_grade,
      houseOwnership: c.house_ownership,
      purchasePurpose: c.purchase_purpose,
    };

    const result = evaluateGuestCondition({ profile, customer });

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
        credit: {
          grade: result.categories.credit.grade,
          score: result.categories.credit.score,
          max_score: result.categories.credit.maxScore,
          reason: result.categories.credit.reasonMessage,
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
      },
      metrics: {
        contract_amount: result.metrics.contractAmount,
        loan_amount: result.metrics.loanAmount,
        monthly_payment_est: result.metrics.monthlyPaymentEst,
        monthly_burden_percent: result.metrics.monthlyBurdenPercent,
      },
    });
  } catch (error) {
    return handleStructuredApiError(
      "condition-validation evaluate-guest",
      error,
      {
        status: 500,
        code: "EVALUATION_FAILED",
        message: "조건 검증 처리 중 오류가 발생했습니다.",
      },
    );
  }
}
