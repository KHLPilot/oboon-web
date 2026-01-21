"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Clock,
  User,
  Camera,
  CheckCircle2,
  AlertCircle,
  X,
  Navigation,
  ExternalLink,
  Map,
} from "lucide-react";
import Link from "next/link";

import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { detectInAppBrowser, InAppBrowserInfo } from "@/lib/inAppBrowser";
import { loadNaverMaps } from "@/features/map/naver.loader";

interface PropertyFacility {
  id: number;
  lat: number | null;
  lng: number | null;
  road_address: string | null;
  type: string;
  is_active: boolean;
}

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
    property_facilities: PropertyFacility[];
  };
}

type ScanStatus =
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

export default function ConsultationQRPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createSupabaseClient();
  const consultationId = params.id as string;
  const scannerRef = useRef<any>(null);

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
  const [scannedToken, setScannedToken] = useState<string | null>(null);
  const [inAppInfo, setInAppInfo] = useState<InAppBrowserInfo | null>(null);
  const [manualRequestId, setManualRequestId] = useState<string | null>(null);
  const [manualReason, setManualReason] = useState("");
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapLoading, setMapLoading] = useState(false);

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

  // 예약 정보 조회
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

  // 수동 확인 요청 상태 폴링
  useEffect(() => {
    if (scanStatus !== "waiting_manual" || !manualRequestId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/visits/request-manual?requestId=${manualRequestId}`
        );
        const data = await response.json();

        if (response.ok && data.request) {
          if (data.request.status === "approved") {
            setScanStatus("manual_approved");
            clearInterval(pollInterval);
          } else if (data.request.status === "rejected") {
            setScanStatus("manual_rejected");
            clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.error("상태 조회 오류:", err);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [scanStatus, manualRequestId]);

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

  // 거리 포맷 (1000m 이상이면 km로 표시)
  function formatDistance(meters: number): string {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)}km`;
    }
    return `${Math.round(meters)}m`;
  }

  // 활성화된 모델하우스 위치 가져오기
  function getModelHouseLocation(): { lat: number; lng: number; address: string } | null {
    if (!consultation?.property?.property_facilities) return null;

    const modelHouse = consultation.property.property_facilities.find(
      (f) => f.type === "MODELHOUSE" && f.is_active && f.lat && f.lng
    );

    if (modelHouse && modelHouse.lat && modelHouse.lng) {
      return {
        lat: modelHouse.lat,
        lng: modelHouse.lng,
        address: modelHouse.road_address || "",
      };
    }
    return null;
  }

  // 지도 보기 버튼 클릭
  async function handleOpenMap() {
    setMapLoading(true);

    try {
      // 네이버 지도 로드
      const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
      if (clientId) {
        await loadNaverMaps(clientId);
      }

      const position = await getLocation();
      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      setShowMapModal(true);
    } catch (err: any) {
      if (err.code === 1) {
        alert("위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.");
      } else if (err.message?.includes("Naver")) {
        alert("지도를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.");
      } else {
        alert("위치 정보를 가져올 수 없습니다.");
      }
    } finally {
      setMapLoading(false);
    }
  }

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
    setScanStatus("verifying");
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
        setScanStatus("success");
      } else {
        setScanStatus("error");
        setErrorInfo({
          message: data.error,
          code: data.code,
          distance: data.distance,
          accuracy: data.accuracy,
        });
      }
    } catch (err: any) {
      setScanStatus("error");

      if (err.code) {
        switch (err.code) {
          case 1:
            setErrorInfo({
              message:
                "위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.",
              code: "PERMISSION_DENIED",
            });
            break;
          case 2:
            setErrorInfo({
              message:
                "위치 정보를 가져올 수 없습니다. GPS 신호가 약하거나 실내에 있을 수 있습니다.",
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
    if (!scannedToken) return;

    setScanStatus("requesting_manual");
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
        setScanStatus("waiting_manual");
        setShowReasonInput(false);
      } else {
        setScanStatus("error");
        setErrorInfo({ message: data.error });
      }
    } catch (err: any) {
      setScanStatus("error");
      setErrorInfo({ message: "요청 중 오류가 발생했습니다" });
    }
  }

  // QR 스캔 시작
  async function startScanning() {
    setScanStatus("scanning");
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
      setScanStatus("error");

      if (err.name === "NotAllowedError") {
        setErrorInfo({
          message: "카메라 권한이 거부되었습니다.",
          code: "CAMERA_DENIED",
        });
      } else if (err.name === "NotFoundError") {
        setErrorInfo({
          message: "카메라를 찾을 수 없습니다.",
          code: "CAMERA_NOT_FOUND",
        });
      } else {
        setErrorInfo({
          message: err.message || "카메라를 시작할 수 없습니다.",
        });
      }
    }
  }

  // 스캔 중지
  function handleStopScanning() {
    stopCamera();
    setScanStatus("idle");
  }

  // 다시 시도
  function handleRetry() {
    if (scannedToken) {
      verifyVisit(scannedToken);
    } else {
      handleReset();
    }
  }

  // 처음으로 돌아가기
  function handleReset() {
    setScanStatus("idle");
    setScannedToken(null);
    setErrorInfo(null);
    setManualRequestId(null);
    setManualReason("");
    setShowReasonInput(false);
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
    const allowedCodes = [
      "OUT_OF_RANGE",
      "ACCURACY_TOO_LOW",
      "PERMISSION_DENIED",
      "POSITION_UNAVAILABLE",
      "TIMEOUT",
    ];
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

  // 성공 화면
  if (scanStatus === "success" || scanStatus === "manual_approved") {
    return (
      <PageContainer className="py-8">
        <div className="max-w-md mx-auto">
          <Card className="p-8 text-center">
            <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-(--oboon-text-title) mb-2">
              방문 인증 완료
            </h1>
            <p className="text-(--oboon-text-muted) mb-6">
              {scanStatus === "manual_approved"
                ? "상담사가 방문을 확인했습니다"
                : "GPS 인증이 완료되었습니다"}
            </p>
            <Link href="/my/consultations">
              <Button variant="primary">
                <ArrowLeft className="h-4 w-4" />내 상담 예약으로
              </Button>
            </Link>
          </Card>
        </div>
      </PageContainer>
    );
  }

  // 수동 확인 대기 화면
  if (scanStatus === "waiting_manual") {
    return (
      <PageContainer className="py-8">
        <div className="max-w-md mx-auto">
          <Card className="p-8 text-center">
            <div className="w-20 h-20 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <Loader2 className="h-10 w-10 text-orange-600 animate-spin" />
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
        </div>
      </PageContainer>
    );
  }

  // 수동 확인 거절 화면
  if (scanStatus === "manual_rejected") {
    return (
      <PageContainer className="py-8">
        <div className="max-w-md mx-auto">
          <Card className="p-8 text-center">
            <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
              <X className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-(--oboon-text-title) mb-2">
              요청이 거절되었습니다
            </h1>
            <p className="text-(--oboon-text-muted) mb-6">
              상담사에게 문의해주세요
            </p>
            <Button variant="secondary" onClick={handleReset}>
              <ArrowLeft className="h-4 w-4" />
              처음으로
            </Button>
          </Card>
        </div>
      </PageContainer>
    );
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

          {/* 지도 보기 버튼 */}
          {getModelHouseLocation() && (
            <Button
              variant="secondary"
              size="sm"
              className="w-full mt-4 flex items-center justify-center gap-2"
              onClick={handleOpenMap}
              disabled={mapLoading}
            >
              {mapLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Map className="h-4 w-4" />
              )}
              모델하우스 위치 보기
            </Button>
          )}
        </Card>

        {/* 인앱 브라우저 안내 */}
        {inAppInfo?.isInApp && (
          <Card className="p-4 mb-6 bg-orange-50 border-orange-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-orange-700 font-medium">
                  {inAppInfo.browser || "인앱 브라우저"}에서는 카메라 사용이
                  제한될 수 있습니다
                </p>
                <Button
                  variant="warning"
                  size="sm"
                  className="mt-2"
                  onClick={handleOpenExternal}
                >
                  <ExternalLink className="h-4 w-4" />
                  {inAppInfo.isIOS ? "Safari" : "Chrome"}에서 열기
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* QR 스캔 카드 */}
        <Card className="p-6">
          {/* QR 스캐너 영역 */}
          <div
            id="qr-reader"
            className={`w-full aspect-square rounded-xl overflow-hidden bg-black mb-4 ${
              scanStatus !== "scanning" ? "hidden" : ""
            }`}
          />

          {/* 인증 중 */}
          {scanStatus === "verifying" && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 mx-auto text-(--oboon-primary) animate-spin mb-4" />
              <p className="text-(--oboon-text-muted)">위치 확인 중...</p>
            </div>
          )}

          {/* 대기 상태 안내 */}
          {scanStatus === "idle" && (
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto bg-(--oboon-bg-subtle) rounded-full flex items-center justify-center mb-4">
                <Camera className="h-8 w-8 text-(--oboon-primary)" />
              </div>
              <h2 className="text-lg font-semibold text-(--oboon-text-title) mb-2">
                상담사의 QR 코드를 스캔하세요
              </h2>
              <p className="text-sm text-(--oboon-text-muted)">
                QR 스캔 후 GPS 위치 확인이 진행됩니다
              </p>
            </div>
          )}

          {/* 에러 메시지 */}
          {scanStatus === "error" && errorInfo && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-700 font-medium">
                    {errorInfo.message}
                  </p>
                  {errorInfo.distance && (
                    <p className="text-xs text-red-600 mt-1">
                      현재 거리: {formatDistance(errorInfo.distance)} (허용: 150m)
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

          {/* 버튼 영역 */}
          {(scanStatus === "idle" || scanStatus === "error") && (
            <>
              {scanStatus === "error" && scannedToken ? (
                <div className="space-y-2">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={handleRetry}
                  >
                    <Navigation className="h-5 w-5" />
                    다시 인증하기
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full"
                    onClick={handleReset}
                  >
                    <Camera className="h-5 w-5" />
                    QR 다시 스캔
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={startScanning}
                >
                  <Camera className="h-5 w-5" />
                  QR 스캔 시작
                </Button>
              )}
            </>
          )}

          {scanStatus === "scanning" && (
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={handleStopScanning}
            >
              <X className="h-5 w-5" />
              스캔 중지
            </Button>
          )}

          {/* 수동 확인 요청 */}
          {scanStatus === "error" && canRequestManual() && (
            <div className="mt-6 pt-6 border-t border-(--oboon-border-default)">
              <p className="text-sm text-(--oboon-text-muted) text-center mb-4">
                GPS 인증이 어려운 경우
              </p>
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
      </div>

      {/* 지도 모달 */}
      {showMapModal && userLocation && getModelHouseLocation() && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 배경 오버레이 */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowMapModal(false)}
          />

          {/* 모달 콘텐츠 */}
          <div className="relative w-full max-w-lg bg-(--oboon-bg-surface) rounded-2xl overflow-hidden shadow-xl">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-(--oboon-border-default)">
              <h3 className="font-semibold text-(--oboon-text-title)">
                모델하우스 위치
              </h3>
              <button
                onClick={() => setShowMapModal(false)}
                className="p-1 rounded-full hover:bg-(--oboon-bg-subtle)"
              >
                <X className="h-5 w-5 text-(--oboon-text-muted)" />
              </button>
            </div>

            {/* 지도 */}
            <div className="h-80 relative">
              <MapView
                userLocation={userLocation}
                modelHouseLocation={getModelHouseLocation()!}
              />
            </div>

            {/* 정보 */}
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                  <Navigation className="h-3 w-3 text-white" />
                </div>
                <div>
                  <p className="text-xs text-(--oboon-text-muted)">내 위치</p>
                  <p className="text-sm text-(--oboon-text-body)">현재 위치</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                  <MapPin className="h-3 w-3 text-white" />
                </div>
                <div>
                  <p className="text-xs text-(--oboon-text-muted)">모델하우스</p>
                  <p className="text-sm text-(--oboon-text-body)">
                    {getModelHouseLocation()?.address || consultation.property.name}
                  </p>
                </div>
              </div>

              <Button
                variant="primary"
                className="w-full mt-2"
                onClick={() => setShowMapModal(false)}
              >
                확인
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

// 지도 컴포넌트
function MapView({
  userLocation,
  modelHouseLocation,
}: {
  userLocation: { lat: number; lng: number };
  modelHouseLocation: { lat: number; lng: number; address: string };
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;

    // 지도가 이미 초기화되었으면 스킵
    if (mapInstanceRef.current) return;

    // 네이버 지도가 로드되어 있는지 확인
    if (!window.naver?.maps) {
      console.error("Naver maps not loaded");
      return;
    }

    const { naver } = window;
    const bounds = new naver.maps.LatLngBounds(
      new naver.maps.LatLng(
        Math.min(userLocation.lat, modelHouseLocation.lat),
        Math.min(userLocation.lng, modelHouseLocation.lng)
      ),
      new naver.maps.LatLng(
        Math.max(userLocation.lat, modelHouseLocation.lat),
        Math.max(userLocation.lng, modelHouseLocation.lng)
      )
    );

    const map = new naver.maps.Map(mapRef.current, {
      bounds,
      padding: { top: 50, right: 50, bottom: 50, left: 50 },
    });
    mapInstanceRef.current = map;

    // 내 위치 마커 (파란색)
    new naver.maps.Marker({
      position: new naver.maps.LatLng(userLocation.lat, userLocation.lng),
      map,
      icon: {
        content: `
          <div style="
            width: 24px;
            height: 24px;
            background: #3B82F6;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          "></div>
        `,
        anchor: new naver.maps.Point(12, 12),
      },
    });

    // 모델하우스 마커 (빨간색)
    new naver.maps.Marker({
      position: new naver.maps.LatLng(
        modelHouseLocation.lat,
        modelHouseLocation.lng
      ),
      map,
      icon: {
        content: `
          <div style="
            width: 32px;
            height: 32px;
            background: #EF4444;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        `,
        anchor: new naver.maps.Point(16, 16),
      },
    });

    // 두 지점 사이 연결선
    new naver.maps.Polyline({
      map,
      path: [
        new naver.maps.LatLng(userLocation.lat, userLocation.lng),
        new naver.maps.LatLng(modelHouseLocation.lat, modelHouseLocation.lng),
      ],
      strokeColor: "#6B7280",
      strokeWeight: 2,
      strokeStyle: "shortdash",
    });

    setMapReady(true);
  }, [userLocation, modelHouseLocation]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapRef} className="w-full h-full" />
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-(--oboon-bg-subtle)">
          <Loader2 className="h-8 w-8 animate-spin text-(--oboon-primary)" />
        </div>
      )}
    </div>
  );
}
