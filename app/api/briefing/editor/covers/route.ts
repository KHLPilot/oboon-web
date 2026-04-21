import { NextRequest, NextResponse } from "next/server";

import { isMissingCoverImageUrlError } from "@/features/briefing/services/briefing.schema";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { editorCoverPatchSchema } from "@/app/api/briefing/_schemas";

export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!["admin", "company"].includes(profile?.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rawBody = await req.json();
  const parsed = editorCoverPatchSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const { type, id, cover_image_url: coverImageUrl } = parsed.data;

  const { error } =
    type === "board"
      ? await supabase
          .from("briefing_boards")
          .update({ cover_image_url: coverImageUrl })
          .eq("id", id)
      : await supabase
          .from("briefing_categories")
          .update({ cover_image_url: coverImageUrl })
          .eq("id", id);

  if (error) {
    if (isMissingCoverImageUrlError(error)) {
      return NextResponse.json(
        { error: "커버 이미지 컬럼이 아직 적용되지 않은 환경입니다." },
        { status: 400 },
      );
    }
    console.error("[PATCH /api/briefing/editor/covers]", { type, id });
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
