import { Suspense } from "react";
import ProfilePage from "@/features/profile/components/ProfilePage.client";

export default function AgentProfilePageRoute() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-(--oboon-text-muted)">로딩 중...</div>}>
      <ProfilePage forceAgentView />
    </Suspense>
  );
}
