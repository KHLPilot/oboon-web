"use client";

import { useState } from "react";

import Button from "@/components/ui/Button";
import { showAlert } from "@/shared/alert";

import { toggleCommunityFollow } from "../../services/community.posts";

export default function FollowButton({
  profileId,
  initialIsFollowing,
  isMine = false,
}: {
  profileId: string;
  initialIsFollowing: boolean;
  isMine?: boolean;
}) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  if (isMine || !profileId) return null;

  const handleClick = async () => {
    setLoading(true);
    // 낙관적 업데이트
    setIsFollowing((prev) => !prev);
    try {
      const result = await toggleCommunityFollow(profileId);
      if (!result.ok) {
        // 롤백
        setIsFollowing((prev) => !prev);
        showAlert(result.message);
      } else {
        setIsFollowing(result.isFollowing);
      }
    } catch {
      setIsFollowing((prev) => !prev);
      showAlert("팔로우 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={isFollowing ? "secondary" : "primary"}
      size="sm"
      shape="pill"
      loading={loading}
      onClick={(e) => {
        e.stopPropagation();
        void handleClick();
      }}
      className="shrink-0 h-6 px-2.5 ob-typo-caption"
    >
      {isFollowing ? "팔로잉" : "팔로우"}
    </Button>
  );
}
