"use client";

import ConsultationsListPanel from "@/features/consultations/components/ConsultationsListPanel.client";

export default function UserConsultationsSection() {
  return (
    <div className="space-y-3">
      <div>
        <div className="ob-typo-h2 text-(--oboon-text-title)">내 상담 예약</div>
        <div className="mt-1 ob-typo-body text-(--oboon-text-muted)">
          예약된 상담 내역을 확인하고 관리할 수 있습니다
        </div>
      </div>
      <ConsultationsListPanel embedded />
    </div>
  );
}
