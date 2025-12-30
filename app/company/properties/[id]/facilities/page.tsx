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

const supabase = createSupabaseClient();

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
  open_start: string | null; // yyyy-mm
  open_end: string | null;   // yyyy-mm
  is_active: boolean;
  isEditing: boolean;
};

/* yyyy-mm formatter */
function formatYearMonth(raw: string) {
  let v = raw.replace(/\D/g, "");
  if (v.length > 6) v = v.slice(0, 6);
  if (v.length <= 4) return v;

  const year = v.slice(0, 4);
  let month = v.slice(4, 6);

  if (month.length === 1 && Number(month) > 1) {
    month = `0${month}`;
  }
  if (month.length === 2) {
    const m = Number(month);
    if (m < 1) month = "01";
    if (m > 12) month = "12";
  }

  return `${year}-${month}`;
}

export default function PropertyFacilitiesPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = Number(params.id);

  const [facilities, setFacilities] = useState<FacilityForm[]>([]);
  const [loading, setLoading] = useState(false);

  /* ===============================
     초기 로드
  =============================== */
  useEffect(() => {
    if (!Number.isFinite(propertyId)) return;
    fetchFacilities(propertyId);
  }, [propertyId]);

  async function fetchFacilities(id: number) {
    const { data, error } = await supabase
      .from("property_facilities")
      .select("*")
      .eq("properties_id", id)
      .order("created_at", { ascending: true });

    if (error) return console.error(error);

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
     CRUD
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

  async function saveFacility(f: FacilityForm) {
    if (loading) return;
    if (!f.name.trim()) return alert("시설명을 입력해주세요.");
    if (!f.road_address) return alert("주소를 입력해주세요.");

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
        ? await supabase.from("property_facilities").update(payload).eq("id", f.id)
        : await supabase.from("property_facilities").insert(payload);

      if (error) throw error;
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
    <div className="max-w-3xl mx-auto px-6 pt-8 pb-40 bg-slate-50">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push(`/company/properties/${propertyId}`)}
          className="text-sm text-slate-500 hover:underline"
        >
          ← 뒤로가기
        </button>
        <h1 className="text-xl font-bold text-slate-900">🏠 홍보시설</h1>
      </div>

      {facilities.map((f, idx) => (
        <section
          key={idx}
          className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
        >
          <Field label="홍보시설 이름">
            <input
              className={inputClass}
              disabled={!f.isEditing}
              value={f.name}
              onChange={(e) => updateField(idx, "name", e.target.value)}
            />
          </Field>

          <Field label="홍보시설 유형">
            <select
              className={selectClass}
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
          </Field>

          {f.road_address && (
            <AddressBox
              roadAddress={f.road_address}
              jibunAddress={f.jibun_address}
            />
          )}

          <button
            className={`w-full py-2 rounded-lg text-sm font-medium ${f.road_address
                ? "bg-slate-200 text-slate-700"
                : "bg-emerald-600 text-white"
              }`}
            disabled={!f.isEditing}
            onClick={() => openPostcode(idx)}
          >
            주소 검색
          </button>

          <Field label="상세 주소">
            <input
              className={inputClass}
              disabled={!f.isEditing}
              value={f.address_detail}
              onChange={(e) =>
                updateField(idx, "address_detail", e.target.value)
              }
            />
          </Field>

          {/* yyyy-mm 직접 입력 */}
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              className={inputClass}
              placeholder="yyyy-mm"
              disabled={!f.isEditing}
              value={f.open_start ?? ""}
              onChange={(e) =>
                updateField(idx, "open_start", formatYearMonth(e.target.value))
              }
            />
            <input
              type="text"
              className={inputClass}
              placeholder="yyyy-mm"
              disabled={!f.isEditing}
              value={f.open_end ?? ""}
              onChange={(e) =>
                updateField(idx, "open_end", formatYearMonth(e.target.value))
              }
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              disabled={!f.isEditing}
              checked={f.is_active}
              onChange={(e) =>
                updateField(idx, "is_active", e.target.checked)
              }
            />
            운영 중
          </label>

          <div className="flex justify-end gap-2 pt-2">
            {f.isEditing ? (
              <>
                <button className="btn-danger" onClick={() => deleteFacility(f)}>
                  삭제
                </button>
                <button className="btn-save" onClick={() => saveFacility(f)}>
                  저장
                </button>
              </>
            ) : (
              <>
                <button className="btn-danger" onClick={() => deleteFacility(f)}>
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

      <button className="btn-primary w-full mt-6" onClick={addFacility}>
        + 시설 추가
      </button>
    </div>
  );
}

/* ===============================
   UI Helpers
=============================== */

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-white text-slate-900 " +
  "border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 " +
  "disabled:bg-slate-100 disabled:text-slate-500";

const selectClass = inputClass;

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <p className="text-sm font-medium text-slate-700">{label}</p>
    {children}
  </div>
);
