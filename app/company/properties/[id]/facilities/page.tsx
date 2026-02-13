// app/company/properties/[id]/facilities/page.tsx
"use client";

import { ChevronDown, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import PageContainer from "@/components/shared/PageContainer";
import { Badge } from "@/components/ui/Badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";

import { deletePropertyFacility, fetchPropertyFacilities, savePropertyFacility } from "@/features/company/services/property.facilities";
import { validateRequiredOrShowModal } from "@/shared/validationMessage";
import { FormField } from "@/components/shared/FormField";
import { showAlert } from "@/shared/alert";
import OboonDatePicker from "@/components/ui/DatePicker";
import NaverMap from "@/features/map/components/NaverMap";
import { useRequirePropertyEditAccess } from "@/features/company/hooks/useRequirePropertyEditAccess";
import { toKoreanErrorMessage } from "@/shared/errorMessage";

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
  manualMode: boolean;
  hasSelectedPosition?: boolean;
};

function facilityTypeLabel(t: FacilityType) {
  return t === "MODELHOUSE"
    ? "모델하우스"
    : t === "PROMOTION"
      ? "홍보관"
      : "팝업";
}

const FACILITY_TYPE_OPTIONS: Array<{ value: FacilityType; label: string }> = [
  { value: "MODELHOUSE", label: "모델하우스" },
  { value: "PROMOTION", label: "홍보관" },
  { value: "POPUP", label: "팝업" },
];

function parseYmToLocalDate(ym: string | null | undefined): Date | null {
  if (!ym) return null;
  const m = /^(\d{4})-(\d{2})/.exec(ym.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!year || month < 1 || month > 12) return null;
  return new Date(year, month - 1, 1);
}

function formatLocalDateToYm(date: Date | null): string | null {
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

// Input과 같은 룩을 select에도 맞추기 위한 토큰 기반 클래스
const CONTROL_LIKE = [
  "w-full",
  "",
  "h-11",
  "rounded-xl",
  "border border-(--oboon-border-default)",
  "bg-(--oboon-bg-surface)",
  "px-4",
  "ob-typo-body text-(--oboon-text-title)",
  "placeholder:text-(--oboon-text-muted)",
  "transition",
  "focus:outline-none focus:ring-2 focus:ring-(--oboon-accent)/40 focus:border-(--oboon-accent)",
  "disabled:opacity-50 disabled:cursor-not-allowed",
].join(" ");

function FacilityMapSelect({
  enabled,
  hasSelectedPosition,
  onSelectPosition,
}: {
  enabled: boolean;
  hasSelectedPosition: boolean;
  onSelectPosition: (lat: number, lng: number) => Promise<void> | void;
}) {
  const [showHint, setShowHint] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // manual mode 진입 시: 2초 노출 → 300ms fade → 제거
    requestAnimationFrame(() => setShowHint(true));
    requestAnimationFrame(() => setHintVisible(true));

    const fadeMs = 300;
    const totalMs = 2000;

    const t1 = window.setTimeout(() => setHintVisible(false), totalMs - fadeMs);
    const t2 = window.setTimeout(() => setShowHint(false), totalMs);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [enabled]);

  return (
    <div className="space-y-2">
      <div className="relative h-64 overflow-hidden rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)">
        {/* ✅ 2초 후 자동 페이드아웃 오버레이 (선택 여부와 무관) */}
        {enabled && showHint ? (
          <div
            className={[
              "absolute inset-0 z-10 flex items-center justify-center",
              "pointer-events-none backdrop-blur-sm",
              "transition-opacity duration-300 ease-out",
              hintVisible ? "opacity-100" : "opacity-0",
            ].join(" ")}
            style={{ background: "var(--oboon-overlay)" }}
          >
            <span className="ob-typo-body text-(--oboon-text-title)">
              지도에 위치를 찍어주세요.
            </span>
          </div>
        ) : null}

        {/* 지도 */}
        <NaverMap
          mode="select"
          onSelectPosition={async (lat, lng) => {
            // 클릭 시에도(원하면) 빠르게 제거되도록
            setHintVisible(false);
            window.setTimeout(() => setShowHint(false), 300);

            await onSelectPosition(lat, lng);
          }}
        />
      </div>

      {!hasSelectedPosition ? (
        <p className="ob-typo-caption text-(--oboon-text-muted)">
          지도에서 위치를 선택하면 주소/행정구역이 자동으로 채워집니다.
        </p>
      ) : null}
    </div>
  );
}

