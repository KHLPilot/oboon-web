"use client";

import { useEffect, useState } from "react";
import { COMMUNITY_PROFILE_TABS } from "../../domain/community";
import type {
  CommunityProfileTabKey,
  CommunityTabKey,
  CommunityProfileViewModel,
} from "../../domain/community";
import {
  mapCommunityProfile,
  mapCommunityPost,
} from "../../mappers/community.mapper";
import { getCommunityProfile } from "../../services/community.profile";
import {
  getCommunityCommentedPosts,
  getCommunityFeed,
} from "../../services/community.posts";
import CommunityPostCard from "../CommunityFeed/CommunityPostCard";
import CommunityTabs from "../CommunityFeed/CommunityTabs";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Bookmarks from "../CommunitySidebars/Bookmarks";
import Interest from "../CommunitySidebars/Interest";

type CommunityEmptyProps = {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

function CommunityEmpty({
  title = "아직 첫 기록이 없습니다",
  description = "다녀온 현장이나 지금 고민중인 내용을 한 문장으로 남겨보세요. 잘 쓴 글이 아니어도 괜찮아요! 나중에 결정할 때, 이 기록이 가장 솔직한 기준이 됩니다.",
  actionLabel = "기록 남기기",
  onAction = () => {},
}: CommunityEmptyProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="ob-typo-h4 text-(--oboon-text-title)">{title}</div>
          <p className="mt-1 ob-typo-body text-(--oboon-text-muted)">
            {description}
          </p>
        </div>
        <Button variant="secondary" size="sm" shape="pill" onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
    </Card>
  );
}

function CommunityProfileHeader({
  profile,
}: {
  profile: CommunityProfileViewModel | null;
}) {
  const stats = profile?.stats ?? { posts: 0, comments: 0, bookmarks: 0 };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle) flex items-center justify-center overflow-hidden">
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
          <div className="ob-typo-body font-semibold text-(--oboon-text-title)">
            {profile?.displayName ?? "사용자"}
          </div>
          <div className="ob-typo-caption text-(--oboon-text-muted)">
            기록 {stats.posts} · 댓글 {stats.comments}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function CommunityProfilePage() {
  const [activeTab, setActiveTab] = useState<CommunityProfileTabKey>("all");
  const [profile, setProfile] = useState<CommunityProfileViewModel | null>(
    null,
  );
  const [posts, setPosts] = useState<ReturnType<typeof mapCommunityPost>[]>([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const loadPosts = async () => {
      if (activeTab === "comments") {
        if (!profile?.id) {
          setPosts([]);
          return;
        }
        const rows = await getCommunityCommentedPosts(profile.id);
        if (!isMounted) return;
        setPosts(rows.map(mapCommunityPost));
        return;
      }

      const rows = await getCommunityFeed(activeTab as CommunityTabKey);
      if (!isMounted) return;
      setPosts(rows.map(mapCommunityPost));
    };

    loadPosts()
      .catch((error) => {
        console.error(
          "community profile posts error:",
          error?.message || error,
        );
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeTab, profile?.id]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
      <section className="min-w-0 space-y-3">
        <CommunityProfileHeader profile={profile} />
        <CommunityTabs
          tabs={COMMUNITY_PROFILE_TABS}
          value={activeTab}
          onChange={setActiveTab}
        />

        {!loading && posts.length === 0 ? (
          <CommunityEmpty
            title={
              activeTab === "comments"
                ? "아직 남긴 댓글이 없습니다"
                : "아직 첫 기록이 없습니다"
            }
            description={
              activeTab === "comments"
                ? profile
                  ? "댓글을 남기면 여기에서 확인할 수 있어요."
                  : "로그인 후 댓글 기록을 확인할 수 있어요."
                : "다녀온 현장이나 고민 중인 내용을 남겨보세요."
            }
          />
        ) : (
          <div className="space-y-3">
            {loading && (
              <Card className="p-4">
                <div className="ob-typo-body text-(--oboon-text-muted)">
                  불러오는 중...
                </div>
              </Card>
            )}
            {posts.map((post) => (
              <CommunityPostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>

      <aside className="space-y-4 lg:sticky lg:top-[calc(var(--oboon-header-offset)+1rem)] lg:self-start">
        <Interest />
        <Bookmarks />
      </aside>
    </div>
  );
}
