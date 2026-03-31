import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

const adminSupabase = createSupabaseAdminClient();

function isBriefingCommentsSchemaError(error: {
  code?: string | null;
  message?: string | null;
}) {
  const code = typeof error.code === "string" ? error.code : "";
  const message = typeof error.message === "string" ? error.message : "";

  return (
    code === "42P01" ||
    code === "42703" ||
    code === "PGRST200" ||
    code === "PGRST204" ||
    message.includes("briefing_comments") ||
    message.includes("comment_count")
  );
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ postId: string; commentId: string }> },
) {
  const { postId, commentId } = await params;
  if (!postId || !commentId) {
    return NextResponse.json(
      { error: "게시글 또는 댓글 ID가 필요합니다." },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: comment, error: commentError } = await adminSupabase
    .from("briefing_comments")
    .select("id, post_id, profile_id")
    .eq("id", commentId)
    .maybeSingle();

  if (commentError) {
    return NextResponse.json(
      { error: "댓글 정보를 확인하지 못했습니다." },
      { status: 500 },
    );
  }

  if (!comment || comment.post_id !== postId) {
    return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
  }

  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  const isOwner = comment.profile_id === userId;
  const isAdmin = profile?.role === "admin";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error: deleteError } = await adminSupabase
    .from("briefing_comments")
    .delete()
    .eq("id", commentId);

  if (deleteError) {
    return NextResponse.json(
      { error: "댓글 삭제에 실패했습니다." },
      { status: 500 },
    );
  }

  const { count, error: countError } = await adminSupabase
    .from("briefing_comments")
    .select("id", { count: "exact", head: true })
    .eq("post_id", postId);

  if (countError) {
    if (isBriefingCommentsSchemaError(countError)) {
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json(
      { error: "댓글 수를 계산하지 못했습니다." },
      { status: 500 },
    );
  }

  const { error: updateError } = await adminSupabase
    .from("briefing_posts")
    .update({ comment_count: count ?? 0 })
    .eq("id", postId);

  if (updateError) {
    if (isBriefingCommentsSchemaError(updateError)) {
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json(
      { error: "댓글 수를 갱신하지 못했습니다." },
      { status: 500 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
