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

type RouteParams = { params: Promise<{ postId: string }> };

async function getProfileRole(profileId: string) {
  const { data } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", profileId)
    .maybeSingle();
  return (data as { role?: string | null } | null)?.role ?? null;
}

async function getAuthUserId() {
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
  return user?.id ?? null;
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { postId } = await params;
    if (!postId) {
      return NextResponse.json({ error: "게시글 ID가 필요합니다." }, { status: 400 });
    }

    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { data: postRow, error: postError } = await adminSupabase
      .from("community_posts")
      .select("id, author_profile_id, status")
      .eq("id", postId)
      .maybeSingle();

    if (postError) {
      return NextResponse.json(
        { error: "게시글을 확인하지 못했습니다." },
        { status: 500 },
      );
    }

    if (!postRow || isBlockedPostStatus((postRow as { status?: string | null }).status)) {
      return NextResponse.json(
        { error: "수정할 수 없는 게시글입니다." },
        { status: 404 },
      );
    }

    if ((postRow as { author_profile_id?: string | null }).author_profile_id !== userId) {
      return NextResponse.json(
        { error: "본인 글만 수정할 수 있습니다." },
        { status: 403 },
      );
    }

    const body = await req.json();
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const content = typeof body?.body === "string" ? body.body.trim() : "";

    if (!title || !content) {
      return NextResponse.json(
        { error: "제목과 내용을 입력해주세요." },
        { status: 400 },
      );
    }

    const { error: updateError } = await adminSupabase
      .from("community_posts")
      .update({
        title,
        body: content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", postId)
      .eq("author_profile_id", userId);

    if (updateError) {
      return NextResponse.json(
        { error: "게시글 수정에 실패했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/community/posts/[postId] 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const { postId } = await params;
    if (!postId) {
      return NextResponse.json({ error: "게시글 ID가 필요합니다." }, { status: 400 });
    }

    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { data: postRow, error: postError } = await adminSupabase
      .from("community_posts")
      .select("id, author_profile_id, status")
      .eq("id", postId)
      .maybeSingle();

    if (postError) {
      return NextResponse.json(
        { error: "게시글을 확인하지 못했습니다." },
        { status: 500 },
      );
    }

    if (!postRow || isBlockedPostStatus((postRow as { status?: string | null }).status)) {
      return NextResponse.json(
        { error: "삭제할 수 없는 게시글입니다." },
        { status: 404 },
      );
    }

    if ((postRow as { author_profile_id?: string | null }).author_profile_id !== userId) {
      const role = await getProfileRole(userId);
      if (role !== "admin") {
        return NextResponse.json(
          { error: "본인 글 또는 관리자만 삭제할 수 있습니다." },
          { status: 403 },
        );
      }
    }

    const { error: deleteError } = await adminSupabase.from("community_posts").update({
      status: "deleted",
      updated_at: new Date().toISOString(),
    }).eq("id", postId);

    if (deleteError) {
      return NextResponse.json(
        { error: "게시글 삭제에 실패했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/community/posts/[postId] 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
