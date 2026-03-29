import "server-only";
import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createSupabaseServer } from "@/lib/supabaseServer";

export const adminSupabase = createSupabaseAdminClient();

type RequireAdminRouteResult =
  | {
      ok: true;
      user: User;
    }
  | {
      ok: false;
      response: NextResponse;
    };

export async function requireAdminRoute(): Promise<RequireAdminRouteResult> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "인증 필요" }, { status: 401 }),
    };
  }

  const { data: adminProfile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[admin] 관리자 권한 확인 실패:", {
      adminId: user.id,
      code: profileError.code,
    });

    return {
      ok: false,
      response: NextResponse.json(
        { error: "처리 중 오류 발생" },
        { status: 500 },
      ),
    };
  }

  if (adminProfile?.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "관리자 권한 필요" },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true,
    user,
  };
}
