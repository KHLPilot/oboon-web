import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

type RegulationArea =
  | "non_regulated"
  | "adjustment_target"
  | "speculative_overheated";

type RegulationRulePayload = {
  id?: number;
  region1?: string;
  region2?: string | null;
  region3?: string | null;
  regulationArea?: RegulationArea;
  regulationAreas?: RegulationArea[];
  replaceAreas?: boolean;
  isActive?: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  note?: string | null;
};

type RegulationRuleRow = {
  id: number;
  region_key: string;
  region_1depth: string;
  region_2depth: string | null;
  region_3depth: string | null;
  regulation_area: RegulationArea;
  source: "manual" | "derived";
  derived_count: number;
  is_active: boolean;
  effective_from: string | null;
  effective_to: string | null;
  note: string | null;
  updated_at: string;
};

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function normalizeSegment(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function normalizeRegionKey(
  region1: string,
  region2: string | null,
  region3: string | null,
): string {
  return [region1, region2, region3]
    .filter((segment): segment is string => Boolean(segment))
    .map((segment) => segment.toLowerCase().replace(/\s+/g, ""))
    .join("|");
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

function regulationAreaPriority(value: RegulationArea): number {
  if (value === "speculative_overheated") return 3;
  if (value === "adjustment_target") return 2;
  return 1;
}

function normalizeRegulationAreas(
  rawAreas: unknown,
  rawSingle: unknown,
): RegulationArea[] {
  const parsedList = Array.isArray(rawAreas)
    ? rawAreas
        .map((item) => parseRegulationArea(item))
        .filter((item): item is RegulationArea => Boolean(item))
    : [];
  const single = parseRegulationArea(rawSingle);
  const merged = single ? [...parsedList, single] : parsedList;

  const deduped = Array.from(new Set(merged));
  if (deduped.length === 0) {
    return ["non_regulated"];
  }

  const hasRegulated = deduped.some((item) => item !== "non_regulated");
  const normalized = hasRegulated
    ? deduped.filter((item) => item !== "non_regulated")
    : deduped;

  return normalized.sort(
    (a, b) => regulationAreaPriority(b) - regulationAreaPriority(a),
  );
}

function toIsoDateOrNull(raw: unknown): string | null {
  const text = normalizeSegment(raw);
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

async function ensureAdmin() {
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
            // ignore
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, status: 401, error: "로그인이 필요합니다." };
  }

  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    return { ok: false as const, status: 403, error: "관리자 권한이 필요합니다." };
  }

  return { ok: true as const };
}

