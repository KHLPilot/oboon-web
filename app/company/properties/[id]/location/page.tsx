"use client";

import { useEffect, useState } from "react";
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

// DB 저장용
type LocationForm = {
  road_address: string;
  jibun_address: string;
  lat: string;
  lng: string;
  region_1depth: string;
  region_2depth: string;
  region_3depth: string;
};

// UI 전용 (상세주소 포함)
type LocationFormWithTemp = LocationForm & {
  temp_address: string;
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
  const [isEdit, setIsEdit] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  const [site, setSite] = useState<LocationFormWithTemp>({
    road_address: "",
    jibun_address: "",
    lat: "",
    lng: "",
    region_1depth: "",
    region_2depth: "",
    region_3depth: "",
    temp_address: "",
  });

  const [hasSelectedPosition, setHasSelectedPosition] = useState(false);

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
        setSite((prev) => ({
          ...prev,
          road_address: data.road_address ?? "",
          jibun_address: data.jibun_address ?? "",
          lat: data.lat ?? "",
          lng: data.lng ?? "",
          region_1depth: data.region_1depth ?? "",
          region_2depth: data.region_2depth ?? "",
          region_3depth: data.region_3depth ?? "",
        }));
        setIsEdit(true);
      }
    }

    fetchLocation();
  }, [propertyId, supabase]);

  /* ==================================================
     주소 검색 (카카오)
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

        setSite((prev) => ({
          ...prev,
          road_address: data.roadAddress,
          jibun_address: data.jibunAddress,
          lat: geo.lat,
          lng: geo.lng,
          region_1depth: geo.region_1depth,
          region_2depth: geo.region_2depth,
          region_3depth: geo.region_3depth,
        }));
      },
    }).open();
  }

  /* ==================================================
     저장
  ================================================== */
  async function handleSave() {
    if (!site.lat || !site.lng) {
      alert("지도에서 위치를 선택해주세요.");
      return;
    }

    // 행정구역 + 상세주소 → road_address로 합침
    const composedRoadAddress = [
      site.region_1depth,
      site.region_2depth,
      site.region_3depth,
      site.temp_address,
    ]
      .filter(Boolean)
      .join(" ");

    const payload: LocationForm = {
      road_address: composedRoadAddress || site.road_address,
      jibun_address: site.jibun_address,
      lat: site.lat,
      lng: site.lng,
      region_1depth: site.region_1depth,
      region_2depth: site.region_2depth,
      region_3depth: site.region_3depth,
    };

    setLoading(true);

    try {
      if (isEdit) {
        await supabase
          .from("property_locations")
          .update(payload)
          .eq("properties_id", propertyId);
      } else {
        await supabase.from("property_locations").insert({
          ...payload,
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
    <div className="p-6 max-w-3xl mx-auto space-y-6 bg-slate-50 dark:bg-black">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/company/properties/${propertyId}`)}
          className="text-sm text-slate-500 hover:underline"
        >
          ← 뒤로가기
        </button>
        <h1 className="text-xl font-bold">📍 현장 위치</h1>
      </div>

      <section className="space-y-4 rounded p-4 bg-white border">
        <h2 className="font-semibold">현장 위치</h2>

        {site.road_address ? (
          <AddressBox
            roadAddress={site.road_address}
            jibunAddress={site.jibun_address}
          />
        ) : (
          <div className="text-sm text-slate-500">
            도로명주소가 입력되지 않았습니다
          </div>
        )}

        {isEditing && !manualMode && (
          <>
            <button className="btn-secondary w-full" onClick={openPostcode}>
              주소 검색
            </button>
            <button
              className="btn-secondary w-full"
              onClick={() => setManualMode(true)}
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
            >
              돌아가기
            </button>

            <div className="h-64 relative">
              {!hasSelectedPosition && (
                <div
                  className="
        absolute inset-0
        flex items-center justify-center
        pointer-events-none
        text-sm font-medium
        text-slate-600
        bg-white/40
        backdrop-blur-[1px]
        z-10
      "
                >
                  지도에 위치를 찍어주세요.
                </div>
              )}

              <NaverMap
                onSelectPosition={async (lat, lng) => {
                  const res = await fetch(
                    `/api/geo/reverse?lat=${lat}&lng=${lng}`
                  );
                  const geo = await res.json();

                  setSite((prev) => ({
                    ...prev,
                    lat: String(lat),
                    lng: String(lng),
                    region_1depth: geo.region_1depth,
                    region_2depth: geo.region_2depth,
                    region_3depth: geo.region_3depth,
                  }));

                  setHasSelectedPosition(true);
                }}
              />
            </div>


            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                행정구역
              </label>

              <input
                className="input-basic bg-slate-100"
                readOnly
                placeholder="지도에서 위치를 클릭하세요"
                value={[
                  site.region_1depth,
                  site.region_2depth,
                  site.region_3depth,
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                상세주소
              </label>

              <input
                className="input-basic"
                placeholder="예: ○○아파트 인근"
                value={site.temp_address}
                onChange={(e) =>
                  setSite((prev) => ({
                    ...prev,
                    temp_address: e.target.value,
                  }))
                }
              />
            </div>

          </>
        )}
      </section>

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
