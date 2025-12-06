"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    naver: any;
  }
}

interface MarkerType {
  id: number;
  label: string;
  location: string; // 주소
  color?: string;
}

export default function NaverMap({ markers = [] }: { markers: MarkerType[] }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  // 🔥 1. 네이버 지도 스크립트 불러오기
  useEffect(() => {
    if (typeof window !== "undefined" && window.naver?.maps) {
      setLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}`;
    script.async = true;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, []);

  // 🔥 2. 주소 → 좌표 변환 (카카오 REST API 호출)
  const geocode = async (address: string) => {
    const res = await fetch(
      `/api/auth/kakao/geocode?query=${encodeURIComponent(address)}`
    );

    const data = await res.json();

    // 카카오 결과 확인 구조 (documents 배열)
    if (!data.documents || data.documents.length === 0) {
      console.warn("⚠️ 주소 변환 실패:", address, data);
      return null;
    }

    return {
      lat: Number(data.documents[0].y),
      lng: Number(data.documents[0].x),
    };
  };

  // 🔥 3. 지도 + 주소 기반 마커 표시
  useEffect(() => {
    if (!loaded || !mapRef.current) return;

    const { naver } = window;

    const map = new naver.maps.Map(mapRef.current, {
      center: new naver.maps.LatLng(37.5665, 126.9780), // 서울 중심
      zoom: 12,
    });

    // 마커 생성
    markers.forEach(async (marker) => {
      const coords = await geocode(marker.location);
      if (!coords) return;

      new naver.maps.Marker({
        position: new naver.maps.LatLng(coords.lat, coords.lng),
        map,
        title: marker.label,
      });
    });
  }, [loaded, markers]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-xl border bg-slate-900"
    />
  );
}