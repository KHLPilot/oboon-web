import { Suspense } from "react";
import ProfilePage from "@/features/profile/components/ProfilePage.client";
import { ProfilePageSkeleton } from "@/features/profile/components/ProfilePageSkeleton";

export default function AgentProfilePageRoute() {
  return (
    <Suspense fallback={<ProfilePageSkeleton />}>
      <ProfilePage forceAgentView />
    </Suspense>
  );
}
