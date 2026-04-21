import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import { repostSchema } from "@/app/api/community/_schemas";

const adminSupabase = createSupabaseAdminClient();

function isInvalidCommunityStatusError(error: unknown) {
  const message = String(
    (error as { message?: unknown })?.message ??
      (error as { details?: unknown })?.details ??
      "",
  ).toLowerCase();
  return (
    message.includes("invalid input value for enum") &&
    message.includes("community_post_status")
  );
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

    // 원본 글 존재 여부 및 리포스트 여부 확인
    const { data: originalPost, error: postError } = await adminSupabase
      .from("community_posts")
      .select("id, status, title, repost_original_post_id")
      .eq("id", postId)
      .maybeSingle();

    if (postError || !originalPost) {
      return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
    }

    const status = (originalPost as { status?: string | null }).status ?? "";
    if (status === "hidden" || status === "deleted" || status === "draft") {
      return NextResponse.json({ error: "접근할 수 없는 게시글입니다." }, { status: 404 });
    }

    // 이미 리포스트된 글은 다시 리포스트 불가
    if ((originalPost as { repost_original_post_id?: string | null }).repost_original_post_id) {
      return NextResponse.json({ error: "리포스트된 글은 다시 리포스트할 수 없습니다." }, { status: 400 });
    }

    // 자기 글 리포스트 불가 (author_profile_id 조회)
    const { data: authorCheck } = await adminSupabase
      .from("community_posts")
      .select("author_profile_id")
      .eq("id", postId)
      .maybeSingle();

    if ((authorCheck as { author_profile_id?: string | null } | null)?.author_profile_id === user.id) {
      return NextResponse.json({ error: "자신의 글은 리포스트할 수 없습니다." }, { status: 400 });
    }

    // 이미 이 글을 리포스트한 적 있는지 확인
    const { data: existingRepost } = await adminSupabase
      .from("community_posts")
      .select("id")
      .eq("author_profile_id", user.id)
      .eq("repost_original_post_id", postId)
      .maybeSingle();

    if (existingRepost) {
      return NextResponse.json({ error: "이미 리포스트한 글입니다." }, { status: 409 });
    }

    let body: string | null = null;
    try {
      const json = await req.json();
      const parsed = repostSchema.safeParse(json);
      body = parsed.success ? (parsed.data.body?.trim() || null) : null;
    } catch {
      // body 없음 허용
    }

    let repost: { id?: string } | null = null;
    let insertError: { message?: string } | null = null;

    {
      const result = await adminSupabase
        .from("community_posts")
        .insert({
          author_profile_id: user.id,
          status: "thinking",
          title: "",
          body: body ?? "",
          repost_original_post_id: postId,
        })
        .select("id")
        .single();
      repost = result.data as { id?: string } | null;
      insertError = (result.error as { message?: string } | null) ?? null;
    }

    if ((!repost?.id || insertError) && isInvalidCommunityStatusError(insertError)) {
      const result = await adminSupabase
        .from("community_posts")
        .insert({
          author_profile_id: user.id,
          status: "published",
          title: "",
          body: body ?? "",
          repost_original_post_id: postId,
        })
        .select("id")
        .single();
      repost = result.data as { id?: string } | null;
      insertError = (result.error as { message?: string } | null) ?? null;
    }

    if (insertError || !repost?.id) {
      return NextResponse.json({ error: "리포스트에 실패했습니다." }, { status: 500 });
    }

    // 원본 글 repost_count 증가
    const { count: repostCount } = await adminSupabase
      .from("community_posts")
      .select("id", { count: "exact", head: true })
      .eq("repost_original_post_id", postId);

    await adminSupabase
      .from("community_posts")
      .update({ repost_count: repostCount ?? 0 })
      .eq("id", postId);

    return NextResponse.json({ id: repost.id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/community/posts/[postId]/repost 오류:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
