// app/api/auth/ensure-profile/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.redirect("/login");

  // DB에서 사용자 존재 여부 확인
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existing) {
    const meta = user.user_metadata || {};
    await supabase.from("profiles").insert({
      id: user.id,
      email: user.email,
      name:
        meta.full_name ||
        meta.name ||
        user.email?.split("@")[0] ||
        "회원",
      avatar_url: meta.avatar_url || meta.picture || null,
      role: "user",
    });
  }

  return NextResponse.redirect("/");
}