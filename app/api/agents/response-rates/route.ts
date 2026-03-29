import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const adminSupabase = createSupabaseAdminClient();

type ResponseRateMap = Record<string, number | null>;
type AvgResponseMinutesMap = Record<string, number | null>;

function computeResponseRate(rows: Array<{ status: string | null; cancelled_by?: string | null }>) {
  let total = 0;
  let responded = 0;

  rows.forEach((row) => {
    const status = String(row.status ?? "");
    const cancelledBy = String(row.cancelled_by ?? "");
    const isResponded =
      status === "confirmed" ||
      status === "visited" ||
      status === "contracted" ||
      (status === "cancelled" && cancelledBy === "agent");
    const isPending = status === "pending";

    if (!isResponded && !isPending) return;
    total += 1;
    if (isResponded) responded += 1;
  });

  if (total === 0) return null;
  return Math.round((responded / total) * 100);
}

function computeAverageResponseMinutes(
  rows: Array<{
    status: string | null;
    cancelled_by?: string | null;
    created_at?: string | null;
    cancelled_at?: string | null;
    visited_at?: string | null;
    request_rejected_at?: string | null;
  }>,
) {
  const minutes: number[] = [];

  rows.forEach((row) => {
    const status = String(row.status ?? "");
    const cancelledBy = String(row.cancelled_by ?? "");
    const createdAt = row.created_at ? Date.parse(row.created_at) : NaN;
    if (!Number.isFinite(createdAt)) return;

    let respondedAtText: string | null = null;
    if (status === "cancelled" && cancelledBy === "agent") {
      respondedAtText = row.cancelled_at ?? null;
    } else if (status === "visited" || status === "contracted") {
      respondedAtText = row.visited_at ?? null;
    } else if (status === "cancelled" && cancelledBy === "admin") {
      respondedAtText = row.request_rejected_at ?? null;
    }

    if (!respondedAtText) return;
    const respondedAt = Date.parse(respondedAtText);
    if (!Number.isFinite(respondedAt)) return;
    const diffMin = Math.max(0, Math.round((respondedAt - createdAt) / 60000));
    minutes.push(diffMin);
  });

  if (minutes.length === 0) return null;
  const avg = minutes.reduce((sum, v) => sum + v, 0) / minutes.length;
  return Math.round(avg);
}

export async function POST(req: Request) {
  try {
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
              // 읽기 전용 컨텍스트에서는 무시
            }
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as { agentIds?: unknown };
    const rawAgentIds = Array.isArray(body.agentIds) ? body.agentIds : [];
    const agentIds = Array.from(
      new Set(
        rawAgentIds
          .map((id) => String(id ?? "").trim())
          .filter((id) => id.length > 0),
      ),
    ).slice(0, 100);

    if (agentIds.length === 0) {
      return NextResponse.json({ responseRates: {} satisfies ResponseRateMap });
    }

    const { data, error } = await adminSupabase
      .from("consultations")
      .select(
        "agent_id, status, cancelled_by, created_at, cancelled_at, visited_at, request_rejected_at",
      )
      .in("agent_id", agentIds);

    if (error) {
      console.error("response-rates query error:", error);
      return NextResponse.json(
        { error: "응답률 조회에 실패했습니다" },
        { status: 500 },
      );
    }

    const grouped = new Map<
      string,
      Array<{
        status: string | null;
        cancelled_by?: string | null;
        created_at?: string | null;
        cancelled_at?: string | null;
        visited_at?: string | null;
        request_rejected_at?: string | null;
      }>
    >();
    (data ?? []).forEach((row) => {
      const agentId = String((row as { agent_id?: string | null }).agent_id ?? "");
      if (!agentId) return;
      if (!grouped.has(agentId)) grouped.set(agentId, []);
      grouped.get(agentId)?.push({
        status: (row as { status?: string | null }).status ?? null,
        cancelled_by: (row as { cancelled_by?: string | null }).cancelled_by ?? null,
        created_at: (row as { created_at?: string | null }).created_at ?? null,
        cancelled_at: (row as { cancelled_at?: string | null }).cancelled_at ?? null,
        visited_at: (row as { visited_at?: string | null }).visited_at ?? null,
        request_rejected_at:
          (row as { request_rejected_at?: string | null }).request_rejected_at ?? null,
      });
    });

    const responseRates: ResponseRateMap = {};
    const avgResponseMinutes: AvgResponseMinutesMap = {};
    agentIds.forEach((agentId) => {
      const rows = grouped.get(agentId) ?? [];
      responseRates[agentId] = computeResponseRate(rows);
      avgResponseMinutes[agentId] = computeAverageResponseMinutes(rows);
    });

    return NextResponse.json({ responseRates, avgResponseMinutes });
  } catch (err) {
    console.error("POST /api/agents/response-rates error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
