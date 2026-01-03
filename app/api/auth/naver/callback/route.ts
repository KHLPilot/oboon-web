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
    // 1. 네이버 Access Token 요청
    const tokenRes = await fetch(
      `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${process.env.NAVER_CLIENT_ID}&client_secret=${process.env.NAVER_CLIENT_SECRET}&code=${code}&state=${state}`
    );
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error("❌ 네이버 토큰 발급 실패");
      return NextResponse.json({ error: "Token error" }, { status: 400 });
    }

    // 2. 네이버 프로필 조회
    const profileRes = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profileData = await profileRes.json();

    const { email, name } = profileData.response;

    if (!email) {
      console.error("❌ 네이버에서 이메일 정보 없음");
      return NextResponse.json({ error: "Email not provided" }, { status: 400 });
    }

    console.log("📧 네이버 로그인 시도:", email);

    // 3. 기존 유저 확인 (전체 유저 목록 조회)
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error("❌ 유저 목록 조회 실패:", listError);
      return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
    }

    const existingUser = users.find((u) => u.email === email);

    let userId: string;

    if (existingUser) {
      // ✅ 기존 유저 발견 - 메타데이터만 업데이트
      console.log("✅ 기존 유저 발견:", email);

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          user_metadata: {
            provider: "naver",
            name: name || "네이버 사용자",
          },
        }
      );

      if (updateError) {
        console.error("⚠️ 메타데이터 업데이트 실패:", updateError);
      }

      userId = existingUser.id;
      console.log("✅ 기존 유저로 로그인 처리");
    } else {
      // ✅ 신규 유저 - 생성 시도
      console.log("🆕 신규 유저 생성 시도:", email);

      const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          provider: "naver",
          name: name || "네이버 사용자",
        },
      });

      if (createError) {
        console.error("❌ 유저 생성 실패:", createError);
        console.error("❌ 에러 상세:", JSON.stringify(createError, null, 2));

        // ✅ 생성 실패 시 다시 한번 조회 (동시 요청 대응)
        console.log("🔄 유저 재조회 중...");
        const { data: { users: retryUsers } } = await supabaseAdmin.auth.admin.listUsers();
        const retryUser = retryUsers.find((u) => u.email === email);

        if (retryUser) {
          console.log("✅ 재조회 성공 - 유저 존재함:", email);
          userId = retryUser.id;
        } else {
          console.error("❌ 재조회 실패 - 유저 생성 불가");
          return NextResponse.json({
            error: "Failed to create user",
            details: createError.message,
            hint: "해당 이메일이 이미 존재하거나 Database 제약 조건 위반",
          }, { status: 500 });
        }
      } else if (data?.user) {
        userId = data.user.id;
        console.log("✅ 신규 유저 생성 완료:", email);
      } else {
        console.error("❌ 유저 데이터 없음");
        return NextResponse.json({ error: "No user data returned" }, { status: 500 });
      }
    }

    // 4. 세션 생성을 위한 매직링크 생성
    console.log("🔗 매직링크 생성 중...");

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/`,
      },
    });

    if (linkError || !linkData) {
      console.error("❌ 매직링크 생성 실패:", linkError);
      return NextResponse.json({ error: "Failed to generate login link" }, { status: 500 });
    }

    console.log("✅ 매직링크 생성 완료 - 자동 로그인");

    // 5. 매직링크로 리다이렉트 (자동 로그인)
    return NextResponse.redirect(linkData.properties.action_link);
  } catch (error: any) {
    console.error("❌ 네이버 OAuth 최상위 오류:", error);
    console.error("❌ 오류 스택:", error.stack);
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}