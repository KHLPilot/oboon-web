import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { evaluateCondition } from "@/features/condition-validation/domain/evaluator";
import { resolveProfileForRecommendation } from "@/features/condition-validation/server/profile-resolver";
import type {
  ConditionCustomerInput,
  FinalGrade,
} from "@/features/condition-validation/domain/types";

type ValidationProfileRow = {
  property_id: string;
  asset_type: string;
  list_price_manwon: number | string;
  contract_ratio: number | string;
  regulation_area: string;
  transfer_restriction: boolean | null;
};

type PropertyRow = {
  id: number;
  name: string | null;
  status: string | null;
  property_type: string | null;
  property_unit_types: Array<{
    price_min: number | string | null;
    price_max: number | string | null;
    is_price_public?: boolean | null;
  }> | null;
};

type PropertySnapshotRow = {
  property_id: number | string | null;
  snapshot: unknown;
  published_at: string | null;
};

type EvaluatedRecommendation = {
  property_id: number;
  property_name: string | null;
  property_type: string | null;
  status: string | null;
  property_image_url: string | null;
  show_detailed_metrics: boolean;
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
      exclude_property_id: z.union([z.number().int().positive(), z.string().trim().min(1)]).optional(),
      include_red: z.boolean().optional(),
      limit: z.number().int().min(1).max(60).optional(),
    })
    .optional(),
});

function createAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase env for condition recommendation API");
  }
  return createClient(url, serviceRoleKey);
}

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
  const asInt = Math.floor(parsed);
  return asInt > 0 ? asInt : null;
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

async function loadRecommendationProperties(
  adminSupabase: ReturnType<typeof createAdminSupabase>,
) {
  const rows: PropertyRow[] = [];
  const chunkSize = 200;
  const maxRows = 1200;
  let from = 0;

  while (rows.length < maxRows) {
    const { data, error } = await adminSupabase
      .from("properties")
      .select(
        "id, name, status, property_type, property_unit_types(price_min,price_max,is_price_public)",
      )
      .order("id", { ascending: false })
      .range(from, from + chunkSize - 1)
      .returns<PropertyRow[]>();

    if (error) {
      throw new Error(error.message);
    }

    const page = data ?? [];
    if (page.length === 0) break;
    rows.push(...page);
    if (page.length < chunkSize) break;
    from += chunkSize;
  }

  return rows.slice(0, maxRows);
}

async function loadValidationProfilesByPropertyIds(
  adminSupabase: ReturnType<typeof createAdminSupabase>,
  ids: number[],
) {
  if (ids.length === 0) return new Map<string, ValidationProfileRow>();
  const rows: ValidationProfileRow[] = [];
  const chunkSize = 200;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize).map((id) => String(id));
    const { data, error } = await adminSupabase
      .from("property_validation_profiles")
      .select(
        "property_id, asset_type, list_price_manwon, contract_ratio, regulation_area, transfer_restriction",
      )
      .in("property_id", chunk)
      .returns<ValidationProfileRow[]>();
    if (error) {
      throw new Error(error.message);
    }
    rows.push(...(data ?? []));
  }
  return new Map(rows.map((row) => [String(row.property_id), row]));
}

function shouldShowDetailedMetrics(
  unitTypes: Array<{ is_price_public?: boolean | null }> | null,
): boolean {
  const rows = unitTypes ?? [];
  if (rows.length === 0) return true;
  return rows.some((row) => row.is_price_public !== false);
}

function toUnknownRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pickImageUrlFromSnapshot(snapshot: unknown): string | null {
  const record = toUnknownRecord(snapshot);
  if (!record) return null;

  const directCandidates = [
    record.image_url,
    record.imageUrl,
    record.main_image_url,
    record.mainImageUrl,
  ];
  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }

  const galleries = [
    record.property_gallery_images,
    record.gallery_images,
    record.images,
  ];
  for (const gallery of galleries) {
    if (!Array.isArray(gallery)) continue;
    for (const item of gallery) {
      const image = toUnknownRecord(item);
      if (!image) continue;
      const candidate = image.image_url ?? image.imageUrl;
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    }
  }

  return null;
}

