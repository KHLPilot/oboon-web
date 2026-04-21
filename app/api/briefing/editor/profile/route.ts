import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServer } from "@/lib/supabaseServer";
import { editorProfilePatchSchema } from "@/app/api/briefing/_schemas";

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

  const rawBody = await req.json();
  const parsed = editorProfilePatchSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const updates: Record<string, string | null> = {};
  if (parsed.data.nickname !== undefined) updates.nickname = parsed.data.nickname || null;
  if (parsed.data.bio !== undefined) updates.bio = parsed.data.bio || null;
  if (parsed.data.avatar_url !== undefined) updates.avatar_url = parsed.data.avatar_url || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "변경 내용이 없습니다." }, { status: 400 });
  }

  const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
  if (error) {
    console.error("[PATCH /api/briefing/editor/profile]", { userId });
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
