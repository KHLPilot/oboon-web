//app/api/auth/kakao/geocode/route.ts

import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");

  if (!query) {
    return NextResponse.json({ error: "No query" }, { status: 400 });
  }

  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(
    query
  )}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}`,
    },
  });

  const data = await res.json();
  return NextResponse.json(data);
}