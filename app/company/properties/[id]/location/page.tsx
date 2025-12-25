"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";
import AddressBox from "app/components/AddressBox";

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
        ${
          isEditing
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
        {isEditing && (
          <button className="btn-secondary w-full" onClick={openPostcode}>
            주소 검색
          </button>
        )}
      </section>

      {/* ================= 버튼 영역 ================= */}
      {!isEditing ? (
        <button
          className="btn-primary w-full"
          onClick={() => setIsEditing(true)}
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
