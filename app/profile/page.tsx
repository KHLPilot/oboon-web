import type { Metadata } from "next";
import { Suspense } from "react";
import ProfilePage from "@/features/profile/components/ProfilePage.client";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProfilePageRoute() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-(--oboon-text-muted)">로딩 중...</div>}>
      <ProfilePage redirectAgentOnProfile />
    </Suspense>
  );
}
