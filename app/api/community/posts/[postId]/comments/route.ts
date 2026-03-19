import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

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

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  author_profile_id: string;
  parent_comment_id: string | null;
  like_count: number | null;
  is_anonymous: boolean | null;
  anonymous_nickname: string | null;
};

type ProfileRow = {
  id: string;
  name: string | null;
  nickname: string | null;
  avatar_url: string | null;
};

export async function GET(
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

    const { data: postRow, error: postError } = await adminSupabase
      .from("community_posts")
      .select("id, status, is_agent_only")
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
      if (!user?.id) {
        return NextResponse.json(
          { error: "상담사 전용 게시글입니다." },
          { status: 403 },
        );
      }
      const role = await getProfileRole(user.id);
      if (!canAccessAgentOnlyRole(role)) {
        return NextResponse.json(
          { error: "상담사 전용 게시글입니다." },
          { status: 403 },
        );
      }
    }

    const { data: comments, error: commentsError } = await adminSupabase
      .from("community_comments")
      .select(
        "id, body, created_at, author_profile_id, parent_comment_id, like_count, is_anonymous, anonymous_nickname",
      )
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (commentsError) {
      return NextResponse.json(
        { error: "댓글을 불러오지 못했습니다." },
        { status: 500 },
      );
    }

    const rows = (comments ?? []) as CommentRow[];
    const authorIds = Array.from(new Set(rows.map((row) => row.author_profile_id)));
    let profilesMap = new Map<string, ProfileRow>();

    if (authorIds.length > 0) {
      const { data: profiles } = await adminSupabase
        .from("profiles")
        .select("id, name, nickname, avatar_url")
        .in("id", authorIds);

      profilesMap = new Map(
        ((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]),
      );
    }

    const commentIds = rows.map((row) => row.id);
    let likedSet = new Set<string>();

    if (user && commentIds.length > 0) {
      const { data: likedRows } = await adminSupabase
        .from("community_comment_likes")
        .select("comment_id")
        .eq("profile_id", user.id)
        .in("comment_id", commentIds);

      likedSet = new Set(
        (likedRows ?? [])
          .map((row) => (row as { comment_id?: string | null }).comment_id)
          .filter((id): id is string => Boolean(id)),
      );
    }

    const enriched = rows.map((row) => {
      const profile = profilesMap.get(row.author_profile_id);
      const isAnonymous = row.is_anonymous === true;
      const anonymousName =
        row.anonymous_nickname && row.anonymous_nickname.trim().length > 0
          ? row.anonymous_nickname.trim()
          : "익명";
      const displayName = profile?.nickname?.trim() || profile?.name?.trim() || "사용자";
      return {
        id: row.id,
        body: row.body,
        createdAt: row.created_at,
        authorId: isAnonymous ? null : row.author_profile_id,
        authorName: isAnonymous ? anonymousName : displayName,
        authorAvatarUrl: isAnonymous ? null : (profile?.avatar_url ?? null),
        parentCommentId: row.parent_comment_id,
        likeCount: row.like_count ?? 0,
        isLiked: likedSet.has(row.id),
        isAnonymous,
      };
    });

    return NextResponse.json({ comments: enriched });
  } catch (error) {
    console.error("GET /api/community/posts/[postId]/comments 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(
  req: Request,
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

    const body = await req.json();
    const content = typeof body?.body === "string" ? body.body.trim() : "";
    const isAnonymous = body?.isAnonymous === true;
    const anonymousNickname =
      typeof body?.anonymousNickname === "string"
        ? body.anonymousNickname.trim()
        : "";
    const parentCommentId =
      typeof body?.parentCommentId === "string" && body.parentCommentId.trim().length > 0
        ? body.parentCommentId.trim()
        : null;

    if (!content) {
      return NextResponse.json({ error: "댓글 내용을 입력해주세요." }, { status: 400 });
    }

    if (parentCommentId) {
      const { data: parentComment, error: parentError } = await adminSupabase
        .from("community_comments")
        .select("id, post_id")
        .eq("id", parentCommentId)
        .maybeSingle();

      if (parentError || !parentComment || parentComment.post_id !== postId) {
        return NextResponse.json(
          { error: "답글 대상 댓글을 찾을 수 없습니다." },
          { status: 400 },
        );
      }
    }

    const { data: inserted, error: insertError } = await adminSupabase
      .from("community_comments")
      .insert({
        post_id: postId,
        author_profile_id: user.id,
        body: content,
        parent_comment_id: parentCommentId,
        like_count: 0,
        is_anonymous: isAnonymous,
        anonymous_nickname: isAnonymous && anonymousNickname ? anonymousNickname : null,
      })
      .select(
        "id, body, created_at, author_profile_id, parent_comment_id, like_count, is_anonymous, anonymous_nickname",
      )
      .single();

    if (insertError || !inserted) {
      return NextResponse.json(
        { error: "댓글 등록에 실패했습니다." },
        { status: 500 },
      );
    }

    const { count } = await adminSupabase
      .from("community_comments")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postId);

    const commentCount = count ?? 0;
    await adminSupabase
      .from("community_posts")
      .update({ comment_count: commentCount })
      .eq("id", postId);

    const { data: authorProfile } = await adminSupabase
      .from("profiles")
      .select("id, name, nickname, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    // 알림: 내 댓글이 아닌 경우 글 작성자에게 알림
    const postAuthorId = (postRow as { author_profile_id?: string | null }).author_profile_id;
    const postTitle = (postRow as { title?: string | null }).title ?? "게시글";
    if (postAuthorId && postAuthorId !== user.id) {
      const commenterName =
        (authorProfile as { nickname?: string | null; name?: string | null } | null)
          ?.nickname?.trim() ||
        (authorProfile as { nickname?: string | null; name?: string | null } | null)
          ?.name?.trim() ||
        "누군가";
      await adminSupabase.from("notifications").insert({
        recipient_id: postAuthorId,
        type: "community_comment",
        title: `내 글에 댓글이 달렸어요`,
        message: `${commenterName}님이 "${postTitle.slice(0, 30)}"에 댓글을 남겼습니다.`,
        metadata: { post_id: postId, comment_id: inserted.id },
      });
    }

    return NextResponse.json({
      success: true,
      commentCount,
      comment: {
        id: inserted.id,
        body: inserted.body,
        createdAt: inserted.created_at,
        authorId: inserted.is_anonymous ? null : inserted.author_profile_id,
        authorName: inserted.is_anonymous
          ? inserted.anonymous_nickname?.trim() || "익명"
          : (authorProfile?.nickname?.trim() ||
            authorProfile?.name?.trim() ||
            "사용자"),
        authorAvatarUrl: inserted.is_anonymous
          ? null
          : (authorProfile?.avatar_url ?? null),
        parentCommentId: inserted.parent_comment_id,
        likeCount: inserted.like_count ?? 0,
        isLiked: false,
        isAnonymous: inserted.is_anonymous === true,
      },
    });
  } catch (error) {
    console.error("POST /api/community/posts/[postId]/comments 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
