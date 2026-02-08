"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";

type QnAWriteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    body: string;
    isSecret: boolean;
    secretPassword?: string;
    isAnonymous: boolean;
    anonymousNickname?: string;
  }) => Promise<void>;
};

export function QnAWriteModal({ isOpen, onClose, onSubmit }: QnAWriteModalProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSecret, setIsSecret] = useState(false);
  const [secretPassword, setSecretPassword] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [anonymousNickname, setAnonymousNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }

    if (!body.trim()) {
      setError("내용을 입력해주세요.");
      return;
    }

    if (isSecret && !secretPassword) {
      setError("비밀글은 비밀번호가 필요합니다.");
      return;
    }

    setLoading(true);

    try {
      await onSubmit({
        title: title.trim(),
        body: body.trim(),
        isSecret,
        secretPassword: isSecret ? secretPassword : undefined,
        isAnonymous,
        anonymousNickname: isAnonymous ? anonymousNickname.trim() : undefined,
      });

      // 성공 시 초기화 및 닫기
      setTitle("");
      setBody("");
      setIsSecret(false);
      setSecretPassword("");
      setIsAnonymous(false);
      setAnonymousNickname("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "등록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg mx-4 bg-(--oboon-bg-default) rounded-xl shadow-lg">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-(--oboon-border-default)">
          <h2 className="text-lg font-bold text-(--oboon-text-title)">문의하기</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-(--oboon-bg-subtle)"
          >
            <X className="h-5 w-5 text-(--oboon-text-muted)" />
          </button>
        </div>

        {/* 본문 */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-(--oboon-danger)/10 text-(--oboon-danger) text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block mb-1 text-sm font-medium text-(--oboon-text-title)">
              제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력해주세요"
              className="w-full px-3 py-2 rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-default) text-(--oboon-text-title) placeholder:text-(--oboon-text-muted) focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)/30"
              maxLength={100}
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-(--oboon-text-title)">
              내용
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="문의 내용을 입력해주세요"
              rows={6}
              className="w-full px-3 py-2 rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-default) text-(--oboon-text-title) placeholder:text-(--oboon-text-muted) focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)/30 resize-none"
            />
          </div>

          {/* 비밀글 옵션 */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isSecret}
                onChange={(e) => setIsSecret(e.target.checked)}
                className="w-4 h-4 rounded border-(--oboon-border-default)"
              />
              <span className="text-sm text-(--oboon-text-title)">비밀글로 작성</span>
            </label>

            {isSecret && (
              <div className="ml-6">
                <input
                  type="password"
                  value={secretPassword}
                  onChange={(e) => setSecretPassword(e.target.value)}
                  placeholder="비밀번호 (4자리 이상)"
                  className="w-full px-3 py-2 rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-default) text-(--oboon-text-title) placeholder:text-(--oboon-text-muted) focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)/30"
                  minLength={4}
                />
              </div>
            )}
          </div>

          {/* 익명 옵션 */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 rounded border-(--oboon-border-default)"
              />
              <span className="text-sm text-(--oboon-text-title)">익명으로 작성</span>
            </label>

            {isAnonymous && (
              <div className="ml-6">
                <input
                  type="text"
                  value={anonymousNickname}
                  onChange={(e) => setAnonymousNickname(e.target.value)}
                  placeholder="표시할 닉네임 (선택)"
                  className="w-full px-3 py-2 rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-default) text-(--oboon-text-title) placeholder:text-(--oboon-text-muted) focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)/30"
                  maxLength={20}
                />
              </div>
            )}
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" loading={loading}>
              등록하기
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default QnAWriteModal;
