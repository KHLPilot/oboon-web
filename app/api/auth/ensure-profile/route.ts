// app/api/auth/ensure-profile/route.ts
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code"); // OAuth PKCE 코드

  const cookieStore = cookies();

  // 이 라우트 전용 Supabase 서버 클라이언트
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );

  // 1) URL에 code가 있으면 -> 세션으로 교환 (이때 쿠키에 세션이 저장됨)
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  // 2) 이제 유저 정보 가져오기
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // 여전히 null이면 아직 로그인 안 된 상태
    return NextResponse.json({ message: "no user" }, { status: 401 });
  }

  // 3) profiles 테이블에 이미 있는지 확인
  const { data: profile, error: selectError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  // 4) 없으면 새로 생성
  if (!profile && !selectError) {
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id, // RLS 정책: auth.uid() = id 조건 맞추기
      email: user.email,
      name:
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0],
      role: "user",
    });

    if (insertError) {
      console.error("insert profile error", insertError);
    }
  }

  // 5) 프로필 처리 끝나면 홈(or 원하는 페이지)으로 돌려보내기
  return NextResponse.redirect(new URL("/", requestUrl.origin));
}