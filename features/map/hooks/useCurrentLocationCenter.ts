"use client";

import { useEffect, useState } from "react";

export type GeoLocationCenter = {
  lat: number;
  lng: number;
};

export type GeoLocationStatus =
  | "idle"
  | "pending"
  | "granted"
  | "denied"
  | "unavailable"
  | "unsupported";

type UseCurrentLocationCenterResult = {
  center: GeoLocationCenter | null;
  status: GeoLocationStatus;
  hasResolved: boolean;
};

type CurrentLocationState = {
  center: GeoLocationCenter | null;
  status: GeoLocationStatus;
};

export function useCurrentLocationCenter(
  enabled = true,
): UseCurrentLocationCenterResult {
  const geolocationSupported =
    typeof window !== "undefined" && typeof navigator !== "undefined"
      ? "geolocation" in navigator
      : true;
  const [state, setState] = useState<CurrentLocationState>({
    center: null,
    status: enabled ? "pending" : "idle",
  });

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (!navigator.geolocation) return;

    let active = true;
    let permissionStatus: PermissionStatus | null = null;
    let watchId: number | null = null;
    let watchTimeoutId: number | null = null;

    const clearWatch = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      if (watchTimeoutId !== null) {
        window.clearTimeout(watchTimeoutId);
        watchTimeoutId = null;
      }
    };

    const resolveSuccess = (position: GeolocationPosition) => {
      if (!active) return;
      clearWatch();
      setState({
        center: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        },
        status: "granted",
      });
    };

    const resolveFailure = (status: Extract<
      GeoLocationStatus,
      "denied" | "unavailable" | "unsupported"
    >) => {
      if (!active) return;
      clearWatch();
      setState((prev) =>
        prev.status === "granted" ? prev : { center: null, status },
      );
    };

    const startWatchFallback = () => {
      clearWatch();
      watchId = navigator.geolocation.watchPosition(
        resolveSuccess,
        (error) => {
          if (!active) return;
          if (error.code === 1) {
            resolveFailure("denied");
            return;
          }
          resolveFailure("unavailable");
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
        },
      );

      watchTimeoutId = window.setTimeout(() => {
        resolveFailure("unavailable");
      }, 12_000);
    };

    const requestCurrentPosition = () => {
      clearWatch();
      navigator.geolocation.getCurrentPosition(
        resolveSuccess,
        (error) => {
          if (!active) return;
          if (error.code === 1) {
            resolveFailure("denied");
            return;
          }
          startWatchFallback();
        },
        {
          enableHighAccuracy: false,
          maximumAge: 300_000,
          timeout: 5_000,
        },
      );
    };

    requestCurrentPosition();

    if (navigator.permissions?.query) {
      void navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((status) => {
          if (!active) return;
          permissionStatus = status;
          const handlePermissionChange = () => {
            if (!active) return;
            if (status.state === "granted") {
              setState((prev) =>
                prev.status === "granted"
                  ? prev
                  : { center: null, status: "pending" },
              );
              requestCurrentPosition();
              return;
            }
            if (status.state === "denied") {
              resolveFailure("denied");
            }
          };

          status.onchange = handlePermissionChange;
          handlePermissionChange();
        })
        .catch(() => {
          // 권한 상태 조회는 보조 기능이므로 실패해도 위치 요청 자체는 유지한다.
        });
    }

    return () => {
      active = false;
      clearWatch();
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, [enabled]);

  const effectiveStatus: GeoLocationStatus = !enabled
    ? "idle"
    : !geolocationSupported
      ? "unsupported"
      : state.status === "idle"
        ? "pending"
        : state.status;
  const effectiveCenter =
    !enabled || !geolocationSupported ? null : state.center;

  return {
    center: effectiveCenter,
    status: effectiveStatus,
    hasResolved: effectiveStatus !== "pending" && effectiveStatus !== "idle",
  };
}
