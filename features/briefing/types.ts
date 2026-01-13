// features/briefing/types.ts

export type BriefingBoardKey = "general" | "oboon_original" | (string & {});
export type BriefingContentKind = "article" | "short";

export type BriefingPostCardModel = {
  id: string;
  slug: string;
  title: string;
  createdAt: string;
  coverImageUrl: string | null;

  boardKey: BriefingBoardKey;
  categoryKey: string | null;
  categoryName: string;

  contentKind: BriefingContentKind;
  externalUrl: string | null;

  categoryPostCount?: number | null;
};

export type BriefingOriginalCardModel = {
  key: string; // categoryKey
  name: string;
  description: string | null;
  coverImageUrl?: string | null;
};

export function formatBriefingDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/**
 * 링크 정책(단일 진실)
 * - general: /briefing/general/[slug]
 * - oboon_original: /briefing/oboon-original/[categoryKey]/[slug]
 */
export function getBriefingPostHref(post: BriefingPostCardModel) {
  if (post.boardKey === "general") {
    return `/briefing/general/${encodeURIComponent(post.slug)}`;
  }

  if (post.boardKey === "oboon_original" && post.categoryKey) {
    return `/briefing/oboon-original/${encodeURIComponent(
      post.categoryKey
    )}/${encodeURIComponent(post.slug)}`;
  }

  return "/briefing";
}

export function getBriefingPostBadgeText(post: BriefingPostCardModel) {
  if (post.boardKey === "general") return "일반";
  if (post.contentKind === "short") return "숏츠";
  return post.categoryName;
}

export function getBriefingOriginalHref(original: BriefingOriginalCardModel) {
  return `/briefing/oboon-original/${encodeURIComponent(original.key)}`;
}
