// app/api/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Supabase가 URL 해시(token) 을 읽어서 session 저장
  const { data, error } = await supabase.auth.getUser();

  if (!data.user) {
    return NextResponse.redirect("/login");
  }

  // DB 프로필 생성
  await fetch(`${req.headers.get("origin")}/api/auth/ensure-profile`, {
    cache: "no-store",
  });

  // 로그인 성공 → 홈 이동
  return NextResponse.redirect("/");
}