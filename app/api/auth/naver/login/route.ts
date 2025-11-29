import { NextResponse } from "next/server";

export async function GET() {
  const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID!;
  const NAVER_CALLBACK_URL = process.env.NAVER_CALLBACK_URL!;
  
  const state = Math.random().toString(36).slice(2);

  const authUrl = 
    `https://nid.naver.com/oauth2.0/authorize?response_type=code` +
    `&client_id=${NAVER_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(NAVER_CALLBACK_URL)}` +
    `&state=${state}` +
    `&auth_type=reauthenticate`;

  return NextResponse.redirect(authUrl);
}