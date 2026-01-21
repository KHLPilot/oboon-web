// app/my/consultations/page.tsx
"use client";

import PageContainer from "@/components/shared/PageContainer";
import ConsultationsListPanel from "@/features/consultations/components/ConsultationsListPanel.client";

export default function MyConsultationsPage() {
  return (
    <PageContainer>
      <div className="mx-auto w-full max-w-3xl ">
        <header className="space-y-1">
          <div className="ob-typo-h1 text-(--oboon-text-title)">
            내 상담 예약
          </div>
          <p className="ob-typo-body text-(--oboon-text-muted)">
            예약된 상담 내역을 확인하고 관리할 수 있습니다
          </p>
        </header>

        <ConsultationsListPanel />
      </div>
    </PageContainer>
  );
}
