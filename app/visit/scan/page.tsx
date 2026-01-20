"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Camera,
  AlertCircle,
  ExternalLink,
  X,
  CheckCircle2,
  Loader2,
  Navigation,
  ArrowLeft,
  User,
} from "lucide-react";

import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { detectInAppBrowser, InAppBrowserInfo } from "@/lib/inAppBrowser";

type PageStatus =
  | "idle"
  | "scanning"
  | "verifying"
  | "success"
  | "error"
  | "requesting_manual"
  | "waiting_manual"
  | "manual_approved"
  | "manual_rejected";

interface ErrorInfo {
  message: string;
  code?: string;
  distance?: number;
  accuracy?: number;
}

export default function VisitScanPage() {
  const scannerRef = useRef<any>(null);

  const [status, setStatus] = useState<PageStatus>("idle");
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
  const [inAppInfo, setInAppInfo] = useState<InAppBrowserInfo | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [scannedToken, setScannedToken] = useState<string | null>(null);
  const [manualRequestId, setManualRequestId] = useState<string | null>(null);
  const [manualReason, setManualReason] = useState("");
  const [showReasonInput, setShowReasonInput] = useState(false);

  // 인앱 브라우저 감지
  useEffect(() => {
    setInAppInfo(detectInAppBrowser());
  }, []);

  // 카메라 정리
  const stopCamera = useCallback(() => {
    if (scannerRef.current) {
      try {
        scannerRef.current.stop();
      } catch (e) {
        // ignore
      }
      scannerRef.current = null;
    }
  }, []);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // 수동 확인 요청 상태 폴링
  useEffect(() => {
    if (status !== "waiting_manual" || !manualRequestId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/visits/request-manual?requestId=${manualRequestId}`
        );
        const data = await response.json();

        if (response.ok && data.request) {
          if (data.request.status === "approved") {
            setStatus("manual_approved");
            clearInterval(pollInterval);
          } else if (data.request.status === "rejected") {
            setStatus("manual_rejected");
            clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.error("상태 조회 오류:", err);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [status, manualRequestId]);

  // QR 코드에서 토큰 추출
  function extractToken(scannedText: string): string | null {
    const urlMatch = scannedText.match(/\/visit\/([a-zA-Z0-9_-]+)/);
    if (urlMatch) return urlMatch[1];
    if (/^[a-zA-Z0-9_-]+$/.test(scannedText)) return scannedText;
    return null;
  }

  // GPS 위치 가져오기
  function getLocation(): Promise<GeolocationPosition> {
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
  }

  // 방문 인증 실행
  async function verifyVisit(token: string) {
    setStatus("verifying");
    setErrorInfo(null);

    try {
      const position = await getLocation();
      const { latitude, longitude, accuracy } = position.coords;

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

      if (err.code) {
        switch (err.code) {
          case 1:
            setErrorInfo({
              message: "위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.",
              code: "PERMISSION_DENIED",
            });
            break;
          case 2:
            setErrorInfo({
              message: "위치 정보를 가져올 수 없습니다. GPS 신호가 약하거나 실내에 있을 수 있습니다.",
              code: "POSITION_UNAVAILABLE",
            });
            break;
          case 3:
            setErrorInfo({
              message: "위치 정보를 가져오는 데 시간이 너무 오래 걸립니다.",
              code: "TIMEOUT",
            });
            break;
          default:
            setErrorInfo({ message: err.message || "위치를 가져오는 중 오류가 발생했습니다" });
        }
      } else {
        setErrorInfo({ message: err.message || "인증 중 오류가 발생했습니다" });
      }
    }
  }

  // 수동 확인 요청
  async function handleRequestManual() {
    if (!scannedToken) return;

    setStatus("requesting_manual");
    setErrorInfo(null);

    try {
      const response = await fetch("/api/visits/request-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: scannedToken,
          reason: manualReason || "GPS 인증 실패",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setManualRequestId(data.requestId);
        setStatus("waiting_manual");
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

  // QR 스캔 시작
  async function startScanning() {
    setStatus("scanning");
    setErrorInfo(null);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          const token = extractToken(decodedText);
          if (token) {
            stopCamera();
            setScannedToken(token);
            verifyVisit(token);
          } else {
            setErrorInfo({ message: "유효하지 않은 QR 코드입니다" });
          }
        },
        () => {}
      );
    } catch (err: any) {
      console.error("카메라 오류:", err);
      setStatus("error");

      if (err.name === "NotAllowedError") {
        setErrorInfo({ message: "카메라 권한이 거부되었습니다.", code: "CAMERA_DENIED" });
      } else if (err.name === "NotFoundError") {
        setErrorInfo({ message: "카메라를 찾을 수 없습니다.", code: "CAMERA_NOT_FOUND" });
      } else {
        setErrorInfo({ message: err.message || "카메라를 시작할 수 없습니다." });
      }
    }
  }

  // 스캔 중지
  function handleStopScanning() {
    stopCamera();
    setStatus("idle");
  }

  // 수동 토큰 입력
  function handleManualSubmit() {
    const token = extractToken(manualToken.trim());
    if (token) {
      setScannedToken(token);
      verifyVisit(token);
    } else {
      setErrorInfo({ message: "유효하지 않은 토큰입니다" });
    }
  }

  // 처음으로 돌아가기
  function handleReset() {
    setStatus("idle");
    setScannedToken(null);
    setErrorInfo(null);
    setManualRequestId(null);
    setManualReason("");
    setShowReasonInput(false);
  }

  // 다시 시도
  function handleRetry() {
    if (scannedToken) {
      verifyVisit(scannedToken);
    } else {
      handleReset();
    }
  }

  // 외부 브라우저로 열기
  function handleOpenExternal() {
    const currentUrl = window.location.href;
    if (inAppInfo?.isIOS) {
      navigator.clipboard?.writeText(currentUrl);
      alert("주소가 복사되었습니다. Safari를 열고 주소창에 붙여넣기 해주세요.");
    } else if (inAppInfo?.isAndroid) {
      const intentUrl = `intent://${currentUrl.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
      window.location.href = intentUrl;
    }
  }

  // 수동 확인 요청 가능 여부
  function canRequestManual() {
    const allowedCodes = ["OUT_OF_RANGE", "ACCURACY_TOO_LOW", "PERMISSION_DENIED", "POSITION_UNAVAILABLE", "TIMEOUT"];
    return scannedToken && errorInfo?.code && allowedCodes.includes(errorInfo.code);
  }

  // 에러 안내 메시지
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
      default:
        return null;
    }
  }

  // 인앱 브라우저 안내
  if (inAppInfo?.isInApp) {
    return (
      <PageContainer className="py-8">
        <div className="max-w-md mx-auto">
          <Card className="p-6 text-center">
            <div className="w-16 h-16 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
            <h1 className="text-xl font-bold text-(--oboon-text-title) mb-2">외부 브라우저 필요</h1>
            <p className="text-sm text-(--oboon-text-muted) mb-4">
              {inAppInfo.browser || "인앱 브라우저"}에서는 카메라 사용이 제한됩니다.
              <br />
              {inAppInfo.isIOS ? "Safari" : "Chrome"}에서 열어주세요.
            </p>
            <Button variant="primary" size="lg" className="w-full mb-3" onClick={handleOpenExternal}>
              <ExternalLink className="h-5 w-5" />
              {inAppInfo.isIOS ? "Safari" : "Chrome"}에서 열기
            </Button>

            <div className="mt-6 pt-6 border-t border-(--oboon-border-default)">
              <p className="text-sm text-(--oboon-text-muted) mb-3">또는 토큰을 직접 입력하세요</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="토큰 입력"
                  className="flex-1 px-3 py-2 border border-(--oboon-border-default) rounded-lg bg-(--oboon-bg-page) text-(--oboon-text-body) text-sm"
                />
                <Button variant="secondary" onClick={handleManualSubmit}>
                  확인
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </PageContainer>
    );
  }

  // 성공 화면
  if (status === "success" || status === "manual_approved") {
    return (
      <PageContainer className="py-8">
        <div className="max-w-md mx-auto">
          <Card className="p-8 text-center">
            <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-(--oboon-text-title) mb-2">방문 인증 완료</h1>
            <p className="text-(--oboon-text-muted) mb-6">
              {status === "manual_approved" ? "상담사가 방문을 확인했습니다" : "GPS 인증이 완료되었습니다"}
            </p>
            <Link href="/my/consultations">
              <Button variant="primary">
                <ArrowLeft className="h-4 w-4" />
                내 상담 예약으로
              </Button>
            </Link>
          </Card>
        </div>
      </PageContainer>
    );
  }

  // 수동 확인 대기 화면
  if (status === "waiting_manual") {
    return (
      <PageContainer className="py-8">
        <div className="max-w-md mx-auto">
          <Card className="p-8 text-center">
            <div className="w-20 h-20 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <Loader2 className="h-10 w-10 text-orange-600 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-(--oboon-text-title) mb-2">상담사 확인 대기 중</h1>
            <p className="text-(--oboon-text-muted) mb-4">상담사가 방문을 확인하면 자동으로 완료됩니다</p>
            <div className="flex items-center justify-center gap-2 text-sm text-(--oboon-text-muted)">
              <Loader2 className="h-4 w-4 animate-spin" />
              확인 중...
            </div>
          </Card>
        </div>
      </PageContainer>
    );
  }

  // 수동 확인 거절 화면
  if (status === "manual_rejected") {
    return (
      <PageContainer className="py-8">
        <div className="max-w-md mx-auto">
          <Card className="p-8 text-center">
            <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
              <X className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-(--oboon-text-title) mb-2">요청이 거절되었습니다</h1>
            <p className="text-(--oboon-text-muted) mb-6">상담사에게 문의해주세요</p>
            <Button variant="secondary" onClick={handleReset}>
              <ArrowLeft className="h-4 w-4" />
              처음으로
            </Button>
          </Card>
        </div>
      </PageContainer>
    );
  }

  // 기본 화면 (스캔/인증/에러)
  return (
    <PageContainer className="py-8">
      <div className="max-w-md mx-auto">
        <Card className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto bg-(--oboon-bg-subtle) rounded-full flex items-center justify-center mb-4">
              <Camera className="h-8 w-8 text-(--oboon-primary)" />
            </div>
            <h1 className="text-xl font-bold text-(--oboon-text-title)">방문 인증</h1>
            <p className="text-sm text-(--oboon-text-muted) mt-1">상담사의 QR 코드를 스캔하여 방문 인증하세요</p>
          </div>

          {/* QR 스캐너 */}
          <div
            id="qr-reader"
            className={`w-full aspect-square rounded-xl overflow-hidden bg-black mb-4 ${
              status !== "scanning" ? "hidden" : ""
            }`}
          />

          {/* 인증 중 */}
          {status === "verifying" && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 mx-auto text-(--oboon-primary) animate-spin mb-4" />
              <p className="text-(--oboon-text-muted)">위치 확인 중...</p>
            </div>
          )}

          {/* 에러 메시지 */}
          {status === "error" && errorInfo && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-700 font-medium">{errorInfo.message}</p>
                  {errorInfo.distance && (
                    <p className="text-xs text-red-600 mt-1">현재 거리: {errorInfo.distance}m (허용: 150m)</p>
                  )}
                  {getErrorGuidance(errorInfo.code) && (
                    <p className="text-xs text-red-600 mt-2">{getErrorGuidance(errorInfo.code)}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 버튼 영역 */}
          {(status === "idle" || status === "error") && !status.includes("manual") && (
            <>
              {status === "error" && scannedToken ? (
                <div className="space-y-2">
                  <Button variant="primary" size="lg" className="w-full" onClick={handleRetry}>
                    <Navigation className="h-5 w-5" />
                    다시 인증하기
                  </Button>
                  <Button variant="secondary" size="lg" className="w-full" onClick={handleReset}>
                    <Camera className="h-5 w-5" />
                    QR 다시 스캔
                  </Button>
                </div>
              ) : (
                <Button variant="primary" size="lg" className="w-full" onClick={startScanning}>
                  <Camera className="h-5 w-5" />
                  QR 스캔 시작
                </Button>
              )}
            </>
          )}

          {status === "scanning" && (
            <Button variant="secondary" size="lg" className="w-full" onClick={handleStopScanning}>
              <X className="h-5 w-5" />
              스캔 중지
            </Button>
          )}

          {/* 수동 확인 요청 */}
          {status === "error" && canRequestManual() && (
            <div className="mt-6 pt-6 border-t border-(--oboon-border-default)">
              <p className="text-sm text-(--oboon-text-muted) text-center mb-4">GPS 인증이 어려운 경우</p>
              {showReasonInput ? (
                <div className="space-y-3">
                  <textarea
                    className="w-full px-3 py-2 border border-(--oboon-border-default) rounded-lg bg-(--oboon-bg-page) text-(--oboon-text-body) text-sm resize-none"
                    placeholder="사유를 입력해주세요 (선택)"
                    rows={2}
                    value={manualReason}
                    onChange={(e) => setManualReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" className="flex-1" onClick={() => setShowReasonInput(false)}>
                      취소
                    </Button>
                    <Button
                      variant="warning"
                      size="sm"
                      className="flex-1"
                      onClick={handleRequestManual}
                    >
                      <User className="h-4 w-4" />
                      요청하기
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="secondary" className="w-full" onClick={() => setShowReasonInput(true)}>
                  <User className="h-4 w-4" />
                  상담사 확인 요청
                </Button>
              )}
            </div>
          )}

          {/* 수동 토큰 입력 */}
          {(status === "idle" || (status === "error" && !scannedToken)) && (
            <div className="mt-6 pt-6 border-t border-(--oboon-border-default)">
              <p className="text-sm text-(--oboon-text-muted) text-center mb-3">QR 스캔이 안 되나요?</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="토큰 또는 URL 입력"
                  className="flex-1 px-3 py-2 border border-(--oboon-border-default) rounded-lg bg-(--oboon-bg-page) text-(--oboon-text-body) text-sm"
                />
                <Button variant="secondary" onClick={handleManualSubmit}>
                  확인
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}
