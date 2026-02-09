"use client";

import { useState } from "react";
import { X, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";

type QnAPasswordModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (password: string) => Promise<boolean>;
};

export function QnAPasswordModal({ isOpen, onClose, onSubmit }: QnAPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password) {
      setError("비밀번호를 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      const isValid = await onSubmit(password);
      if (!isValid) {
        setError("비밀번호가 일치하지 않습니다.");
      } else {
        setPassword("");
        onClose();
      }
    } catch {
      setError("확인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-(--oboon-overlay)">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) shadow-(--oboon-shadow-card)">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-(--oboon-border-default)">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-(--oboon-text-muted)" />
            <h2 className="text-lg font-bold text-(--oboon-text-title)">비밀글</h2>
          </div>
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
          <p className="text-sm text-(--oboon-text-muted)">
            이 글은 비밀글입니다. 비밀번호를 입력해주세요.
          </p>

          {error && (
            <div className="p-3 rounded-lg bg-(--oboon-danger)/10 text-(--oboon-danger) text-sm">
              {error}
            </div>
          )}

          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              className="w-full px-3 py-2 rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-default) text-(--oboon-text-title) placeholder:text-(--oboon-text-muted) focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)/30"
              autoFocus
            />
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" loading={loading}>
              확인
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default QnAPasswordModal;
