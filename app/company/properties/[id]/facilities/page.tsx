// /app/company/properties/[id]/facilities/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { createSupabaseClient } from "@/lib/supabaseClient";

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

  return (
    <div className="bg-(--oboon-bg-page) px-4 py-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/company/properties/${propertyId}`)}
            className="text-sm text-(--oboon-text-muted) hover:underline"
          >
            ← 뒤로가기
          </button>
          <h1 className="text-xl font-bold text-(--oboon-text-title)">
            홍보시설
          </h1>
        </div>

        {facilities.map((f, idx) => (
          <section
            key={idx}
            className={[
              "space-y-3 rounded-2xl border p-4",
              "bg-(--oboon-bg-surface)",
              "border-(--oboon-border-default)",
              "shadow-none md:shadow-sm",
            ].join(" ")}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="status" className="text-[12px]">
                  {f.type === "MODELHOUSE"
                    ? "모델하우스"
                    : f.type === "PROMOTION"
                    ? "홍보관"
                    : "팝업"}
                </Badge>
                <span className="text-sm text-(--oboon-text-muted)">
                  {f.is_active ? "운영 중" : "미운영"}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  shape="pill"
                  onClick={() => deleteFacility(f)}
                  disabled={loading}
                >
                  삭제
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  shape="pill"
                  onClick={() => updateField(idx, "isEditing", !f.isEditing)}
                >
                  {f.isEditing ? "수정 중" : "수정"}
                </Button>
              </div>
            </div>

            <Field label="시설명">
              <input
                className="input-basic"
                disabled={!f.isEditing}
                value={f.name}
                onChange={(e) => updateField(idx, "name", e.target.value)}
              />
            </Field>

            <Field label="시설 유형">
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
            </Field>

            {f.road_address && (
              <div className="space-y-1 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-2">
                <div className="text-xs text-(--oboon-text-muted)">
                  도로명주소
                </div>
                <div className="text-sm font-medium text-(--oboon-text-title)">
                  {f.road_address}
                </div>
                {f.jibun_address && (
                  <div className="text-xs text-(--oboon-text-muted)">
                    {f.jibun_address}
                  </div>
                )}
              </div>
            )}

            <Button
              variant="secondary"
              size="md"
              shape="pill"
              className="w-full justify-center"
              disabled={!f.isEditing}
              onClick={() => openPostcode(idx)}
            >
              주소 검색
            </Button>

            <input
              className="input-basic"
              placeholder="상세 주소"
              disabled={!f.isEditing}
              value={f.address_detail}
              onChange={(e) =>
                updateField(idx, "address_detail", e.target.value)
              }
            />

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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

            <label className="flex items-center gap-2 text-sm text-(--oboon-text-body)">
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
                  <Button
                    variant="secondary"
                    size="sm"
                    shape="pill"
                    onClick={() => deleteFacility(f)}
                    disabled={loading}
                  >
                    삭제
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    shape="pill"
                    onClick={() => saveFacility(f)}
                    disabled={loading}
                  >
                    저장
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    shape="pill"
                    onClick={() => deleteFacility(f)}
                    disabled={loading}
                  >
                    삭제
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    shape="pill"
                    onClick={() => updateField(idx, "isEditing", true)}
                  >
                    수정
                  </Button>
                </>
              )}
            </div>
          </section>
        ))}

        <Button
          variant="primary"
          size="md"
          shape="pill"
          className="w-full justify-center"
          onClick={addFacility}
        >
          + 시설 추가
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="text-sm font-medium text-(--oboon-text-title)">
        {label}
      </div>
      {children}
    </div>
  );
}
