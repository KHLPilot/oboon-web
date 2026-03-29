import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";

const adminSupabase = createSupabaseAdminClient();

function isBlockedPostStatus(status: string | null | undefined) {
  const normalized = (status ?? "").trim().toLowerCase();
  return normalized === "hidden" || normalized === "deleted" || normalized === "draft";
}

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
  { params }: { params: Promise<{ postId: string }> },
) {
  try {
    const { postId } = await params;
    if (!postId) {
      return NextResponse.json({ error: "게시글 ID가 필요합니다." }, { status: 400 });
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

    const { data: postRow, error: postError } = await adminSupabase
      .from("community_posts")
      .select("id, status, is_agent_only, author_profile_id, title")
      .eq("id", postId)
      .maybeSingle();

    if (postError) {
      return NextResponse.json(
        { error: "게시글 상태를 확인하지 못했습니다." },
        { status: 500 },
      );
    }

    if (!postRow || isBlockedPostStatus((postRow as { status?: string | null }).status)) {
      return NextResponse.json(
        { error: "접근할 수 없는 게시글입니다." },
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

    const { data: existingLike, error: likeFetchError } = await adminSupabase
      .from("community_likes")
      .select("post_id")
      .eq("post_id", postId)
      .eq("profile_id", user.id)
      .maybeSingle();

    if (likeFetchError) {
      return NextResponse.json(
        { error: "좋아요 상태를 확인하지 못했습니다." },
        { status: 500 },
      );
    }

    let liked = false;
    if (existingLike) {
      const { error: unlikeError } = await adminSupabase
        .from("community_likes")
        .delete()
        .eq("post_id", postId)
        .eq("profile_id", user.id);

      if (unlikeError) {
        return NextResponse.json(
          { error: "좋아요 취소에 실패했습니다." },
          { status: 500 },
        );
      }
      liked = false;
    } else {
      const { error: likeInsertError } = await adminSupabase
        .from("community_likes")
        .insert({
          post_id: postId,
          profile_id: user.id,
        });

      if (likeInsertError) {
        return NextResponse.json(
          { error: "좋아요 등록에 실패했습니다." },
          { status: 500 },
        );
      }
      liked = true;
    }

    const { count, error: likeCountError } = await adminSupabase
      .from("community_likes")
      .select("post_id", { count: "exact", head: true })
      .eq("post_id", postId);

    if (likeCountError) {
      return NextResponse.json(
        { error: "좋아요 수를 계산하지 못했습니다." },
        { status: 500 },
      );
    }

    const likeCount = count ?? 0;
    await adminSupabase
      .from("community_posts")
      .update({ like_count: likeCount })
      .eq("id", postId);

    // 알림: 좋아요 추가 시(취소 아닐 때) 글 작성자에게 알림
    if (liked) {
      const postAuthorId = (postRow as { author_profile_id?: string | null }).author_profile_id;
      const postTitle = (postRow as { title?: string | null }).title ?? "게시글";
      if (postAuthorId && postAuthorId !== user.id) {
        const { data: likerProfile } = await adminSupabase
          .from("profiles")
          .select("nickname, name")
          .eq("id", user.id)
          .maybeSingle();
        const likerName =
          (likerProfile as { nickname?: string | null; name?: string | null } | null)
            ?.nickname?.trim() ||
          (likerProfile as { nickname?: string | null; name?: string | null } | null)
            ?.name?.trim() ||
          "누군가";
        await adminSupabase.from("notifications").insert({
          recipient_id: postAuthorId,
          type: "community_like",
          title: "내 글에 좋아요가 달렸어요",
          message: `${likerName}님이 "${postTitle.slice(0, 30)}"을 좋아합니다.`,
          metadata: { post_id: postId },
        });
      }
    }

    return NextResponse.json({
      success: true,
      liked,
      likeCount,
    });
  } catch (error) {
    console.error("POST /api/community/posts/[postId]/like 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
