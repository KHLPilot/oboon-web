import { NextResponse } from "next/server";
import {
  createOAuthState,
  setOAuthStateCookie,
} from "@/lib/auth/oauthState";

export async function GET() {
  const authUrl = new URL("https://nid.naver.com/oauth2.0/authorize");
  const state = createOAuthState();

  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", process.env.NAVER_CLIENT_ID!);
  authUrl.searchParams.set("redirect_uri", process.env.NAVER_CALLBACK_URL!);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("auth_type", "reauthenticate");

  const response = NextResponse.redirect(authUrl);
  return setOAuthStateCookie(response, "naver", state);
}
