"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import Card from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { getAvatarUrlOrDefault } from "@/shared/imageUrl";

import { COMMUNITY_PROFILE_TABS } from "../../domain/community";
import type {
  CommunityProfileTabKey,
  CommunityProfileViewModel,
  CommunityTabKey,
  FollowStats,
} from "../../domain/community";
import { mapCommunityProfile, mapCommunityPost } from "../../mappers/community.mapper";
import {
  getPublicProfile,
  getFollowStats,
  getIsFollowing,
} from "../../services/community.profile";
import {
  getCommunityCommentedPosts,
  getCommunityProfileFeed,
} from "../../services/community.posts";
import CommunityPostCard from "../CommunityFeed/CommunityPostCard";
import CommunityTabs from "../CommunityFeed/CommunityTabs";
import { CommunityPostCardSkeleton } from "../CommunityFeed/CommunityPostCardSkeleton";
import FollowButton from "../shared/FollowButton";
import Interest from "../CommunitySidebars/Interest";

// 프로필 탭 — 북마크 제외 (타인 프로필)
const OTHER_PROFILE_TABS = COMMUNITY_PROFILE_TABS.filter(
  (tab) => tab.key !== "comments",
);

function ProfileHeaderSkeleton() {
  return (
    <div className="flex items-start gap-4 mb-6">
      <Skeleton className="h-16 w-16 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
  );
}

function OtherUserProfileHeader({
  profile,
  followStats,
  isFollowing,
  isMine,
}: {
  profile: CommunityProfileViewModel;
  followStats: FollowStats | null;
  isFollowing: boolean;
  isMine: boolean;
}) {
  const stats = profile.stats;
  const avatarUrl = getAvatarUrlOrDefault(profile.avatarUrl);

  return (
    <div className="mb-6">
      <div className="flex items-start gap-4">
        <div className="h-16 w-16 rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle) flex items-center justify-center overflow-hidden flex-shrink-0">
          <Image
            src={avatarUrl}
            alt={profile.displayName}
            width={64}
            height={64}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="ob-typo-h3 font-semibold text-(--oboon-text-title)">
              {profile.displayName}
            </div>
            {!isMine && (
              <FollowButton
                profileId={profile.id}
                initialIsFollowing={isFollowing}
                isMine={isMine}
              />
            )}
          </div>
          <div className="mt-0.5 ob-typo-caption text-(--oboon-text-muted)">
            {profile.roleLabel}
          </div>
          <div className="mt-1.5 ob-typo-caption text-(--oboon-text-muted) flex items-center gap-3 flex-wrap">
            <span>기록 {stats.posts}</span>
            <span>댓글 {stats.comments}</span>
            {followStats !== null ? (
              <>
                <span>팔로워 {followStats.followerCount}</span>
                <span>팔로잉 {followStats.followingCount}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OtherUserProfilePage({
  userId,
  currentUserId,
}: {
  userId: string;
  currentUserId: string | null;
}) {
  const [activeTab, setActiveTab] = useState<CommunityProfileTabKey>("all");
  const [profile, setProfile] = useState<CommunityProfileViewModel | null>(null);
  const [followStats, setFollowStats] = useState<FollowStats | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [headerLoaded, setHeaderLoaded] = useState(false);
  const [posts, setPosts] = useState<ReturnType<typeof mapCommunityPost>[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(6);

  // 프로필 + 팔로우 통계 + 팔로우 여부 로드
  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getPublicProfile(userId),
      getFollowStats(userId),
      getIsFollowing(userId),
    ]).then(([profileData, followData, following]) => {
      if (!isMounted) return;
      setProfile(profileData ? mapCommunityProfile(profileData) : null);
      setFollowStats(followData);
      setIsFollowing(following);
      setHeaderLoaded(true);
    }).catch(() => {
      if (!isMounted) return;
      setHeaderLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  // 글 목록 로드
  useEffect(() => {
    if (!profile?.id) return;
    let isMounted = true;

    const load = async () => {
      if (activeTab === "comments") {
        const rows = await getCommunityCommentedPosts(profile.id);
        if (!isMounted) return;
        setPosts(rows.map(mapCommunityPost));
      } else {
        const rows = await getCommunityProfileFeed(
          profile.id,
          activeTab as CommunityTabKey,
        );
        if (!isMounted) return;
        setPosts(rows.map(mapCommunityPost));
      }
    };

    load()
      .catch((error) => {
        console.error("other user profile posts error:", error?.message || error);
      })
      .finally(() => {
        if (!isMounted) return;
        setPostsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeTab, profile?.id]);

  const isMine = Boolean(currentUserId && currentUserId === userId);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <section className="min-w-0 space-y-3">
        {!headerLoaded ? (
          <ProfileHeaderSkeleton />
        ) : profile ? (
          <OtherUserProfileHeader
            profile={profile}
            followStats={followStats}
            isFollowing={isFollowing}
            isMine={isMine}
          />
        ) : (
          <Card className="p-4">
            <p className="ob-typo-body text-(--oboon-text-muted)">
              존재하지 않는 사용자입니다.
            </p>
          </Card>
        )}

        {profile && (
          <>
            <CommunityTabs
              tabs={OTHER_PROFILE_TABS}
              value={activeTab}
              onChange={(tab) => {
                setPosts([]);
                setVisibleCount(6);
                setPostsLoading(true);
                setActiveTab(tab);
              }}
            />

            {postsLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <CommunityPostCardSkeleton key={i} />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <Card className="p-5">
                <div className="ob-typo-body text-(--oboon-text-muted)">
                  {activeTab === "visited"
                    ? "다녀온 현장 기록이 없습니다."
                    : activeTab === "thinking"
                      ? "고민 중인 글이 없습니다."
                      : "아직 작성한 글이 없습니다."}
                </div>
              </Card>
            ) : (
              <div className="space-y-3">
                {posts.slice(0, visibleCount).map((post) => (
                  <CommunityPostCard key={post.id} post={post} />
                ))}
                {posts.length > visibleCount && (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      className="ob-typo-caption text-(--oboon-primary) px-4 py-2 rounded-xl border border-(--oboon-border-default) hover:bg-(--oboon-bg-subtle) transition-colors"
                      onClick={() =>
                        setVisibleCount((prev) => Math.min(prev + 6, posts.length))
                      }
                    >
                      더보기
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>

      <aside className="space-y-4 lg:sticky lg:top-[calc(var(--oboon-header-offset)+1rem)] lg:self-start">
        <Interest />
      </aside>
    </div>
  );
}
