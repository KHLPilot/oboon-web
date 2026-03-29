import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

type ValidationAssetType =
  | "apartment"
  | "officetel"
  | "commercial"
  | "knowledge_industry";

type RegulationArea =
  | "non_regulated"
  | "adjustment_target"
  | "speculative_overheated";

type ValidationProfileRow = {
  property_id: string;
  asset_type: ValidationAssetType;
  list_price_manwon: number | string;
  contract_ratio: number | string;
  regulation_area: RegulationArea;
  transfer_restriction: boolean | null;
  transfer_restriction_period?: string | null;
};

const adminSupabase = createSupabaseAdminClient();

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

function parsePropertyId(value: unknown): number | null {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return null;
  const asInt = Math.floor(parsed);
  return asInt > 0 ? asInt : null;
}

function normalizeText(value: unknown): string {
  return String(value ?? "").toLowerCase().replace(/\s+/g, "");
}

function inferAssetType(raw: unknown): ValidationAssetType {
  const normalized = normalizeText(raw);
  if (normalized.includes("오피스텔") || normalized.includes("officetel")) {
    return "officetel";
  }
  if (normalized.includes("아파트") || normalized.includes("apartment")) {
    return "apartment";
  }
  if (normalized.includes("지식산업")) {
    return "knowledge_industry";
  }
  if (normalized.includes("상가") || normalized.includes("상업")) {
    return "commercial";
  }
  return "apartment";
}

function normalizePriceToManwon(value: number): number {
  // 과거 데이터/입력에 원 단위(예: 200,000,000)가 섞이면 만원 단위로 보정한다.
  return Math.abs(value) >= 10_000_000 ? value / 10000 : value;
}

function parseRegulationArea(raw: unknown): RegulationArea | null {
  if (
    raw === "non_regulated" ||
    raw === "adjustment_target" ||
    raw === "speculative_overheated"
  ) {
    return raw;
  }
  return null;
}

function parseContractRatio(raw: unknown): number | null {
  const parsed = toFiniteNumber(raw);
  if (parsed === null) return null;
  const ratio = parsed > 1 ? parsed / 100 : parsed;
  if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1) return null;
  return Math.round(ratio * 10000) / 10000;
}

function parseTransferRestrictionPeriod(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.trim();
  return normalized.length > 0 ? normalized : null;
}

function isMissingColumnError(error: unknown): boolean {
  const maybeCode = (error as { code?: string } | null)?.code;
  return maybeCode === "42703";
}

function inferRepresentativeListPrice(unitTypes: unknown): number | null {
  if (!Array.isArray(unitTypes)) return null;

  const prices = unitTypes
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const rec = row as Record<string, unknown>;
      const max = toFiniteNumber(rec.price_max);
      const min = toFiniteNumber(rec.price_min);
      if (max !== null && max > 0) return normalizePriceToManwon(max);
      if (min !== null && min > 0) return normalizePriceToManwon(min);
      return null;
    })
    .filter((value): value is number => value !== null);

  if (prices.length === 0) return null;
  return Math.max(...prices);
}

async function getAuthContext() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
            // Ignore in read-only contexts.
          }
        },
      },
    },
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  return { user, authError };
}

async function authorizePropertyAccess(params: {
  propertyIdNum: number;
  userId: string;
}) {
  const { propertyIdNum, userId } = params;

  const { data: me, error: meError } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle<{ role: string | null }>();

  if (meError || !me?.role) {
    return { error: "권한 정보를 찾을 수 없습니다.", status: 403 as const };
  }

  const { data: property, error: propertyError } = await adminSupabase
    .from("properties")
    .select("id, created_by, property_type")
    .eq("id", propertyIdNum)
    .maybeSingle<{ id: number; created_by: string | null; property_type: string | null }>();

  if (propertyError || !property) {
    return { error: "현장을 찾을 수 없습니다.", status: 404 as const };
  }

  if (me.role !== "admin") {
    const isOwner = property.created_by === userId;
    let isApprovedAgent = false;

    if (!isOwner && me.role === "agent") {
      const { data: membership } = await adminSupabase
        .from("property_agents")
        .select("id")
        .eq("property_id", propertyIdNum)
        .eq("agent_id", userId)
        .eq("status", "approved")
        .limit(1);
      isApprovedAgent = (membership?.length ?? 0) > 0;
    }

    if (!isOwner && !isApprovedAgent) {
      return { error: "권한이 없습니다.", status: 403 as const };
    }
  }

  return {
    me,
    property,
    status: 200 as const,
  };
}

