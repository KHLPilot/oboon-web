import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code) {
    return NextResponse.redirect(new URL("/auth/login?error=no_code", process.env.NEXT_PUBLIC_SITE_URL!));
  }

  try {
    // 1. 네이버 Access Token 요청
    const tokenRes = await fetch(
      `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${process.env.NAVER_CLIENT_ID}&client_secret=${process.env.NAVER_CLIENT_SECRET}&code=${code}&state=${state}`
    );
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return NextResponse.redirect(new URL("/auth/login?error=token_failed", process.env.NEXT_PUBLIC_SITE_URL!));
    }

    // 2. 네이버 프로필 조회
    const profileRes = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profileData = await profileRes.json();

    const { email, name } = profileData.response;

    if (!email) {
      return NextResponse.redirect(new URL("/auth/login?error=no_email", process.env.NEXT_PUBLIC_SITE_URL!));
    }

    // 3. 기존 유저 확인
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = users.find((u) => u.email === email);

    let userId: string;

    if (existingUser) {
      // 기존 유저
      userId = existingUser.id;
    } else {
      // 신규 유저 생성
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          provider: "naver",
          name: name || "네이버 사용자",
        },
      });

      if (error || !data?.user) {
        // 재조회
        const { data: { users: retry } } = await supabaseAdmin.auth.admin.listUsers();
        const retryUser = retry.find((u) => u.email === email);

        if (retryUser) {
          userId = retryUser.id;
        } else {
          return NextResponse.redirect(new URL("/auth/login?error=create_failed", process.env.NEXT_PUBLIC_SITE_URL!));
        }
      } else {
        userId = data.user.id;
      }
    }

    // 4. ✅ generateLink로 OTP 생성
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: email,
    });

    if (linkError || !linkData) {
      console.error("❌ 링크 생성 실패:", linkError);
      return NextResponse.redirect(new URL("/auth/login?error=link_failed", process.env.NEXT_PUBLIC_SITE_URL!));
    }

    // 5. ✅ /auth/callback으로 리다이렉트 (OTP 포함)
    const redirectUrl = new URL("/auth/callback", process.env.NEXT_PUBLIC_SITE_URL!);
    redirectUrl.searchParams.set("type", "naver");
    redirectUrl.searchParams.set("token_hash", linkData.properties.hashed_token);
    redirectUrl.searchParams.set("email", email);

    return NextResponse.redirect(redirectUrl.toString());

  } catch (error: any) {
    console.error("❌ 네이버 OAuth 오류:", error);
    return NextResponse.redirect(new URL("/auth/login?error=unknown", process.env.NEXT_PUBLIC_SITE_URL!));
  }
}
