// app/company/properties/[id]/location/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { createSupabaseClient } from "@/lib/supabaseClient";
import NaverMap from "@/features/map/NaverMap";

type LocationForm = {
  road_address: string;
  jibun_address: string;
  lat: string;
  lng: string;
  region_1depth: string;
  region_2depth: string;
  region_3depth: string;
};

type LocationFormWithTemp = LocationForm & {
  temp_address: string;
};

type DaumPostcodeResult = {
  roadAddress: string;
  jibunAddress: string;
};

type DaumPostcodeConstructor = new (opts: {
  oncomplete: (data: DaumPostcodeResult) => void;
}) => { open: () => void };

type GeoResult = {
  lat: string;
  lng: string;
  region_1depth: string;
  region_2depth: string;
  region_3depth: string;
};

declare global {
  interface Window {
    daum?: { Postcode: DaumPostcodeConstructor };
  }
}

export default function PropertyLocationPage() {
  const supabase = createSupabaseClient();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const propertyId = Number(params.id);

  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [hasSelectedPosition, setHasSelectedPosition] = useState(false);

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

  function openPostcode() {
    if (!isEditing) return;

    const Postcode = window.daum?.Postcode;
    if (!Postcode) return;

    new Postcode({
      oncomplete: async function (data: DaumPostcodeResult) {
        const query = data.roadAddress || data.jibunAddress;

        const res = await fetch(
          `/api/geo/address?query=${encodeURIComponent(query)}`
        );
        const geo = (await res.json()) as GeoResult;

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

  async function handleSave() {
    if (!site.lat || !site.lng) {
      alert("주소를 검색하거나 지도에서 위치를 선택해주세요.");
      return;
    }

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      alert("저장 실패: " + message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-(--oboon-bg-page) px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
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
              onClick={() => router.push(`/company/properties/${propertyId}`)}
            >
              취소
            </Button>
          </div>
        </header>

        <section className="space-y-4 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-6 shadow-(--oboon-shadow-card)/30">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-(--oboon-text-title)">
              현장 위치 입력
            </h2>
            {!isEditing && (
              <Button
                variant="secondary"
                size="sm"
                shape="pill"
                onClick={() => {
                  setIsEditing(true);
                  setManualMode(false);
                }}
              >
                편집
              </Button>
            )}
          </div>

          {site.road_address ? (
            <div className="space-y-1 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-2">
              <div className="text-xs text-(--oboon-text-muted)">
                도로명주소
              </div>
              <div className="text-sm font-medium text-(--oboon-text-title)">
                {site.road_address}
              </div>
              {site.jibun_address && (
                <div className="text-xs text-(--oboon-text-muted)">
                  {site.jibun_address}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg bg-(--oboon-bg-subtle)/60 px-3 py-2 text-sm text-(--oboon-text-muted)">
              주소가 입력되지 않았습니다
            </div>
          )}

          {isEditing && !manualMode && (
            <>
              <Button
                variant="secondary"
                size="md"
                shape="pill"
                className="w-full justify-center"
                onClick={openPostcode}
              >
                주소 검색
              </Button>
              <Button
                variant="secondary"
                size="md"
                shape="pill"
                className="w-full justify-center"
                onClick={() => setManualMode(true)}
              >
                직접 위치 등록
              </Button>
            </>
          )}

          {isEditing && manualMode && (
            <>
              <Button
                variant="secondary"
                size="md"
                shape="pill"
                className="w-full justify-center"
                onClick={() => setManualMode(false)}
              >
                돌아가기
              </Button>

              <div className="h-64 relative rounded-xl overflow-hidden border border-(--oboon-border-default)">
                {!hasSelectedPosition && (
                  <div
                    className="absolute inset-0 z-10 flex items-center justify-center text-sm font-medium bg-white/50 backdrop-blur pointer-events-none"
                    style={{ color: "var(--oboon-text-body)" }}
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
                <label className="text-xs font-medium text-(--oboon-text-body)">
                  행정구역
                </label>
                <input
                  className="w-full rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-4 py-3 text-sm"
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
                <label className="text-xs font-medium text-(--oboon-text-body)">
                  상세주소
                </label>
                <input
                  className="w-full rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-4 py-3 text-sm"
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

        {isEditing && (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="secondary"
              size="md"
              shape="pill"
              className="w-full justify-center"
              onClick={() => setIsEditing(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button
              variant="primary"
              size="md"
              shape="pill"
              className="w-full justify-center"
              onClick={handleSave}
              loading={loading}
            >
              저장하기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
