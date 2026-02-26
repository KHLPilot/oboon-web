import { NextResponse } from "next/server";
import { fetchPublicNoticeBySlug } from "@/features/notice/services/notices.server";

export async function GET(
  _request: Request,
  context: { params: { slug: string } },
) {
  try {
    const item = await fetchPublicNoticeBySlug(context.params.slug);
    if (!item) {
      return NextResponse.json({ error: "공지사항을 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (error) {
    console.error("GET /api/notices/[slug] 오류:", error);
    return NextResponse.json({ error: "공지 조회에 실패했습니다." }, { status: 500 });
  }
}
