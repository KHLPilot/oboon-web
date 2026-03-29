import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";

const adminSupabase = createSupabaseAdminClient();

async function getAuthedUser() {
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
  return supabase.auth.getUser();
}

// PATCH /api/community/comments/[commentId] — 댓글 수정 (작성자 본인만)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ commentId: string }> },
) {
  try {
    const { commentId } = await params;
    if (!commentId) {
      return NextResponse.json({ error: "댓글 ID가 필요합니다." }, { status: 400 });
    }

    const { data: { user } } = await getAuthedUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { data: comment, error: fetchError } = await adminSupabase
      .from("community_comments")
      .select("id, author_profile_id")
      .eq("id", commentId)
      .maybeSingle();

    if (fetchError || !comment) {
      return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
    }

    if ((comment as { author_profile_id: string }).author_profile_id !== user.id) {
      return NextResponse.json({ error: "본인 댓글만 수정할 수 있습니다." }, { status: 403 });
    }

    const body = await req.json();
    const content = typeof body?.body === "string" ? body.body.trim() : "";
    if (!content) {
      return NextResponse.json({ error: "댓글 내용을 입력해주세요." }, { status: 400 });
    }

    const { error: updateError } = await adminSupabase
      .from("community_comments")
      .update({ body: content })
      .eq("id", commentId);

    if (updateError) {
      return NextResponse.json({ error: "댓글 수정에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/community/comments/[commentId] 오류:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// DELETE /api/community/comments/[commentId] — 댓글 삭제 (작성자 또는 관리자)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ commentId: string }> },
) {
  try {
    const { commentId } = await params;
    if (!commentId) {
      return NextResponse.json({ error: "댓글 ID가 필요합니다." }, { status: 400 });
    }

    const { data: { user } } = await getAuthedUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { data: comment, error: fetchError } = await adminSupabase
      .from("community_comments")
      .select("id, author_profile_id, post_id")
      .eq("id", commentId)
      .maybeSingle();

    if (fetchError || !comment) {
      return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
    }

    const row = comment as { author_profile_id: string; post_id: string };

    if (row.author_profile_id !== user.id) {
      const { data: profile } = await adminSupabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      const role = (profile as { role?: string | null } | null)?.role;
      if (role !== "admin") {
        return NextResponse.json({ error: "본인 댓글만 삭제할 수 있습니다." }, { status: 403 });
      }
    }

    const { error: deleteError } = await adminSupabase
      .from("community_comments")
      .delete()
      .eq("id", commentId);

    if (deleteError) {
      return NextResponse.json({ error: "댓글 삭제에 실패했습니다." }, { status: 500 });
    }

    // comment_count 동기화
    const { count } = await adminSupabase
      .from("community_comments")
      .select("id", { count: "exact", head: true })
      .eq("post_id", row.post_id);

    await adminSupabase
      .from("community_posts")
      .update({ comment_count: count ?? 0 })
      .eq("id", row.post_id);

    return NextResponse.json({ success: true, commentCount: count ?? 0 });
  } catch (error) {
    console.error("DELETE /api/community/comments/[commentId] 오류:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
