"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
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
import Modal from "@/components/ui/Modal";
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
    image_url: string | null;
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

type ConsultationQRPanelProps = {
  consultationId: string;
  showHeader?: boolean;
  onClose?: () => void;
  onNavigate?: () => void;
};

export function ConsultationQRPanel({
  consultationId,
  showHeader = true,
  onClose,
  onNavigate,
}: ConsultationQRPanelProps) {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const scannerRef = useRef<any>(null);
  const isModal = !showHeader;

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
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [mapLoading, setMapLoading] = useState(false);

  const handleNavigate = useCallback(
    (href: string) => {
      onNavigate?.();
      router.push(href);
    },
    [onNavigate, router],
  );

  useEffect(() => {
    setInAppInfo(detectInAppBrowser());
  }, []);

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

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    if (!consultationId) return;

    async function fetchConsultation() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          handleNavigate("/auth/login");
          return;
        }

        const response = await fetch(`/api/consultations/${consultationId}`);
        const data = await response.json();

        if (response.ok) {
          setConsultation(data.consultation);
        } else {
          console.error("예약 조회 실패:", data.error);
          handleNavigate("/my/consultations");
        }
      } catch (err) {
        console.error("예약 조회 오류:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchConsultation();
  }, [supabase, consultationId, handleNavigate]);

  useEffect(() => {
    if (scanStatus !== "waiting_manual" || !manualRequestId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/visits/request-manual?requestId=${manualRequestId}`,
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
    return `${month}월 ${day}일(${dayName}) ${hours}:${minutes}`;
  }

  function formatDistance(meters: number): string {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)}km`;
    }
    return `${Math.round(meters)}m`;
  }

  function getModelHouseLocation(): {
    lat: number;
    lng: number;
    address: string;
  } | null {
    if (!consultation?.property?.property_facilities) return null;

    const modelHouse = consultation.property.property_facilities.find(
      (f) => f.type === "MODELHOUSE" && f.is_active && f.lat && f.lng,
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

  async function handleOpenMap() {
    setMapLoading(true);

    try {
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
        alert(
          "위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.",
        );
      } else if (err.message?.includes("Naver")) {
        alert("지도를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.");
      } else {
        alert("위치 정보를 가져올 수 없습니다.");
      }
    } finally {
      setMapLoading(false);
    }
  }

  function extractToken(scannedText: string): string | null {
    const urlMatch = scannedText.match(/\/visit\/([a-zA-Z0-9_-]+)/);
    if (urlMatch) return urlMatch[1];
    if (/^[a-zA-Z0-9_-]+$/.test(scannedText)) return scannedText;
    return null;
  }

  function getLocation(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("이 브라우저에서는 위치 API를 지원하지 않습니다"));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });
  }

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
              message: "위치 정보를 가져오는데 시간이 너무 오래 걸립니다.",
              code: "TIMEOUT",
            });
            break;
          default:
            setErrorInfo({
              message:
                err.message || "위치 정보를 가져오는 중 오류가 발생했습니다",
            });
        }
      } else {
        setErrorInfo({
          message: err.message || "인증 중 오류가 발생했습니다",
        });
      }
    }
  }

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
        () => {},
      );
    } catch (err: any) {
      console.error("카메라 오류:", err);
      setScanStatus("error");

      if (err.name === "NotAllowedError") {
        setErrorInfo({
          message: "카메라 권한이 거부되었습니다",
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

  function handleStopScanning() {
    stopCamera();
    setScanStatus("idle");
  }

  function handleRetry() {
    if (scannedToken) {
      verifyVisit(scannedToken);
    } else {
      handleReset();
    }
  }

  function handleReset() {
    setScanStatus("idle");
    setScannedToken(null);
    setErrorInfo(null);
    setManualRequestId(null);
    setManualReason("");
    setShowReasonInput(false);
  }

  function handleOpenExternal() {
    const currentUrl = window.location.href;
    if (inAppInfo?.isIOS) {
      navigator.clipboard?.writeText(currentUrl);
      alert("주소가 복사되었습니다. Safari에서 주소창에 붙여넣기 해주세요.");
    } else if (inAppInfo?.isAndroid) {
      const intentUrl = `intent://${currentUrl.replace(
        /^https?:\/\//,
        "",
      )}#Intent;scheme=https;package=com.android.chrome;end`;
      window.location.href = intentUrl;
    }
  }

  function canRequestManual() {
    const allowedCodes = [
      "OUT_OF_RANGE",
      "ACCURACY_TOO_LOW",
      "PERMISSION_DENIED",
      "POSITION_UNAVAILABLE",
      "TIMEOUT",
    ];
    return (
      scannedToken && errorInfo?.code && allowedCodes.includes(errorInfo.code)
    );
  }

  function getErrorGuidance(code?: string) {
    switch (code) {
      case "OUT_OF_RANGE":
        return "모델하우스에 가까이 이동 후 다시 시도해주세요.";
      case "ACCURACY_TOO_LOW":
        return "외부로 이동해 GPS 신호가 좋은 곳에서 다시 시도해주세요.";
      case "TOKEN_EXPIRED":
        return "QR 코드가 만료되었습니다. 상담사에게 QR 코드를 요청해주세요.";
      case "TOKEN_ALREADY_USED":
        return "이미 방문 인증이 완료되었습니다.";
      default:
        return null;
    }
  }

  const wrap = (content: ReactNode, className: string) => {
    return showHeader ? (
      <PageContainer className={className}>{content}</PageContainer>
    ) : (
      <div className={className}>{content}</div>
    );
  };

  if (loading) {
    return wrap(
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-(--oboon-primary)" />
      </div>,
      isModal ? " " : "pb-8",
    );
  }

  if (!consultation) {
    return null;
  }

  if (scanStatus === "success" || scanStatus === "manual_approved") {
    return wrap(
      <div className="mt-6">
        <Card className="p-5 text-center">
          <div className="w-20 h-20 mx-auto bg-(--oboon-safe-bg) rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-10 w-10 text-(--oboon-safe)" />
          </div>
          <div className="ob-typo-h2 text-(--oboon-text-title) mb-2">
            방문 인증 완료
          </div>
          <p className="text-(--oboon-text-muted) mb-6">
            {scanStatus === "manual_approved"
              ? "상담사가 방문을 확인했습니다"
              : "GPS 인증이 완료되었습니다"}
          </p>
          {isModal ? (
            <Button
              variant="primary"
              onClick={() => {
                if (onClose) {
                  onClose();
                  return;
                }
                handleNavigate("/my/consultations");
              }}
            >
              내 상담 예약으로
            </Button>
          ) : (
            <Link href="/my/consultations" onClick={() => onNavigate?.()}>
              <Button variant="primary">
                <ArrowLeft className="h-4 w-4" />내 상담 예약으로
              </Button>
            </Link>
          )}
        </Card>
      </div>,
      isModal ? "py-2" : "py-8",
    );
  }

  if (scanStatus === "waiting_manual") {
    return wrap(
      <div className="mt-6">
        <Card className="p-8 text-center">
          <div className="w-20 h-20 mx-auto bg-(--oboon-warning-bg) rounded-full flex items-center justify-center mb-4">
            <Loader2 className="h-10 w-10 text-(--oboon-warning) animate-spin" />
          </div>
          <h1 className="ob-typo-h2 text-(--oboon-text-title) mb-2">
            상담사 확인 대기중
          </h1>
          <p className="text-(--oboon-text-muted) mb-4">
            상담사가 방문을 확인하면 자동으로 완료됩니다
          </p>
          <div className="flex items-center justify-center gap-2 ob-typo-caption text-(--oboon-text-muted)">
            <Loader2 className="h-4 w-4 animate-spin" />
            확인 중..
          </div>
        </Card>
      </div>,
      isModal ? "py-2" : "py-8",
    );
  }

  if (scanStatus === "manual_rejected") {
    return wrap(
      <div className="mt-6">
        <Card className="p-8 text-center">
          <div className="w-20 h-20 mx-auto bg-(--oboon-danger-bg) rounded-full flex items-center justify-center mb-4">
            <X className="h-10 w-10 text-(--oboon-danger)" />
          </div>
          <div className="ob-typo-h2 text-(--oboon-text-title) mb-2">
            요청이 거절되었습니다
          </div>
          <p className="text-(--oboon-text-muted) mb-6">
            상담사에게 문의해주세요
          </p>
          <Button variant="secondary" onClick={handleReset}>
            <ArrowLeft className="h-4 w-4" />
            처음으로
          </Button>
        </Card>
      </div>,
      isModal ? "py-2" : "py-8",
    );
  }

  return wrap(
    <div className="mt-6">
      {showHeader && (
        <div className="flex items-center gap-3 mb-6">
          <Link href="/my/consultations" onClick={() => onNavigate?.()}>
            <Button variant="ghost" size="md">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="ob-typo-h2 text-(--oboon-text-title)">방문 인증</div>
        </div>
      )}

      <Card className="p-4 mb-4">
        <div className="group flex items-center gap-3 sm:gap-4 rounded-xl">
          {/* 썸네일 */}
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-(--oboon-bg-subtle)">
            {consultation.property.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={consultation.property.image_url}
                alt={consultation.property.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-(--oboon-text-primary)" />
              </div>
            )}
          </div>

          {/* 텍스트 영역 */}
          <div className="flex-1 min-w-0 space-y-1">
            <p className="ob-typo-h3 truncate text-(--oboon-text-title)">
              {consultation.property.name}
            </p>

            {/* 일정 */}
            <div className="flex items-center gap-2 ob-typo-body text-(--oboon-text-body)">
              <Clock className="h-4 w-4 text-(--oboon-text-muted)" />
              <span className="text-(--oboon-text-muted)">
                {formatDate(consultation.scheduled_at)}
              </span>
            </div>

            {/* 상담사 */}
            <div className="flex items-center gap-2 ob-typo-body text-(--oboon-text-muted)">
              <User className="h-4 w-4" />
              <span>상담사: {consultation.agent.name}</span>
            </div>
          </div>
        </div>

        {getModelHouseLocation() && (
          <Button
            variant="secondary"
            size="md"
            className="w-full mt-4 flex items-center justify-center gap-2"
            onClick={handleOpenMap}
            disabled={mapLoading}
          >
            {mapLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Map className="h-4 w-4" />
            )}
            모델하우스 위치 보기
          </Button>
        )}
      </Card>

      {inAppInfo?.isInApp && (
        <Card className="p-4 bg-(--oboon-warning-bg) border-(--oboon-warning-border)">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-(--oboon-warning) shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="ob-typo-body2 text-(--oboon-warning-text)">
                {inAppInfo.browser || "인앱 브라우저"}에서는 카메라 사용이
                제한될 수 있습니다
              </p>
              <Button
                variant="warning"
                size="md"
                className="mt-2"
                onClick={handleOpenExternal}
              >
                <ExternalLink className="h-5 w-5" />
                {inAppInfo.isIOS ? "Safari" : "Chrome"}에서 열기
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className={isModal ? "p-6 aspect-square overflow-y-auto" : "p-6"}>
        <div className={isModal ? "flex h-full flex-col gap-4" : "space-y-4"}>
          <div
            id="qr-reader"
            className={`w-full aspect-square rounded-xl overflow-hidden bg-(--oboon-overlay) ${
              isModal ? "mx-auto max-w-[240px]" : ""
            } ${scanStatus !== "scanning" ? "hidden" : ""}`}
          />

          {scanStatus === "verifying" && (
            <div
              className={
                isModal
                  ? "flex-1 flex flex-col items-center justify-center text-center"
                  : "text-center py-8"
              }
            >
              <Loader2 className="h-12 w-12 mx-auto text-(--oboon-primary) animate-spin mb-4" />
              <p className="text-(--oboon-text-muted)">위치 확인 중..</p>
            </div>
          )}

          {scanStatus === "idle" && (
            <div
              className={
                isModal
                  ? "flex-1 flex flex-col items-center justify-center text-center"
                  : "text-center mb-6"
              }
            >
              <div className="w-16 h-16 mx-auto bg-(--oboon-bg-subtle) rounded-full flex items-center justify-center mb-4">
                <Camera className="h-8 w-8 text-(--oboon-primary)" />
              </div>
              <div className="ob-typo-h3 text-(--oboon-text-title) mb-2">
                상담사의 QR 코드를 스캔해주세요
              </div>
              <p className="ob-typo-body text-(--oboon-text-muted)">
                QR 스캔 후 GPS 위치 확인이 진행됩니다
              </p>
            </div>
          )}

          {scanStatus === "error" && errorInfo && (
            <div
              className={
                isModal
                  ? "p-4 bg-(--oboon-danger-bg) border border-(--oboon-danger-border) rounded-lg"
                  : "mb-4 p-4 bg-(--oboon-danger-bg) border border-(--oboon-danger-border) rounded-lg"
              }
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-(--oboon-danger) shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="ob-typo-body2 text-(--oboon-danger)">
                    {errorInfo.message}
                  </p>
                  {errorInfo.distance && (
                    <p className="ob-typo-caption text-(--oboon-danger-text) mt-1">
                      현재 거리: {formatDistance(errorInfo.distance)} (허용:
                      150m)
                    </p>
                  )}
                  {getErrorGuidance(errorInfo.code) && (
                    <p className="ob-typo-caption text-(--oboon-danger-text) mt-2">
                      {getErrorGuidance(errorInfo.code)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {(scanStatus === "idle" || scanStatus === "error") && (
            <div className={isModal ? "mt-auto space-y-2" : ""}>
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
            </div>
          )}

          {scanStatus === "scanning" && (
            <div className={isModal ? "mt-auto" : ""}>
              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                onClick={handleStopScanning}
              >
                <X className="h-5 w-5" />
                스캔 중지
              </Button>
            </div>
          )}

          {scanStatus === "error" && canRequestManual() && (
            <div
              className={
                isModal
                  ? "mt-4 pt-4 border-t border-(--oboon-border-default)"
                  : "mt-6 pt-6 border-t border-(--oboon-border-default)"
              }
            >
              <p className="ob-typo-caption text-(--oboon-text-muted) text-center mb-4">
                GPS 인증이 어려울 경우
              </p>
              {showReasonInput ? (
                <div className="space-y-3">
                  <textarea
                    className="w-full px-3 py-2 border border-(--oboon-border-default) rounded-lg bg-(--oboon-bg-page) text-(--oboon-text-body) ob-typo-body resize-none"
                    placeholder="사유를 입력해주세요 (선택)"
                    rows={2}
                    value={manualReason}
                    onChange={(e) => setManualReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="md"
                      className="flex-1"
                      onClick={() => setShowReasonInput(false)}
                    >
                      취소
                    </Button>
                    <Button
                      variant="warning"
                      size="md"
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
        </div>
      </Card>

      {showMapModal && userLocation && getModelHouseLocation() && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-(--oboon-overlay)"
            onClick={() => setShowMapModal(false)}
          />

          <div className="relative w-full max-w-lg bg-(--oboon-bg-surface) rounded-2xl overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-(--oboon-border-default)">
              <div className="font-semibold text-(--oboon-text-title)">
                모델하우스 위치
              </div>
              <button
                onClick={() => setShowMapModal(false)}
                className="p-1 rounded-full hover:bg-(--oboon-bg-subtle)"
              >
                <X className="h-5 w-5 text-(--oboon-text-muted)" />
              </button>
            </div>

            <div className="h-80 relative">
              <MapView
                userLocation={userLocation}
                modelHouseLocation={getModelHouseLocation()!}
              />
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-(--oboon-primary) flex items-center justify-center shrink-0">
                  <Navigation className="h-3 w-3 text-(--oboon-on-primary)" />
                </div>
                <div>
                  <p className="ob-typo-caption text-(--oboon-text-muted)">
                    현재 위치
                  </p>
                  <p className="ob-typo-body text-(--oboon-text-body)">
                    현재 위치
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-(--oboon-danger) flex items-center justify-center shrink-0">
                  <MapPin className="h-3 w-3 text-(--oboon-on-danger)" />
                </div>
                <div>
                  <p className="ob-typo-caption text-(--oboon-text-muted)">
                    모델하우스
                  </p>
                  <p className="ob-typo-body text-(--oboon-text-body)">
                    {getModelHouseLocation()?.address ||
                      consultation.property.name}
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
    </div>,
    isModal ? " " : "pb-8",
  );
}

type ConsultationQRModalProps = {
  open: boolean;
  consultationId: string | null;
  onClose: () => void;
  onNavigate?: () => void;
};

export default function ConsultationQRModal({
  open,
  consultationId,
  onClose,
  onNavigate,
}: ConsultationQRModalProps) {
  if (!open || !consultationId) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      panelClassName="p-0"
      zIndexOffset={10}
    >
      <div className="flex items-center justify-between">
        <div className="ob-typo-h2 text-(--oboon-text-title)">방문 인증</div>
      </div>
      <div>
        <ConsultationQRPanel
          consultationId={consultationId}
          showHeader={false}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      </div>
    </Modal>
  );
}

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

    if (mapInstanceRef.current) return;

    if (!window.naver?.maps) {
      console.error("Naver maps not loaded");
      return;
    }

    const { naver } = window;
    const bounds = new naver.maps.LatLngBounds(
      new naver.maps.LatLng(
        Math.min(userLocation.lat, modelHouseLocation.lat),
        Math.min(userLocation.lng, modelHouseLocation.lng),
      ),
      new naver.maps.LatLng(
        Math.max(userLocation.lat, modelHouseLocation.lat),
        Math.max(userLocation.lng, modelHouseLocation.lng),
      ),
    );

    const map = new naver.maps.Map(mapRef.current, {
      bounds,
      padding: { top: 50, right: 50, bottom: 50, left: 50 },
    });
    mapInstanceRef.current = map;

    const strokeColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--oboon-text-muted")
      .trim();
    const fallbackStrokeColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--oboon-border-default")
      .trim();
    const resolvedStrokeColor = strokeColor || fallbackStrokeColor;

    new naver.maps.Marker({
      position: new naver.maps.LatLng(userLocation.lat, userLocation.lng),
      map,
      icon: {
        content: `
          <div style="
            width: 24px;
            height: 24px;
            background: var(--oboon-primary);
            border: 3px solid var(--oboon-bg-surface);
            border-radius: 50%;
            box-shadow: var(--oboon-shadow-card);
          "></div>
        `,
        anchor: new naver.maps.Point(12, 12),
      },
    });

    new naver.maps.Marker({
      position: new naver.maps.LatLng(
        modelHouseLocation.lat,
        modelHouseLocation.lng,
      ),
      map,
      icon: {
        content: `
          <div style="
            width: 32px;
            height: 32px;
            background: var(--oboon-danger);
            border: 3px solid var(--oboon-bg-surface);
            border-radius: 50%;
            box-shadow: var(--oboon-shadow-card);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--oboon-on-danger)" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        `,
        anchor: new naver.maps.Point(16, 16),
      },
    });

    new naver.maps.Polyline({
      map,
      path: [
        new naver.maps.LatLng(userLocation.lat, userLocation.lng),
        new naver.maps.LatLng(modelHouseLocation.lat, modelHouseLocation.lng),
      ],
      strokeColor: resolvedStrokeColor,
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
