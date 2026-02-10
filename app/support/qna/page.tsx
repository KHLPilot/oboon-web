import { Suspense } from "react";
import QnAPageClient from "@/features/support/components/qna/QnAPage.client";

export default function SupportQnAPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-(--oboon-text-muted)">로딩 중...</div>}>
      <QnAPageClient />
    </Suspense>
  );
}
