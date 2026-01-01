// /app/company/properties/[id]/facilities/page.tsx
"use client";

import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { FormField } from "@/app/components/FormField";
import PrecisionDateInput from "@/components/ui/PercisionDateInput";

const inputBase =
  "input-basic rounded-md border border-(--oboon-border-default) bg-(--oboon-bg-subtle)/70 px-3 py-2 transition focus:border-(--oboon-accent) focus:outline-none focus:ring-2 focus:ring-(--oboon-accent)/50 w-full";

const labelStrong = "text-sm font-medium text-(--oboon-text-title)";

type DaumPostcodeResult = {
  roadAddress: string;
  jibunAddress: string;
};

type DaumPostcodeConstructor = new (opts: {
  oncomplete: (data: DaumPostcodeResult) => void;
}) => { open: () => void };

type GeoResult = {
  lat: number | null;
  lng: number | null;
  region_1depth: string | null;
  region_2depth: string | null;
  region_3depth: string | null;
};

declare global {
  interface Window {
    daum?: { Postcode: DaumPostcodeConstructor };
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

  /** ✅ YYYY-MM 로 저장 (월 단위) */
  open_start: string | null;
  open_end: string | null;

  is_active: boolean;
  isEditing: boolean;
};

export default function PropertyFacilitiesPage() {
  const supabase = createSupabaseClient();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const propertyId = Number(params.id);

  const [facilities, setFacilities] = useState<FacilityForm[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFacilities = useCallback(
    async (id: number) => {
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
          open_start: f.open_start, // ✅ YYYY-MM 기대
          open_end: f.open_end, // ✅ YYYY-MM 기대
          is_active: f.is_active ?? true,
          isEditing: false,
        }))
      );
    },
    [supabase]
  );

  useEffect(() => {
    if (Number.isNaN(propertyId)) return;
    fetchFacilities(propertyId);
  }, [propertyId, fetchFacilities]);

  function openPostcode(index: number) {
    const Postcode = window.daum?.Postcode;
    if (!Postcode) return;

    new Postcode({
      oncomplete: async (data: DaumPostcodeResult) => {
        const query = data.roadAddress || data.jibunAddress;
        const res = await fetch(
          `/api/geo/address?query=${encodeURIComponent(query)}`
        );
        const geo = (await res.json()) as GeoResult;

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

  function updateField(
    index: number,
    key: keyof FacilityForm,
    value: FacilityForm[keyof FacilityForm]
  ) {
    setFacilities((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [key]: value } : f))
    );
  }

  return (
    <div className="bg-(--oboon-bg-page) px-4 py-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-(--oboon-text-title)">
              홍보시설
            </h1>
            <p className="mt-1 text-sm text-(--oboon-text-muted)">
              모델하우스·홍보관·팝업 등 홍보시설 정보를 입력하세요.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              shape="pill"
              onClick={() => addFacility()}
            >
              시설 추가
            </Button>

            <Button
              variant="secondary"
              size="sm"
              shape="pill"
              onClick={() => router.push(`/company/properties/${propertyId}`)}
            >
              취소
            </Button>
          </div>
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

              <button
                type="button"
                aria-label="삭제"
                onClick={() => deleteFacility(f)}
                disabled={loading}
                className="ml-auto shrink-0 rounded-full p-1.5 text-red-500 hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500/30 disabled:opacity-50"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <FormField label="시설명" labelClassName={labelStrong}>
              <input
                className={inputBase}
                placeholder="시설명"
                disabled={!f.isEditing}
                value={f.name}
                onChange={(e) => updateField(idx, "name", e.target.value)}
              />
            </FormField>

            <FormField label="시설 유형" labelClassName={labelStrong}>
              <select
                className={inputBase}
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
            </FormField>

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
              className={inputBase}
              placeholder="상세 주소"
              disabled={!f.isEditing}
              value={f.address_detail}
              onChange={(e) =>
                updateField(idx, "address_detail", e.target.value)
              }
            />

            {/* ✅ 운영 시작/종료: PrecisionDateInput (월 단위 문자열 YYYY-MM 저장) */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="운영 시작월" labelClassName={labelStrong}>
                <PrecisionDateInput
                  value={f.open_start}
                  onChange={(next) => updateField(idx, "open_start", next)}
                  disabled={!f.isEditing}
                  policy="monthOnly"
                  inputClassName={inputBase}
                  placeholder="예) 2026-01"
                />
              </FormField>

              <FormField label="운영 종료월" labelClassName={labelStrong}>
                <PrecisionDateInput
                  value={f.open_end}
                  onChange={(next) => updateField(idx, "open_end", next)}
                  disabled={!f.isEditing}
                  policy="monthOnly"
                  inputClassName={inputBase}
                  placeholder="예) 2026-03"
                />
              </FormField>
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
                    onClick={() => updateField(idx, "isEditing", false)}
                    disabled={loading}
                  >
                    취소
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
                <Button
                  variant="secondary"
                  size="sm"
                  shape="pill"
                  onClick={() => updateField(idx, "isEditing", true)}
                  disabled={loading}
                >
                  수정
                </Button>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