async function fetchExistingProfile(propertyId: string) {
  const baseSelect =
    "property_id, asset_type, list_price_manwon, contract_ratio, regulation_area, transfer_restriction";
  const extendedSelect = `${baseSelect}, transfer_restriction_period`;

  const { data: existingProfileWithPeriod, error: profileErrorWithPeriod } =
    await adminSupabase
      .from("property_validation_profiles")
      .select(extendedSelect)
      .eq("property_id", propertyId)
      .maybeSingle<ValidationProfileRow>();

  if (!profileErrorWithPeriod) {
    return existingProfileWithPeriod ?? null;
  }

  if (!isMissingColumnError(profileErrorWithPeriod)) {
    throw profileErrorWithPeriod;
  }

  const { data: existingProfileWithoutPeriod } = await adminSupabase
    .from("property_validation_profiles")
    .select(baseSelect)
    .eq("property_id", propertyId)
    .maybeSingle<ValidationProfileRow>();

  return existingProfileWithoutPeriod ?? null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyIdNum = parsePropertyId(searchParams.get("propertyId"));
    if (!propertyIdNum) {
      return NextResponse.json({ error: "propertyId가 필요합니다." }, { status: 400 });
    }
    const propertyId = String(propertyIdNum);

    const { user, authError } = await getAuthContext();
    if (authError || !user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const authorized = await authorizePropertyAccess({
      propertyIdNum,
      userId: user.id,
    });
    if ("error" in authorized) {
      return NextResponse.json({ error: authorized.error }, { status: authorized.status });
    }

    const existingProfile = await fetchExistingProfile(propertyId);

    return NextResponse.json({
      ok: true,
      profile: existingProfile,
      resolved: {
        contract_ratio: parseContractRatio(existingProfile?.contract_ratio),
        regulation_area:
          parseRegulationArea(existingProfile?.regulation_area) ?? "non_regulated",
        transfer_restriction:
          typeof existingProfile?.transfer_restriction === "boolean"
            ? existingProfile.transfer_restriction
            : null,
        transfer_restriction_period: parseTransferRestrictionPeriod(
          existingProfile?.transfer_restriction_period,
        ),
      },
    });
  } catch (error) {
    console.error("GET /api/condition-validation/profiles/upsert error:", error);
    return NextResponse.json(
      { error: "검증 기준 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { user, authError } = await getAuthContext();

    if (authError || !user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const propertyIdNum = parsePropertyId(body?.propertyId);
    if (!propertyIdNum) {
      return NextResponse.json({ error: "propertyId가 필요합니다." }, { status: 400 });
    }
    const propertyId = String(propertyIdNum);

    const authorized = await authorizePropertyAccess({
      propertyIdNum,
      userId: user.id,
    });
    if ("error" in authorized) {
      return NextResponse.json({ error: authorized.error }, { status: authorized.status });
    }
    const { property } = authorized;

    const existingProfile = await fetchExistingProfile(propertyId);

    const assetType = inferAssetType(body?.propertyType ?? property.property_type);
    const listPriceFromBodyRaw = toFiniteNumber(body?.listPriceManwon);
    const listPriceFromUnits = inferRepresentativeListPrice(body?.unitTypes);
    const listPriceFromExistingRaw = toFiniteNumber(existingProfile?.list_price_manwon);
    const listPriceFromBody =
      listPriceFromBodyRaw === null
        ? null
        : normalizePriceToManwon(listPriceFromBodyRaw);
    const listPriceFromExisting =
      listPriceFromExistingRaw === null
        ? null
        : normalizePriceToManwon(listPriceFromExistingRaw);
    const listPriceManwon = listPriceFromBody ?? listPriceFromUnits ?? listPriceFromExisting;

    if (listPriceManwon === null || listPriceManwon <= 0) {
      return NextResponse.json(
        { error: "대표 분양가(만원)를 계산할 수 없습니다." },
        { status: 400 },
      );
    }

    const requestedContractRatio = parseContractRatio(body?.contractRatio);
    if (body && "contractRatio" in body && requestedContractRatio === null) {
      return NextResponse.json(
        { error: "계약금 비율(contractRatio)은 0~1 또는 0~100 범위로 입력해주세요." },
        { status: 400 },
      );
    }

    const contractRatio =
      requestedContractRatio ??
      parseContractRatio(existingProfile?.contract_ratio);
    if (contractRatio === null) {
      return NextResponse.json(
        { error: "계약금 비율(contractRatio)이 설정되지 않았습니다." },
        { status: 400 },
      );
    }

    const regulationArea =
      parseRegulationArea(body?.regulationArea) ??
      parseRegulationArea(existingProfile?.regulation_area) ??
      "non_regulated";

    const transferRestriction =
      typeof body?.transferRestriction === "boolean"
        ? body.transferRestriction
        : body?.transferRestriction === null
          ? null
          : typeof existingProfile?.transfer_restriction === "boolean"
            ? existingProfile.transfer_restriction
            : null;
    const transferRestrictionPeriod =
      parseTransferRestrictionPeriod(body?.transferRestrictionPeriod) ??
      parseTransferRestrictionPeriod(existingProfile?.transfer_restriction_period);

    const upsertPayloadBase = {
      property_id: propertyId,
      asset_type: assetType,
      list_price_manwon: listPriceManwon,
      contract_ratio: contractRatio,
      regulation_area: regulationArea,
      transfer_restriction: transferRestriction,
      updated_at: new Date().toISOString(),
    };

    const upsertPayloadWithPeriod = {
      ...upsertPayloadBase,
      transfer_restriction_period: transferRestrictionPeriod,
    };

    const selectBase =
      "property_id, asset_type, list_price_manwon, contract_ratio, regulation_area, transfer_restriction, updated_at";
    const selectWithPeriod = `${selectBase}, transfer_restriction_period`;

    let upserted: Record<string, unknown> | null = null;
    let upsertError: unknown = null;

    const firstTry = await adminSupabase
      .from("property_validation_profiles")
      .upsert(
        upsertPayloadWithPeriod,
        { onConflict: "property_id" },
      )
      .select(selectWithPeriod)
      .maybeSingle();

    upserted = firstTry.data;
    upsertError = firstTry.error;

    if (upsertError && isMissingColumnError(upsertError)) {
      const secondTry = await adminSupabase
        .from("property_validation_profiles")
        .upsert(upsertPayloadBase, { onConflict: "property_id" })
        .select(selectBase)
        .maybeSingle();
      upserted = secondTry.data;
      upsertError = secondTry.error;
    }

    if (upsertError) {
      console.error("property_validation_profiles upsert failed:", upsertError);
      return NextResponse.json({ error: "검증 기준 저장에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      profile: upserted,
    });
  } catch (error) {
    console.error("POST /api/condition-validation/profiles/upsert error:", error);
    return NextResponse.json(
      { error: "검증 기준 동기화 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
