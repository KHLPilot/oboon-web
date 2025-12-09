// app/api/auth/ensure-profile/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  // 🔍 1) 유저 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "no user" });
  }

  // 🔍 2) profiles 테이블에 이미 있는지 확인
  const { data: exist } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  // 🔍 3) 없으면 새로 생성
  if (!exist) {
    await supabase.from("profiles").insert({
      id: user.id,
      email: user.email,
      name:
        user.user_metadata.full_name ||
        user.user_metadata.name ||
        user.email?.split("@")[0],
      role: "user",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  // 🔍 4) 생성 후 리다이렉트
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_SITE_URL!));
}