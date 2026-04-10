import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { evaluateFullCondition } from "@/features/condition-validation/domain/fullCustomerEvaluator";
import {
  buildScheduleAwareTimingCategory,
  deriveScheduleAwareTimingMonthsDiff,
} from "@/features/condition-validation/lib/timing-satisfaction";
import {
  loadPropertyProfile,
  loadUnitValidationProfiles,
} from "@/features/condition-validation/server/profile-resolver";
import type { FullCustomerInput, UnitTypeValidationProfile } from "@/features/condition-validation/domain/types";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { AppError, ERR } from "@/lib/errors";
import {
  checkAuthRateLimit,
  conditionEvaluationUserLimiter,
} from "@/lib/rateLimit";

type PriceVisibility = "public" | "non_public" | "unknown";

type PropertyTimelineRow = {
  announcement_date: string | null;
  application_start: string | null;
  application_end: string | null;
  contract_start: string | null;
  contract_end: string | null;
  move_in_date: string | null;
};

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

function getCashRule(assetType: UnitTypeValidationProfile["assetType"]) {
  if (assetType === "apartment") {
    return { minExtraRate: 0.08, recommendedExtraRate: 0.12 };
  }
  if (assetType === "officetel") {
    return { minExtraRate: 0.1, recommendedExtraRate: 0.15 };
  }
  return { minExtraRate: 0.12, recommendedExtraRate: 0.18 };
}

function calculateCashThresholds(args: {
  assetType: UnitTypeValidationProfile["assetType"];
  listPrice: number;
  contractRatio: number;
}) {
  const { assetType, listPrice, contractRatio } = args;
  const contractAmount = listPrice * contractRatio;
  const cashRule = getCashRule(assetType);

  return {
    contractAmount,
    minCash: contractAmount + listPrice * cashRule.minExtraRate,
    recommendedCash: contractAmount + listPrice * cashRule.recommendedExtraRate,
  };
}

