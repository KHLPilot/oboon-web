import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createRestoreOAuthTempSession } from "@/lib/auth/oauthTempSession";
import { findAuthUserByEmail } from "@/lib/supabaseAdminAuth";

const supabaseAdmin = createSupabaseAdminClient();

const OAUTH_STATE_COOKIE_NAME = "oauth_state";
type NaverTokenResponse = {
  access_token?: string;
};

type NaverProfileResponse = {
  response?: {
    email?: string;
    name?: string;
  };
};

function clearOAuthStateCookie(response: NextResponse) {
  response.cookies.set(OAUTH_STATE_COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  return response;
}

function redirectWithClearedState(path: string) {
  const response = NextResponse.redirect(
    new URL(path, process.env.NEXT_PUBLIC_SITE_URL!),
  );
  return clearOAuthStateCookie(response);
}

function redirectToAuthFailed() {
  return redirectWithClearedState("/auth/login?error=auth_failed");
}

async function resolveAuthUser(email: string, name: string): Promise<User | null> {
  const existingUser = await findAuthUserByEmail(supabaseAdmin, email);

  if (existingUser) {
    return existingUser;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
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

  console.error("[naver/callback] auth user create failed");
  return findAuthUserByEmail(supabaseAdmin, email);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code")?.trim();
  const state = url.searchParams.get("state")?.trim();
  const cookieStore = await cookies();
  const storedState = cookieStore.get(OAUTH_STATE_COOKIE_NAME)?.value?.trim();

  if (!state || !storedState || storedState !== state) {
    return redirectWithClearedState("/auth/login?error=invalid_state");
  }
  cookieStore.set(OAUTH_STATE_COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });

  if (!code) {
    return redirectToAuthFailed();
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
        state,
      }),
      cache: "no-store",
    });

    if (!tokenRes.ok) {
      console.error("[naver/callback] token exchange failed", {
        status: tokenRes.status,
      });
      return redirectToAuthFailed();
    }

    const tokenData = (await tokenRes.json()) as NaverTokenResponse;

    if (!tokenData.access_token) {
      console.error("[naver/callback] token response missing access token", {
        status: tokenRes.status,
      });
      return redirectToAuthFailed();
    }

    const profileRes = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
      cache: "no-store",
    });

    if (!profileRes.ok) {
      console.error("[naver/callback] profile fetch failed", {
        status: profileRes.status,
      });
      return redirectToAuthFailed();
    }

    const profileData = (await profileRes.json()) as NaverProfileResponse;
    const email = profileData.response?.email?.trim().toLowerCase() ?? "";
    const name = profileData.response?.name?.trim() || "네이버 사용자";

    if (!email) {
      console.error("[naver/callback] profile response missing email", {
        status: profileRes.status,
      });
      return redirectToAuthFailed();
    }

    const authUser = await resolveAuthUser(email, name);

    if (!authUser) {
      return redirectToAuthFailed();
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("deleted_at")
      .eq("id", authUser.id)
      .maybeSingle();

    if (profileError) {
      console.error("[naver/callback] profile lookup failed");
      return redirectToAuthFailed();
    }

    if ((profile as { deleted_at: string | null } | null)?.deleted_at) {
      const sessionKey = await createRestoreOAuthTempSession({
        userId: authUser.id,
        email,
      });

      return redirectWithClearedState(
        `/auth/restore?s=${encodeURIComponent(sessionKey)}`,
      );
    }

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (linkError || !linkData?.properties.hashed_token) {
      console.error("[naver/callback] magic link generation failed");
      return redirectToAuthFailed();
    }

    const redirectUrl = new URL("/auth/callback", process.env.NEXT_PUBLIC_SITE_URL!);
    redirectUrl.searchParams.set("type", "naver");
    redirectUrl.searchParams.set("token_hash", linkData.properties.hashed_token);

    return redirectWithClearedState(redirectUrl.toString());
  } catch {
    console.error("[naver/callback] unexpected error");
    return redirectToAuthFailed();
  }
}
