import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createRestoreOAuthTempSession } from "@/lib/auth/oauthTempSession";
import {
  clearOAuthStateCookie,
  readOAuthStateCookie,
  resolveMatchingOAuthState,
} from "@/lib/auth/oauthState";
import {
  checkAuthRateLimit,
  getClientIp,
  oauthCallbackIpLimiter,
} from "@/lib/rateLimit";

type GoogleProfileRow = {
  role: string | null;
  name: string | null;
  phone_number: string | null;
  deleted_at: string | null;
};

const adminSupabase = createSupabaseAdminClient();

function redirectWithClearedState(siteOrigin: string, path: string): NextResponse {
  const response = NextResponse.redirect(new URL(path, siteOrigin));
  return clearOAuthStateCookie(response, "google");
}

function invalidStateResponse(): NextResponse {
  const response = NextResponse.json(
    { error: "잘못된 인증 요청입니다." },
    { status: 400 },
  );

  return clearOAuthStateCookie(response, "google");
}

export async function GET(req: Request) {
  const rateLimitRes = await checkAuthRateLimit(
    oauthCallbackIpLimiter,
    getClientIp(req),
    { windowMs: 60 * 1000 },
  );
  if (rateLimitRes) return rateLimitRes;

  const url = new URL(req.url);
  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || url.origin;
  const cookieStore = await cookies();
  const storedState = readOAuthStateCookie("google", cookieStore);
  const stateCandidates = url.searchParams
    .getAll("state")
    .map((value) => value.trim())
    .filter(Boolean);
  const matchedState = resolveMatchingOAuthState(storedState, stateCandidates);
  const code = url.searchParams.get("code")?.trim();

  if (!matchedState) {
    return invalidStateResponse();
  }

  if (!code) {
    return redirectWithClearedState(siteOrigin, "/auth/login?error=no_code");
  }

  try {
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data?.user) {
      console.error("[google/callback] session exchange", {
        status: typeof (error as { status?: unknown } | null)?.status === "number"
          ? ((error as { status?: number }).status ?? 500)
          : 500,
        message: "session exchange failed",
      });

      if (error?.message?.toLowerCase().includes("banned")) {
        return redirectWithClearedState(siteOrigin, "/auth/login?error=banned");
      }

      return redirectWithClearedState(siteOrigin, "/auth/login?error=session_failed");
    }

    const user = data.user;
    const [{ data: profile, error: profileError }, { data: authUserData, error: authUserError }] =
      await Promise.all([
        adminSupabase
          .from("profiles")
          .select("role, name, phone_number, deleted_at")
          .eq("id", user.id)
          .maybeSingle(),
        adminSupabase.auth.admin.getUserById(user.id),
      ]);

    if (profileError) {
      console.error("[google/callback] profile lookup", {
        status: 500,
        message: "profile lookup failed",
      });
      await supabase.auth.signOut();
      return redirectWithClearedState(siteOrigin, "/auth/login?error=auth_failed");
    }

    if (authUserError) {
      console.error("[google/callback] auth status lookup", {
        status: typeof (authUserError as { status?: unknown }).status === "number"
          ? ((authUserError as { status?: number }).status ?? 500)
          : 500,
        message: "auth status lookup failed",
      });
      await supabase.auth.signOut();
      return redirectWithClearedState(siteOrigin, "/auth/login?error=auth_failed");
    }

    const profileRow = (profile as GoogleProfileRow | null) ?? null;
    const bannedUntil =
      (authUserData.user as { banned_until?: string | null } | null)?.banned_until ?? null;

    if (bannedUntil) {
      await supabase.auth.signOut();
      return redirectWithClearedState(siteOrigin, "/auth/login?error=banned");
    }

    if (profileRow?.deleted_at) {
      await supabase.auth.signOut();

      if (!user.email) {
        return redirectWithClearedState(siteOrigin, "/auth/login?error=banned");
      }

      const sessionKey = await createRestoreOAuthTempSession({
        userId: user.id,
        email: user.email,
      });

      return redirectWithClearedState(
        siteOrigin,
        `/auth/restore?s=${encodeURIComponent(sessionKey)}`,
      );
    }

    const isMissingProfile =
      !profileRow ||
      !profileRow.name ||
      profileRow.name === "temp" ||
      !profileRow.phone_number ||
      profileRow.phone_number === "temp";

    if (profileRow?.role === "admin") {
      return redirectWithClearedState(siteOrigin, "/admin");
    }

    if (isMissingProfile) {
      return redirectWithClearedState(siteOrigin, "/auth/onboarding");
    }

    return redirectWithClearedState(siteOrigin, "/");
  } catch {
    console.error("[google/callback] oauth callback", {
      status: 500,
      message: "unexpected error",
    });
    return redirectWithClearedState(siteOrigin, "/auth/login?error=unknown");
  }
}
