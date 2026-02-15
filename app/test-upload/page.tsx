"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { FormField } from "@/components/shared/FormField";
import type { PropertyExtractionData } from "@/lib/schema/property-schema";
import NaverMap, { type MapMarker } from "@/features/map/components/NaverMap";

type ExtractResult = PropertyExtractionData & {
  location: PropertyExtractionData["location"] & {
    lat?: number | null;
    lng?: number | null;
  };
  _meta?: {
    fileCount: number;
    textLength: number;
    truncated: boolean;
    geocoded: boolean;
  };
};

type ExtractUnitType = PropertyExtractionData["unit_types"][number];
type ExtractUnitTypeExtended = ExtractUnitType & {
  building_layout?: string | null;
  orientation?: string | null;
  supply_count?: number | null;
  floor_plan_url?: string | null;
  image_url?: string | null;
};
type ExtractFacilityType = PropertyExtractionData["facilities"][number];
type ExtractFacilityWithCoords = ExtractFacilityType & {
  lat?: unknown;
  lng?: unknown;
};

type StatusTone = "idle" | "safe" | "danger";

const STATUS_LABEL: Record<string, string> = {
  READY: "분양 예정",
  OPEN: "분양 중",
  CLOSED: "분양 종료",
};

const tableHeaders = [
  "타입",
  "평면도",
  "전용(m²)",
  "공급(m²)",
  "방",
  "욕실",
  "구조",
  "향",
  "공급 수",
  "분양가(만원)",
  "세대수",
];

function toKoreanErrorMessage(message: string) {
  const raw = message.trim();
  const lower = raw.toLowerCase();

  if (
    lower.includes("quota exceeded") ||
    lower.includes("rate limit") ||
    lower.includes("free_tier_requests") ||
    lower.includes("you exceeded your current quota")
  ) {
    return "오늘 무료 요청 한도(일 20회) 초과로 분석을 진행할 수 없습니다. 한도 리셋 후 다시 시도해주세요.";
  }

  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.";
  }

  if (lower.includes("network") || lower.includes("failed to fetch")) {
    return "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.";
  }

  if (raw.startsWith("서버 에러:")) {
    return `${raw} (서버 처리 중 오류가 발생했습니다.)`;
  }

  return raw;
}

function toNumberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.trim().replaceAll(",", "");
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeKoreaCoords(
  lat: number | null,
  lng: number | null
): { lat: number | null; lng: number | null } {
  if (lat == null || lng == null) return { lat, lng };

  const isKoreaLat = lat >= 30 && lat <= 45;
  const isKoreaLng = lng >= 120 && lng <= 135;
  if (isKoreaLat && isKoreaLng) return { lat, lng };

  const isSwappedKoreaLat = lng >= 30 && lng <= 45;
  const isSwappedKoreaLng = lat >= 120 && lat <= 135;
  if (isSwappedKoreaLat && isSwappedKoreaLng) {
    return { lat: lng, lng: lat };
  }

  return { lat, lng };
}

