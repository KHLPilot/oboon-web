"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Modal from "@/components/ui/Modal";
import { oboonFieldBaseClass } from "@/lib/ui/formFieldStyles";

type DeleteAccountModalProps = {
  open: boolean;
  onClose: () => void;
  onDelete: () => Promise<void>;
};

export default function DeleteAccountModal({
  open,
  onClose,
  onDelete,
}: DeleteAccountModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // 모달이 닫힐 때 입력값 초기화
  useEffect(() => {
    if (!open) {
      setConfirmText("");
    }
  }, [open]);

  const handleDelete = async () => {
    if (confirmText !== "계정삭제") return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="space-y-5">
        <div className="ob-typo-h2 text-(--oboon-danger)">계정 삭제</div>

        <div className="mt-4 space-y-3 sm:space-y-4">
          <div className="p-3 rounded-lg bg-(--oboon-danger-bg) border border-(--oboon-danger-border)">
            <p className="ob-typo-body text-(--oboon-danger) space-y-1">
              <span className="block">• 모든 개인정보가 삭제됩니다</span>
              <span className="block">
                • 작성한 게시글은 &quot;탈퇴한 사용자&quot;로 표시됩니다
              </span>
              <span className="block">• 이 작업은 되돌릴 수 없습니다</span>
            </p>
          </div>

          <div>
            <Label>확인 문구 입력</Label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="'계정삭제'를 입력하세요"
              className={oboonFieldBaseClass}
            />
            <p className="ob-typo-body text-(--oboon-text-muted) mt-2">
              정확히 &apos;계정삭제&apos;를 입력해주세요
            </p>
          </div>
        </div>

        <div className="flex gap-2 sm:gap-3">
          <Button
            variant="danger"
            size="md"
            onClick={handleDelete}
            disabled={deleting || confirmText !== "계정삭제"}
            loading={deleting}
            className="flex-1"
          >
            {deleting ? "삭제 중..." : "계정 삭제"}
          </Button>
          <Button variant="secondary" size="md" onClick={onClose}>
            취소
          </Button>
        </div>
      </div>
    </Modal>
  );
}
