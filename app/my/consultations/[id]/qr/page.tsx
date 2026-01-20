"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, MapPin, Clock, User, QrCode } from "lucide-react";
import Link from "next/link";

import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { createSupabaseClient } from "@/lib/supabaseClient";

interface Consultation {
  id: string;
  scheduled_at: string;
  status: string;
  agent: {
    id: string;
    name: string;
  };
  property: {
    id: number;
    name: string;
  };
}

export default function ConsultationQRPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createSupabaseClient();
  const consultationId = params.id as string;

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConsultation() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/auth/login");
          return;
        }

        const response = await fetch(`/api/consultations/${consultationId}`);
        const data = await response.json();

        if (response.ok) {
          setConsultation(data.consultation);
        } else {
          console.error("예약 조회 실패:", data.error);
          router.push("/my/consultations");
        }
      } catch (err) {
        console.error("예약 조회 오류:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchConsultation();
  }, [supabase, router, consultationId]);

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const dayName = dayNames[date.getDay()];
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${month}월 ${day}일 (${dayName}) ${hours}:${minutes}`;
  }

  if (loading) {
    return (
      <PageContainer className="pb-8">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-(--oboon-primary)" />
        </div>
      </PageContainer>
    );
  }

  if (!consultation) {
    return null;
  }

  return (
    <PageContainer className="pb-8">
      <div className="max-w-md mx-auto">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/my/consultations">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-(--oboon-text-title)">
            방문 인증
          </h1>
        </div>

        {/* 예약 정보 카드 */}
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-(--oboon-bg-subtle) flex items-center justify-center">
              <MapPin className="h-5 w-5 text-(--oboon-primary)" />
            </div>
            <div>
              <p className="font-semibold text-(--oboon-text-title)">
                {consultation.property.name}
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-(--oboon-text-body)">
              <Clock className="h-4 w-4 text-(--oboon-text-muted)" />
              <span>{formatDate(consultation.scheduled_at)}</span>
            </div>
            <div className="flex items-center gap-2 text-(--oboon-text-body)">
              <User className="h-4 w-4 text-(--oboon-text-muted)" />
              <span>상담사: {consultation.agent.name}</span>
            </div>
          </div>
        </Card>

        {/* 안내 카드 */}
        <Card className="p-6 text-center">
          <div className="w-16 h-16 mx-auto bg-(--oboon-bg-subtle) rounded-full flex items-center justify-center mb-4">
            <QrCode className="h-8 w-8 text-(--oboon-primary)" />
          </div>

          <h2 className="text-lg font-semibold text-(--oboon-text-title) mb-2">
            상담사의 QR 코드를 스캔하세요
          </h2>

          <p className="text-sm text-(--oboon-text-muted) mb-6">
            모델하우스 방문 시 상담사가 보여주는
            <br />
            QR 코드를 스캔하여 방문 인증을 완료하세요
          </p>

          <div className="space-y-3">
            <p className="text-xs text-(--oboon-text-muted)">
              QR 스캔 후 GPS 위치 확인이 진행됩니다
            </p>
            <p className="text-xs text-(--oboon-text-muted)">
              모델하우스 150m 이내에서만 인증이 가능합니다
            </p>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
