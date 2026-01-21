"use client";

import { useParams } from "next/navigation";

import { ConsultationQRPanel } from "@/features/consultations/components/ConsultationQRModal.client";

export default function ConsultationQRPage() {
  const params = useParams();
  const consultationId = params.id as string;

  if (!consultationId) return null;

  return <ConsultationQRPanel consultationId={consultationId} />;
}
