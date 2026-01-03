import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  // 1. 현재 로그인 유저 확인 (쿠키 기반)
  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json({ needOnboarding: false });
  }

  const accessToken = authHeader.replace("Bearer ", "");

  const {
    data: { user },
    error: userError,
  } = await adminSupabase.auth.getUser(accessToken);

  if (!user || userError) {
    return NextResponse.json({ needOnboarding: false });
  }

  // 2. profiles 조회
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // 3. profiles 없으면 생성
  if (!profile) {
    const { error: insertError } = await adminSupabase.from("profiles").insert({
      id: user.id,
      email: user.email,
      name: "temp",
      nickname: null,
      phone_number: "temp",
      user_type: "personal",
      role: "user",
    });

    if (insertError) {
      console.error("profiles insert error:", insertError);
    }

    return NextResponse.json({ needOnboarding: true });
  }

  // ✅ 4. 필수값 체크 (temp 값도 체크)
  const isNameMissing = !profile.name || profile.name === "temp";
  const isPhoneMissing = !profile.phone_number || profile.phone_number === "temp";

  if (isNameMissing || isPhoneMissing) {
    console.log("🔄 온보딩 필요:", {
      userId: user.id,
      name: profile.name,
      phone: profile.phone_number
    });
    return NextResponse.json({ needOnboarding: true });
  }

  // 모든 값이 정상 → 온보딩 불필요
  return NextResponse.json({ needOnboarding: false });
}