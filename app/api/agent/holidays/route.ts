import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type HolidayRow = {
  holiday_date: string;
};

function isString(value: unknown): value is string {
  return typeof value === "string";
}

async function ensureAgentRole(userId: string) {
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  return profile?.role === "agent" || profile?.role === "admin";
}

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasRole = await ensureAgentRole(user.id);
    if (!hasRole) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data } = await adminSupabase
      .from("agent_holidays")
      .select("holiday_date")
      .eq("agent_id", user.id)
      .order("holiday_date");

    const dates = (data ?? []).map((row: HolidayRow) => row.holiday_date);
    return NextResponse.json({ dates });
  } catch (err: unknown) {
    console.error("Failed to load holidays:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasRole = await ensureAgentRole(user.id);
    if (!hasRole) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const dates = Array.isArray(body?.dates)
      ? (body.dates as unknown[])
      : null;

    if (!dates) {
      return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
    }

    const normalizedDates: string[] = Array.from(
      new Set(
        dates
          .filter(isString)
          .map((value) => value.trim())
          .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)),
      ),
    ).sort();

    const { data: existingRows } = await adminSupabase
      .from("agent_holidays")
      .select("holiday_date")
      .eq("agent_id", user.id);

    const existingDates = new Set(
      (existingRows ?? []).map((row: HolidayRow) => row.holiday_date),
    );

    const datesToAdd = normalizedDates.filter(
      (dateKey) => !existingDates.has(dateKey),
    );
    const datesToRemove = Array.from(existingDates).filter(
      (dateKey) => !normalizedDates.includes(dateKey),
    );

    if (datesToAdd.length > 0) {
      const rows = datesToAdd.map((dateKey) => ({
        agent_id: user.id,
        holiday_date: dateKey,
      }));

      const { error } = await adminSupabase
        .from("agent_holidays")
        .upsert(rows, { onConflict: "agent_id,holiday_date" });

      if (error) {
        console.error("Failed to save holidays:", error);
        return NextResponse.json({ error: "Save failed" }, { status: 500 });
      }
    }

    if (datesToRemove.length > 0) {
      const { error } = await adminSupabase
        .from("agent_holidays")
        .delete()
        .eq("agent_id", user.id)
        .in("holiday_date", datesToRemove);

      if (error) {
        console.error("Failed to remove holidays:", error);
        return NextResponse.json({ error: "Delete failed" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Holiday API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
