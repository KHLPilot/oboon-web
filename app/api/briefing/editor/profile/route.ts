import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServer } from "@/lib/supabaseServer";

export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (!["admin"].includes(profile?.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    nickname?: string;
    bio?: string;
    avatar_url?: string;
  };

  const updates: Record<string, string | null> = {};

  if (body.nickname !== undefined) {
    updates.nickname = body.nickname.trim() || null;
  }

  if (body.bio !== undefined) {
    updates.bio = body.bio.trim() || null;
  }

  if (body.avatar_url !== undefined) {
    updates.avatar_url = body.avatar_url.trim() || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "변경 내용이 없습니다." }, { status: 400 });
  }

  const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
