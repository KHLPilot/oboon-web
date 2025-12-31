import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
  }
);

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json({ needOnboarding: false });
  }

  const accessToken = authHeader.replace("Bearer ", "");

  // 토큰으로 유저 확인
  const {
    data: { user },
    error: userError,
  } = await adminSupabase.auth.getUser(accessToken);

  if (!user || userError) {
    return NextResponse.json({ needOnboarding: false });
  }

  // profiles 존재 여부만 확인
  const { data: profile, error } = await adminSupabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  // profile 없으면 → 온보딩 필요
  if (!profile) {
    return NextResponse.json({ needOnboarding: true });
  }

  // 있으면 → 무조건 통과
  return NextResponse.json({ needOnboarding: false });
}
