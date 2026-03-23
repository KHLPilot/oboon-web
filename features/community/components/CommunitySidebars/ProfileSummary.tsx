"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { getAvatarUrlOrDefault } from "@/shared/imageUrl";

import type { CommunityProfileViewModel, FollowStats } from "../../domain/community";
import { mapCommunityProfile } from "../../mappers/community.mapper";
import { getCommunityProfile, getFollowStats } from "../../services/community.profile";
import Interest from "./Interest";

function ProfileSummarySkeleton() {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-5 w-28 rounded-md" />
            <Skeleton className="h-3.5 w-18 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-4 w-4 rounded-sm flex-shrink-0" />
      </div>

      <div className="my-4 h-px bg-(--oboon-border-default)" />

      <div className="grid grid-cols-3 text-center">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={[
              "flex flex-col items-center gap-1 px-2",
              i === 1 ? "border-x border-(--oboon-border-default)" : "",
            ].join(" ")}
          >
            <Skeleton className="h-7 w-10 rounded-md" />
            <Skeleton className="h-3 w-11 rounded-md" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function ProfileSummary() {
  const [profile, setProfile] = useState<CommunityProfileViewModel | null>(
    null
  );
  const [followStats, setFollowStats] = useState<FollowStats | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getCommunityProfile().then((data) => {
      if (!isMounted) return;
      const mapped = data ? mapCommunityProfile(data) : null;
      setProfile(mapped);
      setLoaded(true);
      if (mapped?.id) {
        getFollowStats(mapped.id).then((stats) => {
          if (!isMounted) return;
          setFollowStats(stats);
        }).catch(() => undefined);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!loaded) {
    return (
      <div className="space-y-4">
        <ProfileSummarySkeleton />
      </div>
    );
  }

  const stats = profile?.stats ?? { posts: 0, comments: 0, bookmarks: 0 };
  const avatarUrl = getAvatarUrlOrDefault(profile?.avatarUrl);
  const isLoggedIn = Boolean(profile);

  const cardContent = (
        <Card className="p-5 hover:bg-(--oboon-bg-subtle) transition-colors">
          {/* 아바타 + 이름 + 역할 */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle) overflow-hidden flex-shrink-0 flex items-center justify-center">
                <Image
                  src={avatarUrl}
                  alt={profile?.displayName ?? "사용자"}
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <div className="ob-typo-h3 font-semibold text-(--oboon-text-title)">
                  {profile?.displayName ?? "사용자"}
                </div>
                <div className="ob-typo-caption text-(--oboon-text-muted) mt-0.5">
                  {profile?.roleLabel ?? "로그인이 필요해요"}
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-(--oboon-text-muted) flex-shrink-0" />
          </div>

          <div className="my-4 h-px bg-(--oboon-border-default)" />

          {/* 스탯 3열 그리드 */}
          <div className="grid grid-cols-3 text-center">
            <div className="flex flex-col gap-0.5">
              <span className="ob-typo-h2 font-bold text-(--oboon-text-title)">
                {stats.posts}
              </span>
              <span className="ob-typo-caption text-(--oboon-text-muted)">
                내 글
              </span>
            </div>
            <div className="flex flex-col gap-0.5 border-x border-(--oboon-border-default)">
              <span className="ob-typo-h2 font-bold text-(--oboon-text-title)">
                {stats.comments}
              </span>
              <span className="ob-typo-caption text-(--oboon-text-muted)">
                댓글
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="ob-typo-h2 font-bold text-(--oboon-text-title)">
                {stats.bookmarks}
              </span>
              <span className="ob-typo-caption text-(--oboon-text-muted)">
                북마크
              </span>
            </div>
          </div>

          {/* 팔로우 통계 */}
          {followStats !== null ? (
            <>
              <div className="my-2 h-px bg-(--oboon-border-default)" />
              <div className="grid grid-cols-2 text-center">
                <div className="flex flex-col gap-0.5">
                  <span className="ob-typo-h2 font-bold text-(--oboon-text-title)">
                    {followStats.followerCount}
                  </span>
                  <span className="ob-typo-caption text-(--oboon-text-muted)">
                    팔로워
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 border-l border-(--oboon-border-default)">
                  <span className="ob-typo-h2 font-bold text-(--oboon-text-title)">
                    {followStats.followingCount}
                  </span>
                  <span className="ob-typo-caption text-(--oboon-text-muted)">
                    팔로잉
                  </span>
                </div>
              </div>
            </>
          ) : null}

          {/* 미로그인 CTA */}
          {!isLoggedIn && (
            <>
              <div className="my-4 h-px bg-(--oboon-border-default)" />
              <Button
                variant="primary"
                size="sm"
                shape="pill"
                className="w-full"
                onClick={(e) => e.preventDefault()}
                asChild
              >
                <Link href="/auth/login">로그인하고 기록 남기기</Link>
              </Button>
            </>
          )}
        </Card>
  );

  return (
    <div className="space-y-4">
      {isLoggedIn ? (
        <Link
          href="/community/profile"
          className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--oboon-accent)/30"
        >
          {cardContent}
        </Link>
      ) : (
        <div className="block rounded-2xl">
          {cardContent}
        </div>
      )}

      <Interest />
    </div>
  );
}
