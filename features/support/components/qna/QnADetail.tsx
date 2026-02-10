"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import type { QnADetailViewModel } from "../../domain/support";

type QnADetailProps = {
  data: QnADetailViewModel & { isLoggedIn: boolean; isAdmin: boolean };
  onUpdate?: (payload: { title: string; body: string }) => Promise<void>;
  onDelete?: () => Promise<void>;
  onAnswer?: (body: string) => Promise<void>;
};

export function QnADetail({
  data,
  onUpdate,
  onDelete,
  onAnswer,
}: QnADetailProps) {
  const router = useRouter();
  const [answerBody, setAnswerBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(data.title);
  const [editBody, setEditBody] = useState(data.body);

  const handleBack = () => {
    router.push("/support/qna");
  };

  const handleDelete = async () => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    if (!onDelete) return;

    setSubmitting(true);
    try {
      await onDelete();
      router.push("/support/qna");
    } catch {
      alert("삭제에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerBody.trim() || !onAnswer) return;

    setSubmitting(true);
    try {
      await onAnswer(answerBody.trim());
      setAnswerBody("");
      router.refresh();
    } catch {
      alert("답변 등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const canEdit = data.isOwner && data.statusKey === "pending";

  const handleUpdateSubmit = async () => {
    if (!onUpdate) return;
    if (!editTitle.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }
    if (!editBody.trim()) {
      alert("내용을 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      await onUpdate({ title: editTitle.trim(), body: editBody.trim() });
      setIsEditing(false);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "수정에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* 상단 네비게이션 */}
      <button
        type="button"
        onClick={handleBack}
        className="ob-typo-body flex items-center gap-1 text-(--oboon-text-muted) hover:text-(--oboon-text-title)"
      >
        <ArrowLeft className="h-4 w-4" />
        목록으로
      </button>

      {/* 질문 카드 */}
      <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-default) p-6">
        {/* 헤더 */}
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {data.isSecret && (
                <Lock className="h-4 w-4 text-(--oboon-text-muted)" />
              )}
              <h1 className="ob-typo-h3 text-(--oboon-text-title)">
                {data.title}
              </h1>
            </div>
            <div className="ob-typo-body flex items-center gap-2 text-(--oboon-text-muted)">
              <span>{data.displayAuthor}</span>
              <span>|</span>
              <span>{data.formattedDate}</span>
              <span>|</span>
              <Badge
                variant="status"
                className={`ob-typo-caption px-2 py-0.5 ${
                  data.statusKey === "answered"
                    ? "bg-(--oboon-success-bg) text-(--oboon-success-text)"
                    : "text-(--oboon-text-muted)"
                }`}
              >
                {data.statusLabel}
              </Badge>
            </div>
          </div>

          {/* 삭제 버튼 (본인 또는 관리자만) */}
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setEditTitle(data.title);
                  setEditBody(data.body);
                  setIsEditing((prev) => !prev);
                }}
                disabled={submitting}
                className="p-2 rounded-full text-(--oboon-text-muted) border border-transparent hover:bg-(--oboon-bg-subtle) hover:border-(--oboon-border-default)"
                aria-label={isEditing ? "수정 취소" : "수정"}
                title={isEditing ? "수정 취소" : "수정"}
              >
                <Pencil className="h-5 w-5" />
              </button>
            )}

            {(data.isOwner || data.isAdmin) && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="p-2 rounded-full hover:bg-(--oboon-bg-subtle) text-(--oboon-danger) border border-transparent hover:bg-(--oboon-danger-bg) hover:border-(--oboon-danger-border)"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="제목을 입력해주세요"
              maxLength={200}
            />
            <Textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              placeholder="내용을 입력해주세요"
              rows={6}
              className="resize-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditTitle(data.title);
                  setEditBody(data.body);
                  setIsEditing(false);
                }}
                disabled={submitting}
              >
                취소
              </Button>
              <Button
                type="button"
                onClick={handleUpdateSubmit}
                loading={submitting}
              >
                저장
              </Button>
            </div>
          </div>
        ) : (
          <div className="whitespace-pre-wrap text-(--oboon-text-body) ob-typo-body">
            {data.body}
          </div>
        )}
      </div>

      {/* 답변 */}
      {data.answer ? (
        <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-6">
          <div className="mb-3 flex items-center gap-2">
            <Badge
              variant="status"
              className="ob-typo-caption bg-(--oboon-primary) text-(--oboon-on-primary) border-transparent px-2 py-0.5"
            >
              답변
            </Badge>
            <span className="ob-typo-body text-(--oboon-text-muted)">
              {data.answer.authorName} | {data.answer.formattedDate}
            </span>
          </div>
          <div className="whitespace-pre-wrap text-(--oboon-text-body) ob-typo-body">
            {data.answer.body}
          </div>
        </div>
      ) : (
        /* 관리자 답변 폼 */
        data.isAdmin && (
          <form
            onSubmit={handleAnswerSubmit}
            className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-default) p-6"
          >
            <div className="ob-typo-h3 mb-4 text-(--oboon-text-title)">답변 작성</div>
            <Textarea
              value={answerBody}
              onChange={(e) => setAnswerBody(e.target.value)}
              placeholder="답변 내용을 입력해주세요"
              rows={4}
              className="mb-3 resize-none"
            />
            <div className="flex justify-end">
              <Button type="submit" loading={submitting} disabled={!answerBody.trim()}>
                답변 등록
              </Button>
            </div>
          </form>
        )
      )}
    </div>
  );
}

export default QnADetail;
