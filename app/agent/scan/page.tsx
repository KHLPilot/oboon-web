"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  QrCode,
  Loader2,
  RefreshCw,
  Clock,
  Check,
  X,
  AlertCircle,
  MapPin,
} from "lucide-react";
import QRCode from "react-qr-code";

import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fetchAgentScanBootstrap, subscribeToVisitConfirmRequests } from "@/features/agent/services/agent.scan";
import { showAlert } from "@/shared/alert";

interface Property {
  id: number;
  name: string;
}

interface Consultation {
  id: string;
  scheduled_at: string;
  status: string;
  customer: {
    id: string;
    name: string;
  };
  property: {
    id: number;
    name: string;
  };
}

interface ManualRequest {
  id: string;
  status: string;
  reason: string;
  created_at: string;
  token: {
    id: string;
    property_id: number;
    consultation_id: string | null;
    created_at: string;
  };
  property: {
    id: number;
    name: string;
  };
  consultation: {
    id: string;
    scheduled_at: string;
    customer: {
      id: string;
      name: string;
    };
  } | null;
}

const TOKEN_TTL_SECONDS = 60;

export default function AgentScanPage() {
  const router = useRouter();

  // 인증 상태
  const [isAgent, setIsAgent] = useState(false);
  const [loading, setLoading] = useState(true);

  // 소속 현장 목록
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(
    null,
  );

  // 확정된 예약 목록
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [selectedConsultationId, setSelectedConsultationId] = useState<
    string | null
  >(null);

  // QR 토큰 상태
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [visitUrl, setVisitUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [generating, setGenerating] = useState(false);

  // 수동 승인 요청 목록
  const [pendingRequests, setPendingRequests] = useState<ManualRequest[]>([]);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(
    null,
  );

  // 초기 데이터 로드
  useEffect(() => {
    async function init() {
      try {
      const data = await fetchAgentScanBootstrap();

      if (!data.userId) {
        router.push("/auth/login");
        return;
      }

      if (data.role !== "agent" && data.role !== "admin") {
        showAlert("상담사 권한이 필요합니다");
        router.push("/");
        return;
      }

      setIsAgent(true);
      setProperties(data.properties);
      if (data.properties.length > 0) {
        setSelectedPropertyId(data.properties[0].id);
      }
      setConsultations(data.consultations);
      } catch (err) {
        console.error("초기화 오류:", err);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  // 수동 승인 요청 목록 조회
  const fetchPendingRequests = useCallback(async () => {
    try {
      const response = await fetch("/api/visits/manual-approve");
      const data = await response.json();
      if (response.ok) {
        setPendingRequests(data.requests || []);
      }
    } catch (err) {
      console.error("수동 승인 요청 조회 오류:", err);
    }
  }, []);

  // 초기 로드 + Realtime 구독
  useEffect(() => {
    if (!isAgent) return;

    // 초기 로드
    fetchPendingRequests();

    // Realtime 구독 - 새 요청이 들어오면 즉시 갱신
    const unsubscribe = subscribeToVisitConfirmRequests(fetchPendingRequests);

    return () => {
      unsubscribe();
    };
  }, [isAgent, fetchPendingRequests]);

  // 남은 시간 카운트다운
  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const now = new Date();
      const remaining = Math.max(
        0,
        Math.floor((expiresAt.getTime() - now.getTime()) / 1000),
      );
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        setQrToken(null);
        setVisitUrl(null);
        setExpiresAt(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // QR 토큰 생성
  async function generateToken(consultationId?: string) {
    const consultation = consultationId
      ? consultations.find((c) => c.id === consultationId)
      : null;

    const propertyId = consultation?.property.id || selectedPropertyId;

    if (!propertyId) {
      showAlert("현장을 선택해주세요");
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch("/api/visits/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          consultationId: consultationId || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setQrToken(data.token);
        setVisitUrl(data.visitUrl);
        setExpiresAt(new Date(data.expiresAt));
        setRemainingSeconds(TOKEN_TTL_SECONDS);
      } else {
        showAlert(data.error || "토큰 생성에 실패했습니다");
      }
    } catch (err) {
      console.error("토큰 생성 오류:", err);
      showAlert("토큰 생성 중 오류가 발생했습니다");
    } finally {
      setGenerating(false);
    }
  }

  // 수동 승인/거절 처리
  async function handleManualAction(
    requestId: string,
    action: "approve" | "reject",
  ) {
    setProcessingRequestId(requestId);
    try {
      const response = await fetch("/api/visits/manual-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });

      const data = await response.json();

      if (response.ok) {
        showAlert(
          action === "approve"
            ? "방문 인증이 승인되었습니다"
            : "요청이 거절되었습니다",
        );
        fetchPendingRequests();
      } else {
        showAlert(data.error || "처리에 실패했습니다");
      }
    } catch (err) {
      console.error("수동 처리 오류:", err);
      showAlert("처리 중 오류가 발생했습니다");
    } finally {
      setProcessingRequestId(null);
    }
  }

  // 날짜 포맷
  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
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

  if (!isAgent) {
    return null;
  }

  return (
    <PageContainer className="pb-8">
      <div className="max-w-lg mx-auto space-y-6">
        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-bold text-(--oboon-text-title)">
            방문 인증 QR
          </h1>
          <p className="mt-1 text-sm text-(--oboon-text-muted)">
            고객이 스캔할 QR 코드를 생성합니다
          </p>
        </div>

        {/* 확정된 예약 목록 */}
        {consultations.length > 0 && (
          <Card className="p-4">
            <label className="block text-sm font-medium text-(--oboon-text-title) mb-3">
              예약 선택 (방문 인증)
            </label>
            <div className="space-y-2">
              {consultations.map((c) => (
                <div
                  key={c.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedConsultationId === c.id
                      ? "border-(--oboon-primary) bg-(--oboon-primary)/5"
                      : "border-(--oboon-border-default) hover:bg-(--oboon-bg-subtle)"
                  }`}
                  onClick={() => setSelectedConsultationId(c.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-(--oboon-text-title)">
                        {c.customer.name}
                      </p>
                      <p className="text-xs text-(--oboon-text-muted)">
                        {c.property.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-(--oboon-text-body)">
                        {formatTime(c.scheduled_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {consultations.length === 0 && properties.length > 0 && (
          <Card className="p-4">
            <label className="block text-sm font-medium text-(--oboon-text-title) mb-2">
              현장 선택 (예약 없이 인증)
            </label>
            <select
              className="w-full px-3 py-2 border border-(--oboon-border-default) rounded-lg bg-(--oboon-bg-page) text-(--oboon-text-body) focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)"
              value={selectedPropertyId || ""}
              onChange={(e) => setSelectedPropertyId(Number(e.target.value))}
            >
              {properties.map((prop) => (
                <option key={prop.id} value={prop.id}>
                  {prop.name}
                </option>
              ))}
            </select>
          </Card>
        )}

        {properties.length === 0 && consultations.length === 0 && (
          <Card className="p-6 text-center">
            <MapPin className="h-12 w-12 mx-auto text-(--oboon-text-muted) mb-4" />
            <p className="text-(--oboon-text-muted)">
              소속된 분양 현장이 없습니다
            </p>
          </Card>
        )}

        {/* QR 코드 영역 */}
        {(consultations.length > 0 || properties.length > 0) && (
          <Card className="p-6">
            {qrToken && visitUrl ? (
              <div className="text-center">
                {/* QR 코드 */}
                <div className="inline-block p-4 bg-white rounded-xl">
                  <QRCode value={visitUrl} size={200} />
                </div>

                {/* 남은 시간 */}
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Clock className="h-5 w-5 text-(--oboon-text-muted)" />
                  <span
                    className={`text-lg font-bold ${
                      remainingSeconds <= 10
                        ? "text-red-500"
                        : "text-(--oboon-text-title)"
                    }`}
                  >
                    {remainingSeconds}초
                  </span>
                </div>

                <p className="text-sm text-(--oboon-text-muted) mt-2">
                  고객에게 QR 코드를 보여주세요
                </p>

                {/* 재생성 버튼 */}
                <Button
                  variant="secondary"
                  className="mt-4"
                  onClick={() =>
                    generateToken(selectedConsultationId || undefined)
                  }
                  loading={generating}
                >
                  <RefreshCw className="h-4 w-4" />새 QR 생성
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <QrCode className="h-16 w-16 mx-auto text-(--oboon-text-muted) mb-4" />
                <p className="text-(--oboon-text-muted) mb-4">
                  {consultations.length > 0
                    ? selectedConsultationId
                      ? "QR 코드를 생성해주세요"
                      : "위에서 고객을 선택해주세요"
                    : "QR 코드를 생성해주세요"}
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() =>
                    generateToken(selectedConsultationId || undefined)
                  }
                  loading={generating}
                  disabled={
                    consultations.length > 0
                      ? !selectedConsultationId
                      : !selectedPropertyId
                  }
                >
                  <QrCode className="h-5 w-5" />
                  QR 코드 생성
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* 수동 승인 요청 목록 */}
        {pendingRequests.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-(--oboon-text-title) mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              수동 확인 요청
              <Badge variant="default">{pendingRequests.length}</Badge>
            </h2>

            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <Card key={request.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-(--oboon-text-title)">
                        {request.consultation?.customer?.name || "고객"}
                      </p>
                      <p className="text-sm text-(--oboon-text-muted)">
                        {request.property?.name}
                      </p>
                      {request.reason && (
                        <p className="text-xs text-(--oboon-text-muted) mt-1 bg-(--oboon-bg-subtle) px-2 py-1 rounded">
                          사유: {request.reason}
                        </p>
                      )}
                      <p className="text-xs text-(--oboon-text-muted) mt-1">
                        요청 시간: {formatTime(request.created_at)}
                      </p>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() =>
                          handleManualAction(request.id, "approve")
                        }
                        loading={processingRequestId === request.id}
                        disabled={processingRequestId !== null}
                      >
                        <Check className="h-4 w-4" />
                        승인
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleManualAction(request.id, "reject")}
                        loading={processingRequestId === request.id}
                        disabled={processingRequestId !== null}
                      >
                        <X className="h-4 w-4" />
                        거절
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
