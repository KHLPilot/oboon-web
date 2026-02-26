import { NextResponse } from "next/server";
import {
  NOTICE_CATEGORY_TABS,
  type NoticeCategory,
} from "@/features/notice/data/notices";
import { fetchPublicNotices } from "@/features/notice/services/notices.server";

export const dynamic = "force-dynamic";

function parseCategory(value: string | null): NoticeCategory {
  if (!value) return "all";
  const valid = NOTICE_CATEGORY_TABS.some((tab) => tab.key === value);
  return valid ? (value as NoticeCategory) : "all";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = parseCategory(searchParams.get("category"));
    const items = await fetchPublicNotices(category);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET /api/notices 오류:", error);
    return NextResponse.json({ error: "공지 조회에 실패했습니다." }, { status: 500 });
  }
}
