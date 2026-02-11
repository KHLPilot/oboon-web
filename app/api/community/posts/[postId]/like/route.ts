import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

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
