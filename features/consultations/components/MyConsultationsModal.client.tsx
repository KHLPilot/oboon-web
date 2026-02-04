"use client";

import Modal from "@/components/ui/Modal";
import ConsultationsListPanel from "@/features/consultations/components/ConsultationsListPanel.client";

type MyConsultationsModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function MyConsultationsModal({
  open,
  onClose,
}: MyConsultationsModalProps) {
  return (
    <Modal open={open} onClose={onClose} size="lg" panelClassName="p-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="ob-typo-h2 text-(--oboon-text-title)">
            내 상담 예약
          </div>
          <div className="mt-1 ob-typo-body text-(--oboon-text-muted)">
            예약된 상담 내역을 확인하고 관리할 수 있습니다
          </div>
        </div>
      </div>
      <div className="mt-3">
        <ConsultationsListPanel embedded onNavigate={onClose} />
      </div>
    </Modal>
  );
}
