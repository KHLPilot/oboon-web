"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CornerDownRight, Heart, Megaphone } from "lucide-react";
import Image from "next/image";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

import { COMMUNITY_TABS } from "../../domain/community";
import type { CommunityTabKey } from "../../domain/community";
import { mapCommunityPost } from "../../mappers/community.mapper";
import { getCommunityAuthStatus } from "../../services/community.meta";
import {
  createCommunityComment,
  getCommunityFeed as getCommunityFeedPosts,
  getCommunityComments,
  toggleCommunityCommentLike,
  toggleCommunityBookmark,
  toggleCommunityLike,
  type CommunityComment,
} from "../../services/community.posts";
import CommunityPostCard from "./CommunityPostCard";
import CommunityTabs from "./CommunityTabs";
import CommunityWriteModal from "./CommunityWriteModal";
import { showAlert } from "@/shared/alert";

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
  const [likeLoadingId, setLikeLoadingId] = useState<string | null>(null);
  const [bookmarkLoadingId, setBookmarkLoadingId] = useState<string | null>(null);
  const [commentsOpenMap, setCommentsOpenMap] = useState<Record<string, boolean>>(
    {},
  );
  const [commentsLoadingId, setCommentsLoadingId] = useState<string | null>(null);
  const [commentSubmittingId, setCommentSubmittingId] = useState<string | null>(
    null,
  );
  const [commentsMap, setCommentsMap] = useState<Record<string, CommunityComment[]>>(
    {},
  );
  const [commentInputMap, setCommentInputMap] = useState<Record<string, string>>(
    {},
  );
  const [commentAnonymousMap, setCommentAnonymousMap] = useState<
    Record<string, boolean>
  >({});
  const [commentAnonymousNicknameMap, setCommentAnonymousNicknameMap] = useState<
    Record<string, string>
  >({});
  const [replyOpenMap, setReplyOpenMap] = useState<Record<string, boolean>>({});
  const [replyInputMap, setReplyInputMap] = useState<Record<string, string>>({});
  const [replyAnonymousMap, setReplyAnonymousMap] = useState<
    Record<string, boolean>
  >({});
  const [replyAnonymousNicknameMap, setReplyAnonymousNicknameMap] = useState<
    Record<string, string>
  >({});
  const [replySubmittingId, setReplySubmittingId] = useState<string | null>(null);
  const [commentLikeLoadingId, setCommentLikeLoadingId] = useState<string | null>(
    null,
  );

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

  const handleToggleLike = async (postId: string) => {
    if (!isLoggedIn) {
      showAlert("로그인 후 이용할 수 있습니다.");
      return;
    }

    setLikeLoadingId(postId);
    try {
      const result = await toggleCommunityLike(postId);
      if (!result.ok) {
        showAlert(result.message);
        return;
      }

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, isLiked: result.liked, likes: result.likeCount }
            : post,
        ),
      );
    } finally {
      setLikeLoadingId(null);
    }
  };

  const handleToggleBookmark = async (postId: string) => {
    if (!isLoggedIn) {
      showAlert("로그인 후 이용할 수 있습니다.");
      return;
    }

    setBookmarkLoadingId(postId);
    try {
      const result = await toggleCommunityBookmark(postId);
      if (!result.ok) {
        showAlert(result.message);
        return;
      }

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, isBookmarked: result.bookmarked }
            : post,
        ),
      );
    } finally {
      setBookmarkLoadingId(null);
    }
  };

  const handleToggleComments = async (postId: string) => {
    const nextOpen = !commentsOpenMap[postId];
    setCommentsOpenMap((prev) => ({ ...prev, [postId]: nextOpen }));

    if (!nextOpen || commentsMap[postId]) return;

    setCommentsLoadingId(postId);
    try {
      const result = await getCommunityComments(postId);
      if (!result.ok) {
        showAlert(result.message);
        return;
      }
      setCommentsMap((prev) => ({ ...prev, [postId]: result.comments }));
    } finally {
      setCommentsLoadingId(null);
    }
  };

  const handleSubmitComment = async (postId: string) => {
    if (!isLoggedIn) {
      showAlert("로그인 후 이용할 수 있습니다.");
      return;
    }

    const body = (commentInputMap[postId] ?? "").trim();
    const isAnonymous = commentAnonymousMap[postId] === true;
    const anonymousNickname = (commentAnonymousNicknameMap[postId] ?? "").trim();
    if (!body) {
      showAlert("댓글 내용을 입력해주세요.");
      return;
    }

    setCommentSubmittingId(postId);
    try {
      const result = await createCommunityComment(
        postId,
        body,
        undefined,
        isAnonymous,
        anonymousNickname,
      );
      if (!result.ok) {
        showAlert(result.message);
        return;
      }

      setCommentsMap((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] ?? []), result.comment],
      }));
      setCommentInputMap((prev) => ({ ...prev, [postId]: "" }));
      setCommentAnonymousMap((prev) => ({ ...prev, [postId]: false }));
      setCommentAnonymousNicknameMap((prev) => ({ ...prev, [postId]: "" }));
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, comments: result.commentCount } : post,
        ),
      );
    } finally {
      setCommentSubmittingId(null);
    }
  };

  const handleSubmitReply = async (postId: string, parentCommentId: string) => {
    if (!isLoggedIn) {
      showAlert("로그인 후 이용할 수 있습니다.");
      return;
    }

    const body = (replyInputMap[parentCommentId] ?? "").trim();
    const isAnonymous = replyAnonymousMap[parentCommentId] === true;
    const anonymousNickname = (
      replyAnonymousNicknameMap[parentCommentId] ?? ""
    ).trim();
    if (!body) {
      showAlert("답글 내용을 입력해주세요.");
      return;
    }

    setReplySubmittingId(parentCommentId);
    try {
      const result = await createCommunityComment(
        postId,
        body,
        parentCommentId,
        isAnonymous,
        anonymousNickname,
      );
      if (!result.ok) {
        showAlert(result.message);
        return;
      }

      setCommentsMap((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] ?? []), result.comment],
      }));
      setReplyInputMap((prev) => ({ ...prev, [parentCommentId]: "" }));
      setReplyOpenMap((prev) => ({ ...prev, [parentCommentId]: false }));
      setReplyAnonymousMap((prev) => ({ ...prev, [parentCommentId]: false }));
      setReplyAnonymousNicknameMap((prev) => ({ ...prev, [parentCommentId]: "" }));
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, comments: result.commentCount } : post,
        ),
      );
    } finally {
      setReplySubmittingId(null);
    }
  };

  const handleToggleCommentLike = async (postId: string, commentId: string) => {
    if (!isLoggedIn) {
      showAlert("로그인 후 이용할 수 있습니다.");
      return;
    }

    setCommentLikeLoadingId(commentId);
    try {
      const result = await toggleCommunityCommentLike(commentId);
      if (!result.ok) {
        showAlert(result.message);
        return;
      }

      setCommentsMap((prev) => ({
        ...prev,
        [postId]: (prev[postId] ?? []).map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                isLiked: result.liked,
                likeCount: result.likeCount,
              }
            : comment,
        ),
      }));
    } finally {
      setCommentLikeLoadingId(null);
    }
  };

  const renderCommentsPanel = (postId: string) => {
    const comments = commentsMap[postId] ?? [];
    const rootComments = comments.filter((comment) => !comment.parentCommentId);
    const repliesMap = comments.reduce<Record<string, CommunityComment[]>>(
      (acc, comment) => {
        if (!comment.parentCommentId) return acc;
        if (!acc[comment.parentCommentId]) acc[comment.parentCommentId] = [];
        acc[comment.parentCommentId].push(comment);
        return acc;
      },
      {},
    );
    const loadingComments = commentsLoadingId === postId;
    const commentInput = commentInputMap[postId] ?? "";
    const commentAnonymous = commentAnonymousMap[postId] === true;
    const commentAnonymousNickname = commentAnonymousNicknameMap[postId] ?? "";
    const submitting = commentSubmittingId === postId;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="댓글로 의견을 남겨보세요"
            value={commentInput}
            onChange={(event) =>
              setCommentInputMap((prev) => ({
                ...prev,
                [postId]: event.target.value,
              }))
            }
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void handleSubmitComment(postId);
              }
            }}
            className="h-9 flex-1 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-3 ob-typo-body text-(--oboon-text-title) placeholder:text-(--oboon-text-muted) focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)/30"
          />
          <Button
            variant="primary"
            size="sm"
            shape="pill"
            loading={submitting}
            onClick={() => void handleSubmitComment(postId)}
          >
            남기기
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={commentAnonymous}
              onChange={(event) =>
                setCommentAnonymousMap((prev) => ({
                  ...prev,
                  [postId]: event.target.checked,
                }))
              }
              className="h-3.5 w-3.5 rounded border-(--oboon-border-default)"
            />
            <span className="ob-typo-caption text-(--oboon-text-muted)">
              익명 댓글
            </span>
          </label>
          {commentAnonymous ? (
            <input
              type="text"
              placeholder="익명 닉네임(선택)"
              value={commentAnonymousNickname}
              onChange={(event) =>
                setCommentAnonymousNicknameMap((prev) => ({
                  ...prev,
                  [postId]: event.target.value,
                }))
              }
              className="h-8 w-44 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-2.5 ob-typo-caption text-(--oboon-text-title) placeholder:text-(--oboon-text-muted) focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)/30"
              maxLength={20}
            />
          ) : null}
        </div>

        {loadingComments ? (
          <div className="ob-typo-caption text-(--oboon-text-muted)">
            댓글을 불러오는 중...
          </div>
        ) : rootComments.length === 0 ? (
          <div className="ob-typo-caption text-(--oboon-text-muted)">
            첫 댓글을 남겨보세요.
          </div>
        ) : (
          <div className="space-y-3">
            {rootComments.map((comment) => {
              const replies = repliesMap[comment.id] ?? [];
              const replyOpen = Boolean(replyOpenMap[comment.id]);
              const replyInput = replyInputMap[comment.id] ?? "";
              const replyAnonymous = replyAnonymousMap[comment.id] === true;
              const replyAnonymousNickname =
                replyAnonymousNicknameMap[comment.id] ?? "";
              const replySubmitting = replySubmittingId === comment.id;

              return (
                <div key={comment.id} className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="h-7 w-7 shrink-0 rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle) overflow-hidden flex items-center justify-center">
                      {comment.authorAvatarUrl ? (
                        <Image
                          src={comment.authorAvatarUrl}
                          alt={comment.authorName}
                          width={28}
                          height={28}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="ob-typo-caption text-(--oboon-text-body)">
                          {comment.authorName.slice(0, 1)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="ob-typo-subtitle text-(--oboon-text-title)">
                        {comment.authorName}
                      </div>
                      <p className="mt-0.5 ob-typo-caption text-(--oboon-text-body) whitespace-pre-wrap break-words">
                        {comment.body}
                      </p>
                      <div className="mt-1 flex items-center gap-3">
                        <button
                          type="button"
                          disabled={commentLikeLoadingId === comment.id}
                          onClick={() => void handleToggleCommentLike(postId, comment.id)}
                          className="inline-flex items-center gap-1 ob-typo-caption text-(--oboon-text-muted) disabled:opacity-50"
                        >
                          <Heart
                            className={[
                              "h-3.5 w-3.5",
                              comment.isLiked
                                ? "fill-(--oboon-primary) text-(--oboon-primary)"
                                : "",
                            ].join(" ")}
                          />
                          {comment.likeCount}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setReplyOpenMap((prev) => ({
                              ...prev,
                              [comment.id]: !prev[comment.id],
                            }))
                          }
                          className="ob-typo-caption text-(--oboon-text-muted)"
                        >
                          답글
                        </button>
                      </div>
                    </div>
                  </div>

                  {replyOpen ? (
                    <div className="ml-9 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="답글 입력"
                          value={replyInput}
                          onChange={(event) =>
                            setReplyInputMap((prev) => ({
                              ...prev,
                              [comment.id]: event.target.value,
                            }))
                          }
                          onKeyDown={(event) => {
                            if (
                              event.key === "Enter" &&
                              !event.nativeEvent.isComposing
                            ) {
                              event.preventDefault();
                              void handleSubmitReply(postId, comment.id);
                            }
                          }}
                          className="h-8 flex-1 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-3 ob-typo-caption text-(--oboon-text-title) placeholder:text-(--oboon-text-muted) focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)/30"
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          shape="pill"
                          loading={replySubmitting}
                          onClick={() => void handleSubmitReply(postId, comment.id)}
                        >
                          답글
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={replyAnonymous}
                            onChange={(event) =>
                              setReplyAnonymousMap((prev) => ({
                                ...prev,
                                [comment.id]: event.target.checked,
                              }))
                            }
                            className="h-3.5 w-3.5 rounded border-(--oboon-border-default)"
                          />
                          <span className="ob-typo-caption text-(--oboon-text-muted)">
                            익명 답글
                          </span>
                        </label>
                        {replyAnonymous ? (
                          <input
                            type="text"
                            placeholder="익명 닉네임(선택)"
                            value={replyAnonymousNickname}
                            onChange={(event) =>
                              setReplyAnonymousNicknameMap((prev) => ({
                                ...prev,
                                [comment.id]: event.target.value,
                              }))
                            }
                            className="h-8 w-44 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-2.5 ob-typo-caption text-(--oboon-text-title) placeholder:text-(--oboon-text-muted) focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)/30"
                            maxLength={20}
                          />
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {replies.length > 0 ? (
                    <div className="ml-9 space-y-2">
                      {replies.map((reply) => (
                        <div key={reply.id} className="flex items-start gap-2">
                          <CornerDownRight className="mt-1 h-3.5 w-3.5 text-(--oboon-text-muted)" />
                          <div className="h-6 w-6 shrink-0 rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle) overflow-hidden flex items-center justify-center">
                            {reply.authorAvatarUrl ? (
                              <Image
                                src={reply.authorAvatarUrl}
                                alt={reply.authorName}
                                width={24}
                                height={24}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="ob-typo-caption text-(--oboon-text-body)">
                                {reply.authorName.slice(0, 1)}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="ob-typo-caption text-(--oboon-text-title)">
                              {reply.authorName}
                            </div>
                            <p className="ob-typo-caption text-(--oboon-text-body) whitespace-pre-wrap break-words">
                              {reply.body}
                            </p>
                            <button
                              type="button"
                              disabled={commentLikeLoadingId === reply.id}
                              onClick={() => void handleToggleCommentLike(postId, reply.id)}
                              className="mt-1 inline-flex items-center gap-1 ob-typo-caption text-(--oboon-text-muted) disabled:opacity-50"
                            >
                              <Heart
                                className={[
                                  "h-3.5 w-3.5",
                                  reply.isLiked
                                    ? "fill-(--oboon-primary) text-(--oboon-primary)"
                                    : "",
                                ].join(" ")}
                              />
                              {reply.likeCount}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

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
            <CommunityPostCard
              key={post.id}
              post={post}
              onToggleLike={() => void handleToggleLike(post.id)}
              onToggleBookmark={() => void handleToggleBookmark(post.id)}
              onToggleComments={() => void handleToggleComments(post.id)}
              likeLoading={likeLoadingId === post.id}
              bookmarkLoading={bookmarkLoadingId === post.id}
              commentsExpanded={Boolean(commentsOpenMap[post.id])}
              commentsPanel={renderCommentsPanel(post.id)}
            />
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
