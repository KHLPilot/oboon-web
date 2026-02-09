"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Textarea from "@/components/ui/Textarea";

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
    <Modal open={isOpen} onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="ob-typo-h2 text-(--oboon-text-title)">문의하기</div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="ob-typo-body p-3 rounded-xl border border-(--oboon-danger-border) bg-(--oboon-danger-bg) text-(--oboon-danger)">
              {error}
            </div>
          )}
          <div>
            <label className="ob-typo-subtitle mb-1 block text-(--oboon-text-title)">
              제목
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력해주세요"
              maxLength={100}
            />
          </div>

          <div>
            <label className="ob-typo-subtitle mb-1 block text-(--oboon-text-title)">
              내용
            </label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="문의 내용을 입력해주세요"
              rows={6}
              className="resize-none"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {/* 익명 옵션 */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 rounded border-(--oboon-border-default)"
                />
                <span className="ob-typo-body text-(--oboon-text-title)">
                  익명으로 작성
                </span>
              </label>

              {isAnonymous && (
                <Input
                  type="text"
                  value={anonymousNickname}
                  onChange={(e) => setAnonymousNickname(e.target.value)}
                  placeholder="표시할 닉네임 (선택)"
                  maxLength={20}
                />
              )}
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
                <span className="ob-typo-body text-(--oboon-text-title)">
                  비밀글로 작성
                </span>
              </label>

              {isSecret && (
                <Input
                  type="password"
                  value={secretPassword}
                  onChange={(e) => setSecretPassword(e.target.value)}
                  placeholder="비밀번호 (4자리 이상)"
                  minLength={4}
                />
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              className="w-full justify-center"
            >
              취소
            </Button>
            <Button
              type="submit"
              size="md"
              loading={loading}
              className="w-full justify-center"
            >
              등록하기
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export default QnAWriteModal;
