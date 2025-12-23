// /app/company/properties/[id]/location/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { createSupabaseClient } from "@/lib/supabaseClient";

type LocationForm = {
  road_address: string;
  jibun_address: string;
  lat: string;
  lng: string;
  region_1depth: string;
  region_2depth: string;
  region_3depth: string;
};

export default function PropertyLocationPage() {
  const supabase = createSupabaseClient();
  const params = useParams();
  const router = useRouter();
  const propertyId = Number(params.id);

  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false); // DB에 기존 데이터 여부
  const [isEditing, setIsEditing] = useState(false); // 편집 모드

  const [site, setSite] = useState<LocationForm>({
    road_address: "",
    jibun_address: "",
    lat: "",
    lng: "",
    region_1depth: "",
    region_2depth: "",
    region_3depth: "",
  });

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

  return (
    <div className="bg-(--oboon-bg-page) px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        {/* 헤더 */}
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <div className="space-y-1 pt-1">
              <p className="text-2xl font-bold text-(--oboon-text-title)">
                현장 위치
              </p>
              <p className="text-sm text-(--oboon-text-muted)">
                주소를 등록하고 지도에 표시해요
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              shape="pill"
              className="text-red-500"
              onClick={() => router.push(`/company/properties/${propertyId}`)}
            >
              취소
            </Button>
          </div>
        </header>

        {/* 현장 위치 카드 */}
        <section className="space-y-4 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-6 shadow-(--oboon-shadow-card)/30">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-(--oboon-text-title)">
              현장 위치 입력
            </h2>
            {!isEditing ? (
              <Button
                variant="secondary"
                size="sm"
                shape="pill"
                onClick={() => setIsEditing(true)}
              >
                편집
              </Button>
            ) : null}
          </div>

          <div className="rounded-lg bg-(--oboon-bg-subtle)/60 px-3 py-2 text-sm text-(--oboon-text-title)">
            {site.road_address || "주소가 입력되지 않았습니다"}
          </div>

          {isEditing && (
            <Button
              variant="secondary"
              size="sm"
              shape="pill"
              className="w-full justify-center"
              onClick={openPostcode}
            >
              주소 검색
            </Button>
          )}
        </section>

        {/* 버튼 영역 */}
        {isEditing ? (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="secondary"
              size="sm"
              shape="pill"
              className="w-full justify-center"
              onClick={() => setIsEditing(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button
              variant="primary"
              size="sm"
              shape="pill"
              className="w-full justify-center"
              onClick={handleSave}
              loading={loading}
            >
              저장하기
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