export default function TestUploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState("PDF를 선택해 테스트를 시작하세요.");
  const [statusTone, setStatusTone] = useState<StatusTone>("idle");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const unitFloorPlanInputRefs = useRef<Record<number, HTMLInputElement | null>>(
    {}
  );
  const [unitFloorPlanUrls, setUnitFloorPlanUrls] = useState<
    Record<number, string>
  >({});
  const unitFloorPlanUrlsRef = useRef<Record<number, string>>({});
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const galleryImageInputRef = useRef<HTMLInputElement>(null);
  const [mainImageUrl, setMainImageUrl] = useState("");
  const [galleryImageUrls, setGalleryImageUrls] = useState<string[]>([]);
  const mainImageUrlRef = useRef<string>("");
  const galleryImageUrlsRef = useRef<string[]>([]);

  const fileNames = useMemo(() => files.map((f) => f.name), [files]);

  const revokeBlobUrl = (url?: string | null) => {
    if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      setStatus("파일을 선택해주세요.");
      setStatusTone("danger");
      return;
    }

    setStatus(`PDF ${files.length}개 분석 중... (최대 60초 소요)`);
    setStatusTone("idle");
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    try {
      const response = await fetch("/api/extract-pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || `서버 에러: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
      Object.values(unitFloorPlanUrlsRef.current).forEach((url) =>
        revokeBlobUrl(url)
      );
      revokeBlobUrl(mainImageUrlRef.current);
      galleryImageUrlsRef.current.forEach((url) => revokeBlobUrl(url));
      setUnitFloorPlanUrls({});
      setMainImageUrl("");
      setGalleryImageUrls([]);
      setStatus("추출 완료!");
      setStatusTone("safe");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      setStatus(`오류: ${toKoreanErrorMessage(message)}`);
      setStatusTone("danger");
    } finally {
      setLoading(false);
    }
  };

  const val = (v: unknown) => (v != null && v !== "" ? String(v) : "-");
  const resolveFloorPlanUrl = (
    unit: ExtractUnitTypeExtended | null,
    rowIndex: number
  ) => {
    const edited = unitFloorPlanUrls[rowIndex];
    if (edited) return edited;
    return unit?.floor_plan_url || unit?.image_url || "";
  };

  const handleFloorPlanFileChange = (
    rowIndex: number,
    file: File | null,
    fallbackUrl = ""
  ) => {
    const nextUrl = file ? URL.createObjectURL(file) : fallbackUrl;
    setUnitFloorPlanUrls((prev) => {
      const current = prev[rowIndex];
      if (current && current.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }
      return { ...prev, [rowIndex]: nextUrl };
    });
  };

  useEffect(() => {
    unitFloorPlanUrlsRef.current = unitFloorPlanUrls;
  }, [unitFloorPlanUrls]);

  const handleMainImageChange = (file: File | null) => {
    setMainImageUrl((prev) => {
      revokeBlobUrl(prev);
      return file ? URL.createObjectURL(file) : "";
    });
  };

  const handleGalleryImagesChange = (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return;
    const nextUrls = Array.from(filesList).map((file) => URL.createObjectURL(file));
    setGalleryImageUrls((prev) => [...prev, ...nextUrls]);
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImageUrls((prev) => {
      const target = prev[index];
      revokeBlobUrl(target);
      return prev.filter((_, i) => i !== index);
    });
  };

  useEffect(() => {
    mainImageUrlRef.current = mainImageUrl;
  }, [mainImageUrl]);

  useEffect(() => {
    galleryImageUrlsRef.current = galleryImageUrls;
  }, [galleryImageUrls]);

  useEffect(() => {
    return () => {
      Object.values(unitFloorPlanUrlsRef.current).forEach((url) => {
        revokeBlobUrl(url);
      });
      revokeBlobUrl(mainImageUrlRef.current);
      galleryImageUrlsRef.current.forEach((url) => revokeBlobUrl(url));
    };
  }, []);
  const rawLocationLat = toNumberOrNull(result?.location?.lat);
  const rawLocationLng = toNumberOrNull(result?.location?.lng);
  const { lat: locationLat, lng: locationLng } = normalizeKoreaCoords(
    rawLocationLat,
    rawLocationLng
  );
  const locationMarkers: MapMarker[] =
    locationLat != null && locationLng != null
      ? [
          {
            id: 1,
            label: result?.properties?.name ?? "현장 위치",
            lat: locationLat,
            lng: locationLng,
            type: "open",
          },
        ]
      : [];

  const facilityMarkers: MapMarker[] = (result?.facilities ?? []).reduce<
    MapMarker[]
  >((acc, facility, index) => {
      const f = facility as ExtractFacilityWithCoords;
      const lat = toNumberOrNull(f.lat);
      const lng = toNumberOrNull(f.lng);
      if (lat == null || lng == null) return acc;

      acc.push({
        id: index + 1,
        label: f.name ?? `홍보시설 ${index + 1}`,
        lat,
        lng,
        type: "open",
      });
      return acc;
    }, []);

  return (
    <PageContainer className="max-w-240">
      <div className="space-y-4">
        <Card className="p-5">
          <div className="ob-typo-h3 text-(--oboon-text-title)">
            OBOON AI 데이터 추출 테스트
          </div>
          <div className="mt-1 ob-typo-body text-(--oboon-text-muted)">
            PDF를 업로드하면 추출 API 결과를 토큰 기반 UI로 검증할 수 있습니다.
          </div>
        </Card>

        <Card className="p-5">
          <div className="rounded-xl border border-dashed border-(--oboon-border-strong) bg-(--oboon-bg-subtle) p-4">
            <FormField
              label="PDF 파일 선택 (복수 가능)"
              labelClassName="ob-typo-caption text-(--oboon-text-muted)"
            >
              <Input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                multiple
                onChange={(e) =>
                  setFiles(e.target.files ? Array.from(e.target.files) : [])
                }
                className="sr-only"
              />

              <div className="mt-2 rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    파일 선택
                  </Button>
                  <span className="ob-typo-caption text-(--oboon-text-muted)">
                    {fileNames.length > 0
                      ? `${fileNames.length}개 파일 선택됨`
                      : "선택한 파일 없음"}
                  </span>
                </div>
              </div>
            </FormField>

            {fileNames.length > 0 ? (
              <div className="mt-3 rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-3">
                <div className="ob-typo-caption text-(--oboon-text-muted)">
                  선택된 파일 ({fileNames.length}개)
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {fileNames.map((name) => (
                    <span
                      key={name}
                      className="rounded-full bg-(--oboon-bg-subtle) px-2 py-1 ob-typo-caption text-(--oboon-text-body)"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex items-center gap-2">
              <Button
                onClick={handleSubmit}
                disabled={files.length === 0}
                loading={loading}
              >
                데이터 추출 시작 ({files.length}개 PDF)
              </Button>
            </div>

            <div
              className={[
                "mt-3 ob-typo-body",
                statusTone === "safe" ? "text-(--oboon-safe)" : "",
                statusTone === "danger" ? "text-(--oboon-danger)" : "",
                statusTone === "idle" ? "text-(--oboon-text-muted)" : "",
              ].join(" ")}
            >
              {status}
            </div>
          </div>
        </Card>

        {result ? (
          <div className="space-y-4">
            {result._meta ? (
              <Card className="p-4">
                <div className="ob-typo-caption text-(--oboon-text-muted)">
                  PDF {result._meta.fileCount}개 / 텍스트{" "}
                  {result._meta.textLength.toLocaleString()}자
                  {result._meta.truncated ? " (일부만 분석됨)" : ""}
                  {result._meta.geocoded ? " / 지오코딩 완료" : ""}
                </div>
              </Card>
            ) : null}

            <Section title="현장 사진">
              <div className="space-y-4">
                <div>
                  <div className="mb-2 ob-typo-caption text-(--oboon-text-muted)">
                    대표사진
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={mainImageInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) =>
                        handleMainImageChange(e.target.files?.[0] ?? null)
                      }
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => mainImageInputRef.current?.click()}
                    >
                      대표사진 업로드
                    </Button>
                  </div>
                  <div className="mt-2">
                    {mainImageUrl ? (
                      <div className="relative h-36 w-56 overflow-hidden rounded-lg border border-(--oboon-border-default)">
                        <Image
                          src={mainImageUrl}
                          alt="대표사진"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-(--oboon-border-default) p-3 ob-typo-caption text-(--oboon-text-muted)">
                        대표사진이 없습니다.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-2 ob-typo-caption text-(--oboon-text-muted)">
                    추가사진
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={galleryImageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(e) => handleGalleryImagesChange(e.target.files)}
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => galleryImageInputRef.current?.click()}
                    >
                      추가사진 업로드
                    </Button>
                  </div>

                  {galleryImageUrls.length > 0 ? (
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {galleryImageUrls.map((url, i) => (
                        <div
                          key={`${url}-${i}`}
                          className="relative overflow-hidden rounded-lg border border-(--oboon-border-default)"
                        >
                          <div className="relative h-24 w-full">
                            <Image
                              src={url}
                              alt={`추가사진 ${i + 1}`}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeGalleryImage(i)}
                            className="w-full border-t border-(--oboon-border-default) bg-(--oboon-bg-subtle) py-1 ob-typo-caption text-(--oboon-text-muted) hover:bg-(--oboon-bg-subtle)/80"
                          >
                            제거
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 rounded-lg border border-dashed border-(--oboon-border-default) p-3 ob-typo-caption text-(--oboon-text-muted)">
                      추가사진이 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </Section>

            <Section title="기본 정보">
              <Row label="현장명" value={val(result.properties?.name)} />
              <Row label="분양 유형" value={val(result.properties?.property_type)} />
              <Row
                label="분양 상태"
                value={
                  result.properties?.status
                    ? STATUS_LABEL[result.properties.status] ??
                      result.properties.status
                    : "-"
                }
              />
              <Row label="설명" value={val(result.properties?.description)} />
            </Section>

            <Section title="사업 개요">
              <Row label="시행사" value={val(result.specs?.developer)} />
              <Row label="시공사" value={val(result.specs?.builder)} />
              <Row label="신탁사" value={val(result.specs?.trust_company)} />
              <Row label="분양 방식" value={val(result.specs?.sale_type)} />
              <Row label="용도지역" value={val(result.specs?.land_use_zone)} />
              <Row
                label="대지면적"
                value={
                  result.specs?.site_area != null
                    ? `${result.specs.site_area} m²`
                    : "-"
                }
              />
              <Row
                label="건축면적"
                value={
                  result.specs?.building_area != null
                    ? `${result.specs.building_area} m²`
                    : "-"
                }
              />
              <Row
                label="규모"
                value={
                  result.specs?.floor_underground != null ||
                  result.specs?.floor_ground != null
                    ? `지하 ${result.specs?.floor_underground ?? "?"}층 / 지상 ${result.specs?.floor_ground ?? "?"}층`
                    : "-"
                }
              />
              <Row label="동 수" value={val(result.specs?.building_count)} />
              <Row label="총 세대수" value={val(result.specs?.household_total)} />
              <Row
                label="주차"
                value={
                  result.specs?.parking_total != null
                    ? `${result.specs.parking_total}대${
                        result.specs.parking_per_household != null
                          ? ` (세대당 ${result.specs.parking_per_household}대)`
                          : ""
                      }`
                    : "-"
                }
              />
              <Row label="난방" value={val(result.specs?.heating_type)} />
              <Row
                label="용적률"
                value={
                  result.specs?.floor_area_ratio != null
                    ? `${result.specs.floor_area_ratio}%`
                    : "-"
                }
              />
              <Row
                label="건폐율"
                value={
                  result.specs?.building_coverage_ratio != null
                    ? `${result.specs.building_coverage_ratio}%`
                    : "-"
                }
              />
              <Row label="부대시설" value={val(result.specs?.amenities)} />
            </Section>

            <Section title="일정">
              <Row label="모집공고일" value={val(result.timeline?.announcement_date)} />
              <Row
                label="청약 접수"
                value={
                  result.timeline?.application_start || result.timeline?.application_end
                    ? `${val(result.timeline?.application_start)} ~ ${val(result.timeline?.application_end)}`
                    : "-"
                }
              />
              <Row label="당첨자 발표" value={val(result.timeline?.winner_announce)} />
              <Row
                label="계약 기간"
                value={
                  result.timeline?.contract_start || result.timeline?.contract_end
                    ? `${val(result.timeline?.contract_start)} ~ ${val(result.timeline?.contract_end)}`
                    : "-"
                }
              />
              <Row label="입주 예정" value={val(result.timeline?.move_in_date)} />
            </Section>

            <Section title="주택형 (타입)">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-center ob-typo-caption text-(--oboon-text-body)">
                  <thead>
                    <tr className="bg-(--oboon-bg-subtle)">
                      {tableHeaders.map((h) => (
                        <th
                          key={h}
                          className="border border-(--oboon-border-default) px-2 py-2 text-(--oboon-text-title)"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(result.unit_types.length > 0
                      ? result.unit_types
                      : [null]
                    ).map((u: ExtractUnitTypeExtended | null, i: number) => (
                      <tr key={`${u?.type_name ?? "unit"}-${i}`}>
                        <td className="border border-(--oboon-border-default) px-2 py-2">
                          <EditableText value={val(u?.type_name)} center />
                        </td>
                        <td className="border border-(--oboon-border-default) px-2 py-2">
                          {u ? (
                            <div className="flex items-center justify-center gap-2">
                              <input
                                ref={(el) => {
                                  unitFloorPlanInputRefs.current[i] = el;
                                }}
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                onChange={(e) =>
                                  handleFloorPlanFileChange(
                                    i,
                                    e.target.files?.[0] ?? null,
                                    u.floor_plan_url || u.image_url || ""
                                  )
                                }
                              />

                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  unitFloorPlanInputRefs.current[i]?.click()
                                }
                              >
                                업로드
                              </Button>

                              {resolveFloorPlanUrl(u, i) ? (
                                <a
                                  href={resolveFloorPlanUrl(u, i)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="relative h-8 w-8 overflow-hidden rounded border border-(--oboon-border-default)"
                                  title="평면도 보기"
                                >
                                  <Image
                                    src={resolveFloorPlanUrl(u, i)}
                                    alt={`${u.type_name ?? "타입"} 평면도`}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                </a>
                              ) : (
                                <span className="ob-typo-caption text-(--oboon-text-muted)">
                                  없음
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="ob-typo-caption text-(--oboon-text-muted)">
                              -
                            </span>
                          )}
                        </td>
                        <td className="border border-(--oboon-border-default) px-2 py-2">
                          <EditableText value={val(u?.exclusive_area)} center />
                        </td>
                        <td className="border border-(--oboon-border-default) px-2 py-2">
                          <EditableText value={val(u?.supply_area)} center />
                        </td>
                        <td className="border border-(--oboon-border-default) px-2 py-2">
                          <EditableText value={val(u?.rooms)} center />
                        </td>
                        <td className="border border-(--oboon-border-default) px-2 py-2">
                          <EditableText value={val(u?.bathrooms)} center />
                        </td>
                        <td className="border border-(--oboon-border-default) px-2 py-2">
                          <EditableText value={val(u?.building_layout)} center />
                        </td>
                        <td className="border border-(--oboon-border-default) px-2 py-2">
                          <EditableText value={val(u?.orientation)} center />
                        </td>
                        <td className="border border-(--oboon-border-default) px-2 py-2">
                          <EditableText value={val(u?.supply_count)} center />
                        </td>
                        <td className="border border-(--oboon-border-default) px-2 py-2">
                          <EditableText
                            value={
                              u && (u.price_min != null || u.price_max != null)
                                ? `${u.price_min?.toLocaleString() ?? "?"} ~ ${u.price_max?.toLocaleString() ?? "?"}`
                                : "-"
                            }
                            center
                          />
                        </td>
                        <td className="border border-(--oboon-border-default) px-2 py-2">
                          <EditableText value={val(u?.unit_count)} center />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="위치">
              <Row label="도로명 주소" value={val(result.location?.road_address)} />
              <Row label="지번 주소" value={val(result.location?.jibun_address)} />
              <Row
                label="지역"
                value={
                  [
                    result.location?.region_1depth,
                    result.location?.region_2depth,
                    result.location?.region_3depth,
                  ]
                    .filter(Boolean)
                    .join(" ") || "-"
                }
              />
              <Row label="위도" value={val(result.location?.lat)} editable={false} />
              <Row label="경도" value={val(result.location?.lng)} editable={false} />

              <div className="mt-3">
                {locationMarkers.length > 0 ? (
                  <div className="pointer-events-none h-72 overflow-hidden rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)">
                    <NaverMap
                      key={`location-map-${locationLat}-${locationLng}`}
                      markers={locationMarkers}
                      focusedId={null}
                      showFocusedAsRich={false}
                      fitToMarkers
                      initialZoom={15}
                      mode="base"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-(--oboon-border-default) p-4 text-center ob-typo-body text-(--oboon-text-muted)">
                    좌표가 없어 지도를 표시할 수 없습니다.
                  </div>
                )}
              </div>
            </Section>

            <Section title="홍보시설">
              <div className="mb-3">
                {facilityMarkers.length > 0 ? (
                  <div className="pointer-events-none h-72 overflow-hidden rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)">
                    <NaverMap
                      key={`facility-map-${facilityMarkers.map((m) => `${m.lat},${m.lng}`).join("|")}`}
                      markers={facilityMarkers}
                      focusedId={facilityMarkers[0]?.id ?? null}
                      showFocusedAsRich={false}
                      fitToMarkers
                      initialZoom={15}
                      mode="base"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-(--oboon-border-default) p-4 text-center ob-typo-body text-(--oboon-text-muted)">
                    홍보시설 좌표가 없어 지도를 표시할 수 없습니다.
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {(result.facilities.length > 0 ? result.facilities : [null]).map(
                  (f: ExtractFacilityType | null, i: number) => (
                    <div
                      key={`${f?.name ?? "facility"}-${i}`}
                      className="rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-3"
                    >
                      <div className="ob-typo-body text-(--oboon-text-title)">
                        <EditableText
                          value={`[${f?.type ?? "-"}] ${f?.name ?? "-"}`}
                        />
                      </div>
                      <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                        주소: <EditableText value={f?.road_address ?? "-"} />
                      </div>
                      <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                        운영시간:{" "}
                        <EditableText
                          value={`${f?.open_start ?? "?"} ~ ${f?.open_end ?? "?"}`}
                        />
                      </div>
                    </div>
                  )
                )}
              </div>
            </Section>

            <Card className="p-4">
              <details>
                <summary className="cursor-pointer ob-typo-body text-(--oboon-text-muted)">
                  원본 JSON 보기
                </summary>
                <pre className="mt-3 max-h-120 overflow-auto rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-3 text-xs text-(--oboon-text-body)">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </Card>
          </div>
        ) : null}
      </div>
    </PageContainer>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="ob-typo-subtitle text-(--oboon-text-title)">{title}</div>
      <div className="mt-3 space-y-1">{children}</div>
    </Card>
  );
}

function Row({
  label,
  value,
  editable = true,
}: {
  label: string;
  value: string;
  editable?: boolean;
}) {
  return (
    <div className="flex gap-3 border-b border-(--oboon-border-default) py-2 last:border-b-0">
      <span className="w-30 shrink-0 ob-typo-caption text-(--oboon-text-muted)">
        {label}
      </span>
      <EditableText value={value} editable={editable} />
    </div>
  );
}

function EditableText({
  value,
  center = false,
  editable = true,
}: {
  value: string;
  center?: boolean;
  editable?: boolean;
}) {
  const normalizeValue = (v: string) => (v === "-" ? "" : v);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(normalizeValue(value));

  const displayValue = draft.trim() ? draft : "-";

  if (!editable) {
    return (
      <span
        className={[
          "min-h-8 px-2 py-1 ob-typo-body text-(--oboon-text-body)",
          center ? "inline-block w-full text-center" : "",
        ].join(" ")}
      >
        {displayValue}
      </span>
    );
  }

  if (editing) {
    return (
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter") setEditing(false);
          if (e.key === "Escape") {
            setDraft(normalizeValue(value));
            setEditing(false);
          }
        }}
        className={center ? "h-8 text-center" : "h-9 max-w-2xl"}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={[
        "min-h-8 rounded-md px-2 py-1 ob-typo-body text-(--oboon-text-body) hover:bg-(--oboon-bg-subtle)",
        center ? "w-full text-center" : "text-left",
      ].join(" ")}
      title="클릭해서 수정"
    >
      {displayValue}
    </button>
  );
}
