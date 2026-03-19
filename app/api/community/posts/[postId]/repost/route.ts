import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

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

    // 요청 바디 파싱
    let body: string | null = null;
    try {
      const json = await req.json() as { body?: string };
      body = (json.body ?? "").trim() || null;
    } catch {
      // body 없음 허용
    }

    const originalTitle = (originalPost as { title?: string | null }).title ?? "";

    // 리포스트 글 생성
    const { data: repost, error: insertError } = await adminSupabase
      .from("community_posts")
      .insert({
        author_profile_id: user.id,
        status: "thinking",
        title: originalTitle,
        body: body ?? "",
        repost_original_post_id: postId,
      })
      .select("id")
      .single();

    if (insertError || !repost) {
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

    return NextResponse.json({ id: (repost as { id: string }).id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/community/posts/[postId]/repost 오류:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
