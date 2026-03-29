import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";

const adminSupabase = createSupabaseAdminClient();

function canAccessAgentOnlyRole(role: string | null | undefined) {
  return role === "agent" || role === "admin";
}

async function getProfileRole(profileId: string) {
  const { data } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", profileId)
    .maybeSingle();
  return (data as { role?: string | null } | null)?.role ?? null;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ commentId: string }> },
) {
  try {
    const { commentId } = await params;
    if (!commentId) {
      return NextResponse.json({ error: "댓글 ID가 필요합니다." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // 읽기 전용 컨텍스트 무시
            }
          },
        },
      },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { data: commentRow, error: commentError } = await adminSupabase
      .from("community_comments")
      .select("id, post_id")
      .eq("id", commentId)
      .maybeSingle();

    if (commentError || !commentRow) {
      return NextResponse.json(
        { error: "댓글 정보를 확인하지 못했습니다." },
        { status: 404 },
      );
    }

    const { data: postRow, error: postError } = await adminSupabase
      .from("community_posts")
      .select("id, is_agent_only")
      .eq("id", commentRow.post_id)
      .maybeSingle();

    if (postError || !postRow) {
      return NextResponse.json(
        { error: "게시글 정보를 확인하지 못했습니다." },
        { status: 404 },
      );
    }

    const isAgentOnlyPost =
      (postRow as { is_agent_only?: boolean | null }).is_agent_only === true;
    if (isAgentOnlyPost) {
      const role = await getProfileRole(user.id);
      if (!canAccessAgentOnlyRole(role)) {
        return NextResponse.json(
          { error: "상담사 전용 게시글입니다." },
          { status: 403 },
        );
      }
    }

    const { data: existing } = await adminSupabase
      .from("community_comment_likes")
      .select("comment_id")
      .eq("comment_id", commentId)
      .eq("profile_id", user.id)
      .maybeSingle();

    let liked = false;
    if (existing) {
      const { error } = await adminSupabase
        .from("community_comment_likes")
        .delete()
        .eq("comment_id", commentId)
        .eq("profile_id", user.id);
      if (error) {
        return NextResponse.json(
          { error: "댓글 좋아요 취소에 실패했습니다." },
          { status: 500 },
        );
      }
      liked = false;
    } else {
      const { error } = await adminSupabase.from("community_comment_likes").insert({
        comment_id: commentId,
        profile_id: user.id,
      });
      if (error) {
        return NextResponse.json(
          { error: "댓글 좋아요 처리에 실패했습니다." },
          { status: 500 },
        );
      }
      liked = true;
    }

    const { count } = await adminSupabase
      .from("community_comment_likes")
      .select("comment_id", { count: "exact", head: true })
      .eq("comment_id", commentId);

    const likeCount = count ?? 0;
    await adminSupabase
      .from("community_comments")
      .update({ like_count: likeCount })
      .eq("id", commentId);

    return NextResponse.json({ success: true, liked, likeCount });
  } catch (error) {
    console.error("POST /api/community/comments/[commentId]/like 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
