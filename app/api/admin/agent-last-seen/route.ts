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

export async function POST(req: Request) {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { userIds?: unknown };
    const userIds = Array.from(
      new Set(
        (Array.isArray(body.userIds) ? body.userIds : [])
          .map((id) => String(id ?? "").trim())
          .filter((id) => id.length > 0),
      ),
    );

    if (userIds.length === 0) {
      return NextResponse.json({ lastSignInAtByUserId: {} as Record<string, string | null> });
    }

    const wanted = new Set(userIds);
    const lastSignInAtByUserId: Record<string, string | null> = {};

    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data, error } = await adminSupabase.auth.admin.listUsers({
        page,
        perPage,
      });
      if (error) {
        throw error;
      }

      const users = data?.users ?? [];
      users.forEach((u) => {
        if (!wanted.has(u.id)) return;
        lastSignInAtByUserId[u.id] = u.last_sign_in_at ?? null;
      });

      if (users.length < perPage) break;
      page += 1;
    }

    userIds.forEach((id) => {
      if (!(id in lastSignInAtByUserId)) {
        lastSignInAtByUserId[id] = null;
      }
    });

    return NextResponse.json({ lastSignInAtByUserId });
  } catch (error) {
    console.error("POST /api/admin/agent-last-seen error:", error);
    return NextResponse.json(
      { error: "최근 접속 시간 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}

