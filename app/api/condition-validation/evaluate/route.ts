import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import {
  evaluateCondition,
  reasonMessageByCode,
} from "@/features/condition-validation/domain/evaluator";
import { loadPropertyProfile } from "@/features/condition-validation/server/profile-resolver";
import type {
  ConditionCustomerInput,
  PropertyValidationProfile,
} from "@/features/condition-validation/domain/types";

type PriceVisibility = "public" | "non_public" | "unknown";

type OptionalPersistRequest = {
  customerId: string | null;
  propertyId: string;
  customer: ConditionCustomerInput;
  inputPayload: unknown;
  profile: PropertyValidationProfile;
  result: ReturnType<typeof evaluateCondition>;
};

const amountSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.replaceAll(",", "").trim();
    if (!normalized) return Number.NaN;
    return Number(normalized);
  }
  return value;
}, z.number().finite());

const manwonAmountSchema = amountSchema
  .refine((value) => value > 0, {
    message: "must be > 0",
  })
  .refine((value) => Number.isInteger(value), {
    message: "must be integer in manwon unit",
  });

const requestSchema = z.object({
  property_id: z.union([
    z.number().int().positive(),
    z.string().trim().min(1),
  ]),
  customer: z.object({
    available_cash: manwonAmountSchema,
    monthly_income: manwonAmountSchema,
    owned_house_count: z
      .preprocess((value) => {
        if (typeof value === "string") {
          const normalized = value.replaceAll(",", "").trim();
          if (!normalized) return Number.NaN;
          return Number(normalized);
        }
        return value;
      }, z.number().int())
      .refine((value) => value >= 0, { message: "must be >= 0" }),
    credit_grade: z.enum(["good", "normal", "unstable"]),
    purchase_purpose: z.enum(["residence", "investment", "both"]),
  }),
  options: z
    .object({
      strict_validation: z.boolean().optional(),
      trace: z.boolean().optional(),
    })
    .optional(),
});

function createAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase env for condition validation API");
  }
  return createClient(url, serviceRoleKey);
}

function stringifyPropertyId(propertyId: string | number): string {
  return typeof propertyId === "number" ? String(propertyId) : propertyId.trim();
}

function isMissingTableError(error: { code?: string | null; message?: string | null }): boolean {
  const code = error.code ?? "";
  const message = error.message ?? "";
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    message.includes("does not exist") ||
    message.includes("Could not find the table")
  );
}

function normalizeCustomerInput(input: z.infer<typeof requestSchema>["customer"]): ConditionCustomerInput {
  return {
    availableCash: input.available_cash,
    monthlyIncome: input.monthly_income,
    ownedHouseCount: input.owned_house_count,
    creditGrade: input.credit_grade,
    purchasePurpose: input.purchase_purpose,
  };
}

async function getOptionalUserId(): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return null;
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Route handler read-only contexts ignore cookie updates.
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
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

  const hasPublicPrice = unitTypes.some((row) => row.is_price_public !== false);
  return hasPublicPrice ? "public" : "non_public";
}

async function persistEvaluation(params: {
  adminSupabase: ReturnType<typeof createAdminSupabase>;
  payload: OptionalPersistRequest;
}) {
  const { adminSupabase, payload } = params;

  try {
    const { data: insertedRequest, error: requestError } = await adminSupabase
      .from("condition_validation_requests")
      .insert({
        property_id: payload.propertyId,
        customer_id: payload.customerId,
        available_cash_manwon: payload.customer.availableCash,
        monthly_income_manwon: payload.customer.monthlyIncome,
        owned_house_count: payload.customer.ownedHouseCount,
        credit_grade: payload.customer.creditGrade,
        purchase_purpose: payload.customer.purchasePurpose,
        amount_unit_raw: "manwon",
        input_payload: payload.inputPayload,
      })
      .select("id")
      .maybeSingle<{ id: string }>();

    if (requestError) {
      if (!isMissingTableError(requestError)) {
        console.error("condition-validation request insert error:", requestError);
      }
      return;
    }

    const requestId = insertedRequest?.id;
    if (!requestId) {
      return;
    }

    const { error: resultError } = await adminSupabase
      .from("condition_validation_results")
      .insert({
        request_id: requestId,
        property_id: payload.profile.propertyId,
        final_grade: payload.result.finalGrade,
        action_code: payload.result.action,
        reason_codes: payload.result.reasonCodes,
        summary_message: payload.result.summaryMessage,
        contract_amount_manwon: payload.result.metrics.contractAmount,
        min_cash_manwon: payload.result.metrics.minCash,
        recommended_cash_manwon: payload.result.metrics.recommendedCash,
        loan_ratio: payload.result.metrics.loanRatio,
        loan_amount_manwon: payload.result.metrics.loanAmount,
        interest_rate: payload.result.metrics.interestRate,
        monthly_payment_est_manwon: payload.result.metrics.monthlyPaymentEst,
        monthly_burden_ratio: payload.result.metrics.monthlyBurdenRatio,
        warnings: payload.result.warnings,
        trace: payload.result.trace,
      });

    if (resultError && !isMissingTableError(resultError)) {
      console.error("condition-validation result insert error:", resultError);
    }
  } catch (error) {
    console.error("condition-validation persist failed:", error);
  }
}

