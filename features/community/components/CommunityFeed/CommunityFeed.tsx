"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

import { COMMUNITY_TABS } from "../../domain/community";
import type { CommunityTabKey } from "../../domain/community";
import { mapCommunityPost } from "../../mappers/community.mapper";
import { getCommunityAuthStatus } from "../../services/community.meta";
import { getCommunityFeed as getCommunityFeedPosts } from "../../services/community.posts";
import CommunityPostCard from "./CommunityPostCard";
import CommunityTabs from "./CommunityTabs";
import CommunityWriteModal from "./CommunityWriteModal";

type CommunityEmptyProps = {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

function CommunityEmpty({
  title = "?꾩쭅 泥?湲곕줉???놁뒿?덈떎",
  description = "?ㅻ????꾩옣?대굹 怨좊? 以묒씤 ?댁슜???④꺼蹂댁꽭??",
  actionLabel = "湲곕줉 ?④린湲?",
  onAction = () => console.log("community:write"),
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
        <Button
          variant="secondary"
          size="sm"
          shape="pill"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      </div>
    </Card>
  );
}

export default function CommunityFeed() {
  const [activeTab, setActiveTab] = useState<CommunityTabKey>("all");
  const [writeOpen, setWriteOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [posts, setPosts] = useState<ReturnType<typeof mapCommunityPost>[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    getCommunityFeedPosts(activeTab)
      .then((rows) => {
        if (!isMounted) return;
        setPosts(rows.map(mapCommunityPost));
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  useEffect(() => {
    let isMounted = true;

    getCommunityAuthStatus().then(({ isLoggedIn: loggedIn }) => {
      if (!isMounted) return;
      setIsLoggedIn(loggedIn);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CommunityTabs
          tabs={COMMUNITY_TABS}
          value={activeTab}
          onChange={setActiveTab}
        />
        <Button
          variant="primary"
          size="sm"
          shape="pill"
          onClick={() => setWriteOpen(true)}
        >
          + 기록 남기기
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle) flex items-center justify-center text-(--oboon-text-muted)">
            <Megaphone className="h-4 w-4" />
          </div>
          <div>
            <div className="ob-typo-h3 font-semibold text-(--oboon-text-title)">
              OBOON 커뮤니티 이용 수칙 안내
            </div>
            <p className="mt-0.5 ob-typo-body text-(--oboon-text-muted)">
              모두가 즐거운 커뮤니티를 위해 서로 존중하는 문화를 만들어가요.
            </p>
          </div>
        </div>
      </Card>

      {!loading && posts.length === 0 ? (
        <CommunityEmpty />
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

      <CommunityWriteModal
        open={writeOpen}
        onClose={() => setWriteOpen(false)}
        isLoggedIn={isLoggedIn}
      />
    </div>
  );
}
