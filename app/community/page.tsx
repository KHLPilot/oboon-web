import { Suspense } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { CommunityShell } from "@/features/community";

export default function CommunityPage() {
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-10">
        <Suspense fallback={null}>
          <CommunityShell />
        </Suspense>
      </PageContainer>
    </main>
  );
}
