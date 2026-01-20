"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Navigation,
  User,
  Clock,
  ArrowLeft,
} from "lucide-react";

import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

type VerifyStatus =
  | "idle"
  | "loading"
  | "success"
  | "error"
  | "requesting"
  | "waiting"
  | "approved"
  | "rejected";

interface ErrorInfo {
  message: string;
  code?: string;
  distance?: number;
  accuracy?: number;
}

export default function VisitVerifyPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [status, setStatus] = useState<VerifyStatus>("idle");
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
  const [manualRequestId, setManualRequestId] = useState<string | null>(null);
  const [manualReason, setManualReason] = useState("");
  const [showReasonInput, setShowReasonInput] = useState(false);

  // GPS 위치 가져오기
  const getLocation = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("이 브라우저에서는 위치 서비스를 지원하지 않습니다"));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });
  }, []);

  // GPS 방문 인증
  async function handleVerify() {
    setStatus("loading");
    // setErrorInfo(null);

    try {
      // 위치 가져오기
      const position = await getLocation();
      const { latitude, longitude, accuracy } = position.coords;

      // API 호출
      const response = await fetch("/api/visits/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          lat: latitude,
          lng: longitude,
          accuracy,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorInfo({
          message: data.error,
          code: data.code,
          distance: data.distance,
          accuracy: data.accuracy,
        });
      }
    } catch (err: any) {
      setStatus("error");

      // GeolocationPositionError 처리
      if (err.code) {
        switch (err.code) {
          case 1: // PERMISSION_DENIED
            setErrorInfo({
              message:
                "위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.",
              code: "PERMISSION_DENIED",
            });
            break;
          case 2: // POSITION_UNAVAILABLE
            setErrorInfo({
              message:
                "위치 정보를 가져올 수 없습니다. GPS 신호가 약하거나 실내에 있을 수 있습니다.",
              code: "POSITION_UNAVAILABLE",
            });
            break;
          case 3: // TIMEOUT
            setErrorInfo({
              message:
                "위치 정보를 가져오는 데 시간이 너무 오래 걸립니다. 다시 시도해주세요.",
              code: "TIMEOUT",
            });
            break;
          default:
            setErrorInfo({
              message: err.message || "위치를 가져오는 중 오류가 발생했습니다",
            });
        }
      } else {
        setErrorInfo({
          message: err.message || "인증 중 오류가 발생했습니다",
        });
      }
    }
  }

  // 수동 확인 요청
  async function handleRequestManual() {
    setStatus("requesting");
    setErrorInfo(null);

    try {
      const response = await fetch("/api/visits/request-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          reason: manualReason || "GPS 인증 실패",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setManualRequestId(data.requestId);
        setStatus("waiting");
        setShowReasonInput(false);
      } else {
        setStatus("error");
        setErrorInfo({ message: data.error });
      }
    } catch (err: any) {
      setStatus("error");
      setErrorInfo({ message: "요청 중 오류가 발생했습니다" });
    }
  }

  // 수동 확인 요청 상태 폴링
  useEffect(() => {
    if (status !== "waiting" || !manualRequestId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/visits/request-manual?requestId=${manualRequestId}`,
        );
        const data = await response.json();

        if (response.ok && data.request) {
          if (data.request.status === "approved") {
            setStatus("approved");
            clearInterval(pollInterval);
          } else if (data.request.status === "rejected") {
            setStatus("rejected");
            clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.error("상태 조회 오류:", err);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [status, manualRequestId]);

  // 에러 코드에 따른 안내 메시지
  function getErrorGuidance(code?: string) {
    switch (code) {
      case "OUT_OF_RANGE":
        return "모델하우스에 더 가까이 이동한 후 다시 시도해주세요.";
      case "ACCURACY_TOO_LOW":
        return "실외로 이동하거나 GPS 신호가 좋은 곳에서 다시 시도해주세요.";
      case "TOKEN_EXPIRED":
        return "QR 코드가 만료되었습니다. 상담사에게 새 QR 코드를 요청하세요.";
      case "TOKEN_ALREADY_USED":
        return "이미 방문 인증이 완료되었습니다.";
      case "PERMISSION_DENIED":
        return "브라우저 주소창 옆의 자물쇠 아이콘을 눌러 위치 권한을 허용해주세요.";
      case "POSITION_UNAVAILABLE":
        return "실외로 이동하거나 WiFi를 켜면 위치 정확도가 향상될 수 있습니다.";
      default:
        return null;
    }
  }

  // GPS 실패 시 수동 확인 요청 가능 여부
  function canRequestManual() {
    const manualAllowedCodes = [
      "OUT_OF_RANGE",
      "ACCURACY_TOO_LOW",
      "PERMISSION_DENIED",
      "POSITION_UNAVAILABLE",
      "TIMEOUT",
    ];
    return errorInfo?.code && manualAllowedCodes.includes(errorInfo.code);
  }

  return (
    <PageContainer className="pb-8">
      <div className="max-w-md mx-auto">
        {/* 성공 화면 */}
        {(status === "success" || status === "approved") && (
          <Card className="p-8 text-center">
            <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-(--oboon-text-title) mb-2">
              방문 인증 완료
            </h1>
            <p className="text-(--oboon-text-muted) mb-6">
              {status === "approved"
                ? "상담사가 방문을 확인했습니다"
                : "GPS 인증이 완료되었습니다"}
            </p>
            <Link href="/my/consultations">
              <Button variant="primary">
                <ArrowLeft className="h-4 w-4" />내 상담 예약으로 돌아가기
              </Button>
            </Link>
          </Card>
        )}

        {/* 거절 화면 */}
        {status === "rejected" && (
          <Card className="p-8 text-center">
            <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-(--oboon-text-title) mb-2">
              요청이 거절되었습니다
            </h1>
            <p className="text-(--oboon-text-muted) mb-6">
              상담사에게 문의해주세요
            </p>
            <Link href="/my/consultations">
              <Button variant="secondary">
                <ArrowLeft className="h-4 w-4" />내 상담 예약으로 돌아가기
              </Button>
            </Link>
          </Card>
        )}

        {/* 대기 중 화면 */}
        {status === "waiting" && (
          <Card className="p-8 text-center">
            <div className="w-20 h-20 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="h-10 w-10 text-orange-600 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold text-(--oboon-text-title) mb-2">
              상담사 확인 대기 중
            </h1>
            <p className="text-(--oboon-text-muted) mb-4">
              상담사가 방문을 확인하면 자동으로 완료됩니다
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-(--oboon-text-muted)">
              <Loader2 className="h-4 w-4 animate-spin" />
              확인 중...
            </div>
          </Card>
        )}

        {/* 기본/에러 화면 */}
        {(status === "idle" ||
          status === "loading" ||
          status === "error" ||
          status === "requesting") && (
          <Card className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto bg-(--oboon-bg-subtle) rounded-full flex items-center justify-center mb-4">
                <MapPin className="h-8 w-8 text-(--oboon-primary)" />
              </div>
              <h1 className="text-xl font-bold text-(--oboon-text-title)">
                방문 인증
              </h1>
              <p className="text-sm text-(--oboon-text-muted) mt-1">
                모델하우스 방문을 인증해주세요
              </p>
            </div>

            {/* 에러 메시지 */}
            {status === "error" && errorInfo && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-700 font-medium">
                      {errorInfo.message}
                    </p>
                    {errorInfo.distance && (
                      <p className="text-xs text-red-600 mt-1">
                        현재 거리: {errorInfo.distance}m (허용: 150m)
                      </p>
                    )}
                    {errorInfo.accuracy && (
                      <p className="text-xs text-red-600 mt-1">
                        GPS 정확도: {errorInfo.accuracy}m
                      </p>
                    )}
                    {getErrorGuidance(errorInfo.code) && (
                      <p className="text-xs text-red-600 mt-2">
                        {getErrorGuidance(errorInfo.code)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* GPS 인증 버튼 */}
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleVerify}
              loading={status === "loading"}
              disabled={status === "loading" || status === "requesting"}
            >
              <Navigation className="h-5 w-5" />
              방문 인증하기
            </Button>

            {/* 수동 확인 요청 섹션 */}
            {(status === "error" || status === "requesting") &&
              canRequestManual() && (
                <div className="mt-6 pt-6 border-t border-(--oboon-border-default)">
                  <p className="text-sm text-(--oboon-text-muted) text-center mb-4">
                    GPS 인증이 어려운 경우
                  </p>

                  {showReasonInput ? (
                    <div className="space-y-3">
                      <textarea
                        className="w-full px-3 py-2 border border-(--oboon-border-default) rounded-lg bg-(--oboon-bg-page) text-(--oboon-text-body) text-sm resize-none focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)"
                        placeholder="사유를 입력해주세요 (선택)"
                        rows={2}
                        value={manualReason}
                        onChange={(e) => setManualReason(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                          onClick={() => setShowReasonInput(false)}
                        >
                          취소
                        </Button>
                        <Button
                          variant="warning"
                          size="sm"
                          className="flex-1"
                          onClick={handleRequestManual}
                          loading={status === "requesting"}
                        >
                          <User className="h-4 w-4" />
                          요청하기
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => setShowReasonInput(true)}
                    >
                      <User className="h-4 w-4" />
                      상담사 확인 요청
                    </Button>
                  )}
                </div>
              )}
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
