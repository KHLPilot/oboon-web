import PageContainer from "@/components/shared/PageContainer";
import { CommunityShell } from "@/features/community";

export default function CommunityPage() {
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-10">
        <CommunityShell />
      </PageContainer>
    </main>
  );
}