export default function PropertyFacilitiesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const propertyId = Number(params.id);
  const { loading: accessLoading, allowed: canAccessProperty } =
    useRequirePropertyEditAccess(propertyId);

  const [facilities, setFacilities] = useState<FacilityForm[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFacilities = useCallback(
    async (id: number) => {
      const { data, error } = await fetchPropertyFacilities(id);

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
          manualMode: false,
          hasSelectedPosition: Boolean(f.lat && f.lng),
        })),
      );
    },
    [],
  );

  useEffect(() => {
    if (accessLoading || !canAccessProperty) return;
    if (Number.isNaN(propertyId)) return;
    fetchFacilities(propertyId);
  }, [accessLoading, canAccessProperty, propertyId, fetchFacilities]);

  const countText = useMemo(() => {
    if (facilities.length === 0) return "아직 등록된 홍보시설이 없습니다.";
    return `${facilities.length}개 홍보시설이 등록되어 있어요.`;
  }, [facilities.length]);

  function openPostcode(index: number) {
    const Postcode = window.daum?.Postcode as
      | DaumPostcodeConstructor
      | undefined;
    if (!Postcode) return;

    new Postcode({
      oncomplete: async (data: DaumPostcodeResult) => {
        const query = data.roadAddress || data.jibunAddress;
        const res = await fetch(
          `/api/geo/address?query=${encodeURIComponent(query)}`,
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
                  hasSelectedPosition: Boolean(geo.lat && geo.lng),
                }
              : f,
          ),
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
        manualMode: false,
        hasSelectedPosition: false,
      },
    ]);
  }

  async function saveFacility(f: FacilityForm) {
    if (loading) return;

    if (!validateRequiredOrShowModal(f.name, "시설명")) return;

    if (!f.lat || !f.lng) {
      showAlert("주소를 검색하거나 지도에서 위치를 선택해주세요.");
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

      const { data, error } = await savePropertyFacility(payload, f.id);

      if (error) {
        showAlert(toKoreanErrorMessage(error, "저장에 실패했습니다."));
        return;
      }

      if (!data) {
        showAlert("저장 권한이 없거나 수정할 시설을 찾을 수 없습니다.");
        return;
      }

      await fetchFacilities(propertyId);
      showAlert("저장되었습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteFacility(f: FacilityForm) {
    if (f.id) {
      const { data, error } = await deletePropertyFacility(f.id);
      if (error) {
        showAlert(toKoreanErrorMessage(error, "삭제에 실패했습니다."));
        return;
      }
      if (!data) {
        showAlert("삭제 권한이 없거나 삭제할 시설을 찾을 수 없습니다.");
        return;
      }
    }
    setFacilities((prev) => prev.filter((x) => x !== f));
  }

  function updateField<K extends keyof FacilityForm>(
    index: number,
    key: K,
    value: FacilityForm[K],
  ) {
    setFacilities((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [key]: value } : f)),
    );
  }

  if (accessLoading) {
    return (
      <div className="px-4 py-8 ob-typo-body text-(--oboon-text-muted)">
        권한 확인 중...
      </div>
    );
  }

  if (!canAccessProperty) return null;

  return (
    <main className="bg-(--oboon-bg-default)">
      <PageContainer>
        <div className="py-8 md:py-0">
          <div className="flex w-full flex-col gap-6">
            {/* Top */}
            <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="ob-typo-h1 text-(--oboon-text-title)">
                  홍보시설
                </div>
                <p className="mt-1 ob-typo-body text-(--oboon-text-muted)">
                  모델하우스·홍보관·팝업 등 홍보시설 정보를 입력하세요.
                </p>
                <p className="ob-typo-caption text-(--oboon-text-muted)">
                  {countText}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  shape="pill"
                  onClick={addFacility}
                >
                  시설 추가
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  shape="pill"
                  onClick={() =>
                    router.push(`/company/properties/${propertyId}`)
                  }
                >
                  목록
                </Button>
              </div>
            </header>

            {facilities.map((f, idx) => (
              <Card key={idx} className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="status" className="text-[12px]">
                      {facilityTypeLabel(f.type)}
                    </Badge>
                    <span className="ob-typo-caption text-(--oboon-text-muted)">
                      {f.is_active ? "운영 중" : "미운영"}
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="삭제"
                    onClick={() => deleteFacility(f)}
                    disabled={loading}
                    className="ml-auto h-8 w-8 min-w-0 shrink-0 rounded-full p-0 text-(--oboon-danger) hover:bg-(--oboon-danger-bg) focus-visible:ring-(--oboon-danger)/30"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4">
                  <FormField label="시설명">
                    <Input
                      placeholder="시설명"
                      disabled={!f.isEditing}
                      value={f.name}
                      onChange={(e) => updateField(idx, "name", e.target.value)}
                    />
                  </FormField>

                  <div className="space-y-2">
                    <Label>시설 유형</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="secondary"
                          size="md"
                          shape="default"
                          className="h-11 w-full justify-between"
                          disabled={!f.isEditing}
                        >
                          <span>{facilityTypeLabel(f.type)}</span>
                          <ChevronDown className="h-4 w-4 text-(--oboon-text-muted)" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" matchTriggerWidth>
                        {FACILITY_TYPE_OPTIONS.map((opt) => (
                          <DropdownMenuItem
                            key={opt.value}
                            onClick={() => updateField(idx, "type", opt.value)}
                          >
                            {opt.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {f.road_address ? (
                    <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-4 py-3">
                      <div className="ob-typo-caption text-(--oboon-text-muted)">
                        도로명주소
                      </div>
                      <div className="mt-1 ob-typo-body text-(--oboon-text-title)">
                        {f.road_address}
                      </div>
                      {f.jibun_address ? (
                        <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                          {f.jibun_address}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {f.isEditing && !f.manualMode ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Button
                        variant="secondary"
                        size="md"
                        shape="pill"
                        className="w-full justify-center"
                        onClick={() => openPostcode(idx)}
                      >
                        주소 검색
                      </Button>

                      <Button
                        variant="secondary"
                        size="md"
                        shape="pill"
                        className="w-full justify-center"
                        onClick={() => updateField(idx, "manualMode", true)}
                      >
                        직접 위치 등록
                      </Button>
                    </div>
                  ) : null}

                  {f.manualMode ? (
                    <Button
                      variant="secondary"
                      size="md"
                      shape="pill"
                      className="w-full justify-center"
                      onClick={() => updateField(idx, "manualMode", false)}
                    >
                      돌아가기
                    </Button>
                  ) : null}

                  {f.isEditing && f.manualMode ? (
                    <>
                      <FacilityMapSelect
                        enabled={true}
                        hasSelectedPosition={Boolean(f.hasSelectedPosition)}
                        onSelectPosition={async (lat, lng) => {
                          const res = await fetch(
                            `/api/geo/reverse?lat=${lat}&lng=${lng}`,
                          );
                          const geo = await res.json();

                          const composedRoadAddress = [
                            geo.region_1depth,
                            geo.region_2depth,
                            geo.region_3depth,
                          ]
                            .filter(Boolean)
                            .join(" ");

                          setFacilities((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? {
                                    ...x,
                                    lat,
                                    lng,
                                    road_address: composedRoadAddress,
                                    jibun_address: "",
                                    region_1depth: geo.region_1depth,
                                    region_2depth: geo.region_2depth,
                                    region_3depth: geo.region_3depth,
                                    hasSelectedPosition: true,
                                  }
                                : x,
                            ),
                          );
                        }}
                      />

                      <FormField
                        label="행정구역"
                        labelClassName="ob-typo-caption text-(--oboon-text-muted)"
                      >
                        <Input
                          readOnly
                          value={[
                            f.region_1depth,
                            f.region_2depth,
                            f.region_3depth,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          placeholder="지도에서 위치를 선택하세요"
                        />
                      </FormField>
                    </>
                  ) : null}

                  <FormField label="상세 주소">
                    <Input
                      placeholder="예: ○○아파트 인근"
                      disabled={!f.isEditing}
                      value={f.address_detail}
                      onChange={(e) =>
                        updateField(idx, "address_detail", e.target.value)
                      }
                    />
                  </FormField>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>운영 시작 월</Label>
                      <OboonDatePicker
                        selected={parseYmToLocalDate(f.open_start)}
                        onChange={(date: Date | null) =>
                          updateField(idx, "open_start", formatLocalDateToYm(date))
                        }
                        disabled={!f.isEditing}
                        showMonthYearPicker
                        dateFormat="yyyy-MM"
                        textFormat="yyyy-MM"
                        inputClassName={CONTROL_LIKE}
                        placeholder="예) 2026-01"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>운영 종료 월</Label>
                      <OboonDatePicker
                        selected={parseYmToLocalDate(f.open_end)}
                        onChange={(date: Date | null) =>
                          updateField(idx, "open_end", formatLocalDateToYm(date))
                        }
                        disabled={!f.isEditing}
                        showMonthYearPicker
                        dateFormat="yyyy-MM"
                        textFormat="yyyy-MM"
                        inputClassName={CONTROL_LIKE}
                        placeholder="예) 2026-03"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 ob-typo-body text-(--oboon-text-body)">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border border-(--oboon-border-default) bg-(--oboon-bg-surface) accent-(--oboon-primary)"
                      disabled={!f.isEditing}
                      checked={f.is_active}
                      onChange={(e) =>
                        updateField(idx, "is_active", e.target.checked)
                      }
                    />
                    운영 중
                  </label>

                  <div className="flex justify-end gap-2">
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
                </div>
              </Card>
            ))}
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
