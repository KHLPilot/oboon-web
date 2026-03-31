import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createSupabaseServer } from "@/lib/supabaseServer";

const adminSupabase = createSupabaseAdminClient();

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;

  if (!postId) {
    return NextResponse.json({ error: "게시글 ID가 필요합니다." }, { status: 400 });
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: post, error: postError } = await adminSupabase
    .from("briefing_posts")
    .select("id, status")
    .eq("id", postId)
    .maybeSingle();

  if (postError) {
    return NextResponse.json({ error: postError.message }, { status: 500 });
  }

  if (!post || post.status !== "published") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { data: nextCount, error: incrementError } = await adminSupabase.rpc(
    "increment_briefing_view_count",
    { p_post_id: postId },
  );

  if (incrementError) {
    return NextResponse.json({ error: incrementError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    postId,
    viewCount: typeof nextCount === "number" ? nextCount : null,
    viewerId: user?.id ?? null,
  });
}
