import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const DEFAULT_START = "10:00";
const DEFAULT_END = "17:00";

function isValidTime(value: unknown) {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value);
}

// GET: 기본 운영시간 조회
export async function GET() {
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
      return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
    }

    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "agent" && profile?.role !== "admin") {
      return NextResponse.json({ error: "상담사 권한 필요" }, { status: 403 });
    }

    const { data } = await adminSupabase
      .from("agent_working_hours")
      .select("day_of_week, start_time, end_time, is_enabled")
      .eq("agent_id", user.id)
      .order("day_of_week");

    return NextResponse.json({ rows: data ?? [] });
  } catch (err: unknown) {
    console.error("기본 운영시간 조회 오류:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// POST: 기본 운영시간 저장
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
      return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
    }

    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "agent" && profile?.role !== "admin") {
      return NextResponse.json({ error: "상담사 권한 필요" }, { status: 403 });
    }

    const body = await req.json();
    const { weekdayEnabled, weekdayStart, weekdayEnd } = body ?? {};

    if (
      typeof weekdayEnabled !== "boolean" ||
      !isValidTime(weekdayStart) ||
      !isValidTime(weekdayEnd)
    ) {
      return NextResponse.json(
        { error: "weekdayEnabled, weekdayStart, weekdayEnd 필요" },
        { status: 400 },
      );
    }

    const weekdayStartTime = weekdayEnabled ? weekdayStart : DEFAULT_START;
    const weekdayEndTime = weekdayEnabled ? weekdayEnd : DEFAULT_END;

    const rows = [
      {
        day_of_week: 0,
        start_time: weekdayStartTime,
        end_time: weekdayEndTime,
        is_enabled: weekdayEnabled,
      },
      {
        day_of_week: 1,
        start_time: weekdayStartTime,
        end_time: weekdayEndTime,
        is_enabled: weekdayEnabled,
      },
      {
        day_of_week: 2,
        start_time: weekdayStartTime,
        end_time: weekdayEndTime,
        is_enabled: weekdayEnabled,
      },
      {
        day_of_week: 3,
        start_time: weekdayStartTime,
        end_time: weekdayEndTime,
        is_enabled: weekdayEnabled,
      },
      {
        day_of_week: 4,
        start_time: weekdayStartTime,
        end_time: weekdayEndTime,
        is_enabled: weekdayEnabled,
      },
      {
        day_of_week: 5,
        start_time: weekdayStartTime,
        end_time: weekdayEndTime,
        is_enabled: weekdayEnabled,
      },
      {
        day_of_week: 6,
        start_time: weekdayStartTime,
        end_time: weekdayEndTime,
        is_enabled: weekdayEnabled,
      },
    ].map((row) => ({ ...row, agent_id: user.id }));

    const { error } = await adminSupabase
      .from("agent_working_hours")
      .upsert(rows, { onConflict: "agent_id,day_of_week" });

    if (error) {
      console.error("기본 운영시간 저장 오류:", error);
      return NextResponse.json({ error: "저장 실패" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("기본 운영시간 API 오류:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
