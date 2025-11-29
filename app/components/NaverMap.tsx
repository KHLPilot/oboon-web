"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    naver: any;
  }
}

export default function NaverMap() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.naver?.maps) {
      setLoaded(true);
      return;
    }

    const script = document.createElement("script");

    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}`;
    script.async = true;
    script.defer = true;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (!mapRef.current) return;

    const { naver } = window as any;

    const map = new naver.maps.Map(mapRef.current, {
      center: new naver.maps.LatLng(37.5665, 126.9780),
      zoom: 12,
    });

    new naver.maps.Marker({
      position: new naver.maps.LatLng(37.5665, 126.9780),
      map,
    });
  }, [loaded]);

  return (
    <div className="mt-4">
      <div
        ref={mapRef}
        className="w-full h-96 rounded-xl border border-slate-700 bg-slate-950"
      />
      {!loaded && (
        <p className="mt-2 text-xs text-slate-400">
          지도를 불러오는 중입니다…
        </p>
      )}
    </div>
  );
}
