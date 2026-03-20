import { COMMUNITY_STATUS_LABELS } from "../domain/community";
import type {
  CommunityPostRow,
  CommunityPostViewModel,
  CommunityProfileRow,
  CommunityProfileStats,
  CommunityProfileViewModel,
} from "../domain/community";
import { COMMUNITY_ROLE_LABELS } from "../domain/community";

function formatTimeLabel(createdAt: string): string {
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  const diffMs = Math.max(0, now - created);
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "방금";
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays === 1) return "어제";
  return `${diffDays}일 전`;
}

function normalizeText(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

export function mapCommunityPost(
  row: CommunityPostRow,
): CommunityPostViewModel {
  const title = normalizeText(row.title);
  const body = normalizeText(row.body);
  const originalTitle = normalizeText(row.originalPost?.title);
  const originalBody = normalizeText(row.originalPost?.body);
  const displayTitle = row.isRepost
    ? body || originalTitle || originalBody || title || "리포스트"
    : title || body || "제목 없음";

  return {
    id: row.id,
    status: row.status,
    statusLabel: COMMUNITY_STATUS_LABELS[row.status],
    propertyName: row.propertyName,
    title,
    displayTitle,
    body,
    authorId: row.authorId ?? null,
    authorName: row.authorName,
    authorAvatarUrl: row.authorAvatarUrl,
    likes: row.likes,
    comments: row.comments,
    isLiked: row.isLiked,
    isBookmarked: row.isBookmarked,
    isMine: row.isMine,
    isFollowingAuthor: row.isFollowingAuthor,
    propertyId: row.propertyId ?? null,
    isRepost: row.isRepost,
    repostCount: row.repostCount,
    isPropertyQna: row.isPropertyQna,
    originalPost: row.originalPost,
    timeLabel: formatTimeLabel(row.createdAt),
  };
}

const DEFAULT_STATS: CommunityProfileStats = {
  posts: 0,
  comments: 0,
  bookmarks: 0,
};

const normalizeName = (value?: string | null) =>
  value && value !== "temp" ? value : "";

export function mapCommunityProfile(
  row: CommunityProfileRow,
): CommunityProfileViewModel {
  const nickname = normalizeName(row.nickname);
  const name = normalizeName(row.name);
  const metaName = normalizeName(row.metaName);
  const emailName = row.email?.split("@")[0];

  const displayName =
    nickname ||
    name ||
    metaName ||
    normalizeName(emailName) ||
    "사용자";

  const roleKey = row.role ?? "user";
  const roleLabel = COMMUNITY_ROLE_LABELS[roleKey] ?? "일반 사용자";

  return {
    id: row.id,
    displayName,
    avatarUrl: row.avatarUrl ?? null,
    roleLabel,
    stats: row.stats ?? DEFAULT_STATS,
  };
}
