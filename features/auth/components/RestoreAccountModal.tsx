"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { RefreshCw, UserPlus } from "lucide-react";
import { showAlert } from "@/shared/alert";

type RestoreAccountModalProps = {
  open: boolean;
  onClose: () => void;
  email: string;
  userId: string;
  onRestore: () => Promise<void>;
  onRecreate: () => Promise<void>;
};

export default function RestoreAccountModal({
  open,
  onClose,
  email,
  onRestore,
  onRecreate,
}: RestoreAccountModalProps) {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<"restore" | "recreate" | null>(null);

  const handleRestore = async () => {
    setLoading(true);
    setAction("restore");
    try {
      await onRestore();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "계정 복구 중 오류가 발생했습니다.";
      showAlert(message);
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const handleRecreate = async () => {
    setLoading(true);
    setAction("recreate");
    try {
      await onRecreate();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "새로 가입 처리 중 오류가 발생했습니다.";
      showAlert(message);
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="md">
      <div className="space-y-4">
        <div className="ob-typo-h2 text-(--oboon-text-title)">
          탈퇴한 계정입니다
        </div>

        <p className="ob-typo-body text-(--oboon-text-muted)">
          <span className="font-medium text-(--oboon-text-title)">{email}</span>
          로 탈퇴한 계정이 있습니다.
          <br />
          어떻게 진행하시겠습니까?
        </p>

        <div className="space-y-3 pt-2">
          {/* 계정 복구 옵션 */}
          <button
            type="button"
            onClick={handleRestore}
            disabled={loading}
            className="w-full p-4 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) hover:bg-(--oboon-bg-subtle) transition-colors text-left disabled:opacity-50"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-(--oboon-primary-bg)">
                <RefreshCw className="h-5 w-5 text-(--oboon-primary)" />
              </div>
              <div className="flex-1">
                <div className="ob-typo-h4 text-(--oboon-text-title) flex items-center gap-2">
                  계정 복구
                  {action === "restore" && (
                    <span className="animate-spin h-4 w-4 border-2 border-(--oboon-primary) border-t-transparent rounded-full" />
                  )}
                </div>
                <p className="ob-typo-caption text-(--oboon-text-muted) mt-1">
                  이전 채팅, 댓글, 예약 내역이 복원됩니다.
                  <br />
                  프로필 정보는 다시 입력해야 합니다.
                </p>
              </div>
            </div>
          </button>

          {/* 새로 가입 옵션 */}
          <button
            type="button"
            onClick={handleRecreate}
            disabled={loading}
            className="w-full p-4 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) hover:bg-(--oboon-bg-subtle) transition-colors text-left disabled:opacity-50"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-(--oboon-bg-subtle)">
                <UserPlus className="h-5 w-5 text-(--oboon-text-muted)" />
              </div>
              <div className="flex-1">
                <div className="ob-typo-h4 text-(--oboon-text-title) flex items-center gap-2">
                  새로 가입
                  {action === "recreate" && (
                    <span className="animate-spin h-4 w-4 border-2 border-(--oboon-text-muted) border-t-transparent rounded-full" />
                  )}
                </div>
                <p className="ob-typo-caption text-(--oboon-text-muted) mt-1">
                  완전히 새로운 계정으로 시작합니다.
                  <br />
                  이전 데이터는 &apos;탈퇴한 사용자&apos;로 유지됩니다.
                </p>
              </div>
            </div>
          </button>
        </div>

        <div className="pt-2">
          <Button
            variant="secondary"
            size="md"
            className="w-full justify-center"
            onClick={onClose}
            disabled={loading}
          >
            취소
          </Button>
        </div>
      </div>
    </Modal>
  );
}
