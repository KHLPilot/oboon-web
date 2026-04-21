import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { deleteBriefingPost } from "@/features/briefing/services/briefing.original.post";
import { createSupabaseServer } from "@/lib/supabaseServer";

const paramsSchema = z.object({ postId: z.string().uuid() });

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const rawParams = await params;
  const parsed = paramsSchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
  }
  const { postId } = parsed.data;

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

  const isAdmin = profile?.role === "admin";

  const { data: post } = await supabase
    .from("briefing_posts")
    .select("author_profile_id")
    .eq("id", postId)
    .maybeSingle();

  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isAdmin && post.author_profile_id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await deleteBriefingPost(postId);
  if (error) {
    console.error("[DELETE /api/briefing/editor/posts]", { postId, userId });
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
