type BaseSeoDescriptor = {
  title: string;
  description: string;
  canonicalPath: string;
  openGraphTitle: string;
};

type RobotsDescriptor = {
  index: boolean;
  follow: boolean;
};

export function buildBriefingCategoryMetadata(args: {
  categoryKey: string;
  categoryName: string;
  description?: string | null;
}) {
  const { categoryKey, categoryName, description } = args;
  const resolvedDescription =
    description?.trim() ||
    `${categoryName} 관련 인사이트와 해설을 모아둔 OBOON 오리지널 브리핑 카테고리입니다.`;

  return {
    title: categoryName,
    description: resolvedDescription,
    canonicalPath: `/briefing/oboon-original/${encodeURIComponent(categoryKey)}`,
    openGraphTitle: `${categoryName} | OBOON`,
  } satisfies BaseSeoDescriptor;
}

export function buildBriefingSearchMetadata(query: string) {
  const trimmed = query.trim();
  const title = trimmed ? `"${trimmed}" 검색` : "브리핑 검색";
  const description = trimmed
    ? `OBOON 브리핑에서 "${trimmed}" 관련 글을 검색한 결과 페이지입니다.`
    : "OBOON 브리핑 검색 페이지입니다.";

  return {
    title,
    description,
    canonicalPath: "/briefing/search",
    openGraphTitle: `${title} | OBOON`,
    robots: {
      index: false,
      follow: false,
    },
  } satisfies BaseSeoDescriptor & { robots: RobotsDescriptor };
}

export function buildBriefingAuthorMetadata(args: {
  authorId: string;
  authorName: string;
  roleLabel: string;
  bio?: string | null;
}) {
  const { authorId, authorName, roleLabel, bio } = args;
  const description =
    bio?.trim() ||
    `${authorName} ${roleLabel}의 OBOON 브리핑 작성 이력을 확인하는 페이지입니다.`;

  return {
    title: `${authorName} 작성자 페이지`,
    description,
    canonicalPath: `/briefing/author/${encodeURIComponent(authorId)}`,
    openGraphTitle: `${authorName} | OBOON`,
    robots: {
      index: false,
      follow: false,
    },
  } satisfies BaseSeoDescriptor & { robots: RobotsDescriptor };
}
