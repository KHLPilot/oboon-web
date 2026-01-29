"use client";

import { useSearchParams } from "next/navigation";

import { AgentScanContent } from "@/features/agent/components/AgentScanModal.client";

export default function AgentScanPage() {
  const searchParams = useSearchParams();
  const consultationId = searchParams.get("consultationId");

  return <AgentScanContent initialConsultationId={consultationId} />;
}
