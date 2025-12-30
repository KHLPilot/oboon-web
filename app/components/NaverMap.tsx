"use client";

import { useEffect, useRef } from "react";

/* ==================================================
   타입
================================================== */

export type MarkerType = "urgent" | "upcoming" | "remain";

export interface MapMarker {
  id: number;
  label: string;
  lat: number;
  lng: number;
  type: MarkerType;
}

type NaverMapProps = {
  markers?: MapMarker[];
  onSelectPosition?: (lat: number, lng: number) => void;
};

/* ==================================================
   전역 선언
================================================== */

declare global {
  interface Window {
    naver: any;
  }
}

/* ==================================================
   컴포넌트
================================================== */

export default function NaverMap({
  markers = [],
  onSelectPosition,
}: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const markerInstances = useRef<any[]>([]);

  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

  const selectedMarkerRef = useRef<any>(null);

  /* ---------- 네이버 지도 스크립트 로드 ---------- */
  useEffect(() => {
    // 🚨 1. Client ID가 유효하지 않으면 로드를 중단합니다.
    if (!clientId) {
      console.error("❌ Naver Map Client ID가 설정되지 않았습니다.");
      return;
    }

    // 🚨 2. 네이버 맵 로드 함수 정의
    function initMap() {
      if (!mapRef.current || mapInstance.current) return;

      mapInstance.current = new window.naver.maps.Map(mapRef.current, {
        center: new window.naver.maps.LatLng(37.5665, 126.978),
        zoom: 11,
      });
    }

    // 이미 로드되었으면 바로 초기화 시도
    if (window.naver?.maps) {
      initMap();
      return;
    }

    // 스크립트 생성 및 로드
    const script = document.createElement("script");
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`;
    script.async = true;
    script.onload = initMap;
    document.head.appendChild(script);

  }, [clientId]);

  //직접등록 마커 클릭 이벤트
  useEffect(() => {
    if (!mapInstance.current || !window.naver?.maps) return;

    const { naver } = window;

    const listener = naver.maps.Event.addListener(
      mapInstance.current,
      "click",
      (e: any) => {
        const latlng = e.latlng;
        if (!latlng) return;

        const lat = latlng.lat();
        const lng = latlng.lng();

        // ✅ 마커가 없으면 생성
        if (!selectedMarkerRef.current) {
          selectedMarkerRef.current = new naver.maps.Marker({
            position: latlng,
            map: mapInstance.current,
          });
        } else {
          // ✅ 있으면 위치만 이동
          selectedMarkerRef.current.setPosition(latlng);
        }

        onSelectPosition?.(lat, lng);
      }
    );

    return () => {
      naver.maps.Event.removeListener(listener);
    };
  }, [onSelectPosition]);

  /* ---------- 마커 렌더링 ---------- */
  useEffect(() => {
    if (!mapInstance.current || !window.naver?.maps) return; // 지도 인스턴스와 네이버 맵 객체 확인

    const { naver } = window;

    // 기존 마커 제거
    markerInstances.current.forEach((m) => m.setMap(null));
    markerInstances.current = [];

    markers.forEach((m) => {
      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(m.lat, m.lng),
        map: mapInstance.current,
        title: m.label,
        icon: {
          content: `
            <div style="
              background:${getColor(m.type)};
              width:14px;
              height:14px;
              border-radius:50%;
              border:2px solid white;
              box-shadow:0 0 4px rgba(0,0,0,.4);
            "></div>
          `,
          anchor: new naver.maps.Point(7, 7),
        },
      });

      markerInstances.current.push(marker);
    });
  }, [markers]); // 마커 데이터가 변경될 때마다 재렌더링

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-xl border border-slate-700"
    />
  );
}

/* ==================================================
   유틸
================================================== */

function getColor(type: MarkerType) {
  switch (type) {
    case "urgent":
      return "#ef4444"; // 빨강
    case "upcoming":
      return "#3b82f6"; // 파랑
    case "remain":
      return "#10b981"; // 초록
    default:
      return "#64748b";
  }
}
