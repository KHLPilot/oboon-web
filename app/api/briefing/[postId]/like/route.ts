import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

const adminSupabase = createSupabaseAdminClient();

type LikeAction = "like" | "unlike";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;
  if (!postId) {
    return NextResponse.json({ error: "게시글 ID가 필요합니다." }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as { action?: LikeAction } | null;
  const action = body?.action;
  if (action !== "like" && action !== "unlike") {
    return NextResponse.json(
      { error: "유효하지 않은 좋아요 요청입니다." },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  let delta = action === "like" ? 1 : -1;

  if (userId) {
    const { data: existingLike, error: likeFetchError } = await adminSupabase
      .from("briefing_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("profile_id", userId)
      .maybeSingle();

    if (likeFetchError) {
      return NextResponse.json(
        { error: "좋아요 상태를 확인하지 못했습니다." },
        { status: 500 },
      );
    }

    if (action === "like") {
      if (existingLike) {
        delta = 0;
      } else {
        const { error } = await adminSupabase.from("briefing_likes").insert({
          post_id: postId,
          profile_id: userId,
        });
        if (error) {
          return NextResponse.json(
            { error: "좋아요 등록에 실패했습니다." },
            { status: 500 },
          );
        }
      }
    } else if (existingLike) {
      const { error } = await adminSupabase
        .from("briefing_likes")
        .delete()
        .eq("post_id", postId)
        .eq("profile_id", userId);

      if (error) {
        return NextResponse.json(
          { error: "좋아요 취소에 실패했습니다." },
          { status: 500 },
        );
      }
    } else {
      delta = 0;
    }
  }

  const { data: currentPost, error: postError } = await adminSupabase
    .from("briefing_posts")
    .select("id, like_count")
    .eq("id", postId)
    .maybeSingle();

  if (postError) {
    return NextResponse.json(
      { error: "게시글 좋아요 수를 조회하지 못했습니다." },
      { status: 500 },
    );
  }

  if (!currentPost) {
    return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
  }

  const nextLikeCount = Math.max(0, (currentPost.like_count ?? 0) + delta);
  const { error: updateError } = await adminSupabase
    .from("briefing_posts")
    .update({ like_count: nextLikeCount })
    .eq("id", postId);

  if (updateError) {
    return NextResponse.json(
      { error: "좋아요 수를 갱신하지 못했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({ like_count: nextLikeCount });
}
