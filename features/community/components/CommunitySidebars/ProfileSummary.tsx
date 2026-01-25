"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import Card from "@/components/ui/Card";

import type { CommunityProfileViewModel } from "../../domain/community";
import { mapCommunityProfile } from "../../mappers/community.mapper";
import { getCommunityProfile } from "../../services/community.profile";
import Interest from "./Interest";

export default function ProfileSummary() {
  const [profile, setProfile] = useState<CommunityProfileViewModel | null>(null);

  useEffect(() => {
    let isMounted = true;

    getCommunityProfile().then((data) => {
      if (!isMounted) return;
      setProfile(data ? mapCommunityProfile(data) : null);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = profile?.stats ?? { posts: 0, comments: 0, bookmarks: 0 };

  return (
    <div className="space-y-4">
      <Link
        href="/community/profile"
        className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--oboon-accent)/30"
      >
        <Card className="p-4 hover:bg-(--oboon-bg-subtle)">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle) overflow-hidden flex items-center justify-center">
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="ob-typo-caption text-(--oboon-text-body)">
                    {(profile?.displayName ?? "사용자").slice(0, 1)}
                  </span>
                )}
              </div>
              <div>
                <div className="ob-typo-h3 font-semibold text-(--oboon-text-title)">
                  {profile?.displayName ?? "사용자"}
                </div>
                <div className="ob-typo-body text-(--oboon-text-muted)">
                  {profile?.roleLabel ?? "로그인 필요"}
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-(--oboon-text-muted)" />
          </div>

          <div className="my-4 h-px bg-(--oboon-border-default)" />

          <div className="space-y-2">
            <div className="flex items-center justify-between ob-typo-subtitle">
              <span className="text-(--oboon-text-title)">내가 쓴 글</span>
              <span className="text-(--oboon-text-muted)">{stats.posts}</span>
            </div>
            <div className="flex items-center justify-between ob-typo-subtitle">
              <span className="text-(--oboon-text-title)">내가 쓴 댓글</span>
              <span className="text-(--oboon-text-muted)">
                {stats.comments}
              </span>
            </div>
            <div className="flex items-center justify-between ob-typo-subtitle">
              <span className="text-(--oboon-text-title)">북마크한 후기</span>
              <span className="text-(--oboon-text-muted)">
                {stats.bookmarks}
              </span>
            </div>
          </div>
        </Card>
      </Link>

      <Interest />
    </div>
  );
}
