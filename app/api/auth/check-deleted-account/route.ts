// app/api/auth/check-deleted-account/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "이메일이 필요합니다." },
        { status: 400 }
      );
    }

    // auth.users에서 이메일로 사용자 찾기
    const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
    const user = userList?.users.find((u) => u.email === email);

    if (!user) {
      return NextResponse.json({
        isDeleted: false,
        isBanned: false,
      });
    }

    // ban 여부 확인
    const bannedUntil = (user as { banned_until?: string | null }).banned_until;
    const isBanned = bannedUntil != null;

    // profiles에서 deleted_at 확인
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("deleted_at")
      .eq("id", user.id)
      .single();

    // deleted_at이 존재하고 null이 아닌 경우만 isDeleted = true
    const isDeleted = profile?.deleted_at != null;

    return NextResponse.json({
      isDeleted,
      isBanned,
      userId: user.id,
    });
  } catch (err) {
    console.error("탈퇴 계정 확인 오류:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
