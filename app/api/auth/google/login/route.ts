import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { createOAuthState, setOAuthStateCookie } from "@/lib/auth/oauthState";

export async function GET(req: Request) {
  const requestUrl = new URL(req.url);
  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || requestUrl.origin;
  const state = createOAuthState();
  const redirectTo = new URL("/api/auth/google/callback", siteOrigin);

  redirectTo.searchParams.set("state", state);

  try {
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectTo.toString(),
        skipBrowserRedirect: true,
      },
    });

    if (error || !data?.url) {
      console.error("[google/login] oauth start", {
        status: 500,
        message: "oauth start failed",
      });

      return NextResponse.redirect(new URL("/auth/login?error=auth_failed", siteOrigin));
    }

    const response = NextResponse.redirect(data.url);
    return setOAuthStateCookie(response, "google", state);
  } catch {
    console.error("[google/login] oauth start", {
      status: 500,
      message: "unexpected error",
    });

    return NextResponse.redirect(new URL("/auth/login?error=auth_failed", siteOrigin));
  }
}
