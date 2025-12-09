// lib/ensureProfile.ts
import { createSupabaseServer } from "./supabaseServer";

export async function ensureProfile() {
  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 로그인 안 돼 있으면 아무것도 안 함
  if (!user) return;

  // 1) 이미 profiles에 있나 확인
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle(); // row 없으면 null, 있으면 1개

  if (selectError) {
    console.error("profiles 조회 에러:", selectError);
    return;
  }

  if (existing) {
    // 이미 회원정보 있으면 끝
    return;
  }

  // 2) 없으면 새로 생성
  const email = user.email ?? null;
  const meta = user.user_metadata || {};
  const name =
    (meta.full_name as string) ||
    (meta.name as string) ||
    (meta.nickname as string) ||
    null;
  const avatarUrl =
    (meta.avatar_url as string) ||
    (meta.picture as string) ||
    null;

  const { error: insertError } = await supabase.from("profiles").insert({
    id: user.id,        // auth.users.id와 동일하게
    email,
    name,
    avatar_url: avatarUrl,
    role: "user",       // 기본값: 일반 회원
    phone_number: null,
    region: null,
  });

  if (insertError) {
    console.error("profiles 생성 에러:", insertError);
  }
}