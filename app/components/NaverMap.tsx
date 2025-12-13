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

export default function NaverMap({ markers }: { markers: MapMarker[] }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const markerInstances = useRef<any[]>([]);

  // 🚨 수정: 환경 변수를 컴포넌트 내부에서 읽습니다. (클라이언트 컴포넌트이므로 안전)
  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

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
    // 🚨 3. clientId 변수를 사용하여 스크립트 URL 생성
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`;
    script.async = true;
    script.onload = initMap;
    document.head.appendChild(script);

    // 컴포넌트 언마운트 시 스크립트 제거 (선택적)
    // return () => {
    //   document.head.removeChild(script);
    // };

    // 🚨 의존성 배열에 clientId를 추가하여, clientId가 변경되면(이 경우 초기 로드시) useEffect를 실행합니다.
  }, [clientId]);

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
