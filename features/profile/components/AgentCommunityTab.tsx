"use client";

import { CommunityProfilePage } from "@/features/community";

type AgentCommunityTabProps = {
  active: boolean;
};

export default function AgentCommunityTab({ active }: AgentCommunityTabProps) {
  return (
    <section id="community-profile" className={active ? "" : "hidden"}>
      <CommunityProfilePage />
    </section>
  );
}
