import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  // 🔹 1) ACCESS TOKEN 요청
  const tokenRes = await fetch(
    `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${process.env.NAVER_CLIENT_ID}&client_secret=${process.env.NAVER_CLIENT_SECRET}&code=${code}&state=${state}`,
    { method: "GET" }
  ).then((res) => res.json());

  const accessToken = tokenRes.access_token;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Failed to get access token", tokenRes },
      { status: 400 }
    );
  }

  // 🔹 2) 프로필 조회
  const profile = await fetch("https://openapi.naver.com/v1/nid/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then((res) => res.json());

  if (!profile?.response) {
    return NextResponse.json(
      { error: "Failed to load profile", profile },
      { status: 400 }
    );
  }

  const user = profile.response;
  const email = user.email;

  // 🔹 3) Supabase 서버 클라이언트 생성
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 🔹 4) 유저 존재 여부 확인 (auth.users 기준)
  const { data: allUsers } = await supabase.auth.admin.listUsers();
  const existedUser = allUsers.users.find(u => u.email === email);

  if (existedUser) {
    // 🔥 기존 유저 → metadata 업데이트
    await supabase.auth.admin.updateUserById(existedUser.id, {
      user_metadata: {
        provider: "naver",
        name: user.name,
      },
    });
  } else {
    // 🔥 신규 유저 생성
    await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        provider: "naver",
        name: user.name,
      },
    });
  }

  // 🔹 5) 세션(magic link) 생성
  const { data: link, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (error) {
    console.error("Magic link error:", error);
    return NextResponse.json(
      { error: "Failed to generate session link" },
      { status: 500 }
    );
  }

  // 🔹 6) magic link redirect → 자동 로그인
  return NextResponse.redirect(link.properties.action_link);
}
