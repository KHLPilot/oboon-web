"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";
import AddressBox from "app/components/AddressBox";
import NaverMap from "app/components/NaverMap";

declare global {
  interface Window {
    daum: any;
  }
}

/* ==================================================
   타입
================================================== */

type LocationForm = {
  road_address: string;
  jibun_address: string;
  lat: string;
  lng: string;
  region_1depth: string;
  region_2depth: string;
  region_3depth: string;
};

/* ==================================================
   페이지
================================================== */

export default function PropertyLocationPage() {
  const supabase = createSupabaseClient();
  const params = useParams();
  const router = useRouter();
  const propertyId = Number(params.id);
  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false); // DB에 기존 데이터 존재 여부
  const [isEditing, setIsEditing] = useState(false); // 수정 모드 여부

  const [site, setSite] = useState<LocationForm>({
    road_address: "",
    jibun_address: "",
    lat: "",
    lng: "",
    region_1depth: "",
    region_2depth: "",
    region_3depth: "",
  });

  //지도 직접입력
  const [manualMode, setManualMode] = useState(false);
  const isTempAddress = !site.jibun_address;
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [regionInput, setRegionInput] = useState("");
  const region = parseRegion(regionInput);

  /* ==================================================
     기존 데이터 로드
  ================================================== */
  useEffect(() => {
    async function fetchLocation() {
      const { data } = await supabase
        .from("property_locations")
        .select("*")
        .eq("properties_id", propertyId)
        .single();

      if (data) {
        setSite({
          road_address: data.road_address,
          jibun_address: data.jibun_address,
          lat: data.lat,
          lng: data.lng,
          region_1depth: data.region_1depth,
          region_2depth: data.region_2depth,
          region_3depth: data.region_3depth,
        });
        setIsEdit(true);
      }
    }

    fetchLocation();
  }, [propertyId, supabase]);

  /* ==================================================
     주소 검색 (수정 모드에서만)
  ================================================== */
  function openPostcode() {
    if (!isEditing) return;

    new window.daum.Postcode({
      oncomplete: async function (data: any) {
        const query = data.roadAddress || data.jibunAddress;

        const res = await fetch(
          `/api/geo/address?query=${encodeURIComponent(query)}`
        );
        const geo = await res.json();

        setSite({
          road_address: data.roadAddress,
          jibun_address: data.jibunAddress,
          lat: geo.lat,
          lng: geo.lng,
          region_1depth: geo.region_1depth,
          region_2depth: geo.region_2depth,
          region_3depth: geo.region_3depth,
        });
      },
    }).open();
  }

  /* ==================================================
     직접 주소 등록
  ================================================== */
  useEffect(() => {
    if (!manualMode) return;
    if (!mapRef.current) return;

    const { naver } = window as any;
    if (!naver) return;

    const center = new naver.maps.LatLng(
      site.lat ? Number(site.lat) : 37.5665,
      site.lng ? Number(site.lng) : 126.9780
    );

    const map = new naver.maps.Map(mapRef.current, {
      center,
      zoom: 16,
    });

    const marker = new naver.maps.Marker({
      position: center,
      map,
    });

    naver.maps.Event.addListener(map, "click", (e: any) => {
      const lat = e.coord.lat();
      const lng = e.coord.lng();

      marker.setPosition(new naver.maps.LatLng(lat, lng));

      setSite((prev) => ({
        ...prev,
        lat: String(lat),
        lng: String(lng),
      }));
    });
  }, [manualMode]);

  function parseRegion(input: string) {
    const parts = input.trim().split(" ");
    return {
      region_1depth: parts[0] ?? "",
      region_2depth: parts[1] ?? "",
      region_3depth: parts[2] ?? "",
    };
  }

  /* ==================================================
     저장
  ================================================== */
  async function handleSave() {
    if (!site.road_address) {
      alert("현장 위치는 필수입니다.");
      return;
    }

    setLoading(true);

    try {
      if (isEdit) {
        await supabase
          .from("property_locations")
          .update(site)
          .eq("properties_id", propertyId);
      } else {
        await supabase.from("property_locations").insert({
          ...site,
          properties_id: propertyId,
        });
      }

      router.push(`/company/properties/${propertyId}`);
    } catch (err: any) {
      alert("저장 실패: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  /* ==================================================
   UI
  ================================================== */
  return (
    <div
      className="p-6 max-w-3xl mx-auto space-y-6
    bg-slate-50 dark:bg-black"
    >
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/company/properties/${propertyId}`)}
          className="
          text-sm
          text-slate-500
          dark:text-slate-400
          hover:underline
        "
        >
          ← 뒤로가기
        </button>

        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          📍 현장 위치
        </h1>
      </div>

      {/* ================= 현장 위치 ================= */}
      <section
        className={`
        space-y-4 rounded p-4 transition
        bg-white dark:bg-slate-900
        border
        ${isEditing
            ? "border-teal-500"
            : "border-slate-200 dark:border-slate-700"
          }
      `}
      >
        <h2 className="font-semibold text-slate-900 dark:text-white">
          현장 위치
        </h2>

        {/* 주소 표시 */}
        {site.road_address ? (
          <AddressBox
            roadAddress={site.road_address}
            jibunAddress={site.jibun_address}
          />
        ) : (
          <div
            className="
      rounded-lg p-3
      bg-slate-100 dark:bg-slate-800
      border border-dashed border-slate-300 dark:border-slate-600
      text-sm text-slate-500 dark:text-slate-400
    "
          >
            도로명주소가 입력되지 않았습니다
          </div>
        )}

        {/* 편집 모드에서만 주소 검색 */}
        {isEditing && !manualMode && (
          <>
            <button className="btn-secondary w-full" onClick={openPostcode}>
              주소 검색
            </button>


            <p className="text-xs text-slate-500 dark:text-slate-400">
              * 공사 현장은 공식 주소 검색이 안 될 수 있어요.
            </p>
            <button
              className="btn-secondary w-full"
              onClick={() => setManualMode(true)}
              type="button"
            >
              현장 주소 직접 등록
            </button>
          </>
        )}


        {isEditing && manualMode && (
          <>
            <button
              className="btn-secondary w-full"
              onClick={() => setManualMode(false)}
              type="button"
            >
              돌아가기
            </button>

            <div className="space-y-2">
              <input
                className="input-basic"
                placeholder="주소를 입력하세요 (임시 가능)"
                value={site.road_address}
                onChange={(e) =>
                  setSite((prev) => ({
                    ...prev,
                    road_address: e.target.value,
                  }))
                }
              />


            </div>

            <div className="h-64">
              <NaverMap
                onSelectPosition={(lat, lng) => {
                  setSite((prev) => ({
                    ...prev,
                    ...region,
                    lat: String(lat),
                    lng: String(lng),
                  }));
                }}
              />
            </div>


          </>
        )}
      </section>

      {/* ================= 버튼 영역 ================= */}
      {!isEditing ? (
        <button
          className="btn-primary w-full"
          onClick={() => {
            setIsEditing(true);
            setManualMode(false);
          }}
        >
          수정하기
        </button>
      ) : (
        <div className="flex gap-3">
          <button
            className="btn-secondary w-full"
            onClick={() => setIsEditing(false)}
            disabled={loading}
          >
            취소
          </button>
          <button
            className="btn-primary w-full"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "저장 중..." : "저장하기"}
          </button>
        </div>
      )}
    </div>
  );
}
