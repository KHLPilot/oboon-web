import { NextResponse } from "next/server";

import { logApiError } from "@/lib/api/route-error";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createSupabaseServer } from "@/lib/supabaseServer";

function isOptionalBriefingViewSchemaError(error: {
  code?: string | null;
  message?: string | null;
}) {
  const code = typeof error.code === "string" ? error.code : "";
  const message = typeof error.message === "string" ? error.message : "";

  return (
    code === "42703" ||
    code === "42883" ||
    code === "PGRST202" ||
    code === "PGRST204" ||
    message.includes("view_count") ||
    message.includes("increment_briefing_view_count")
  );
}

function createNoopResponse(postId: string, viewerId: string | null) {
  return NextResponse.json({
    ok: false,
    postId,
    viewCount: null,
    viewerId,
  });
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;

  if (!postId) {
    return NextResponse.json({ error: "게시글 ID가 필요합니다." }, { status: 400 });
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const viewerId = user?.id ?? null;

  let adminSupabase: ReturnType<typeof createSupabaseAdminClient>;
  try {
    adminSupabase = createSupabaseAdminClient();
  } catch (error) {
    logApiError("briefing.view.createAdminClient", error, { hasViewer: viewerId ? true : false });
    return createNoopResponse(postId, viewerId);
  }

  const { data: post, error: postError } = await adminSupabase
    .from("briefing_posts")
    .select("id, status")
    .eq("id", postId)
    .maybeSingle();

  if (postError) {
    if (isOptionalBriefingViewSchemaError(postError)) {
      logApiError("briefing.view.fetchPost", postError, { hasViewer: viewerId ? true : false });
      return createNoopResponse(postId, viewerId);
    }

    return NextResponse.json({ error: postError.message }, { status: 500 });
  }

  if (!post || post.status !== "published") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { data: nextCount, error: incrementError } = await adminSupabase.rpc(
    "increment_briefing_view_count",
    { p_post_id: postId },
  );

  if (incrementError) {
    if (isOptionalBriefingViewSchemaError(incrementError)) {
      logApiError("briefing.view.increment", incrementError, { hasViewer: viewerId ? true : false });
      return createNoopResponse(postId, viewerId);
    }

    return NextResponse.json({ error: incrementError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    postId,
    viewCount: typeof nextCount === "number" ? nextCount : null,
    viewerId,
  });
}