async function resolvePriceVisibility(params: {
  adminSupabase: ReturnType<typeof createAdminSupabase>;
  matchedPropertyId: number | null;
}): Promise<PriceVisibility> {
  const { adminSupabase, matchedPropertyId } = params;
  if (!matchedPropertyId || !Number.isFinite(matchedPropertyId)) {
    return "unknown";
  }

  const { data, error } = await adminSupabase
    .from("properties")
    .select("property_unit_types(is_price_public)")
    .eq("id", matchedPropertyId)
    .maybeSingle<{ property_unit_types: Array<{ is_price_public?: boolean | null }> | null }>();

  if (error || !data) {
    return "unknown";
  }

  const unitTypes = data.property_unit_types ?? [];
  if (unitTypes.length === 0) {
    return "unknown";
  }

  return unitTypes.some((row) => row.is_price_public !== false)
    ? "public"
    : "non_public";
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

  const rateLimitRes = await checkAuthRateLimit(
    conditionEvaluationUserLimiter,
    userId,
    {
      windowMs: 60 * 1000,
      message: "조건 상세 평가 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
    },
  );
  if (rateLimitRes) return rateLimitRes;

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

    const { data: propertyRow } = await adminSupabase
      .from("properties")
      .select(
        "property_timeline(announcement_date,application_start,application_end,contract_start,contract_end,move_in_date)",
      )
      .eq("id", propertyIdInput)
      .maybeSingle<{ property_timeline: PropertyTimelineRow[] | PropertyTimelineRow | null }>();

    const timeline = Array.isArray(propertyRow?.property_timeline)
      ? (propertyRow.property_timeline[0] ?? null)
      : (propertyRow?.property_timeline ?? null);

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

    const timingOverride = buildScheduleAwareTimingCategory({
      purchaseTiming: customer.purchaseTiming,
      moveinTiming: customer.moveinTiming,
      timeline: timeline
        ? {
            announcementDate: timeline.announcement_date,
            applicationStart: timeline.application_start,
            applicationEnd: timeline.application_end,
            contractStart: timeline.contract_start,
            contractEnd: timeline.contract_end,
            moveInDate: timeline.move_in_date,
          }
        : null,
    });

    const result = evaluateFullCondition({ profile, customer, timingOverride });
    const priceVisibility = await resolvePriceVisibility({
      adminSupabase,
      matchedPropertyId: profile.matchedPropertyId,
    });
    const cashThresholds = calculateCashThresholds({
      assetType: profile.assetType,
      listPrice: profile.listPrice,
      contractRatio: profile.contractRatio,
    });
    const monthlyBurdenPercent =
      customer.monthlyIncome > 0
        ? Math.round((result.metrics.monthlyPaymentEst / customer.monthlyIncome) * 100)
        : null;
    const timingMonthsDiff = deriveScheduleAwareTimingMonthsDiff({
      purchaseTiming: customer.purchaseTiming,
      moveinTiming: customer.moveinTiming,
      timeline: timeline
        ? {
            announcementDate: timeline.announcement_date,
            applicationStart: timeline.application_start,
            applicationEnd: timeline.application_end,
            contractStart: timeline.contract_start,
            contractEnd: timeline.contract_end,
            moveInDate: timeline.move_in_date,
          }
        : null,
    });

    const resolvedPropertyId =
      profile.matchedPropertyId != null
        ? String(profile.matchedPropertyId)
        : propertyIdInput;
    const unitProfiles = await loadUnitValidationProfiles({
      adminSupabase,
      propertyId: resolvedPropertyId,
    });
    const unitTypeResults = unitProfiles.map((unitProfile: UnitTypeValidationProfile) => {
      const unitPropertyProfile = {
        ...profile,
        propertyId: unitProfile.propertyId,
        propertyName: profile.propertyName,
        assetType: unitProfile.assetType,
        listPrice: unitProfile.listPriceManwon,
        contractRatio: unitProfile.contractRatio,
        regulationArea: unitProfile.regulationArea,
        transferRestriction: unitProfile.transferRestriction,
        source: "validation_profile" as const,
        matchedPropertyId: profile.matchedPropertyId,
      };
      const unitResult = evaluateFullCondition({
        profile: unitPropertyProfile,
        customer,
        timingOverride,
      });
      const unitCashThresholds = calculateCashThresholds({
        assetType: unitProfile.assetType,
        listPrice: unitProfile.listPriceManwon,
        contractRatio: unitProfile.contractRatio,
      });
      const unitMonthlyBurdenPercent =
        customer.monthlyIncome > 0
          ? Math.round((unitResult.metrics.monthlyPaymentEst / customer.monthlyIncome) * 10000) /
            100
          : null;

      return {
        unit_type_id: unitProfile.unitTypeId,
        unit_type_name: unitProfile.unitTypeName,
        exclusive_area: unitProfile.exclusiveArea,
        list_price_manwon: unitProfile.listPriceManwon,
        is_price_public: unitProfile.isPricePublic,
        final_grade: unitResult.finalGrade,
        total_score: unitResult.totalScore,
        summary_message: unitResult.summaryMessage,
        grade_label: unitResult.gradeLabel,
        metrics: {
          contract_amount: Math.round(unitCashThresholds.contractAmount),
          min_cash: Math.round(unitCashThresholds.minCash),
          recommended_cash: Math.round(unitCashThresholds.recommendedCash),
          loan_amount: Math.round(unitResult.metrics.loanAmount),
          monthly_payment_est: Math.round(unitResult.metrics.monthlyPaymentEst),
          monthly_burden_percent: unitMonthlyBurdenPercent,
          timing_months_diff: timingMonthsDiff,
        },
        categories: {
          cash: {
            grade: unitResult.categories.cash.grade,
            score: unitResult.categories.cash.score,
            max_score: unitResult.categories.cash.maxScore,
            reason: unitResult.categories.cash.reasonMessage,
          },
          income: {
            grade: unitResult.categories.income.grade,
            score: unitResult.categories.income.score,
            max_score: unitResult.categories.income.maxScore,
            reason: unitResult.categories.income.reasonMessage,
          },
          ltv_dsr: {
            grade: unitResult.categories.ltvDsr.grade,
            score: unitResult.categories.ltvDsr.score,
            max_score: unitResult.categories.ltvDsr.maxScore,
            reason: unitResult.categories.ltvDsr.reasonMessage,
          },
          ownership: {
            grade: unitResult.categories.ownership.grade,
            score: unitResult.categories.ownership.score,
            max_score: unitResult.categories.ownership.maxScore,
            reason: unitResult.categories.ownership.reasonMessage,
          },
          purpose: {
            grade: unitResult.categories.purpose.grade,
            score: unitResult.categories.purpose.score,
            max_score: unitResult.categories.purpose.maxScore,
            reason: unitResult.categories.purpose.reasonMessage,
          },
          timing: {
            grade: unitResult.categories.timing.grade,
            score: unitResult.categories.timing.score,
            max_score: unitResult.categories.timing.maxScore,
            reason: unitResult.categories.timing.reasonMessage,
          },
        },
        recommendation_context: {
          available_cash_manwon: customer.availableCash,
          monthly_income_manwon: customer.monthlyIncome,
          house_ownership: customer.houseOwnership,
          purchase_purpose: customer.purchasePurpose,
        },
      };
    });

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
        min_cash: cashThresholds.minCash,
        recommended_cash: cashThresholds.recommendedCash,
        loan_amount: result.metrics.loanAmount,
        monthly_payment_est: result.metrics.monthlyPaymentEst,
        monthly_surplus: result.metrics.monthlySurplus,
        monthly_burden_percent: monthlyBurdenPercent,
        dsr_percent: result.metrics.dsrPercent,
        timing_months_diff: timingMonthsDiff,
      },
      display: {
        price_visibility: priceVisibility,
      },
      unit_type_results: unitTypeResults,
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
