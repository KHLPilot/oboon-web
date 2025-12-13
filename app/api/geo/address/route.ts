// app/api/auth/kakao/geocode/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");

  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const res = await fetch(
    `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(
      query
    )}`,
    {
      headers: {
        Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}`,
      },
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Kakao API error" }, { status: 500 });
  }

  const json = await res.json();

  if (!json.documents || json.documents.length === 0) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  const doc = json.documents[0];

  // ✅ 프론트에서 바로 쓰기 좋은 형태로 변환
  return NextResponse.json({
    road_address: doc.road_address?.address_name ?? null,
    jibun_address: doc.address?.address_name ?? null,
    lat: doc.y,
    lng: doc.x,
    region_1depth: doc.address?.region_1depth_name ?? null,
    region_2depth: doc.address?.region_2depth_name ?? null,
    region_3depth: doc.address?.region_3depth_name ?? null,
  });
}