async function loadPropertyImageMapByIds(
  adminSupabase: ReturnType<typeof createAdminSupabase>,
  ids: number[],
) {
  const imageMap = new Map<number, string | null>();
  if (ids.length === 0) return imageMap;

  const chunkSize = 200;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { data, error } = await adminSupabase
      .from("property_public_snapshots")
      .select("property_id, snapshot, published_at")
      .in("property_id", chunk)
      .order("published_at", { ascending: false })
      .returns<PropertySnapshotRow[]>();

    if (error) {
      throw new Error(error.message);
    }

    for (const row of data ?? []) {
      const propertyId = toPositiveInt(row.property_id);
      if (!propertyId) continue;
      if (imageMap.has(propertyId)) continue;
      imageMap.set(propertyId, pickImageUrlFromSnapshot(row.snapshot));
    }
  }

  return imageMap;
}

const GRADE_RANK: Record<FinalGrade, number> = {
  GREEN: 0,
  YELLOW: 1,
  RED: 2,
};

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

  try {
    const adminSupabase = createAdminSupabase();
    const customer = normalizeCustomerInput(parsed.data.customer);
    const limit = parsed.data.options?.limit ?? 24;
    const includeRed = parsed.data.options?.include_red ?? false;
    const excludePropertyId = toPositiveInt(parsed.data.options?.exclude_property_id);

    const properties = await loadRecommendationProperties(adminSupabase);
    const propertyIds = properties.map((property) => property.id);
    const profileByPropertyId = await loadValidationProfilesByPropertyIds(
      adminSupabase,
      propertyIds,
    );
    const propertyImageMap = await loadPropertyImageMapByIds(
      adminSupabase,
      propertyIds,
    );

    const evaluated: EvaluatedRecommendation[] = properties
      .map((property): EvaluatedRecommendation | null => {
        if (excludePropertyId && property.id === excludePropertyId) {
          return null;
        }
        if (property.status === "CLOSED") return null;

        const profile = resolveProfileForRecommendation({
          property,
          profileRow: profileByPropertyId.get(String(property.id)),
        });
        if (!profile) return null;

        const result = evaluateCondition({ profile, customer });
        return {
          property_id: property.id,
          property_name: property.name,
          property_type: property.property_type,
          status: property.status,
          property_image_url: propertyImageMap.get(property.id) ?? null,
          show_detailed_metrics: shouldShowDetailedMetrics(
            property.property_unit_types,
          ),
          result,
        };
      })
      .filter((item): item is EvaluatedRecommendation => item !== null)
      .sort((a, b) => {
        const gradeDiff =
          GRADE_RANK[a.result.finalGrade] - GRADE_RANK[b.result.finalGrade];
        if (gradeDiff !== 0) return gradeDiff;
        const burdenDiff =
          a.result.metrics.monthlyBurdenPercent - b.result.metrics.monthlyBurdenPercent;
        if (burdenDiff !== 0) return burdenDiff;
        return a.result.metrics.minCash - b.result.metrics.minCash;
      });

    const filtered = includeRed
      ? evaluated
      : evaluated.filter((item) => item.result.finalGrade !== "RED");
    const selected = filtered.slice(0, limit);

    return NextResponse.json({
      ok: true,
      scanned: evaluated.length,
      returned: selected.length,
      property_ids: selected.map((item) => item.property_id),
      recommendations: selected.map((item) => ({
        property_id: item.property_id,
        property_name: item.property_name,
        property_type: item.property_type,
        status: item.status,
        image_url: item.property_image_url,
        final_grade: item.result.finalGrade,
        action: item.result.action,
        summary_message: item.result.summaryMessage,
        reason_messages: item.result.reasonMessages,
        show_detailed_metrics: item.show_detailed_metrics,
        metrics: {
          list_price: item.result.metrics.listPrice,
          min_cash: item.result.metrics.minCash,
          recommended_cash: item.result.metrics.recommendedCash,
          monthly_payment_est: item.result.metrics.monthlyPaymentEst,
          monthly_burden_percent: item.result.metrics.monthlyBurdenPercent,
        },
      })),
      evaluated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("POST /api/condition-validation/recommend error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "RECOMMENDATION_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "추천 현장 조회 중 오류가 발생했습니다.",
        },
      },
      { status: 500 },
    );
  }
}
