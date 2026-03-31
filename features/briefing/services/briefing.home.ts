import "server-only";

import { createClient } from "@supabase/supabase-js";

import { createSupabaseServiceError } from "@/lib/errors";
import { createServiceServerClient } from "@/lib/services/supabase-server";

type BoardRow = { key?: string | null } | { key?: string | null }[] | null;
type CategoryRow =
  | { key?: string | null; name?: string | null }
  | { key?: string | null; name?: string | null }[]
  | null;

type TopPostQueryRow = {
  id: string;
  slug: string;
  title: string;
  created_at: string;
  published_at: string | null;
  board: BoardRow;
  category: CategoryRow;
};

type EditorPickQueryRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  created_at: string;
  published_at: string | null;
  board: BoardRow;
  category: CategoryRow;
};

type RecentPostQueryRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  created_at: string;
  published_at: string | null;
  board: BoardRow;
  category: CategoryRow;
};

export type BriefingSitemapPostRow = {
  slug: string | null;
  created_at: string | null;
  published_at: string | null;
  board: BoardRow;
  category: CategoryRow;
};

function pickFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function createPublicSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function fetchPublishedBriefingPostsForSitemap(
  limit = 500,
): Promise<BriefingSitemapPostRow[]> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("briefing_posts")
    .select(
      `
        slug, created_at, published_at,
        board:briefing_boards!inner(key),
        category:briefing_categories(key)
      `,
    )
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as BriefingSitemapPostRow[];
}

export async function fetchBriefingHomeData() {
  const supabase = await createServiceServerClient();

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

  const [topResult, editorResult, recentResult, generalRecentResult] = await Promise.all([
    supabase
      .from("briefing_posts")
      .select(
        `
        id, slug, title, published_at, created_at,
        board:briefing_boards!inner(key),
        category:briefing_categories(key,name)
      `,
      )
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("briefing_posts")
      .select(
        `
        id, slug, title, excerpt, cover_image_url, published_at, created_at,
        board:briefing_boards!inner(key),
        category:briefing_categories(key,name)
      `,
      )
      .eq("status", "published")
      .eq("is_editor_pick", true)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("briefing_posts")
      .select(
        `
        id, slug, title, excerpt, cover_image_url, published_at, created_at,
        board:briefing_boards!inner(key),
        category:briefing_categories(key,name)
      `,
      )
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("briefing_posts")
      .select(
        `
        id, slug, title, excerpt, cover_image_url, published_at, created_at,
        board:briefing_boards!inner(key),
        category:briefing_categories(key,name)
      `,
      )
      .eq("status", "published")
      .eq("board.key", "general")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const { data: topData, error: topErr } = topResult;
  if (topErr) {
    throw createSupabaseServiceError(topErr, {
      scope: "briefing.home",
      action: "fetch top posts",
      defaultMessage: "인기 브리핑을 불러오지 못했습니다.",
    });
  }

  const { data: editorData, error: editorErr } = editorResult;
  if (editorErr) {
    throw createSupabaseServiceError(editorErr, {
      scope: "briefing.home",
      action: "fetch editor picks",
      defaultMessage: "에디터 픽을 불러오지 못했습니다.",
    });
  }

  const { data: recentData, error: recentErr } = recentResult;
  if (recentErr) {
    throw createSupabaseServiceError(recentErr, {
      scope: "briefing.home",
      action: "fetch recent posts",
      defaultMessage: "최신 브리핑을 불러오지 못했습니다.",
    });
  }
  const { data: generalRecentData, error: generalRecentErr } = generalRecentResult;
  if (generalRecentErr) {
    throw createSupabaseServiceError(generalRecentErr, {
      scope: "briefing.home",
      action: "fetch recent general posts",
      defaultMessage: "일반 브리핑 목록을 불러오지 못했습니다.",
    });
  }

  const topPosts = ((topData ?? []) as TopPostQueryRow[]).map((row) => {
    const board = pickFirst(row.board);
    const category = pickFirst(row.category);

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      published_at: row.published_at,
      created_at: row.created_at,
      boardKey: board?.key ?? null,
      category: category
        ? {
            key: category.key ?? null,
            name: category.name ?? null,
          }
        : null,
    };
  });

  const editorPicks = ((editorData ?? []) as EditorPickQueryRow[]).map((row) => {
    const board = pickFirst(row.board);
    const category = pickFirst(row.category);

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      cover_image_url: row.cover_image_url,
      published_at: row.published_at,
      created_at: row.created_at,
      boardKey: board?.key ?? null,
      category: category
        ? {
            key: category.key ?? null,
            name: category.name ?? null,
          }
        : null,
    };
  });

  const recentPosts = ((recentData ?? []) as RecentPostQueryRow[]).map((row) => {
    const board = pickFirst(row.board);
    const category = pickFirst(row.category);

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      cover_image_url: row.cover_image_url,
      published_at: row.published_at,
      created_at: row.created_at,
      boardKey: board?.key ?? null,
      category: category
        ? {
            key: category.key ?? null,
            name: category.name ?? null,
          }
        : null,
    };
  });

  const generalRecentPosts = ((generalRecentData ?? []) as RecentPostQueryRow[]).map((row) => {
    const board = pickFirst(row.board);
    const category = pickFirst(row.category);

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      cover_image_url: row.cover_image_url,
      published_at: row.published_at,
      created_at: row.created_at,
      boardKey: board?.key ?? null,
      category: category
        ? {
            key: category.key ?? null,
            name: category.name ?? null,
          }
        : null,
    };
  });

  return {
    isAdmin,
    topPosts,
    editorPicks,
    recentPosts,
    generalRecentPosts,
  };
}
