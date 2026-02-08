"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { QnADetailViewModel } from "../../domain/support";

type QnADetailProps = {
  data: QnADetailViewModel & { isLoggedIn: boolean; isAdmin: boolean };
  onDelete?: () => Promise<void>;
  onAnswer?: (body: string) => Promise<void>;
};

export function QnADetail({ data, onDelete, onAnswer }: QnADetailProps) {
  const router = useRouter();
  const [answerBody, setAnswerBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <div className="space-y-6">
      {/* 상단 네비게이션 */}
      <button
        type="button"
        onClick={handleBack}
        className="flex items-center gap-1 text-sm text-(--oboon-text-muted) hover:text-(--oboon-text-title)"
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
              <h1 className="text-xl font-bold text-(--oboon-text-title)">
                {data.title}
              </h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-(--oboon-text-muted)">
              <span>{data.displayAuthor}</span>
              <span>|</span>
              <span>{data.formattedDate}</span>
              <span>|</span>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                  data.statusKey === "answered"
                    ? "bg-(--oboon-success-bg) text-(--oboon-success-text)"
                    : "bg-(--oboon-bg-subtle) text-(--oboon-text-muted)"
                }`}
              >
                {data.statusLabel}
              </span>
            </div>
          </div>

          {/* 삭제 버튼 (본인 또는 관리자만) */}
          {(data.isOwner || data.isAdmin) && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={submitting}
              className="p-2 rounded-lg hover:bg-(--oboon-bg-subtle) text-(--oboon-text-muted) hover:text-(--oboon-danger)"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* 본문 */}
        <div className="whitespace-pre-wrap text-(--oboon-text-body) ob-typo-body-md">
          {data.body}
        </div>
      </div>

      {/* 답변 */}
      {data.answer ? (
        <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full bg-(--oboon-primary) px-2 py-0.5 text-xs text-(--oboon-on-primary)">
              답변
            </span>
            <span className="text-sm text-(--oboon-text-muted)">
              {data.answer.authorName} | {data.answer.formattedDate}
            </span>
          </div>
          <div className="whitespace-pre-wrap text-(--oboon-text-body) ob-typo-body-md">
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
            <h3 className="mb-3 font-bold text-(--oboon-text-title)">답변 작성</h3>
            <textarea
              value={answerBody}
              onChange={(e) => setAnswerBody(e.target.value)}
              placeholder="답변 내용을 입력해주세요"
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-default) text-(--oboon-text-title) placeholder:text-(--oboon-text-muted) focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)/30 resize-none mb-3"
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
