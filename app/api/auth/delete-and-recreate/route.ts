// app/api/auth/delete-and-recreate/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId가 필요합니다." },
        { status: 400 }
      );
    }

    // 1. profiles 레코드 삭제 (FK 제약 해제를 위해 먼저 삭제)
    // 관련 데이터(채팅, 댓글, 예약 등)는 '탈퇴한 사용자'로 이미 익명화됨
    const { error: profileDeleteError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileDeleteError) {
      console.error("Profile 삭제 실패:", profileDeleteError);
      // profiles 삭제 실패해도 auth 삭제 시도
    }

    // 2. 기존 auth.users 완전 삭제
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      userId
    );

    if (deleteError) {
      console.error("Auth 사용자 삭제 실패:", deleteError);
      return NextResponse.json(
        { error: "계정 삭제 실패: " + deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "기존 계정이 삭제되었습니다. 새로 가입해주세요.",
    });
  } catch (err) {
    console.error("계정 삭제 및 재생성 오류:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
