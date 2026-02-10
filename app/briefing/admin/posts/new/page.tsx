// app/briefing/admin/posts/new/page.tsx
import { notFound } from "next/navigation";

import PageContainer from "@/components/shared/PageContainer";
import {
  createBriefingPostWithSeq,
  ensureBriefingAdminUser,
  fetchBriefingAdminBootstrap,
} from "@/features/briefing/services/briefing.admin";
import { validateRequired } from "@/shared/validationMessage";
import PostEditorClient, { type EditorBootstrap } from "./PostEditor.client";

type BoardRow = { id: string; key: string; name: string };
type CategoryRow = { id: string; key: string; name: string; board_id: string };
type TagRow = {
  id: string;
  name: string;
  sort_order: number | null;
  is_active: boolean;
};


export default async function BriefingPostNewPage() {
  const bootstrapData = await fetchBriefingAdminBootstrap();
  if (!bootstrapData) notFound();

  const { boards, categories, tags } = bootstrapData;
  const defaultBoard =
    (boards ?? []).find((b: BoardRow) => b.key === "oboon_original") ??
    (boards ?? [])[0];

  if (!defaultBoard) {
    notFound();
  }

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
      const admin = await ensureBriefingAdminUser();
      if (!admin) {
        return { ok: false, message: "관리자 권한이 필요합니다." };
      }

      const userId = admin.userId;

      const boardId = String(input.board_id ?? "").trim();
      const categoryId = String(input.category_id ?? "").trim();
      const title = String(input.title ?? "").trim();
      const coverImageUrl = String(input.cover_image_url ?? "").trim();
      const contentMd = String(input.content_md ?? "");
      const intent = input.intent;
      const tagId = input.tag_id ? String(input.tag_id).trim() : null;

      if (!boardId || !categoryId)
        return { ok: false, message: "보드/카테고리를 선택해주세요." };
      const titleRequiredError = validateRequired(title, "제목");
      if (titleRequiredError) {
        return { ok: false, message: titleRequiredError };
      }

      const result = await createBriefingPostWithSeq({
        boardId,
        categoryId,
        title,
        contentMd,
        coverImageUrl,
        intent,
        tagId,
        userId,
      });

      if (!result.ok) {
        return { ok: false, message: result.message };
      }

      const boardKey =
        (boards ?? []).find((b: BoardRow) => b.id === boardId)?.key ?? "";
      let redirectTo = "/briefing";
      if (boardKey === "general") {
        redirectTo = `/briefing/general/${encodeURIComponent(result.slug)}`;
      } else if (boardKey === "oboon_original" && result.categoryKey) {
        redirectTo = `/briefing/oboon-original/${encodeURIComponent(
          result.categoryKey
        )}/${encodeURIComponent(result.slug)}`;
      }

      return { ok: true, redirectTo };
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : null;
      return {
        ok: false,
        message: errorMessage ?? "알 수 없는 오류가 발생했습니다.",
      };
    }
  }

  const typedCategories = (categories ?? []) as CategoryRow[];
  const defaultCats = typedCategories.filter(
    (c) => c.board_id === defaultBoard.id
  );

  const bootstrap: EditorBootstrap = {
    boards: (boards ?? []) as BoardRow[],
    categories: typedCategories,
    tags: (tags ?? []) as TagRow[],
    defaultBoardId: defaultBoard.id,
    defaultCategoryId: defaultCats[0]?.id ?? "",
  };

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20">
        <PostEditorClient bootstrap={bootstrap} onCreate={createPostAction} />
      </PageContainer>
    </main>
  );
}
