import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { briefingCommentCreateSchema } from "@/app/api/briefing/_schemas";

const adminSupabase = createSupabaseAdminClient();

type BriefingCommentQueryRow = {
  id: string;
  nickname: string;
  content: string;
  created_at: string;
  profile_id: string | null;
  is_anonymous: boolean;
  profile: { avatar_url: string | null } | { avatar_url: string | null }[] | null;
};

function normalizeCommentAvatar(
  profile: BriefingCommentQueryRow["profile"],
): string | null {
  if (Array.isArray(profile)) return profile[0]?.avatar_url ?? null;
  return profile?.avatar_url ?? null;
}

function serializeComment(row: BriefingCommentQueryRow) {
  return {
    id: row.id,
    nickname: row.nickname,
    content: row.content,
    created_at: row.created_at,
    profile_id: row.profile_id,
    is_anonymous: row.is_anonymous === true,
    avatar_url: row.is_anonymous ? null : normalizeCommentAvatar(row.profile),
  };
}

async function loadProfileAvatarMap(rows: Array<{ profile_id: string | null }>) {
  const profileIds = [...new Set(rows.map((row) => row.profile_id).filter(Boolean))];
  if (profileIds.length === 0) {
    return new Map<
      string,
      { avatar_url: string | null; nickname: string | null; name: string | null }
    >();
  }

  const { data } = await adminSupabase
    .from("profiles")
    .select("id, avatar_url, nickname, name")
    .in("id", profileIds);

  return new Map(
    (data ?? []).map((profile) => [
      profile.id as string,
      {
        avatar_url: (profile.avatar_url as string | null) ?? null,
        nickname: (profile.nickname as string | null) ?? null,
        name: (profile.name as string | null) ?? null,
      },
    ]),
  );
}

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
    message.includes("is_anonymous") ||
    message.includes("comment_count")
  );
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;
  if (!postId) {
    return NextResponse.json({ error: "게시글 ID가 필요합니다." }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const rawLimit = Number(searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.trunc(rawLimit), 1), 50)
    : 20;

  let query = adminSupabase
    .from("briefing_comments")
    .select(
      "id, nickname, content, created_at, profile_id, is_anonymous, profile:profiles(avatar_url)",
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;
  if (error) {
    if (isBriefingCommentsSchemaError(error)) {
      let fallbackQuery = adminSupabase
        .from("briefing_comments")
        .select("id, nickname, content, created_at, profile_id")
        .eq("post_id", postId)
        .order("created_at", { ascending: false })
        .limit(limit + 1);

      if (cursor) {
        fallbackQuery = fallbackQuery.lt("created_at", cursor);
      }

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;
      if (fallbackError) {
        return NextResponse.json(
          { error: "댓글 기능을 아직 사용할 수 없습니다. 마이그레이션을 먼저 적용해주세요." },
          { status: 500 },
        );
      }

      const profileMap = await loadProfileAvatarMap(fallbackData ?? []);
      const rows = (fallbackData ?? []).map((row) => {
        const profile = row.profile_id ? profileMap.get(row.profile_id) ?? null : null;
        const isAnonymous =
          !!profile &&
          row.nickname !== (profile.nickname?.trim() || profile.name?.trim() || "");

        return {
          ...row,
          is_anonymous: isAnonymous,
          avatar_url: isAnonymous ? null : (profile?.avatar_url ?? null),
        };
      });
      const hasMore = rows.length > limit;
      const comments = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore
        ? comments[comments.length - 1]?.created_at ?? null
        : null;

      return NextResponse.json({ comments, nextCursor });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = ((data ?? []) as BriefingCommentQueryRow[]).map(serializeComment);
  const hasMore = rows.length > limit;
  const comments = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? comments[comments.length - 1]?.created_at ?? null : null;

  return NextResponse.json({ comments, nextCursor });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;
  if (!postId) {
    return NextResponse.json({ error: "게시글 ID가 필요합니다." }, { status: 400 });
  }

  const rawBody = await req.json().catch(() => null);
  const parsed = briefingCommentCreateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 });
  }
  const { content, nickname: rawNickname, isAnonymous = false } = parsed.data;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  let nickname = rawNickname ?? "";
  let avatarUrl: string | null = null;
  if (userId) {
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("name, nickname, avatar_url")
      .eq("id", userId)
      .maybeSingle();
    nickname = isAnonymous
      ? (nickname || "익명")
      : (profile?.nickname?.trim() || profile?.name?.trim() || "익명");
    avatarUrl = isAnonymous ? null : (profile?.avatar_url ?? null);
  } else if (!nickname) {
    return NextResponse.json({ error: "닉네임을 입력해주세요." }, { status: 400 });
  }

  let comment:
    | {
        id: string;
        nickname: string;
        content: string;
        created_at: string;
        profile_id: string | null;
        is_anonymous?: boolean | null;
      }
    | null = null;

  let insertError:
    | {
        code?: string | null;
        message?: string | null;
      }
    | null = null;

  const insertPayload = {
    post_id: postId,
    profile_id: userId,
    is_anonymous: isAnonymous,
    nickname,
    content,
  };

  const primaryInsert = await adminSupabase
    .from("briefing_comments")
    .insert(insertPayload)
    .select("id, nickname, content, created_at, profile_id, is_anonymous")
    .single();

  comment = primaryInsert.data;
  insertError = primaryInsert.error;

  if (insertError && isBriefingCommentsSchemaError(insertError)) {
    const fallbackInsert = await adminSupabase
      .from("briefing_comments")
      .insert({
        post_id: postId,
        profile_id: userId,
        nickname,
        content,
      })
      .select("id, nickname, content, created_at, profile_id")
      .single();

    comment = fallbackInsert.data
      ? { ...fallbackInsert.data, is_anonymous: isAnonymous }
      : null;
    insertError = fallbackInsert.error;
  }

  if (insertError || !comment) {
    return NextResponse.json(
      {
        error: isBriefingCommentsSchemaError(insertError ?? {})
          ? "댓글 기능을 아직 사용할 수 없습니다. 마이그레이션을 먼저 적용해주세요."
          : "댓글 등록에 실패했습니다.",
      },
      { status: 500 },
    );
  }

  const { count, error: countError } = await adminSupabase
    .from("briefing_comments")
    .select("id", { count: "exact", head: true })
    .eq("post_id", postId);

  if (countError) {
    if (isBriefingCommentsSchemaError(countError)) {
      return NextResponse.json(
        {
          comment: {
            ...comment,
            is_anonymous: comment.is_anonymous === true,
            avatar_url: avatarUrl,
          },
        },
        { status: 201 },
      );
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
      return NextResponse.json(
        {
          comment: {
            ...comment,
            is_anonymous: comment.is_anonymous === true,
            avatar_url: avatarUrl,
          },
        },
        { status: 201 },
      );
    }

    return NextResponse.json(
      { error: "댓글 수를 갱신하지 못했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      comment: {
        ...comment,
        is_anonymous: comment.is_anonymous === true,
        avatar_url: avatarUrl,
      },
    },
    { status: 201 },
  );
}
