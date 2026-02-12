import type { Metadata } from "next";
import PageContainer from "@/components/shared/PageContainer";
import { CommunityProfilePage as CommunityProfilePageView } from "@/features/community";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function CommunityProfilePage() {
  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-10">
        <CommunityProfilePageView />
      </PageContainer>
    </main>
  );
}
