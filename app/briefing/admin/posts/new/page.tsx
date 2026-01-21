// app/briefing/admin/posts/new/page.tsx
import { notFound } from "next/navigation";

import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";

import { createSupabaseServer } from "@/lib/supabaseServer";
import PostEditorClient, { type EditorBootstrap } from "./PostEditor.client";

type BoardRow = { id: string; key: string; name: string };
type CategoryRow = { id: string; key: string; name: string; board_id: string };
type TagRow = {
  id: string;
  name: string;
  sort_order: number | null;
  is_active: boolean;
};

async function requireAdmin() {
  const supabase = createSupabaseServer();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;

  const user = authData.user;
  if (!user) notFound();

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("id, role, deleted_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profErr) throw profErr;
  if (!profile || profile.deleted_at) notFound();
  if (profile.role !== "admin") notFound();

  return { supabase, userId: user.id };
}

export default async function BriefingPostNewPage() {
  const { supabase, userId } = await requireAdmin();

  // boards
  const { data: boards, error: boardsErr } = await supabase
    .from("briefing_boards")
    .select("id,key,name")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (boardsErr) throw boardsErr;

  const defaultBoard =
    (boards ?? []).find((b: any) => b.key === "oboon_original") ??
    (boards?.[0] as any);

  if (!defaultBoard) {
    return (
      <main className="bg-(--oboon-bg-page)">
        <PageContainer className="pb-20">
          <Card className="shadow-none">
            <div className="ob-typo-body text-(--oboon-text-title)">
              활성화된 briefing_boards가 없습니다.
            </div>
          </Card>
        </PageContainer>
      </main>
    );
  }

  // categories (모든 보드)
  const boardIds = (boards ?? []).map((b: any) => b.id);
  const { data: categories, error: catsErr } = await supabase
    .from("briefing_categories")
    .select("id,key,name,board_id")
    .in("board_id", boardIds)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (catsErr) throw catsErr;

  // tags
  const { data: tags, error: tagsErr } = await supabase
    .from("briefing_tags")
    .select("id,name,sort_order,is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (tagsErr) throw tagsErr;

  async function createPostAction(input: {
    board_id: string;
    category_id: string;
    title: string;
    cover_image_url: string;
    content_md: string;
    intent: "draft" | "publish";
    tag_id: string | null; // 단일 태그
  }): Promise<
    { ok: true; redirectTo: string } | { ok: false; message: string }
  > {
    "use server";

    try {
      const { supabase, userId } = await requireAdmin();

      const boardId = String(input.board_id ?? "").trim();
      const categoryId = String(input.category_id ?? "").trim();
      const title = String(input.title ?? "").trim();
      const coverImageUrl = String(input.cover_image_url ?? "").trim();
      const contentMd = String(input.content_md ?? "");
      const intent = input.intent;
      const tagId = input.tag_id ? String(input.tag_id).trim() : null;

      if (!boardId || !categoryId)
        return { ok: false, message: "보드/카테고리를 선택해주세요." };
      if (!title) return { ok: false, message: "제목을 입력해주세요." };

      // 카테고리 조작 방지 (보드 소속/활성 확인)
      const { data: cat, error: catErr } = await supabase
        .from("briefing_categories")
        .select("id, key, board_id, is_active")
        .eq("id", categoryId)
        .maybeSingle();

      if (catErr) throw catErr;
      if (!cat || cat.board_id !== boardId || !cat.is_active) {
        return { ok: false, message: "유효하지 않은 카테고리입니다." };
      }

      // slug 발급 규칙: board_key-category_key-000123 (DB/RPC에서 원자적으로 발급)
      const { data: rpcData, error: rpcErr } = await supabase.rpc(
        "create_briefing_post_with_seq",
        {
          p_board_id: boardId,
          p_category_id: categoryId,
          p_title: title,
          p_content_md: contentMd,
          p_cover_image_url: coverImageUrl,
          p_intent: intent,
          p_author_profile_id: userId,
          p_tag_id: tagId,
        }
      );

      if (rpcErr) {
        return { ok: false, message: `저장에 실패했습니다: ${rpcErr.message}` };
      }

      const inserted = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      const slug = inserted?.slug ? String(inserted.slug) : "";
      if (!slug) {
        return {
          ok: false,
          message:
            "저장 결과에서 slug를 확인할 수 없습니다. RPC 반환 값을 점검해주세요.",
        };
      }

      const redirectTo = `/briefing/oboon-original/${encodeURIComponent(
        cat.key
      )}/${encodeURIComponent(slug)}`;

      return { ok: true, redirectTo };
    } catch (e: any) {
      return {
        ok: false,
        message: e?.message
          ? String(e.message)
          : "알 수 없는 오류가 발생했습니다.",
      };
    }
  }

  const defaultCats = (categories ?? []).filter(
    (c: any) => c.board_id === defaultBoard.id
  );

  const bootstrap: EditorBootstrap = {
    boards: (boards ?? []) as BoardRow[],
    categories: (categories ?? []) as CategoryRow[],
    tags: (tags ?? []) as TagRow[],
    defaultBoardId: defaultBoard.id,
    defaultCategoryId: (defaultCats?.[0] as any)?.id ?? "",
  };

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20">
        <PostEditorClient bootstrap={bootstrap} onCreate={createPostAction} />
      </PageContainer>
    </main>
  );
}
