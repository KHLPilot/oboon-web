"use client";

import { useEffect, useMemo, useState } from "react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { FormField } from "@/components/shared/FormField";
import { showAlert } from "@/shared/alert";
import NaverMap from "@/features/map/components/NaverMap";
import {
  fetchPropertyLocation,
  savePropertyLocation,
} from "@/features/company/services/property.location";

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

export default function LocationEditorCard({
  propertyId,
  onAfterSave,
}: {
  propertyId: number;
  onAfterSave?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [showMapHint, setShowMapHint] = useState(false);
  const [mapHintVisible, setMapHintVisible] = useState(false);
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

  const hasAnyAddress = useMemo(
    () => Boolean(site.road_address || site.jibun_address),
    [site.road_address, site.jibun_address],
  );
  const siteLat = Number(site.lat);
  const siteLng = Number(site.lng);
  const hasMapCoords = Number.isFinite(siteLat) && Number.isFinite(siteLng);
  const locationMarkers = useMemo(
    () =>
      hasMapCoords
        ? [
            {
              id: 1,
              label: "현장 위치",
              lat: siteLat,
              lng: siteLng,
              type: "ready" as const,
              topLabel: null,
              mainLabel: "현장 위치",
            },
          ]
        : [],
    [hasMapCoords, siteLat, siteLng],
  );

  useEffect(() => {
    async function fetchLocation() {
      const { data } = await fetchPropertyLocation(propertyId);
      if (!data) return;
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
    void fetchLocation();
  }, [propertyId]);

  useEffect(() => {
    if (!manualMode) {
      setShowMapHint(false);
      setMapHintVisible(false);
      return;
    }
    setShowMapHint(true);
    requestAnimationFrame(() => setMapHintVisible(true));
    const totalMs = 2000;
    const fadeMs = 300;
    const t1 = window.setTimeout(() => setMapHintVisible(false), totalMs - fadeMs);
    const t2 = window.setTimeout(() => setShowMapHint(false), totalMs);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [manualMode]);

  function openPostcode() {
    const Postcode = window.daum?.Postcode;
    if (!Postcode) return;

    new Postcode({
      oncomplete: async (data: DaumPostcodeResult) => {
        const query = data.roadAddress || data.jibunAddress;
        const res = await fetch(`/api/geo/address?query=${encodeURIComponent(query)}`);
        const geo = (await res.json()) as GeoResult;
        setSite((prev) => ({
          ...prev,
          road_address: data.roadAddress ?? "",
          jibun_address: data.jibunAddress ?? "",
          lat: geo.lat ?? "",
          lng: geo.lng ?? "",
          region_1depth: geo.region_1depth ?? "",
          region_2depth: geo.region_2depth ?? "",
          region_3depth: geo.region_3depth ?? "",
        }));
      },
    }).open();
  }

  async function handleSave() {
    if (!site.lat || !site.lng) {
      showAlert("주소를 검색하거나 지도에서 위치를 선택해주세요.");
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
      const { data, error } = await savePropertyLocation(propertyId, payload, isEdit);
      if (error) throw error;
      if (!data) {
        throw new Error("저장 권한이 없거나 수정할 위치 정보를 찾을 수 없습니다.");
      }
      showAlert("저장되었습니다.");
      onAfterSave?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      showAlert("저장 실패: " + message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="ob-typo-h3 text-(--oboon-text-title)">현장 위치 입력</div>
          {!isEditing ? (
            <Button
              variant={hasAnyAddress ? "secondary" : "primary"}
              size="sm"
              shape="pill"
              onClick={() => {
                setIsEditing(true);
                setManualMode(false);
              }}
            >
              {hasAnyAddress ? "편집" : "추가"}
            </Button>
          ) : null}
        </div>

        <div className="mt-3">
          {hasAnyAddress ? (
            <div className="space-y-1 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-2">
              <div className="ob-typo-caption text-(--oboon-text-muted)">도로명주소</div>
              <div className="ob-typo-body text-(--oboon-text-title)">{site.road_address || "-"}</div>
              {site.jibun_address ? (
                <div className="ob-typo-caption text-(--oboon-text-muted)">{site.jibun_address}</div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-2">
              <div className="ob-typo-body text-(--oboon-text-muted)">아직 위치가 등록되지 않았습니다.</div>
            </div>
          )}
        </div>

        {!manualMode && hasMapCoords ? (
          <div className="mt-4 space-y-2">
            <p className="ob-typo-caption text-(--oboon-text-muted)">지도 위치</p>
            <div className="h-64 overflow-hidden rounded-xl border border-(--oboon-border-default)">
              <NaverMap mode="base" markers={locationMarkers} fitToMarkers initialZoom={16} interactive={false} />
            </div>
          </div>
        ) : null}

        {!manualMode && (isEditing || !hasAnyAddress) ? (
          <div className="mt-4 flex flex-col gap-2">
            <Button
              variant="secondary"
              size="md"
              shape="pill"
              className="w-full justify-center"
              onClick={() => {
                setIsEditing(true);
                setManualMode(false);
                openPostcode();
              }}
            >
              주소 검색
            </Button>
            <Button
              variant="secondary"
              size="md"
              shape="pill"
              className="w-full justify-center"
              onClick={() => {
                setIsEditing(true);
                setManualMode(true);
              }}
            >
              직접 위치 등록
            </Button>
          </div>
        ) : null}

        {manualMode ? (
          <div className="mt-4 space-y-4">
            <Button
              variant="secondary"
              size="md"
              shape="pill"
              className="w-full justify-center"
              onClick={() => setManualMode(false)}
            >
              돌아가기
            </Button>

            <div className="relative h-64 overflow-hidden rounded-xl border border-(--oboon-border-default)">
              {showMapHint ? (
                <div
                  className={[
                    "absolute inset-0 z-10 flex items-center justify-center",
                    "backdrop-blur-sm pointer-events-none",
                    "transition-opacity duration-300 ease-out",
                    mapHintVisible ? "opacity-100" : "opacity-0",
                  ].join(" ")}
                  style={{ background: "var(--oboon-overlay)" }}
                >
                  <span className="ob-typo-body text-(--oboon-text-title)">지도에 위치를 찍어주세요.</span>
                </div>
              ) : null}

              <NaverMap
                mode="select"
                onSelectPosition={async (lat, lng) => {
                  setMapHintVisible(false);
                  window.setTimeout(() => setShowMapHint(false), 300);
                  setSite((prev) => ({ ...prev, lat: String(lat), lng: String(lng) }));
                  try {
                    const res = await fetch(`/api/geo/reverse?lat=${lat}&lng=${lng}`);
                    if (!res.ok) throw new Error(String(res.status));
                    const geo = await res.json();
                    setSite((prev) => ({
                      ...prev,
                      region_1depth: geo.region_1depth ?? "",
                      region_2depth: geo.region_2depth ?? "",
                      region_3depth: geo.region_3depth ?? "",
                    }));
                  } catch {
                    // no-op
                  }
                }}
              />
            </div>

            <FormField label="행정구역">
              <Input
                readOnly
                placeholder="지도에서 위치를 클릭하세요"
                value={[site.region_1depth, site.region_2depth, site.region_3depth].filter(Boolean).join(" ")}
                className="bg-(--oboon-bg-subtle)"
              />
            </FormField>

            <FormField label="상세주소">
              <Input
                placeholder="예: ○○아파트 인근"
                value={site.temp_address}
                onChange={(e) => setSite((prev) => ({ ...prev, temp_address: e.target.value }))}
              />
            </FormField>
          </div>
        ) : null}
      </Card>

      {isEditing ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="secondary"
            size="md"
            shape="pill"
            className="w-full justify-center"
            onClick={() => {
              setIsEditing(false);
              setManualMode(false);
            }}
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
      ) : null}
    </div>
  );
}
