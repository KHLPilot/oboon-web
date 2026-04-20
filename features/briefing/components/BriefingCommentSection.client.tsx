"use client";

import Image from "next/image";
import { useState } from "react";
import Button from "@/components/ui/Button";
import TextButton from "@/components/ui/TextButton";
import { getAvatarUrlOrDefault } from "@/shared/imageUrl";

type Comment = {
  id: string;
  nickname: string;
  content: string;
  created_at: string;
  profile_id: string | null;
  is_anonymous: boolean;
  avatar_url: string | null;
};

export default function BriefingCommentSection({
  postId,
  initialComments,
  initialNextCursor,
  currentUserId,
  currentUserAvatarUrl,
  currentUserNickname,
}: {
  postId: string;
  initialComments: Comment[];
  initialNextCursor: string | null;
  currentUserId: string | null;
  currentUserAvatarUrl: string | null;
  currentUserNickname: string;
}) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [nickname, setNickname] = useState(currentUserId ? currentUserNickname : "");
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/briefing/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname || undefined,
          content,
          isAnonymous,
        }),
      });

      const payload = (await res.json().catch(() => null)) as
        | { error?: string; comment?: Comment }
        | null;

      if (!res.ok || !payload?.comment) {
        setError(payload?.error ?? "오류가 발생했습니다.");
        return;
      }

      setComments((prev) => [payload.comment!, ...prev]);
      setContent("");
      setNickname(currentUserId ? currentUserNickname : "");
      setIsAnonymous(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    const previousComments = comments;
    setComments((prev) => prev.filter((comment) => comment.id !== commentId));

    const res = await fetch(`/api/briefing/${postId}/comments/${commentId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      setComments(previousComments);
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "댓글 삭제에 실패했습니다.");
    }
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;

    setLoadingMore(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/briefing/${postId}/comments?cursor=${encodeURIComponent(
          nextCursor,
        )}&limit=20`,
      );

      const payload = (await res.json().catch(() => null)) as
        | {
            error?: string;
            comments?: Comment[];
            nextCursor?: string | null;
          }
        | null;

      if (!res.ok) {
        setError(payload?.error ?? "댓글을 불러오지 못했습니다.");
        return;
      }

      setComments((prev) => [...prev, ...(payload?.comments ?? [])]);
      setNextCursor(payload?.nextCursor ?? null);
    } finally {
      setLoadingMore(false);
    }
  }

  const canEditNickname = !currentUserId || isAnonymous;
  const nicknameValue = canEditNickname ? nickname : "";
  const nicknamePlaceholder = currentUserId
    ? isAnonymous
      ? "익명 닉네임"
      : currentUserNickname || "내 닉네임"
    : "닉네임";
  const effectiveNickname = canEditNickname ? nicknameValue.trim() : currentUserNickname.trim();
  const previewAvatarUrl =
    currentUserId && !isAnonymous ? currentUserAvatarUrl : null;

  return (
    <div id="briefing-comments" className="mt-16">
      <div className="mb-4 ob-typo-h3 text-(--oboon-text-title)">
        댓글
      </div>

      <div className="mb-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle)">
              <Image
                src={getAvatarUrlOrDefault(previewAvatarUrl)}
                alt={currentUserId ? "내 프로필 이미지" : "기본 프로필 이미지"}
                width={40}
                height={40}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1 sm:flex-none">
              <input
                type="text"
                placeholder={nicknamePlaceholder}
                value={nicknameValue}
                onChange={(e) => setNickname(e.target.value)}
                readOnly={!canEditNickname}
                className={`h-10 w-full rounded-2xl border px-4 ob-typo-body text-(--oboon-text-title) focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)/30 sm:w-52 ${
                  canEditNickname
                    ? "border-(--oboon-border-default) bg-(--oboon-bg-surface) placeholder:text-(--oboon-text-muted)"
                    : "border-(--oboon-border-default) bg-(--oboon-bg-subtle) text-(--oboon-text-muted)"
                }`}
                maxLength={20}
              />
            </div>
            {currentUserId ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                shape="pill"
                onClick={() => {
                  if (isAnonymous) {
                    setIsAnonymous(false);
                    setNickname(currentUserNickname);
                    return;
                  }
                  setIsAnonymous(true);
                  setNickname("");
                }}
              >
                {isAnonymous ? "내 닉네임 사용" : "익명으로 등록"}
              </Button>
            ) : null}
          </div>

          <textarea
            placeholder="가장 인상 깊은 부분은 무엇이었나요?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="min-h-[84px] w-full resize-none rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-4 py-3 ob-typo-body text-(--oboon-text-title) placeholder:text-(--oboon-text-muted) focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)/30"
            maxLength={500}
          />

          <div className="flex justify-end gap-3">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              shape="pill"
              loading={submitting}
              disabled={!content.trim() || !effectiveNickname}
            >
              남기기
            </Button>
          </div>

          {error ? <div className="ob-typo-caption text-red-500">{error}</div> : null}
        </form>
      </div>

      {comments.length === 0 ? null : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="flex items-start gap-2 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4"
            >
              <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle)">
                <Image
                  src={getAvatarUrlOrDefault(comment.avatar_url)}
                  alt={`${comment.nickname} 프로필 이미지`}
                  width={28}
                  height={28}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="ob-typo-subtitle text-(--oboon-text-title)">
                    {comment.nickname}
                  </div>
                  {currentUserId && currentUserId === comment.profile_id ? (
                    <TextButton
                      color="danger"
                      size="sm"
                      className="shrink-0"
                      onClick={() => handleDelete(comment.id)}
                    >
                      삭제
                    </TextButton>
                  ) : null}
                </div>
                <p className="mt-0.5 whitespace-pre-wrap break-words ob-typo-caption text-(--oboon-text-body)">
                  {comment.content}
                </p>
              </div>
            </div>
          ))}

          {nextCursor ? (
            <div className="w-full flex justify-center py-2">
              <TextButton
                color="muted"
                size="sm"
                onClick={loadMore}
                disabled={loadingMore}
                loading={loadingMore}
              >
                더보기
              </TextButton>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
