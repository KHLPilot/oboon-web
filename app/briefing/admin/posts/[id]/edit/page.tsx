import { notFound } from "next/navigation";

import PageContainer from "@/components/shared/PageContainer";
import {
  ensureBriefingAdminUser,
  fetchBriefingAdminBootstrap,
  fetchBriefingPostForEdit,
  updateBriefingPost,
} from "@/features/briefing/services/briefing.admin";
import { validateRequired } from "@/shared/validationMessage";
import PostEditorClient, {
  type EditorBootstrap,
} from "@/app/briefing/admin/posts/new/PostEditor.client";

type BoardRow = { id: string; key: string; name: string };
type CategoryRow = { id: string; key: string; name: string; board_id: string };
type TagRow = {
  id: string;
  name: string;
  sort_order: number | null;
  is_active: boolean;
};

export default async function BriefingPostEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: postId } = await params;

  const [post, bootstrapData] = await Promise.all([
    fetchBriefingPostForEdit(postId),
    fetchBriefingAdminBootstrap(),
  ]);

  if (!post) notFound();
  if (!bootstrapData) notFound();

  const editPost = post;
  const { boards, categories, tags } = bootstrapData;

  async function updatePostAction(input: {
    title: string;
    cover_image_url: string;
    content_html: string;
    intent: "draft" | "publish";
    tag_id: string | null;
    is_editor_pick: boolean;
  }): Promise<
    { ok: true; redirectTo: string } | { ok: false; message: string }
  > {
    "use server";

    try {
      const admin = await ensureBriefingAdminUser();
      if (!admin) return { ok: false, message: "관리자 권한이 필요합니다." };

      const title = String(input.title ?? "").trim();
      const coverImageUrl = String(input.cover_image_url ?? "").trim();
      const contentHtml = String(input.content_html ?? "");
      const intent = input.intent;
      const tagId = input.tag_id ? String(input.tag_id).trim() : null;
      const isEditorPick = Boolean(input.is_editor_pick);

      const titleError = validateRequired(title, "제목");
      if (titleError) return { ok: false, message: titleError };

      const result = await updateBriefingPost({
        postId,
        title,
        contentHtml,
        coverImageUrl,
        intent,
        tagId,
        isEditorPick,
        userId: admin.userId,
      });

      if (!result.ok) return { ok: false, message: result.message };

      const board = (boards ?? []).find(
        (b: BoardRow) => b.id === editPost.boardId,
      );
      const category = (categories ?? []).find(
        (c: CategoryRow) => c.id === editPost.categoryId,
      );
      let redirectTo = "/briefing";
      if (board?.key === "general") {
        redirectTo = `/briefing/general/${encodeURIComponent(editPost.slug)}`;
      } else if (board?.key === "oboon_original" && category?.key) {
        redirectTo = `/briefing/oboon-original/${encodeURIComponent(
          category.key,
        )}/${encodeURIComponent(editPost.slug)}`;
      }

      return { ok: true, redirectTo };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : null;
      return { ok: false, message: msg ?? "알 수 없는 오류가 발생했습니다." };
    }
  }

  const typedCategories = (categories ?? []) as CategoryRow[];

  const bootstrap: EditorBootstrap = {
    boards: (boards ?? []) as BoardRow[],
    categories: typedCategories,
    tags: (tags ?? []) as TagRow[],
    defaultBoardId: editPost.boardId,
    defaultCategoryId: editPost.categoryId,
  };

  const initialValues = {
    title: editPost.title,
    coverImageUrl: editPost.coverImageUrl,
    contentHtml: editPost.contentHtml,
    tagId: editPost.tagId,
    isEditorPick: editPost.isEditorPick,
  };

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20">
        <PostEditorClient
          bootstrap={bootstrap}
          mode="edit"
          postId={postId}
          initialValues={initialValues}
          onUpdate={updatePostAction}
        />
      </PageContainer>
    </main>
  );
}
