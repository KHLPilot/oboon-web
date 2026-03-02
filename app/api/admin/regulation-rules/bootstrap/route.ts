import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

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

export async function POST(request: Request) {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams, origin } = new URL(request.url);
    const dryRun = searchParams.get("dryRun") !== "false";
    const cronSecret = process.env.CRON_SECRET;
    const response = await fetch(
      `${origin}/api/cron/regulation-rules-bootstrap?dryRun=${dryRun ? "true" : "false"}`,
      {
        method: "GET",
        headers: cronSecret ? { Authorization: `Bearer ${cronSecret}` } : undefined,
        cache: "no-store",
      },
    );

    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            typeof payload?.error === "string"
              ? payload.error
              : "regulation_rules_bootstrap_failed",
          details: payload?.details,
        },
        { status: response.status },
      );
    }

    return NextResponse.json(payload ?? { success: true, dryRun });
  } catch (error) {
    return NextResponse.json(
      {
        error: "regulation_rules_bootstrap_proxy_failed",
        details: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    );
  }
}
