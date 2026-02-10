import { NextRequest, NextResponse } from "next/server";

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY!;

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);

    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (!lat || !lng) {
        return NextResponse.json(
            { error: "lat, lng are required" },
            { status: 400 }
        );
    }

    try {
        const res = await fetch(
            `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`,
            {
                headers: {
                    Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
                },
            }
        );

        const data = await res.json();

        const address = data.documents?.[0]?.address;

        if (!address) {
            return NextResponse.json(
                { error: "주소를 찾을 수 없습니다." },
                { status: 404 }
            );
        }

        return NextResponse.json({
            region_1depth: address.region_1depth_name,
            region_2depth: address.region_2depth_name,
            region_3depth: address.region_3depth_name,
        });
    } catch {
        return NextResponse.json(
            { error: "reverse geocode failed" },
            { status: 500 }
        );
    }
}
