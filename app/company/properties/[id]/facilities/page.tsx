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

type FacilityType = "MODELHOUSE" | "PROMOTION" | "POPUP";

type FacilityForm = {
  id?: number;
  type: FacilityType;
  name: string;
  road_address: string;
  jibun_address: string;
  address_detail: string;
  lat: number | null;
  lng: number | null;
  region_1depth: string | null;
  region_2depth: string | null;
  region_3depth: string | null;
  open_start: string | null;
  open_end: string | null;
  is_active: boolean;
  isEditing: boolean;
};

export default function PropertyFacilitiesPage() {
  const supabase = createSupabaseClient();
  const params = useParams();
  const router = useRouter();
  const propertyId = Number(params.id);

  const [facilities, setFacilities] = useState<FacilityForm[]>([]);
  const [loading, setLoading] = useState(false);

  /* ===============================
     초기 로드
  =============================== */
  useEffect(() => {
    if (!params?.id) return;
    const id = Number(params.id);
    if (Number.isNaN(id)) return;
    fetchFacilities(id);
  }, [params?.id]);

  async function fetchFacilities(id: number) {
    const { data, error } = await supabase
      .from("property_facilities")
      .select("*")
      .eq("properties_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setFacilities(
      data.map((f) => ({
        id: f.id,
        type: f.type,
        name: f.name ?? "",
        road_address: f.road_address ?? "",
        jibun_address: f.jibun_address ?? "",
        address_detail: f.address_detail ?? "",
        lat: f.lat,
        lng: f.lng,
        region_1depth: f.region_1depth,
        region_2depth: f.region_2depth,
        region_3depth: f.region_3depth,
        open_start: f.open_start,
        open_end: f.open_end,
        is_active: f.is_active ?? true,
        isEditing: false,
      }))
    );
  }

  /* ===============================
     주소 검색
  =============================== */
  function openPostcode(index: number) {
    new window.daum.Postcode({
      oncomplete: async (data: any) => {
        const query = data.roadAddress || data.jibunAddress;
        const res = await fetch(
          `/api/geo/address?query=${encodeURIComponent(query)}`
        );
        const geo = await res.json();

        setFacilities((prev) =>
          prev.map((f, i) =>
            i === index
              ? {
                  ...f,
                  road_address: data.roadAddress,
                  jibun_address: data.jibunAddress,
                  lat: geo.lat,
                  lng: geo.lng,
                  region_1depth: geo.region_1depth,
                  region_2depth: geo.region_2depth,
                  region_3depth: geo.region_3depth,
                }
              : f
          )
        );
      },
    }).open();
  }

  /* ===============================
     시설 추가
  =============================== */
  function addFacility() {
    setFacilities((prev) => [
      ...prev,
      {
        type: "MODELHOUSE",
        name: "",
        road_address: "",
        jibun_address: "",
        address_detail: "",
        lat: null,
        lng: null,
        region_1depth: null,
        region_2depth: null,
        region_3depth: null,
        open_start: null,
        open_end: null,
        is_active: true,
        isEditing: true,
      },
    ]);
  }

  /* ===============================
     저장
  =============================== */
  async function saveFacility(f: FacilityForm) {
    if (loading) return;

    if (!f.name.trim()) {
      alert("시설명을 입력해주세요.");
      return;
    }
    if (!f.road_address) {
      alert("주소를 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        properties_id: propertyId,
        type: f.type,
        name: f.name,
        road_address: f.road_address,
        jibun_address: f.jibun_address,
        address_detail: f.address_detail,
        lat: f.lat,
        lng: f.lng,
        region_1depth: f.region_1depth,
        region_2depth: f.region_2depth,
        region_3depth: f.region_3depth,
        open_start: f.open_start,
        open_end: f.open_end,
        is_active: f.is_active,
      };

      const { error } = f.id
        ? await supabase
            .from("property_facilities")
            .update(payload)
            .eq("id", f.id)
        : await supabase.from("property_facilities").insert(payload);

      if (error) {
        alert(error.message);
        return;
      }

      await fetchFacilities(propertyId);
      alert("저장되었습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteFacility(f: FacilityForm) {
    if (f.id) {
      await supabase.from("property_facilities").delete().eq("id", f.id);
    }
    setFacilities((prev) => prev.filter((x) => x !== f));
  }

  function updateField(index: number, key: keyof FacilityForm, value: any) {
    setFacilities((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [key]: value } : f))
    );
  }

  /* ===============================
     UI
  =============================== */
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 bg-slate-50 dark:bg-black">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/company/properties/${propertyId}`)}
          className="text-sm text-slate-500 dark:text-slate-400 hover:underline"
        >
          ← 뒤로가기
        </button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          🏠 홍보시설
        </h1>
      </div>

      {facilities.map((f, idx) => (
        <section
          key={idx}
          className="rounded-lg border p-4 space-y-3
            bg-white dark:bg-slate-900
            border-slate-200 dark:border-slate-700"
        >
          <label className="text-sm text-slate-500 dark:text-slate-400">
            홍보시설 이름
          </label>
          <input
            className="input-basic"
            disabled={!f.isEditing}
            value={f.name}
            onChange={(e) => updateField(idx, "name", e.target.value)}
          />

          <label className="text-sm text-slate-500 dark:text-slate-400">
            홍보시설 유형
          </label>
          <select
            className="input-basic"
            disabled={!f.isEditing}
            value={f.type}
            onChange={(e) =>
              updateField(idx, "type", e.target.value as FacilityType)
            }
          >
            <option value="MODELHOUSE">모델하우스</option>
            <option value="PROMOTION">홍보관</option>
            <option value="POPUP">팝업</option>
          </select>

          {f.road_address && (
            <AddressBox
              roadAddress={f.road_address}
              jibunAddress={f.jibun_address}
            />
          )}

          <button
            className={`w-full py-2 rounded-lg transition ${
              f.road_address
                ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                : "bg-teal-500 text-white"
            }`}
            disabled={!f.isEditing}
            onClick={() => openPostcode(idx)}
          >
            주소 검색
          </button>

          <input
            className="input-basic"
            placeholder="상세 주소"
            disabled={!f.isEditing}
            value={f.address_detail}
            onChange={(e) => updateField(idx, "address_detail", e.target.value)}
          />

          <div className="flex gap-2">
            <input
              type="date"
              className="input-basic"
              disabled={!f.isEditing}
              value={f.open_start ?? ""}
              onChange={(e) => updateField(idx, "open_start", e.target.value)}
            />
            <input
              type="date"
              className="input-basic"
              disabled={!f.isEditing}
              value={f.open_end ?? ""}
              onChange={(e) => updateField(idx, "open_end", e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              disabled={!f.isEditing}
              checked={f.is_active}
              onChange={(e) => updateField(idx, "is_active", e.target.checked)}
            />
            운영 중
          </label>

          <div className="flex justify-end gap-2 pt-2">
            {f.isEditing ? (
              <>
                <button
                  className="btn-danger"
                  onClick={() => deleteFacility(f)}
                >
                  삭제
                </button>
                <button className="btn-save" onClick={() => saveFacility(f)}>
                  저장
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn-danger"
                  onClick={() => deleteFacility(f)}
                >
                  삭제
                </button>
                <button
                  className="btn-primary"
                  onClick={() => updateField(idx, "isEditing", true)}
                >
                  수정
                </button>
              </>
            )}
          </div>
        </section>
      ))}

      <button className="btn-primary w-full" onClick={addFacility}>
        + 시설 추가
      </button>
    </div>
  );
}
