"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Megaphone } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

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
};

function CommunityEmpty({
  title = "아직 첫 기록이 없습니다",
  description = "다녀온 현장이나 지금 고민중인 내용을 한 문장으로 남겨보세요. 잘 쓴 글이 아니어도 괜찮아요! 나중에 결정할 때, 이 기록이 가장 솔직한 기준이 됩니다.",
}: CommunityEmptyProps) {
  return (
    <Card className="p-5">
      <div>
        <div className="ob-typo-h4 text-(--oboon-text-title)">{title}</div>
        <p className="mt-1 ob-typo-body text-(--oboon-text-muted)">
          {description}
        </p>
      </div>
    </Card>
  );
}

export default function CommunityFeed() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<CommunityTabKey>("all");
  const [writeOpen, setWriteOpen] = useState(searchParams.get("write") === "1");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [posts, setPosts] = useState<ReturnType<typeof mapCommunityPost>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

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
            onChange={(tab) => {
              setLoading(true);
              setActiveTab(tab);
            }}
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
