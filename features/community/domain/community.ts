export const COMMUNITY_TABS = [
  { key: "all", label: "전체" },
  { key: "visited", label: "다녀왔어요" },
  { key: "thinking", label: "고민 중이에요" },
  { key: "property_qna", label: "현장 Q&A" },
  { key: "follow", label: "팔로우" },
  { key: "agent_only", label: "상담사 전용" },
] as const;

export const COMMUNITY_PROFILE_TABS = [
  { key: "all", label: "전체" },
  { key: "visited", label: "다녀왔어요" },
  { key: "thinking", label: "고민 중이에요" },
  { key: "comments", label: "남긴 댓글" },
  { key: "bookmarks", label: "북마크" },
] as const;

export const COMMUNITY_STATUS_LABELS = {
  visited: "다녀왔어요",
  thinking: "고민 중이에요",
  agent_only: "상담사 전용",
} as const;

export const COMMUNITY_ROLE_LABELS = {
  user: "일반 사용자",
  agent_pending: "분양대행사 직원 (승인 대기)",
  agent: "분양대행사 직원",
  builder: "시공사",
  developer: "시행사",
  admin: "관리자",
} as const;

export type CommunityTabKey = (typeof COMMUNITY_TABS)[number]["key"];
export type CommunityProfileTabKey =
  (typeof COMMUNITY_PROFILE_TABS)[number]["key"];
export type CommunityPostStatus = keyof typeof COMMUNITY_STATUS_LABELS;
export type CommunityUserRole = keyof typeof COMMUNITY_ROLE_LABELS;

export type CommunityOriginalPost = {
  id: string;
  title: string;
  body: string;
  authorName: string;
  propertyName: string;
  createdAt: string;
};

export type FollowStats = {
  followerCount: number;
  followingCount: number;
};

export type CommunityPostRow = {
  id: string;
  status: CommunityPostStatus;
  propertyName: string;
  propertyId?: number | null;
  title: string;
  body: string;
  authorId?: string | null;
  authorName: string;
  authorAvatarUrl?: string | null;
  likes: number;
  comments: number;
  isLiked: boolean;
  isBookmarked: boolean;
  isMine: boolean;
  isFollowingAuthor: boolean;
  createdAt: string;
  isRepost: boolean;
  repostCount: number;
  isPropertyQna: boolean;
  originalPost: CommunityOriginalPost | null;
};

export type CommunityPostViewModel = {
  id: string;
  status: CommunityPostStatus;
  statusLabel: string;
  propertyName: string;
  propertyId?: number | null;
  title: string;
  displayTitle: string;
  body: string;
  authorId?: string | null;
  authorName: string;
  authorAvatarUrl?: string | null;
  likes: number;
  comments: number;
  isLiked: boolean;
  isBookmarked: boolean;
  isMine: boolean;
  isFollowingAuthor: boolean;
  timeLabel: string;
  isRepost: boolean;
  repostCount: number;
  isPropertyQna: boolean;
  originalPost: CommunityOriginalPost | null;
};

export type CommunityProfileStats = {
  posts: number;
  comments: number;
  bookmarks: number;
};

export type CommunityProfileRow = {
  id: string;
  email?: string | null;
  name?: string | null;
  nickname?: string | null;
  metaName?: string | null;
  avatarUrl?: string | null;
  role?: CommunityUserRole | null;
  stats?: CommunityProfileStats;
};

export type CommunityProfileViewModel = {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  roleLabel: string;
  stats: CommunityProfileStats;
};

export type CommunityPropertyOption = {
  id: number;
  name: string;
  visitedOn?: string | null;
};

export type CommunityInterestProperty = {
  id: number;
  name: string;
};
