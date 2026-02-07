"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
} from "lucide-react";

import Modal from "@/components/ui/Modal";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { detectInAppBrowser, getExternalBrowserUrl, InAppBrowserInfo } from "@/lib/inAppBrowser";
import { showAlert } from "@/shared/alert";

type Props = {
  open: boolean;
  consultationId: string | null;
  propertyName?: string;
  scheduledAtLabel?: string;
  onClose: () => void;
  onVerified?: () => void;
};

type VerifyErrorInfo = {
  message: string;
  code?: string;
  distance?: number;
  accuracy?: number;
};

type ManualStatus = "idle" | "waiting" | "approved" | "rejected";

export default function GpsVisitVerifyModal({
  open,
  consultationId,
  propertyName,
  scheduledAtLabel,
  onClose,
  onVerified,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<VerifyErrorInfo | null>(null);
  const [inAppInfo, setInAppInfo] = useState<InAppBrowserInfo | null>(null);
  const [manualStatus, setManualStatus] = useState<ManualStatus>("idle");
  const [manualRequestId, setManualRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setInAppInfo(detectInAppBrowser());
    setErrorInfo(null);
    setManualStatus("idle");
    setManualRequestId(null);
  }, [open]);

  useEffect(() => {
    if (manualStatus !== "waiting" || !manualRequestId) return;
    const timer = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/visits/visit-confirm-requests?requestId=${manualRequestId}`,
        );
        const data = await response.json();
        if (!response.ok || !data.request) return;
        if (data.request.status === "approved") {
          setManualStatus("approved");
          clearInterval(timer);
          showAlert("상담사가 방문 인증을 승인했습니다.");
          onVerified?.();
          onClose();
        } else if (data.request.status === "rejected") {
          setManualStatus("rejected");
          clearInterval(timer);
        }
      } catch {
        // polling best-effort
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [manualStatus, manualRequestId, onClose, onVerified]);

  const errorGuidance = useMemo(() => {
    switch (errorInfo?.code) {
      case "OUT_OF_RANGE":
        return "모델하우스에 더 가까이 이동한 후 다시 시도해주세요.";
      case "ACCURACY_TOO_LOW":
        return "실외로 이동하거나 GPS 신호가 좋은 곳에서 다시 시도해주세요.";
      case "RESERVATION_TIME_INVALID":
        return "예약 시간 전후 2시간 이내에 인증할 수 있습니다.";
      default:
        return null;
    }
  }, [errorInfo?.code]);

  function handleOpenExternal() {
    if (!inAppInfo?.isInApp) return;
    const currentUrl = window.location.href;
    if (inAppInfo.isIOS) {
      void navigator.clipboard?.writeText(currentUrl);
      showAlert("주소를 복사했습니다. Safari에 붙여넣어 열어주세요.");
      return;
    }
    window.location.href = getExternalBrowserUrl(currentUrl, inAppInfo);
  }

  async function handleVerifyByGps() {
    if (!consultationId) return;
    if (!navigator.geolocation) {
      showAlert("이 브라우저에서는 위치 기능을 지원하지 않습니다.");
      return;
    }

    setLoading(true);
    setErrorInfo(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch("/api/visits/verify-gps", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              consultationId,
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
            }),
          });

          const data = await response.json();
          if (!response.ok) {
            setErrorInfo({
              message: data.error || "방문 인증에 실패했습니다.",
              code: data.code,
              distance: data.distance,
              accuracy: data.accuracy,
            });
            return;
          }
          if (data.pendingApproval && data.requestId) {
            setManualRequestId(data.requestId);
            setManualStatus("waiting");
            showAlert(
              data.message ||
                "도착 인증 요청이 전송되었습니다. 상담사 확인을 기다려주세요.",
            );
            return;
          }

          showAlert(data.message || "방문 인증이 완료되었습니다.");
          onVerified?.();
          onClose();
        } catch (err: any) {
          setErrorInfo({ message: err.message || "방문 인증 중 오류가 발생했습니다." });
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        setLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setErrorInfo({
              message: "위치 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.",
              code: "PERMISSION_DENIED",
            });
            break;
          case error.POSITION_UNAVAILABLE:
            setErrorInfo({
              message: "현재 위치를 확인할 수 없습니다.",
              code: "POSITION_UNAVAILABLE",
            });
            break;
          case error.TIMEOUT:
            setErrorInfo({
              message: "위치 확인 시간이 초과되었습니다. 다시 시도해주세요.",
              code: "TIMEOUT",
            });
            break;
          default:
            setErrorInfo({ message: "위치 정보를 가져오지 못했습니다." });
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="ob-typo-h3 text-(--oboon-text-title)">방문 인증</div>

      {inAppInfo?.isInApp ? (
        <Card className="mt-4 p-4 border-(--oboon-warning-border) bg-(--oboon-warning-bg) shadow-none">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 text-(--oboon-warning-text)" />
            <div className="min-w-0">
              <p className="ob-typo-body text-(--oboon-warning-text)">
                {inAppInfo.browser || "인앱 브라우저"}에서는 위치 인증이 제한될 수 있습니다.
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={handleOpenExternal}
              >
                <ExternalLink className="h-4 w-4" />
                외부 브라우저로 열기
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="mt-4 p-4 shadow-none">
        <div className="ob-typo-body text-(--oboon-text-title)">
          {propertyName || "현장"}
        </div>
        {scheduledAtLabel ? (
          <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
            {scheduledAtLabel}
          </div>
        ) : null}
      </Card>

      <p className="mt-4 ob-typo-body text-(--oboon-text-muted)">
        현재 위치 기반으로 방문 인증을 진행합니다.
      </p>

      {manualStatus === "waiting" ? (
        <Card className="mt-3 p-3 border-(--oboon-warning-border) bg-(--oboon-warning-bg) shadow-none">
          <p className="ob-typo-caption text-(--oboon-warning-text)">
            상담사 확인 요청이 접수되었습니다. 승인 결과를 확인 중입니다.
          </p>
        </Card>
      ) : null}

      {manualStatus === "rejected" ? (
        <Card className="mt-3 p-3 border-(--oboon-danger-border) bg-(--oboon-danger-bg) shadow-none">
          <p className="ob-typo-caption text-(--oboon-danger-text)">
            상담사가 요청을 거절했습니다. 다시 GPS 인증을 시도해주세요.
          </p>
        </Card>
      ) : null}

      {errorInfo ? (
        <Card className="mt-3 p-3 border-(--oboon-danger-border) bg-(--oboon-danger-bg) shadow-none">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 text-(--oboon-danger-text)" />
            <div className="min-w-0">
              <p className="ob-typo-caption text-(--oboon-danger-text)">
                {errorInfo.message}
              </p>
              {typeof errorInfo.distance === "number" ? (
                <p className="mt-1 ob-typo-caption text-(--oboon-danger-text)">
                  현재 거리: {Math.round(errorInfo.distance)}m (허용: 150m)
                </p>
              ) : null}
              {typeof errorInfo.accuracy === "number" ? (
                <p className="mt-1 ob-typo-caption text-(--oboon-danger-text)">
                  GPS 정확도: {Math.round(errorInfo.accuracy)}m
                </p>
              ) : null}
              {errorGuidance ? (
                <p className="mt-1 ob-typo-caption text-(--oboon-danger-text)">
                  {errorGuidance}
                </p>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}

      <div className="mt-5 flex gap-2">
        <Button
          className="flex-1"
          variant="secondary"
          onClick={onClose}
          disabled={loading}
        >
          취소
        </Button>
        <Button
          className="flex-1"
          variant="primary"
          onClick={handleVerifyByGps}
          disabled={!consultationId || loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : errorInfo ? (
            <Navigation className="h-4 w-4" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
          {errorInfo ? "다시 인증" : "위치로 인증"}
        </Button>
      </div>
    </Modal>
  );
}
