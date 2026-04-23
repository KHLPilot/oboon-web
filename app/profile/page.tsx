import type { Metadata } from "next";
import { Suspense } from "react";
import ProfilePage from "@/features/profile/components/ProfilePage.client";
import { ProfilePageSkeleton } from "@/features/profile/components/ProfilePageSkeleton";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProfilePageRoute() {
  return (
    <Suspense fallback={<ProfilePageSkeleton />}>
      <ProfilePage redirectAgentOnProfile />
    </Suspense>
  );
}
