import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code) return NextResponse.json({ error: "No code provided" }, { status: 400 });

  // 1) 네이버 Access Token 요청
  const tokenRes = await fetch(
    `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${process.env.NAVER_CLIENT_ID}&client_secret=${process.env.NAVER_CLIENT_SECRET}&code=${code}&state=${state}`
  ).then((res) => res.json());

  if (!tokenRes.access_token) return NextResponse.json({ error: "Token error" }, { status: 400 });

  // 2) 네이버 프로필 조회
  const profile = await fetch("https://openapi.naver.com/v1/nid/me", {
    headers: { Authorization: `Bearer ${tokenRes.access_token}` },
  }).then((res) => res.json());

  const { email, name } = profile.response;

  // 3) Supabase Admin 클라이언트
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 4) 유저 처리
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const existedUser = users.find(u => u.email === email);

  let user;

  if (existedUser) {
    // 기존 유저는 업데이트
    const { data, error } = await supabase.auth.admin.updateUserById(existedUser.id, {
      email_confirm: true,
      user_metadata: { provider: "naver", name: name }
    });
    user = data.user;
  } else {
    // 신규 유저는 생성
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { provider: "naver", name: name }
    });
    user = data.user;
  }

  // 5) 이메일 발송 없이 세션 생성을 위한 매직링크 생성
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: email,
    options: { redirectTo: "https://oboon-web.vercel.app/" }
  });

  if (linkError) {
    console.error("Link Error:", linkError.message);
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  // 6) 성공 리다이렉트
  return NextResponse.redirect(linkData.properties.action_link);
}