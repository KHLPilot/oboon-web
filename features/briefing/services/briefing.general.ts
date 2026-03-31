import "server-only";

import { createSupabaseServiceError } from "@/lib/errors";
import { createServiceServerClient } from "@/lib/services/supabase-server";

const BRIEFING_GENERAL_PAGE_SIZE = 12;

type BriefingTagRow = {
  id: string;
  name: string;
  sort_order: number | null;
  is_active: boolean;
};

export type BriefingGeneralListRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  created_at: string;
  published_at: string | null;
  cover_image_url: string | null;
  category:
    | { key: string; name: string }
    | { key: string; name: string }[]
    | null;
  post_tags?:
    | {
        tag:
          | BriefingTagRow
          | BriefingTagRow[]
          | null;
      }[]
    | null;
};

export async function fetchGeneralBriefingPageData(page = 1) {
  const supabase = await createServiceServerClient();
  const pageSize = BRIEFING_GENERAL_PAGE_SIZE;
  const offset = (Math.max(1, page) - 1) * pageSize;

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  let isAdmin = false;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, deleted_at")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = !!profile && !profile.deleted_at && profile.role === "admin";
  }

  const { data, error, count } = await supabase
    .from("briefing_posts")
    .select(
      `
      id, slug, title, excerpt, created_at, published_at, cover_image_url,
      board:briefing_boards!inner(key),
      category:briefing_categories(key,name),
      post_tags:briefing_post_tags(
        tag:briefing_tags(id,name,sort_order,is_active)
      )
      `,
      { count: "exact" },
    )
    .eq("status", "published")
    .eq("board.key", "general")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    throw createSupabaseServiceError(error, {
      scope: "briefing.general",
      action: "fetch general posts",
      defaultMessage: "일반 브리핑 목록을 불러오지 못했습니다.",
      context: { page, offset },
    });
  }

  return {
    isAdmin,
    posts: (data ?? []) as BriefingGeneralListRow[],
    totalCount: count ?? 0,
    page,
    pageSize,
  };
}
