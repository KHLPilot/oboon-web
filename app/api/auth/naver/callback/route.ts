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
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  try {
    // 1) 네이버 Access Token 요청
    const tokenRes = await fetch(
      `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${process.env.NAVER_CLIENT_ID}&client_secret=${process.env.NAVER_CLIENT_SECRET}&code=${code}&state=${state}`
    );
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return NextResponse.json({ error: "Token error" }, { status: 400 });
    }

    // 2) 네이버 프로필 조회
    const profileRes = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profileData = await profileRes.json();

    const { email, name } = profileData.response;

    if (!email) {
      return NextResponse.json({ error: "Email not provided" }, { status: 400 });
    }

    // 3) 기존 유저 확인
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = users.find((u) => u.email === email);

    let userId: string;

    if (existingUser) {
      // ✅ 기존 유저: 메타데이터만 업데이트
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        user_metadata: {
          provider: "naver",
          name: name || "네이버 사용자"
        },
      });
      userId = existingUser.id;
    } else {
      // ✅ 신규 유저: auth.users 생성
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          provider: "naver",
          name: name || "네이버 사용자",
        },
      });

      if (error || !data.user) {
        console.error("User creation error:", error);
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
      }

      userId = data.user.id;

      // ✅ profiles 테이블에 temp 값으로 생성
      const { error: profileError } = await supabaseAdmin.from("profiles").insert({
        id: userId,
        email: email,
        name: "temp",
        nickname: null,
        phone_number: "temp",
        user_type: "personal",
        role: "user",
      });

      if (profileError) {
        console.error("Profile creation error:", profileError);
      }
    }

    // 4) 세션 생성을 위한 매직링크 생성
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/`,
      },
    });

    if (linkError || !linkData) {
      console.error("Link generation error:", linkError);
      return NextResponse.json({ error: "Failed to generate login link" }, { status: 500 });
    }

    // 5) 매직링크로 리다이렉트 (자동 로그인)
    return NextResponse.redirect(linkData.properties.action_link);
  } catch (error: any) {
    console.error("Naver OAuth error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}