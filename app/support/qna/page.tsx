import { Suspense } from "react";
import QnAPageClient from "@/features/support/components/qna/QnAPage.client";
import { QnAListSkeleton } from "@/features/support/components/qna/QnAListSkeleton";

export default function SupportQnAPage() {
  return (
    <Suspense fallback={<QnAListSkeleton />}>
      <QnAPageClient />
    </Suspense>
  );
}
