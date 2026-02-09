// app/api/auth/restore-account/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId, email } = await req.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: "userId와 email이 필요합니다." },
        { status: 400 }
      );
    }

    // 1. auth.users ban 해제
    const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { ban_duration: "none" }
    );

    if (unbanError) {
      console.error("Ban 해제 실패:", unbanError);
      return NextResponse.json(
        { error: "계정 복구 실패" },
        { status: 500 }
      );
    }

    // 2. profiles 복원 (deleted_at null, 이메일 복원)
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        deleted_at: null,
        email: email,
        // name, nickname, phone_number는 온보딩에서 다시 입력
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Profile 복원 실패:", updateError);
      return NextResponse.json(
        { error: "프로필 복원 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "계정이 복구되었습니다. 프로필 정보를 다시 입력해주세요.",
    });
  } catch (err) {
    console.error("계정 복구 오류:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
