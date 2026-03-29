import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

const OAUTH_STATE_COOKIE_NAME = "oauth_state";
const OAUTH_STATE_MAX_AGE_SECONDS = 60 * 5;

export async function GET() {
  const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID!;
  const NAVER_CALLBACK_URL = process.env.NAVER_CALLBACK_URL!;
  const state = randomUUID();
  const authUrl = new URL("https://nid.naver.com/oauth2.0/authorize");

  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", NAVER_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", NAVER_CALLBACK_URL);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("auth_type", "reauthenticate");

  const response = NextResponse.redirect(authUrl);

  response.cookies.set(OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
    path: "/",
  });

  return response;
}