export async function POST(request: Request) {
  let payload: unknown = null;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "invalid json payload",
        },
      },
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
          message: "request validation failed",
          field_errors: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  const adminSupabase = createAdminSupabase();
  const propertyIdInput = stringifyPropertyId(parsed.data.property_id);
  const customer = normalizeCustomerInput(parsed.data.customer);

  try {
    const profile = await loadPropertyProfile({
      adminSupabase,
      propertyIdInput,
    });

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

    if (parsed.data.options?.strict_validation && profile.source !== "validation_profile") {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "PROPERTY_PROFILE_NOT_READY",
            message: "현장 검증 기준이 아직 등록되지 않았습니다.",
          },
        },
        { status: 409 },
      );
    }

    const result = evaluateCondition({ profile, customer });
    const priceVisibility = await resolvePriceVisibility({
      adminSupabase,
      matchedPropertyId: profile.matchedPropertyId,
    });
    const userId = await getOptionalUserId();

    void persistEvaluation({
      adminSupabase,
      payload: {
        customerId: userId,
        propertyId: profile.propertyId,
        customer,
        inputPayload: payload,
        profile,
        result,
      },
    });

    return NextResponse.json({
      ok: true,
      profile: {
        property_id: profile.propertyId,
        property_name: profile.propertyName,
        matched_property_id: profile.matchedPropertyId,
        source: profile.source,
        asset_type: profile.assetType,
      },
      result: {
        final_grade: result.finalGrade,
        action: result.action,
        reason_codes: result.reasonCodes,
        reason_messages: result.reasonMessages,
        summary_message: result.summaryMessage,
      },
      metrics: {
        list_price: result.metrics.listPrice,
        contract_amount: result.metrics.contractAmount,
        min_cash: result.metrics.minCash,
        recommended_cash: result.metrics.recommendedCash,
        loan_ratio: result.metrics.loanRatio,
        loan_amount: result.metrics.loanAmount,
        interest_rate: result.metrics.interestRate,
        monthly_payment_est: result.metrics.monthlyPaymentEst,
        monthly_burden_ratio: result.metrics.monthlyBurdenRatio,
        monthly_burden_percent: result.metrics.monthlyBurdenPercent,
      },
      warnings: result.warnings,
      display: {
        show_detailed_metrics: priceVisibility !== "non_public",
        price_visibility: priceVisibility,
      },
      trace: parsed.data.options?.trace
        ? {
            step1_cash_grade: result.trace.step1CashGrade,
            step1_cash_reason_code: result.trace.step1CashReasonCode,
            step1_cash_reason_message: reasonMessageByCode(
              result.trace.step1CashReasonCode,
            ),
            step2_burden_grade: result.trace.step2BurdenGrade,
            step2_burden_reason_code: result.trace.step2BurdenReasonCode,
            step2_burden_reason_message: result.trace.step2BurdenReasonCode
              ? reasonMessageByCode(result.trace.step2BurdenReasonCode)
              : null,
            step3_risk_grade: result.trace.step3RiskGrade,
            step3_risk_reason_codes: result.trace.step3RiskReasonCodes,
            step3_risk_reason_messages: result.trace.step3RiskReasonCodes.map(
              (code) => reasonMessageByCode(code),
            ),
          }
        : undefined,
      evaluated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("POST /api/condition-validation/evaluate error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "EVALUATION_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "조건 검증 처리 중 오류가 발생했습니다.",
        },
      },
      { status: 500 },
    );
  }
}
