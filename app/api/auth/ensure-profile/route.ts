import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ needOnboarding: false });

  // 프로필 조회
  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // 프로필 자체가 없으면 온보딩 필요
  if (!existing) {
    return NextResponse.json({ needOnboarding: true });
  }

  // 이름 / 지역 / 전화번호 중 하나라도 없으면 온보딩
  if (!existing.name || !existing.region || !existing.phone_number) {
    return NextResponse.json({ needOnboarding: true });
  }

  return NextResponse.json({ needOnboarding: false });
}