export async function GET() {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await adminSupabase
    .from("regulation_rules")
    .select(
      "id, region_key, region_1depth, region_2depth, region_3depth, regulation_area, source, derived_count, is_active, effective_from, effective_to, note, updated_at",
    )
    .order("updated_at", { ascending: false })
    .returns<RegulationRuleRow[]>();

  if (error) {
    return NextResponse.json(
      { error: `규제 룰 조회 실패: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json()) as RegulationRulePayload;
  const region1 = normalizeSegment(body.region1);
  const region2 = normalizeSegment(body.region2);
  const region3 = normalizeSegment(body.region3);
  const regulationAreas = normalizeRegulationAreas(
    body.regulationAreas,
    body.regulationArea,
  );

  if (!region1 || regulationAreas.length === 0) {
    return NextResponse.json(
      { error: "시/도와 규제구분은 필수입니다." },
      { status: 400 },
    );
  }

  const regionKey = normalizeRegionKey(region1, region2, region3);
  const nowIso = new Date().toISOString();

  const { error } = await adminSupabase
    .from("regulation_rules")
    .upsert(
      regulationAreas.map((regulationArea) => ({
        region_key: regionKey,
        region_1depth: region1,
        region_2depth: region2,
        region_3depth: region3,
        regulation_area: regulationArea,
        source: "manual",
        is_active: body.isActive !== false,
        effective_from: toIsoDateOrNull(body.effectiveFrom),
        effective_to: toIsoDateOrNull(body.effectiveTo),
        note: normalizeSegment(body.note),
        updated_at: nowIso,
      })),
      { onConflict: "region_key,regulation_area" },
    )
    .select("id");

  if (error) {
    return NextResponse.json(
      { error: `규제 룰 저장 실패: ${error.message}` },
      { status: 500 },
    );
  }

  if (body.replaceAreas === true) {
    const inactiveTargets = regulationAreas.join(",");
    const { error: deactivateError } = await adminSupabase
      .from("regulation_rules")
      .update({
        is_active: false,
        updated_at: nowIso,
      })
      .eq("region_key", regionKey)
      .eq("source", "manual")
      .not("regulation_area", "in", `(${inactiveTargets})`);

    if (deactivateError) {
      return NextResponse.json(
        { error: `규제 룰 동기화 실패: ${deactivateError.message}` },
        { status: 500 },
      );
    }
  }

  const { data: refreshedRows, error: refreshError } = await adminSupabase
    .from("regulation_rules")
    .select(
      "id, region_key, region_1depth, region_2depth, region_3depth, regulation_area, source, derived_count, is_active, effective_from, effective_to, note, updated_at",
    )
    .eq("region_key", regionKey)
    .order("regulation_area", { ascending: false })
    .returns<RegulationRuleRow[]>();

  if (refreshError) {
    return NextResponse.json(
      { error: `규제 룰 재조회 실패: ${refreshError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ items: refreshedRows ?? [] });
}

export async function PUT(request: Request) {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json()) as RegulationRulePayload;
  const id = Number(body.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID가 필요합니다." }, { status: 400 });
  }

  const { data: existing, error: existingError } = await adminSupabase
    .from("regulation_rules")
    .select(
      "id, region_1depth, region_2depth, region_3depth, regulation_area, is_active, effective_from, effective_to, note",
    )
    .eq("id", id)
    .maybeSingle();

  if (existingError || !existing) {
    return NextResponse.json({ error: "대상 규제 룰을 찾을 수 없습니다." }, { status: 404 });
  }

  const region1 = normalizeSegment(body.region1) ?? normalizeSegment(existing.region_1depth);
  const region2 = normalizeSegment(body.region2 ?? existing.region_2depth);
  const region3 = normalizeSegment(body.region3 ?? existing.region_3depth);
  const regulationAreas = normalizeRegulationAreas(
    body.regulationAreas,
    body.regulationArea ?? existing.regulation_area,
  );
  const regulationArea = regulationAreas[0] ?? null;

  if (!region1 || !regulationArea) {
    return NextResponse.json(
      { error: "시/도와 규제구분은 필수입니다." },
      { status: 400 },
    );
  }

  const regionKey = normalizeRegionKey(region1, region2, region3);

  const { data, error } = await adminSupabase
    .from("regulation_rules")
    .update({
      region_key: regionKey,
      region_1depth: region1,
      region_2depth: region2,
      region_3depth: region3,
      regulation_area: regulationArea,
      is_active: typeof body.isActive === "boolean" ? body.isActive : Boolean(existing.is_active),
      effective_from:
        body.effectiveFrom !== undefined
          ? toIsoDateOrNull(body.effectiveFrom)
          : toIsoDateOrNull(existing.effective_from),
      effective_to:
        body.effectiveTo !== undefined
          ? toIsoDateOrNull(body.effectiveTo)
          : toIsoDateOrNull(existing.effective_to),
      note:
        body.note !== undefined
          ? normalizeSegment(body.note)
          : normalizeSegment(existing.note),
      source: "manual",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(
      "id, region_key, region_1depth, region_2depth, region_3depth, regulation_area, source, derived_count, is_active, effective_from, effective_to, note, updated_at",
    )
    .single<RegulationRuleRow>();

  if (error) {
    return NextResponse.json(
      { error: `규제 룰 수정 실패: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ item: data });
}
