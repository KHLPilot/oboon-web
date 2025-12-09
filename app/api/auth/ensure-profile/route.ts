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

  // 현재 로그인된 유저 가져오기
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "no user" }, { status: 401 });
  }

  // 프로필 존재하는지 확인
  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (existing) {
    return NextResponse.json({ message: "profile exists" });
  }

  // 없으면 생성
  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    email: user.email,
    name:
      user.user_metadata.full_name ||
      user.user_metadata.name ||
      user.email?.split("@")[0],
    role: "user",
    phone_number: user.user_metadata.phone_number || "",
    region: "",
    avatar_url: user.user_metadata.avatar_url || "",
  });

  if (error) {
    console.error("profile insert error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "profile created" });
}