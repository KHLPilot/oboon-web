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

    const { data: existingBookmark, error: bookmarkFetchError } = await adminSupabase
      .from("community_bookmarks")
      .select("post_id")
      .eq("post_id", postId)
      .eq("profile_id", user.id)
      .maybeSingle();

    if (bookmarkFetchError) {
      return NextResponse.json(
        { error: "북마크 상태를 확인하지 못했습니다." },
        { status: 500 },
      );
    }

    let bookmarked = false;
    if (existingBookmark) {
      const { error: unbookmarkError } = await adminSupabase
        .from("community_bookmarks")
        .delete()
        .eq("post_id", postId)
        .eq("profile_id", user.id);

      if (unbookmarkError) {
        return NextResponse.json(
          { error: "북마크 취소에 실패했습니다." },
          { status: 500 },
        );
      }
      bookmarked = false;
    } else {
      const { error: bookmarkInsertError } = await adminSupabase
        .from("community_bookmarks")
        .insert({
          post_id: postId,
          profile_id: user.id,
        });

      if (bookmarkInsertError) {
        return NextResponse.json(
          { error: "북마크 등록에 실패했습니다." },
          { status: 500 },
        );
      }
      bookmarked = true;
    }

    return NextResponse.json({
      success: true,
      bookmarked,
    });
  } catch (error) {
    console.error("POST /api/community/posts/[postId]/bookmark 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
