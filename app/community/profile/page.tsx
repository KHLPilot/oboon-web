import PageContainer from "@/components/shared/PageContainer";
import { CommunityProfilePage as CommunityProfilePageView } from "@/features/community";

export default function CommunityProfilePage() {
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-10">
        <CommunityProfilePageView />
      </PageContainer>
    </main>
  );
}
