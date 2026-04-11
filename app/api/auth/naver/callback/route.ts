import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createRestoreOAuthTempSession } from "@/lib/auth/oauthTempSession";
import { findAuthUserByEmail } from "@/lib/supabaseAdminAuth";
import { setRestoreSessionCookie } from "@/lib/auth/restoreSessionCookie";
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

const adminSupabase = createSupabaseAdminClient();

type NaverTokenResponse = {
  access_token?: string;
};

type NaverProfileResponse = {
  response?: {
    email?: string;
    name?: string;
  };
};

function redirectWithClearedState(siteOrigin: string, path: string): NextResponse {
  const response = NextResponse.redirect(new URL(path, siteOrigin));
  return clearOAuthStateCookie(response, "naver");
}

function invalidStateResponse(): NextResponse {
  const response = NextResponse.json(
    { error: "잘못된 인증 요청입니다." },
    { status: 400 },
  );

  return clearOAuthStateCookie(response, "naver");
}

function isAuthUserBanned(user: User | null | undefined): boolean {
  return Boolean((user as { banned_until?: string | null } | null)?.banned_until ?? null);
}

async function resolveAuthUser(email: string, name: string): Promise<User | null> {
  const existingUser = await findAuthUserByEmail(adminSupabase, email);

  if (existingUser) {
    return existingUser;
  }

  const { data, error } = await adminSupabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      provider: "naver",
      name,
    },
  });

  if (!error && data?.user) {
    return data.user;
  }

  console.error("[naver/callback] auth user create", {
    status: 500,
    message: "auth user create failed",
  });

  return findAuthUserByEmail(adminSupabase, email);
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
  const storedState = readOAuthStateCookie("naver", cookieStore);
  const stateCandidates = url.searchParams
    .getAll("state")
    .map((value) => value.trim())
    .filter(Boolean);
  const code = url.searchParams.get("code")?.trim();
  const stateForTokenExchange = resolveMatchingOAuthState(storedState, stateCandidates);

  if (!stateForTokenExchange) {
    return invalidStateResponse();
  }

  if (!code) {
    return redirectWithClearedState(siteOrigin, "/auth/login?error=no_code");
  }

  try {
    const tokenRes = await fetch("https://nid.naver.com/oauth2.0/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.NAVER_CLIENT_ID!,
        client_secret: process.env.NAVER_CLIENT_SECRET!,
        code,
        state: stateForTokenExchange,
      }),
      cache: "no-store",
    });

    if (!tokenRes.ok) {
      console.error("[naver/callback] token exchange", {
        status: tokenRes.status,
        message: "token exchange failed",
      });
      return redirectWithClearedState(siteOrigin, "/auth/login?error=auth_failed");
    }

    const tokenData = (await tokenRes.json()) as NaverTokenResponse;

    if (!tokenData.access_token) {
      console.error("[naver/callback] token exchange", {
        status: tokenRes.status,
        message: "missing access token",
      });
      return redirectWithClearedState(siteOrigin, "/auth/login?error=auth_failed");
    }

    const profileRes = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
      cache: "no-store",
    });

    if (!profileRes.ok) {
      console.error("[naver/callback] profile fetch", {
        status: profileRes.status,
        message: "profile fetch failed",
      });
      return redirectWithClearedState(siteOrigin, "/auth/login?error=auth_failed");
    }

    const profileData = (await profileRes.json()) as NaverProfileResponse;
    const email = profileData.response?.email?.trim().toLowerCase() ?? "";
    const name = profileData.response?.name?.trim() || "네이버 사용자";

    if (!email) {
      console.error("[naver/callback] profile fetch", {
        status: profileRes.status,
        message: "missing email",
      });
      return redirectWithClearedState(siteOrigin, "/auth/login?error=auth_failed");
    }

    const authUser = await resolveAuthUser(email, name);

    if (!authUser) {
      return redirectWithClearedState(siteOrigin, "/auth/login?error=auth_failed");
    }

    if (isAuthUserBanned(authUser)) {
      return redirectWithClearedState(siteOrigin, "/auth/login?error=banned");
    }

    const { data: profile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("deleted_at")
      .eq("id", authUser.id)
      .maybeSingle();

    if (profileError) {
      console.error("[naver/callback] profile lookup", {
        status: 500,
        message: "profile lookup failed",
      });
      return redirectWithClearedState(siteOrigin, "/auth/login?error=auth_failed");
    }

    if ((profile as { deleted_at: string | null } | null)?.deleted_at) {
      const sessionKey = await createRestoreOAuthTempSession({
        userId: authUser.id,
        email,
      });

      const response = redirectWithClearedState(siteOrigin, "/auth/restore");
      return setRestoreSessionCookie(response, sessionKey);
    }

    const { data: linkData, error: linkError } =
      await adminSupabase.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

    if (linkError || !linkData?.properties.hashed_token) {
      console.error("[naver/callback] magic link", {
        status: 500,
        message: "magic link generation failed",
      });
      return redirectWithClearedState(siteOrigin, "/auth/login?error=auth_failed");
    }

    const redirectUrl = new URL("/auth/callback", siteOrigin);
    redirectUrl.searchParams.set("type", "naver");
    redirectUrl.searchParams.set("token_hash", linkData.properties.hashed_token);

    return redirectWithClearedState(siteOrigin, redirectUrl.toString());
  } catch {
    console.error("[naver/callback] oauth callback", {
      status: 500,
      message: "unexpected error",
    });
    return redirectWithClearedState(siteOrigin, "/auth/login?error=unknown");
  }
}
