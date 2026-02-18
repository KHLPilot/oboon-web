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
import { createSupabaseClient } from "@/lib/supabaseClient";

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
    imageStats?: {
      totalPages: number;
      imagesFound: number;
      imagesExtracted: number;
      imagesFailed: number;
      renderFallbackUsed: boolean;
    };
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
type CompareSource = "existing" | "incoming";

type SimilarPropertyCandidate = {
  id: number;
  name: string;
  property_type: string | null;
  status: string | null;
  created_at: string | null;
  score: number;
};

type ExistingPropertySnapshot = {
  property: {
    id: number;
    name: string;
    property_type: string | null;
    status: string | null;
    description: string | null;
  };
  location: {
    id?: number;
    road_address: string | null;
    jibun_address: string | null;
    region_1depth: string | null;
    region_2depth: string | null;
    region_3depth: string | null;
    lat: number | null;
    lng: number | null;
  } | null;
  specs: {
    id?: number;
    developer: string | null;
    builder: string | null;
    trust_company: string | null;
    sale_type: string | null;
    site_area: number | null;
    building_area: number | null;
    floor_ground: number | null;
    floor_underground: number | null;
    building_count: number | null;
    household_total: number | null;
    parking_total: number | null;
    parking_per_household: number | null;
    heating_type: string | null;
    floor_area_ratio: number | null;
    building_coverage_ratio: number | null;
  } | null;
  timeline: {
    id?: number;
    announcement_date: string | null;
    application_start: string | null;
    application_end: string | null;
    winner_announce: string | null;
    contract_start: string | null;
    contract_end: string | null;
    move_in_date: string | null;
  } | null;
};

type CompareSection = "properties" | "location" | "specs" | "timeline";

type CompareField = {
  key: string;
  section: CompareSection;
  sectionLabel: string;
  label: string;
  column: string;
  existingValue: unknown;
  incomingValue: unknown;
};

const STATUS_LABEL: Record<string, string> = {
  READY: "분양 예정",
  OPEN: "분양 중",
  ONGOING: "분양 중",
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
  lng: number | null,
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

function normalizeStatusForDb(
  status: string | null | undefined,
): string | null {
  if (!status) return null;
  const upper = status.trim().toUpperCase();
  if (upper === "ONGOING") return "OPEN";
  if (upper === "OPEN" || upper === "READY" || upper === "CLOSED") {
    return upper;
  }
  return null;
}

function mapFacilityTypeToDb(value: string | null | undefined) {
  const raw = String(value ?? "")
    .trim()
    .toUpperCase();
  if (!raw) return "MODELHOUSE";
  if (raw.includes("모델") || raw === "MODELHOUSE") return "MODELHOUSE";
  if (raw.includes("홍보") || raw.includes("PROMOTION")) return "PROMOTION";
  if (raw.includes("팝업") || raw.includes("POPUP")) return "POPUP";
  return "MODELHOUSE";
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^0-9a-zA-Z가-힣]/g, "");
}

function makeBigrams(value: string) {
  if (value.length < 2) return [value];
  const out: string[] = [];
  for (let i = 0; i < value.length - 1; i += 1) {
    out.push(value.slice(i, i + 2));
  }
  return out;
}

function similarityScore(a: string, b: string) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;

  const ga = makeBigrams(na);
  const gb = makeBigrams(nb);
  const map = new Map<string, number>();

  for (const item of ga) {
    map.set(item, (map.get(item) ?? 0) + 1);
  }

  let intersection = 0;
  for (const item of gb) {
    const count = map.get(item) ?? 0;
    if (count > 0) {
      intersection += 1;
      map.set(item, count - 1);
    }
  }

  return (2 * intersection) / (ga.length + gb.length);
}

function normalizeComparableValue(value: unknown): unknown {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (Array.isArray(value)) {
    const joined = value
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join(", ");
    return joined || null;
  }
  return value;
}

function isSameValue(a: unknown, b: unknown) {
  const na = normalizeComparableValue(a);
  const nb = normalizeComparableValue(b);

  if (typeof na === "number" || typeof nb === "number") {
    const an = toNumberOrNull(na);
    const bn = toNumberOrNull(nb);
    if (an == null && bn == null) return true;
    return an === bn;
  }

  return String(na ?? "") === String(nb ?? "");
}

function displayValue(value: unknown, key?: string) {
  if (value == null || value === "") return "-";
  if (key?.endsWith("status")) {
    const status = String(value).toUpperCase();
    return STATUS_LABEL[status] ?? status;
  }
  if (typeof value === "number") return value.toLocaleString();
  if (Array.isArray(value)) return value.join(", ") || "-";
  return String(value);
}

function normalizeDateYmd(value: unknown): string | null {
  const raw = String(normalizeComparableValue(value) ?? "");
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return null;
}

function normalizeMoveInDate(value: unknown): string | null {
  const raw = String(normalizeComparableValue(value) ?? "");
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}$/.test(raw)) return `${raw}-01`;
  return null;
}

function buildCompareFields(
  existing: ExistingPropertySnapshot,
  incoming: ExtractResult,
): CompareField[] {
  const fields: CompareField[] = [
    {
      key: "properties.name",
      section: "properties",
      sectionLabel: "기본 정보",
      label: "현장명",
      column: "name",
      existingValue: existing.property.name,
      incomingValue: incoming.properties?.name,
    },
    {
      key: "properties.property_type",
      section: "properties",
      sectionLabel: "기본 정보",
      label: "분양 유형",
      column: "property_type",
      existingValue: existing.property.property_type,
      incomingValue: incoming.properties?.property_type,
    },
    {
      key: "properties.status",
      section: "properties",
      sectionLabel: "기본 정보",
      label: "분양 상태",
      column: "status",
      existingValue: existing.property.status,
      incomingValue: normalizeStatusForDb(incoming.properties?.status ?? null),
    },
    {
      key: "properties.description",
      section: "properties",
      sectionLabel: "기본 정보",
      label: "설명",
      column: "description",
      existingValue: existing.property.description,
      incomingValue: incoming.properties?.description,
    },

    {
      key: "location.road_address",
      section: "location",
      sectionLabel: "위치",
      label: "도로명 주소",
      column: "road_address",
      existingValue: existing.location?.road_address,
      incomingValue: incoming.location?.road_address,
    },
    {
      key: "location.jibun_address",
      section: "location",
      sectionLabel: "위치",
      label: "지번 주소",
      column: "jibun_address",
      existingValue: existing.location?.jibun_address,
      incomingValue: incoming.location?.jibun_address,
    },
    {
      key: "location.region_1depth",
      section: "location",
      sectionLabel: "위치",
      label: "시/도",
      column: "region_1depth",
      existingValue: existing.location?.region_1depth,
      incomingValue: incoming.location?.region_1depth,
    },
    {
      key: "location.region_2depth",
      section: "location",
      sectionLabel: "위치",
      label: "시/군/구",
      column: "region_2depth",
      existingValue: existing.location?.region_2depth,
      incomingValue: incoming.location?.region_2depth,
    },
    {
      key: "location.region_3depth",
      section: "location",
      sectionLabel: "위치",
      label: "읍/면/동",
      column: "region_3depth",
      existingValue: existing.location?.region_3depth,
      incomingValue: incoming.location?.region_3depth,
    },
    {
      key: "location.lat",
      section: "location",
      sectionLabel: "위치",
      label: "위도",
      column: "lat",
      existingValue: existing.location?.lat,
      incomingValue: incoming.location?.lat,
    },
    {
      key: "location.lng",
      section: "location",
      sectionLabel: "위치",
      label: "경도",
      column: "lng",
      existingValue: existing.location?.lng,
      incomingValue: incoming.location?.lng,
    },

    {
      key: "specs.developer",
      section: "specs",
      sectionLabel: "사업 개요",
      label: "시행사",
      column: "developer",
      existingValue: existing.specs?.developer,
      incomingValue: incoming.specs?.developer,
    },
    {
      key: "specs.builder",
      section: "specs",
      sectionLabel: "사업 개요",
      label: "시공사",
      column: "builder",
      existingValue: existing.specs?.builder,
      incomingValue: incoming.specs?.builder,
    },
    {
      key: "specs.trust_company",
      section: "specs",
      sectionLabel: "사업 개요",
      label: "신탁사",
      column: "trust_company",
      existingValue: existing.specs?.trust_company,
      incomingValue: incoming.specs?.trust_company,
    },
    {
      key: "specs.sale_type",
      section: "specs",
      sectionLabel: "사업 개요",
      label: "분양 방식",
      column: "sale_type",
      existingValue: existing.specs?.sale_type,
      incomingValue: incoming.specs?.sale_type,
    },
    {
      key: "specs.site_area",
      section: "specs",
      sectionLabel: "사업 개요",
      label: "대지면적",
      column: "site_area",
      existingValue: existing.specs?.site_area,
      incomingValue: incoming.specs?.site_area,
    },
    {
      key: "specs.building_area",
      section: "specs",
      sectionLabel: "사업 개요",
      label: "건축면적",
      column: "building_area",
      existingValue: existing.specs?.building_area,
      incomingValue: incoming.specs?.building_area,
    },
    {
      key: "specs.floor_underground",
      section: "specs",
      sectionLabel: "사업 개요",
      label: "지하층",
      column: "floor_underground",
      existingValue: existing.specs?.floor_underground,
      incomingValue: incoming.specs?.floor_underground,
    },
    {
      key: "specs.floor_ground",
      section: "specs",
      sectionLabel: "사업 개요",
      label: "지상층",
      column: "floor_ground",
      existingValue: existing.specs?.floor_ground,
      incomingValue: incoming.specs?.floor_ground,
    },
    {
      key: "specs.building_count",
      section: "specs",
      sectionLabel: "사업 개요",
      label: "동 수",
      column: "building_count",
      existingValue: existing.specs?.building_count,
      incomingValue: incoming.specs?.building_count,
    },
    {
      key: "specs.household_total",
      section: "specs",
      sectionLabel: "사업 개요",
      label: "총 세대수",
      column: "household_total",
      existingValue: existing.specs?.household_total,
      incomingValue: incoming.specs?.household_total,
    },
    {
      key: "specs.parking_total",
      section: "specs",
      sectionLabel: "사업 개요",
      label: "총 주차 대수",
      column: "parking_total",
      existingValue: existing.specs?.parking_total,
      incomingValue: incoming.specs?.parking_total,
    },
    {
      key: "specs.parking_per_household",
      section: "specs",
      sectionLabel: "사업 개요",
      label: "세대당 주차",
      column: "parking_per_household",
      existingValue: existing.specs?.parking_per_household,
      incomingValue: incoming.specs?.parking_per_household,
    },
    {
      key: "specs.heating_type",
      section: "specs",
      sectionLabel: "사업 개요",
      label: "난방",
      column: "heating_type",
      existingValue: existing.specs?.heating_type,
      incomingValue: incoming.specs?.heating_type,
    },
    {
      key: "specs.floor_area_ratio",
      section: "specs",
      sectionLabel: "사업 개요",
      label: "용적률",
      column: "floor_area_ratio",
      existingValue: existing.specs?.floor_area_ratio,
      incomingValue: incoming.specs?.floor_area_ratio,
    },
    {
      key: "specs.building_coverage_ratio",
      section: "specs",
      sectionLabel: "사업 개요",
      label: "건폐율",
      column: "building_coverage_ratio",
      existingValue: existing.specs?.building_coverage_ratio,
      incomingValue: incoming.specs?.building_coverage_ratio,
    },

    {
      key: "timeline.announcement_date",
      section: "timeline",
      sectionLabel: "일정",
      label: "모집공고일",
      column: "announcement_date",
      existingValue: existing.timeline?.announcement_date,
      incomingValue: incoming.timeline?.announcement_date,
    },
    {
      key: "timeline.application_start",
      section: "timeline",
      sectionLabel: "일정",
      label: "청약 시작",
      column: "application_start",
      existingValue: existing.timeline?.application_start,
      incomingValue: incoming.timeline?.application_start,
    },
    {
      key: "timeline.application_end",
      section: "timeline",
      sectionLabel: "일정",
      label: "청약 종료",
      column: "application_end",
      existingValue: existing.timeline?.application_end,
      incomingValue: incoming.timeline?.application_end,
    },
    {
      key: "timeline.winner_announce",
      section: "timeline",
      sectionLabel: "일정",
      label: "당첨자 발표",
      column: "winner_announce",
      existingValue: existing.timeline?.winner_announce,
      incomingValue: incoming.timeline?.winner_announce,
    },
    {
      key: "timeline.contract_start",
      section: "timeline",
      sectionLabel: "일정",
      label: "계약 시작",
      column: "contract_start",
      existingValue: existing.timeline?.contract_start,
      incomingValue: incoming.timeline?.contract_start,
    },
    {
      key: "timeline.contract_end",
      section: "timeline",
      sectionLabel: "일정",
      label: "계약 종료",
      column: "contract_end",
      existingValue: existing.timeline?.contract_end,
      incomingValue: incoming.timeline?.contract_end,
    },
    {
      key: "timeline.move_in_date",
      section: "timeline",
      sectionLabel: "일정",
      label: "입주 예정",
      column: "move_in_date",
      existingValue: existing.timeline?.move_in_date,
      incomingValue: incoming.timeline?.move_in_date,
    },
  ];

  return fields.filter(
    (field) => !isSameValue(field.existingValue, field.incomingValue),
  );
}

export default function TestUploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState("PDF를 선택해 테스트를 시작하세요.");
  const [statusTone, setStatusTone] = useState<StatusTone>("idle");
  const [loading, setLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const unitFloorPlanInputRefs = useRef<
    Record<number, HTMLInputElement | null>
  >({});
  const [unitFloorPlanUrls, setUnitFloorPlanUrls] = useState<
    Record<number, string>
  >({});
  const [unitFloorPlanFiles, setUnitFloorPlanFiles] = useState<
    Record<number, File | null>
  >({});
  const unitFloorPlanUrlsRef = useRef<Record<number, string>>({});
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const galleryImageInputRef = useRef<HTMLInputElement>(null);
  const [mainImageUrl, setMainImageUrl] = useState("");
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [galleryImageUrls, setGalleryImageUrls] = useState<string[]>([]);
  const [galleryImageFiles, setGalleryImageFiles] = useState<File[]>([]);

  // PDF에서 추출된 이미지 (A안: 이미지 추출)
  type ExtractedImageWithDestination = {
    id: string;
    base64: string;
    source: string;
    aiType?: "building" | "floor_plan" | "other";
    destination: "none" | "main" | "gallery" | "floor_plan";
    unitTypeIndex?: number;
  };
  const [extractedImages, setExtractedImages] = useState<
    ExtractedImageWithDestination[]
  >([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const mainImageUrlRef = useRef<string>("");
  const galleryImageUrlsRef = useRef<string[]>([]);

  const [checkingSimilar, setCheckingSimilar] = useState(false);
  const [similarCandidates, setSimilarCandidates] = useState<
    SimilarPropertyCandidate[]
  >([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(
    null,
  );

  const [loadingComparison, setLoadingComparison] = useState(false);
  const [existingSnapshot, setExistingSnapshot] =
    useState<ExistingPropertySnapshot | null>(null);
  const [compareFields, setCompareFields] = useState<CompareField[]>([]);
  const [selectionMap, setSelectionMap] = useState<
    Record<string, CompareSource>
  >({});
  const [savingCompareMerge, setSavingCompareMerge] = useState(false);
  const [creatingNewProperty, setCreatingNewProperty] = useState(false);
  const [showNewPropertyAction, setShowNewPropertyAction] = useState(false);
  const additionalFileInputRef = useRef<HTMLInputElement>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [additionalLoading, setAdditionalLoading] = useState(false);
  const [textOnlyLoading, setTextOnlyLoading] = useState(false);

  const fileNames = useMemo(() => files.map((f) => f.name), [files]);

  const revokeBlobUrl = (url?: string | null) => {
    if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
  };

  const mergeExtractResults = (
    existing: ExtractResult,
    incoming: ExtractResult,
  ): ExtractResult => {
    const mergeSection = <T extends Record<string, unknown>>(
      base: T | undefined | null,
      next: T | undefined | null,
    ): T => {
      if (!next) return (base ?? {}) as T;
      const filtered = Object.fromEntries(
        Object.entries(next).filter(
          ([, v]) => v != null && v !== "",
        ),
      );
      return { ...(base ?? {}), ...filtered } as T;
    };

    return {
      ...existing,
      properties: mergeSection(existing.properties, incoming.properties),
      location: mergeSection(existing.location, incoming.location),
      specs: mergeSection(existing.specs, incoming.specs),
      timeline: mergeSection(existing.timeline, incoming.timeline),
      unit_types: [
        ...(existing.unit_types ?? []),
        ...(incoming.unit_types ?? []).filter(
          (u) =>
            !(existing.unit_types ?? []).some(
              (e) => e.type_name === u.type_name,
            ),
        ),
      ],
      facilities: [
        ...(existing.facilities ?? []),
        ...(incoming.facilities ?? []).filter(
          (f) =>
            !(existing.facilities ?? []).some((e) => e.name === f.name),
        ),
      ],
    };
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      setStatus("파일을 선택해주세요.");
      setStatusTone("danger");
      return;
    }

    setStatusTone("idle");
    setLoading(true);
    setElapsedSeconds(0);
    elapsedTimerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    setStatus(`PDF ${files.length}개 분석 중...`);
    setResult(null);
    setSimilarCandidates([]);
    setSelectedCandidateId(null);
    setExistingSnapshot(null);
    setCompareFields([]);
    setSelectionMap({});
    setShowNewPropertyAction(false);

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
        revokeBlobUrl(url),
      );
      revokeBlobUrl(mainImageUrlRef.current);
      galleryImageUrlsRef.current.forEach((url) => revokeBlobUrl(url));
      setUnitFloorPlanUrls({});
      setUnitFloorPlanFiles({});
      setMainImageUrl("");
      setMainImageFile(null);
      setGalleryImageUrls([]);
      setGalleryImageFiles([]);

      // 추출된 이미지 초기화 (AI 분류 결과로 자동 배정)
      if (data.extractedImages && Array.isArray(data.extractedImages)) {
        let mainAssigned = false;
        setExtractedImages(
          data.extractedImages.map(
            (img: {
              id: string;
              base64: string;
              source: string;
              aiType?: "building" | "floor_plan";
            }) => {
              let destination: "none" | "main" | "gallery" | "floor_plan" =
                "none";
              if (img.aiType === "building" && !mainAssigned) {
                destination = "main";
                mainAssigned = true;
              } else if (img.aiType === "building") {
                destination = "gallery";
              } else if (img.aiType === "floor_plan") {
                destination = "floor_plan";
              }
              return {
                ...img,
                destination,
                unitTypeIndex: undefined,
              };
            },
          ),
        );
      } else {
        setExtractedImages([]);
      }
      setStatus("추출 완료! 유사 현장 자동 비교 중...");
      const hasSimilar = await runNameComparison(data);
      if (hasSimilar === true) {
        setStatus(
          "추출 완료! 유사한 현장을 자동으로 찾았습니다. 비교 결과를 불러오는 중입니다.",
        );
        setStatusTone("safe");
        setShowNewPropertyAction(false);
      } else if (hasSimilar === false) {
        setStatus("추출 완료!");
        setStatusTone("safe");
        setShowNewPropertyAction(true);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      setStatus(`오류: ${toKoreanErrorMessage(message)}`);
      setStatusTone("danger");
    } finally {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
      setLoading(false);
    }
  };

  const handleTextOnlyReExtract = async () => {
    if (files.length === 0 || !result) return;

    setTextOnlyLoading(true);
    setStatusTone("idle");
    setStatus("텍스트만 재추출 중...");

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    formData.append("textOnly", "true");

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
      // 텍스트 필드만 업데이트, 이미지는 유지
      setResult((prev) => {
        if (!prev) return data;
        return {
          ...prev,
          properties: data.properties ?? prev.properties,
          location: data.location ?? prev.location,
          specs: data.specs ?? prev.specs,
          timeline: data.timeline ?? prev.timeline,
          unit_types: data.unit_types ?? prev.unit_types,
          facilities: data.facilities ?? prev.facilities,
        };
      });

      setStatus("텍스트 재추출 완료! 기존 이미지는 유지됩니다.");
      setStatusTone("safe");

      // 유사 현장 비교 다시 실행
      const hasSimilar = await runNameComparison(data);
      if (hasSimilar === true) {
        setStatus("텍스트 재추출 완료! 유사 현장을 찾았습니다.");
        setShowNewPropertyAction(false);
      } else if (hasSimilar === false) {
        setStatus("텍스트 재추출 완료!");
        setShowNewPropertyAction(true);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      setStatus(`오류: ${toKoreanErrorMessage(message)}`);
      setStatusTone("danger");
    } finally {
      setTextOnlyLoading(false);
    }
  };

  const handleAdditionalPdf = async () => {
    if (additionalFiles.length === 0 || !result) return;

    setAdditionalLoading(true);
    setStatusTone("idle");
    setElapsedSeconds(0);
    elapsedTimerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    setStatus(`추가 PDF ${additionalFiles.length}개 분석 중...`);

    const formData = new FormData();
    additionalFiles.forEach((f) => formData.append("files", f));

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
      const merged = mergeExtractResults(result, data);
      setResult(merged);

      // 추출된 이미지 합산
      if (data.extractedImages && Array.isArray(data.extractedImages)) {
        const newImages: ExtractedImageWithDestination[] =
          data.extractedImages.map(
            (img: {
              id: string;
              base64: string;
              source: string;
              aiType?: "building" | "floor_plan";
            }) => {
              let destination: ExtractedImageWithDestination["destination"] =
                "none";
              if (img.aiType === "building") {
                destination = "gallery";
              } else if (img.aiType === "floor_plan") {
                destination = "floor_plan";
              }
              return { ...img, destination, unitTypeIndex: undefined };
            },
          );
        setExtractedImages((prev) => [...prev, ...newImages]);
      }
      setAdditionalFiles([]);
      setStatus(
        `추가 PDF 병합 완료! 데이터가 업데이트되었습니다.`,
      );
      setStatusTone("safe");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      setStatus(`추가 PDF 오류: ${toKoreanErrorMessage(message)}`);
      setStatusTone("danger");
    } finally {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
      setAdditionalLoading(false);
    }
  };

  const runNameComparison = async (
    sourceResult?: ExtractResult | null,
  ): Promise<boolean | null> => {
    const target = sourceResult ?? result;
    if (!target?.properties?.name?.trim()) {
      setSimilarCandidates([]);
      setSelectedCandidateId(null);
      return false;
    }

    setCheckingSimilar(true);
    setSimilarCandidates([]);
    setSelectedCandidateId(null);
    setExistingSnapshot(null);
    setCompareFields([]);
    setSelectionMap({});
    setShowNewPropertyAction(false);

    try {
      const supabase = createSupabaseClient();
      const extractedName = target.properties.name.trim();

      const { data, error } = await supabase
        .from("properties")
        .select("id, name, property_type, status, created_at")
        .order("created_at", { ascending: false })
        .limit(300);

      if (error) throw error;

      const candidates = (data ?? [])
        .map((row) => {
          const score = similarityScore(extractedName, row.name ?? "");
          return {
            id: row.id as number,
            name: String(row.name ?? ""),
            property_type: (row.property_type as string | null) ?? null,
            status: (row.status as string | null) ?? null,
            created_at: (row.created_at as string | null) ?? null,
            score,
          } satisfies SimilarPropertyCandidate;
        })
        .filter((row) => row.score >= 0.5)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);

      setSimilarCandidates(candidates);
      setSelectedCandidateId(candidates[0]?.id ?? null);
      return candidates.length > 0;
    } catch (err) {
      const message = err instanceof Error ? err.message : "비교 중 오류";
      setStatus(`현장명 비교 오류: ${toKoreanErrorMessage(message)}`);
      setStatusTone("danger");
      return null;
    } finally {
      setCheckingSimilar(false);
    }
  };

  const loadComparison = async () => {
    if (!result || !selectedCandidateId) return;

    setLoadingComparison(true);
    setExistingSnapshot(null);
    setCompareFields([]);
    setSelectionMap({});

    try {
      const supabase = createSupabaseClient();

      const [propertyRes, locationRes, specsRes, timelineRes] =
        await Promise.all([
          supabase
            .from("properties")
            .select("id, name, property_type, status, description")
            .eq("id", selectedCandidateId)
            .single(),
          supabase
            .from("property_locations")
            .select(
              "id, road_address, jibun_address, region_1depth, region_2depth, region_3depth, lat, lng",
            )
            .eq("properties_id", selectedCandidateId)
            .maybeSingle(),
          supabase
            .from("property_specs")
            .select(
              "id, developer, builder, trust_company, sale_type, site_area, building_area, floor_ground, floor_underground, building_count, household_total, parking_total, parking_per_household, heating_type, floor_area_ratio, building_coverage_ratio",
            )
            .eq("properties_id", selectedCandidateId)
            .order("id", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("property_timeline")
            .select(
              "id, announcement_date, application_start, application_end, winner_announce, contract_start, contract_end, move_in_date",
            )
            .eq("properties_id", selectedCandidateId)
            .maybeSingle(),
        ]);

      if (propertyRes.error) throw propertyRes.error;
      if (locationRes.error) throw locationRes.error;
      if (specsRes.error) throw specsRes.error;
      if (timelineRes.error) throw timelineRes.error;

      const snapshot: ExistingPropertySnapshot = {
        property: {
          id: Number(propertyRes.data.id),
          name: String(propertyRes.data.name ?? ""),
          property_type:
            (propertyRes.data.property_type as string | null) ?? null,
          status: (propertyRes.data.status as string | null) ?? null,
          description: (propertyRes.data.description as string | null) ?? null,
        },
        location:
          (locationRes.data as ExistingPropertySnapshot["location"]) ?? null,
        specs: (specsRes.data as ExistingPropertySnapshot["specs"]) ?? null,
        timeline:
          (timelineRes.data as ExistingPropertySnapshot["timeline"]) ?? null,
      };

      const diffFields = buildCompareFields(snapshot, result);
      const initialSelections = Object.fromEntries(
        diffFields.map((field) => [field.key, "existing" as CompareSource]),
      );

      setExistingSnapshot(snapshot);
      setCompareFields(diffFields);
      setSelectionMap(initialSelections);

      if (diffFields.length === 0) {
        setStatus(
          "두 데이터가 비교 필드 기준으로 모두 일치합니다. (추가 비교 없음)",
        );
      } else {
        setStatus(`비교 완료: 다른 항목 ${diffFields.length}개`);
      }
      setStatusTone("safe");
    } catch (err) {
      const message = err instanceof Error ? err.message : "비교 로드 실패";
      setStatus(`비교 데이터 로드 오류: ${toKoreanErrorMessage(message)}`);
      setStatusTone("danger");
    } finally {
      setLoadingComparison(false);
    }
  };

  useEffect(() => {
    if (!result || !selectedCandidateId) return;
    void loadComparison();
    // selectedCandidateId가 바뀔 때 자동 비교
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCandidateId]);

  const applySelectedMerge = async () => {
    if (!existingSnapshot || !result) return;
    if (!confirm(`"${existingSnapshot.property.name}" 현장에 선택한 값을 반영하시겠습니까?`)) return;

    setSavingCompareMerge(true);
    try {
      const supabase = createSupabaseClient();
      const targetId = existingSnapshot.property.id;

      const merged = {
        properties: {
          name: existingSnapshot.property.name,
          property_type: existingSnapshot.property.property_type,
          status: existingSnapshot.property.status,
          description: existingSnapshot.property.description,
        },
        location: {
          road_address: existingSnapshot.location?.road_address ?? null,
          jibun_address: existingSnapshot.location?.jibun_address ?? null,
          region_1depth: existingSnapshot.location?.region_1depth ?? null,
          region_2depth: existingSnapshot.location?.region_2depth ?? null,
          region_3depth: existingSnapshot.location?.region_3depth ?? null,
          lat: existingSnapshot.location?.lat ?? null,
          lng: existingSnapshot.location?.lng ?? null,
        },
        specs: {
          developer: existingSnapshot.specs?.developer ?? null,
          builder: existingSnapshot.specs?.builder ?? null,
          trust_company: existingSnapshot.specs?.trust_company ?? null,
          sale_type: existingSnapshot.specs?.sale_type ?? null,
          site_area: existingSnapshot.specs?.site_area ?? null,
          building_area: existingSnapshot.specs?.building_area ?? null,
          floor_ground: existingSnapshot.specs?.floor_ground ?? null,
          floor_underground: existingSnapshot.specs?.floor_underground ?? null,
          building_count: existingSnapshot.specs?.building_count ?? null,
          household_total: existingSnapshot.specs?.household_total ?? null,
          parking_total: existingSnapshot.specs?.parking_total ?? null,
          parking_per_household:
            existingSnapshot.specs?.parking_per_household ?? null,
          heating_type: existingSnapshot.specs?.heating_type ?? null,
          floor_area_ratio: existingSnapshot.specs?.floor_area_ratio ?? null,
          building_coverage_ratio:
            existingSnapshot.specs?.building_coverage_ratio ?? null,
        },
        timeline: {
          announcement_date:
            existingSnapshot.timeline?.announcement_date ?? null,
          application_start:
            existingSnapshot.timeline?.application_start ?? null,
          application_end: existingSnapshot.timeline?.application_end ?? null,
          winner_announce: existingSnapshot.timeline?.winner_announce ?? null,
          contract_start: existingSnapshot.timeline?.contract_start ?? null,
          contract_end: existingSnapshot.timeline?.contract_end ?? null,
          move_in_date: existingSnapshot.timeline?.move_in_date ?? null,
        },
      };

      for (const field of compareFields) {
        const selected = selectionMap[field.key] ?? "existing";
        if (selected !== "incoming") continue;

        const normalizedIncoming =
          field.key === "properties.status"
            ? normalizeStatusForDb(String(field.incomingValue ?? ""))
            : normalizeComparableValue(field.incomingValue);

        if (field.section === "properties") {
          (merged.properties as Record<string, unknown>)[field.column] =
            normalizedIncoming;
        }
        if (field.section === "location") {
          (merged.location as Record<string, unknown>)[field.column] =
            normalizedIncoming;
        }
        if (field.section === "specs") {
          (merged.specs as Record<string, unknown>)[field.column] =
            normalizedIncoming;
        }
        if (field.section === "timeline") {
          (merged.timeline as Record<string, unknown>)[field.column] =
            normalizedIncoming;
        }
      }

      const { error: propertyError } = await supabase
        .from("properties")
        .update({
          name:
            String(
              normalizeComparableValue(merged.properties.name) ?? "",
            ).trim() || existingSnapshot.property.name,
          property_type: normalizeComparableValue(
            merged.properties.property_type,
          ),
          status: normalizeStatusForDb(String(merged.properties.status ?? "")),
          description: normalizeComparableValue(merged.properties.description),
        })
        .eq("id", targetId);
      if (propertyError) throw propertyError;

      const locationPayload = {
        road_address: normalizeComparableValue(merged.location.road_address),
        jibun_address: normalizeComparableValue(merged.location.jibun_address),
        region_1depth: normalizeComparableValue(merged.location.region_1depth),
        region_2depth: normalizeComparableValue(merged.location.region_2depth),
        region_3depth: normalizeComparableValue(merged.location.region_3depth),
        lat: toNumberOrNull(merged.location.lat),
        lng: toNumberOrNull(merged.location.lng),
      };

      const hasLocationValue = Object.values(locationPayload).some(
        (v) => v !== null && v !== "",
      );
      if (existingSnapshot.location?.id) {
        const { error: locationError } = await supabase
          .from("property_locations")
          .update(locationPayload)
          .eq("id", existingSnapshot.location.id);
        if (locationError) throw locationError;
      } else if (hasLocationValue) {
        const { error: locationInsertError } = await supabase
          .from("property_locations")
          .insert({ ...locationPayload, properties_id: targetId });
        if (locationInsertError) throw locationInsertError;
      }

      const specsPayload = {
        properties_id: targetId,
        developer: normalizeComparableValue(merged.specs.developer),
        builder: normalizeComparableValue(merged.specs.builder),
        trust_company: normalizeComparableValue(merged.specs.trust_company),
        sale_type: normalizeComparableValue(merged.specs.sale_type),
        site_area: toNumberOrNull(merged.specs.site_area),
        building_area: toNumberOrNull(merged.specs.building_area),
        floor_ground: toNumberOrNull(merged.specs.floor_ground),
        floor_underground: toNumberOrNull(merged.specs.floor_underground),
        building_count: toNumberOrNull(merged.specs.building_count),
        household_total: toNumberOrNull(merged.specs.household_total),
        parking_total: toNumberOrNull(merged.specs.parking_total),
        parking_per_household: toNumberOrNull(
          merged.specs.parking_per_household,
        ),
        heating_type: normalizeComparableValue(merged.specs.heating_type),
        floor_area_ratio: toNumberOrNull(merged.specs.floor_area_ratio),
        building_coverage_ratio: toNumberOrNull(
          merged.specs.building_coverage_ratio,
        ),
      };

      const hasSpecsValue = Object.entries(specsPayload).some(
        ([key, value]) =>
          key !== "properties_id" && value !== null && value !== "",
      );
      if (hasSpecsValue) {
        const { error: specsError } = await supabase
          .from("property_specs")
          .upsert(specsPayload, { onConflict: "properties_id" });
        if (specsError) throw specsError;
      }

      const timelinePayload = {
        announcement_date: normalizeDateYmd(merged.timeline.announcement_date),
        application_start: normalizeDateYmd(merged.timeline.application_start),
        application_end: normalizeDateYmd(merged.timeline.application_end),
        winner_announce: normalizeDateYmd(merged.timeline.winner_announce),
        contract_start: normalizeDateYmd(merged.timeline.contract_start),
        contract_end: normalizeDateYmd(merged.timeline.contract_end),
        move_in_date: normalizeMoveInDate(merged.timeline.move_in_date),
      };

      const hasTimelineValue = Object.values(timelinePayload).some(
        (value) => value !== null && value !== "",
      );
      if (existingSnapshot.timeline?.id) {
        const { error: timelineError } = await supabase
          .from("property_timeline")
          .update(timelinePayload)
          .eq("id", existingSnapshot.timeline.id);
        if (timelineError) throw timelineError;
      } else if (hasTimelineValue) {
        const { error: timelineInsertError } = await supabase
          .from("property_timeline")
          .insert({ ...timelinePayload, properties_id: targetId });
        if (timelineInsertError) throw timelineInsertError;
      }

      const appliedCount = compareFields.filter(
        (field) => selectionMap[field.key] === "incoming",
      ).length;

      setStatus(
        appliedCount > 0
          ? `선택 반영 완료: ${appliedCount}개 항목을 기존 현장(${existingSnapshot.property.name})에 업데이트했습니다. — 2초 후 새로고침됩니다.`
          : "선택된 변경 항목이 없어 기존 값을 그대로 유지했습니다. — 2초 후 새로고침됩니다.",
      );
      setStatusTone("safe");
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "반영 중 오류";
      setStatus(`비교 반영 실패: ${toKoreanErrorMessage(message)}`);
      setStatusTone("danger");
    } finally {
      setSavingCompareMerge(false);
    }
  };

  const createNewPropertyFromExtract = async () => {
    if (!result) return;
    if (!confirm("새 현장을 등록하시겠습니까?")) return;

    setCreatingNewProperty(true);
    try {
      const supabase = createSupabaseClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("로그인이 필요합니다.");

      const propertyPayload = {
        name: result.properties?.name?.trim() || "이름 미정 현장",
        property_type: normalizeComparableValue(
          result.properties?.property_type,
        ),
        status: normalizeStatusForDb(result.properties?.status ?? null),
        description: normalizeComparableValue(result.properties?.description),
        created_by: user.id,
      };

      const { data: propertyData, error: propertyError } = await supabase
        .from("properties")
        .insert(propertyPayload)
        .select("id")
        .single();
      if (propertyError) throw propertyError;

      const propertyId = Number(propertyData.id);
      let mainImagePublicUrl: string | null = null;

      if (mainImageFile) {
        const fd = new FormData();
        fd.append("file", mainImageFile);
        fd.append("propertyId", String(propertyId));
        fd.append("mode", "property_main");

        const mainRes = await fetch("/api/r2/upload", {
          method: "POST",
          body: fd,
        });
        const mainPayload = await mainRes.json().catch(() => null);
        if (!mainRes.ok || !mainPayload?.url) {
          throw new Error(mainPayload?.error || "대표 이미지 업로드 실패");
        }
        mainImagePublicUrl = String(mainPayload.url);

        const { error: mainUpdateError } = await supabase
          .from("properties")
          .update({ image_url: mainImagePublicUrl })
          .eq("id", propertyId);
        if (mainUpdateError) throw mainUpdateError;
      }

      const locationPayload = {
        properties_id: propertyId,
        road_address: normalizeComparableValue(result.location?.road_address),
        jibun_address: normalizeComparableValue(result.location?.jibun_address),
        region_1depth: normalizeComparableValue(result.location?.region_1depth),
        region_2depth: normalizeComparableValue(result.location?.region_2depth),
        region_3depth: normalizeComparableValue(result.location?.region_3depth),
        lat: toNumberOrNull(result.location?.lat),
        lng: toNumberOrNull(result.location?.lng),
      };
      const hasLocationValue = Object.entries(locationPayload).some(
        ([key, value]) =>
          key !== "properties_id" && value !== null && value !== "",
      );
      if (hasLocationValue) {
        const { error: locationError } = await supabase
          .from("property_locations")
          .insert(locationPayload);
        if (locationError) throw locationError;
      }

      const specsPayload = {
        properties_id: propertyId,
        developer: normalizeComparableValue(result.specs?.developer),
        builder: normalizeComparableValue(result.specs?.builder),
        trust_company: normalizeComparableValue(result.specs?.trust_company),
        sale_type: normalizeComparableValue(result.specs?.sale_type),
        site_area: toNumberOrNull(result.specs?.site_area),
        building_area: toNumberOrNull(result.specs?.building_area),
        floor_ground: toNumberOrNull(result.specs?.floor_ground),
        floor_underground: toNumberOrNull(result.specs?.floor_underground),
        building_count: toNumberOrNull(result.specs?.building_count),
        household_total: toNumberOrNull(result.specs?.household_total),
        parking_total: toNumberOrNull(result.specs?.parking_total),
        parking_per_household: toNumberOrNull(
          result.specs?.parking_per_household,
        ),
        heating_type: normalizeComparableValue(result.specs?.heating_type),
        floor_area_ratio: toNumberOrNull(result.specs?.floor_area_ratio),
        building_coverage_ratio: toNumberOrNull(
          result.specs?.building_coverage_ratio,
        ),
      };
      const hasSpecsValue = Object.entries(specsPayload).some(
        ([key, value]) =>
          key !== "properties_id" && value !== null && value !== "",
      );
      if (hasSpecsValue) {
        const { error: specsError } = await supabase
          .from("property_specs")
          .upsert(specsPayload, { onConflict: "properties_id" });
        if (specsError) throw specsError;
      }

      const timelinePayload = {
        properties_id: propertyId,
        announcement_date: normalizeDateYmd(result.timeline?.announcement_date),
        application_start: normalizeDateYmd(result.timeline?.application_start),
        application_end: normalizeDateYmd(result.timeline?.application_end),
        winner_announce: normalizeDateYmd(result.timeline?.winner_announce),
        contract_start: normalizeDateYmd(result.timeline?.contract_start),
        contract_end: normalizeDateYmd(result.timeline?.contract_end),
        move_in_date: normalizeMoveInDate(result.timeline?.move_in_date),
      };
      const hasTimelineValue = Object.entries(timelinePayload).some(
        ([key, value]) =>
          key !== "properties_id" && value !== null && value !== "",
      );
      if (hasTimelineValue) {
        const { error: timelineError } = await supabase
          .from("property_timeline")
          .insert(timelinePayload);
        if (timelineError) throw timelineError;
      }

      const uploadedFloorPlanUrls: Record<number, string> = {};
      const floorPlanEntries = Object.entries(unitFloorPlanFiles);
      for (const [indexText, file] of floorPlanEntries) {
        if (!file) continue;
        const rowIndex = Number(indexText);
        if (!Number.isFinite(rowIndex)) continue;

        const fd = new FormData();
        fd.append("file", file);
        fd.append("propertyId", String(propertyId));
        fd.append("mode", "property_floor_plan");
        fd.append(
          "unitType",
          String(
            result.unit_types?.[rowIndex]?.type_name ?? `type-${rowIndex}`,
          ),
        );

        const fpRes = await fetch("/api/r2/upload", {
          method: "POST",
          body: fd,
        });
        const fpPayload = await fpRes.json().catch(() => null);
        if (!fpRes.ok || !fpPayload?.url) {
          throw new Error(fpPayload?.error || "평면도 업로드 실패");
        }

        uploadedFloorPlanUrls[rowIndex] = String(fpPayload.url);
      }

      const unitRows = (result.unit_types ?? [])
        .map((unit, index) => {
          const floorPlanUrl = resolveFloorPlanUrl(
            unit as ExtractUnitTypeExtended,
            index,
          );
          return {
            properties_id: propertyId,
            type_name:
              String(normalizeComparableValue(unit.type_name) ?? "").trim() ||
              null,
            exclusive_area: toNumberOrNull(unit.exclusive_area),
            supply_area: toNumberOrNull(unit.supply_area),
            rooms: toNumberOrNull(unit.rooms),
            bathrooms: toNumberOrNull(unit.bathrooms),
            price_min: toNumberOrNull(unit.price_min),
            price_max: toNumberOrNull(unit.price_max),
            unit_count: toNumberOrNull(unit.unit_count),
            supply_count: toNumberOrNull(
              (unit as ExtractUnitTypeExtended).supply_count,
            ),
            building_layout: normalizeComparableValue(
              (unit as ExtractUnitTypeExtended).building_layout,
            ),
            orientation: normalizeComparableValue(
              (unit as ExtractUnitTypeExtended).orientation,
            ),
            floor_plan_url:
              uploadedFloorPlanUrls[index] ??
              (floorPlanUrl && !floorPlanUrl.startsWith("blob:")
                ? floorPlanUrl
                : normalizeComparableValue(
                    (unit as ExtractUnitTypeExtended).floor_plan_url ??
                      (unit as ExtractUnitTypeExtended).image_url,
                  )),
            is_price_public: true,
            is_public: true,
          };
        })
        .filter((row) => row.type_name);

      if (unitRows.length > 0) {
        const { error: unitsError } = await supabase
          .from("property_unit_types")
          .insert(unitRows);
        if (unitsError) throw unitsError;
      }

      const facilityRows = (result.facilities ?? [])
        .map((facility) => ({
          properties_id: propertyId,
          type: mapFacilityTypeToDb(facility.type),
          name:
            String(normalizeComparableValue(facility.name) ?? "").trim() ||
            null,
          road_address: normalizeComparableValue(facility.road_address),
          open_start: normalizeComparableValue(facility.open_start),
          open_end: normalizeComparableValue(facility.open_end),
          is_active: true,
        }))
        .filter((row) => row.name);

      if (facilityRows.length > 0) {
        const { error: facilitiesError } = await supabase
          .from("property_facilities")
          .insert(facilityRows);
        if (facilitiesError) throw facilitiesError;
      }

      if (galleryImageFiles.length > 0) {
        const galleryFormData = new FormData();
        galleryFormData.append("propertyId", String(propertyId));
        galleryImageFiles.forEach((file) =>
          galleryFormData.append("files", file),
        );

        const galleryRes = await fetch("/api/property/gallery", {
          method: "POST",
          body: galleryFormData,
        });
        const galleryPayload = await galleryRes.json().catch(() => null);
        if (!galleryRes.ok) {
          throw new Error(galleryPayload?.error || "추가 사진 업로드 실패");
        }
      }

      // 추출된 이미지 업로드 및 DB 저장
      let extractedImageCount = 0;
      for (const img of extractedImages) {
        if (img.destination === "none") continue;

        try {
          if (img.destination === "main") {
            // 대표 이미지
            const url = await uploadSingleExtractedImage(
              img,
              "property_main",
              propertyId,
            );
            await supabase
              .from("properties")
              .update({ image_url: url })
              .eq("id", propertyId);
            extractedImageCount++;
          } else if (img.destination === "gallery") {
            // 추가 현장사진
            const url = await uploadSingleExtractedImage(
              img,
              "property_additional",
              propertyId,
            );
            await supabase.from("property_gallery_images").insert({
              property_id: propertyId,
              image_url: url,
              sort_order: 0,
            });
            extractedImageCount++;
          } else if (
            img.destination === "floor_plan" &&
            img.unitTypeIndex !== undefined
          ) {
            // 평면도
            const url = await uploadSingleExtractedImage(
              img,
              "property_floor_plan",
              propertyId,
            );
            // unit_types의 floor_plan_url을 업데이트
            const targetUnit = result?.unit_types?.[img.unitTypeIndex];
            if (targetUnit) {
              await supabase
                .from("property_unit_types")
                .update({ floor_plan_url: url })
                .eq("properties_id", propertyId)
                .eq("type_name", targetUnit.type_name || "");
              extractedImageCount++;
            }
          }
        } catch (err) {
          console.warn("추출 이미지 업로드 실패:", img.id, err);
          // 개별 이미지 업로드 실패해도 계속 진행
        }
      }

      setStatus(
        `새 현장 등록 완료 (ID: ${propertyId}, 대표사진 ${mainImagePublicUrl ? 1 : 0}장, 추가사진 ${galleryImageFiles.length}장, 평면도 ${Object.keys(uploadedFloorPlanUrls).length}장, PDF추출이미지 ${extractedImageCount}장, 타입 ${unitRows.length}개, 시설 ${facilityRows.length}개) — 2초 후 새로고침됩니다.`,
      );
      setStatusTone("safe");
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "새 현장 등록 실패";
      setStatus(`새 현장 등록 실패: ${toKoreanErrorMessage(message)}`);
      setStatusTone("danger");
    } finally {
      setCreatingNewProperty(false);
    }
  };

  const val = (v: unknown) => (v != null && v !== "" ? String(v) : "-");
  const removeSelectedPdfFile = (removeIndex: number) => {
    setFiles((prev) => prev.filter((_, index) => index !== removeIndex));
  };
  const normalizeTextInput = (value: string) => {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  };
  const updateResultSectionField = (
    section: "properties" | "location" | "specs" | "timeline",
    field: string,
    value: unknown,
  ) => {
    setResult((prev) => {
      if (!prev) return prev;
      const currentSection = (prev as Record<string, unknown>)[section] as
        | Record<string, unknown>
        | undefined;
      return {
        ...prev,
        [section]: {
          ...(currentSection ?? {}),
          [field]: value,
        },
      };
    });
  };
  const updateResultUnitField = (
    index: number,
    field: string,
    value: unknown,
  ) => {
    setResult((prev) => {
      if (!prev) return prev;
      const nextUnits = [...(prev.unit_types ?? [])] as ExtractUnitTypeExtended[];
      const current = nextUnits[index];
      if (!current) return prev;
      nextUnits[index] = {
        ...current,
        [field]: value,
      };
      return { ...prev, unit_types: nextUnits };
    });
  };
  const updateResultFacilityField = (
    index: number,
    field: string,
    value: unknown,
  ) => {
    setResult((prev) => {
      if (!prev) return prev;
      const nextFacilities = [...(prev.facilities ?? [])];
      const current = nextFacilities[index];
      if (!current) return prev;
      nextFacilities[index] = {
        ...current,
        [field]: value,
      };
      return { ...prev, facilities: nextFacilities };
    });
  };
  const toNullableNumberInput = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return toNumberOrNull(trimmed);
  };
  const parsePriceRangeInput = (value: string) => {
    const normalized = value.replaceAll("~", " ").replaceAll("-", " ");
    const numbers = normalized
      .split(" ")
      .map((part) => toNumberOrNull(part))
      .filter((part): part is number => part != null);
    if (numbers.length === 0) return { min: null, max: null };
    if (numbers.length === 1) return { min: numbers[0], max: numbers[0] };
    return { min: numbers[0], max: numbers[1] };
  };
  const resolveFloorPlanUrl = (
    unit: ExtractUnitTypeExtended | null,
    rowIndex: number,
  ) => {
    const edited = unitFloorPlanUrls[rowIndex];
    if (edited) return edited;
    return unit?.floor_plan_url || unit?.image_url || "";
  };

  const handleFloorPlanFileChange = (
    rowIndex: number,
    file: File | null,
    fallbackUrl = "",
  ) => {
    const nextUrl = file ? URL.createObjectURL(file) : fallbackUrl;
    setUnitFloorPlanFiles((prev) => ({ ...prev, [rowIndex]: file }));
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
    setMainImageFile(file);
    setMainImageUrl((prev) => {
      revokeBlobUrl(prev);
      return file ? URL.createObjectURL(file) : "";
    });
  };

  const handleGalleryImagesChange = (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return;
    const nextFiles = Array.from(filesList);
    const nextUrls = nextFiles.map((file) => URL.createObjectURL(file));
    setGalleryImageFiles((prev) => [...prev, ...nextFiles]);
    setGalleryImageUrls((prev) => [...prev, ...nextUrls]);
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImageFiles((prev) => prev.filter((_, i) => i !== index));
    setGalleryImageUrls((prev) => {
      const target = prev[index];
      revokeBlobUrl(target);
      return prev.filter((_, i) => i !== index);
    });
  };

  // 추출된 이미지 배치 변경 함수
  const updateImageDestination = (index: number, destination: string) => {
    setExtractedImages((prev) =>
      prev.map((img, i) =>
        i === index
          ? {
              ...img,
              destination: destination as ExtractedImageWithDestination["destination"],
              unitTypeIndex: undefined,
            }
          : img,
      ),
    );
  };

  const removeExtractedImage = (index: number) => {
    setExtractedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const updateImageUnitType = (index: number, unitTypeIndex: number) => {
    setExtractedImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, unitTypeIndex } : img)),
    );
  };

  // base64를 Blob으로 변환
  const base64ToBlob = (base64: string): Blob => {
    const [header, data] = base64.split(",");
    const mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
    const binary = atob(data);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type: mime });
  };

  // 단일 이미지 업로드 (R2)
  const uploadSingleExtractedImage = async (
    img: ExtractedImageWithDestination,
    mode: string,
    propertyId: number,
  ): Promise<string> => {
    const blob = base64ToBlob(img.base64);
    const formData = new FormData();
    formData.append("file", blob, `extracted-${img.id}.jpg`);
    formData.append("mode", mode);
    formData.append("propertyId", propertyId.toString());

    const res = await fetch("/api/r2/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("이미지 업로드 실패");
    const { url } = await res.json();
    return url;
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
    rawLocationLng,
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
              label="PDF 파일 선택 (최대 100MB)"
              labelClassName="ob-typo-caption text-(--oboon-text-muted)"
            >
              <Input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                multiple
                onChange={(e) => {
                  const selected = e.target.files
                    ? Array.from(e.target.files)
                    : [];
                  const totalSize = selected.reduce(
                    (sum, f) => sum + f.size,
                    0,
                  );
                  if (totalSize > 100 * 1024 * 1024) {
                    setStatus(
                      `PDF 합산 용량이 100MB를 초과합니다. (${(totalSize / 1024 / 1024).toFixed(1)}MB)`,
                    );
                    setStatusTone("danger");
                    e.target.value = "";
                    return;
                  }
                  setFiles(selected);
                }}
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
                    {files.length > 0
                      ? `${files.length}개 파일 선택됨 (${(files.reduce((s, f) => s + f.size, 0) / 1024 / 1024).toFixed(1)}MB)`
                      : "선택한 파일 없음"}
                  </span>
                </div>
              </div>
            </FormField>

            {fileNames.length > 0 ? (
              <div className="mt-3 rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-3">
                <div className="ob-typo-caption text-(--oboon-text-muted)">
                  선택된 파일 ({files.length}개, 합계{" "}
                  {(
                    files.reduce((s, f) => s + f.size, 0) /
                    1024 /
                    1024
                  ).toFixed(1)}
                  MB)
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {files.map((f, index) => (
                    <span
                      key={`${f.name}-${index}`}
                      className="inline-flex items-center gap-1 rounded-full bg-(--oboon-bg-subtle) px-2 py-1 ob-typo-caption text-(--oboon-text-body)"
                    >
                      {f.name} ({(f.size / 1024 / 1024).toFixed(1)}MB)
                      <button
                        type="button"
                        onClick={() => removeSelectedPdfFile(index)}
                        className="rounded-full px-1 text-(--oboon-text-muted) hover:bg-(--oboon-border-default)/40 hover:text-(--oboon-text-title)"
                        aria-label={`${f.name} 제거`}
                        title="파일 제거"
                      >
                        ×
                      </button>
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
              {loading && (
                <span className="ml-2 text-(--oboon-text-muted)">
                  ({elapsedSeconds}초 경과)
                </span>
              )}
            </div>
          </div>
        </Card>

        {result ? (
          <div className="space-y-4">
            {checkingSimilar || similarCandidates.length > 0 ? (
              <Card className="p-5">
                <div className="ob-typo-subtitle text-(--oboon-text-title)">
                  현장명 자동 비교
                </div>
                <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                  추출 완료 후 유사 현장을 자동 탐색합니다.
                </div>

                {checkingSimilar ? (
                  <div className="mt-3 rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-3 ob-typo-body text-(--oboon-text-muted)">
                    유사 현장 자동 비교 중...
                  </div>
                ) : null}

                {similarCandidates.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-3 ob-typo-body text-(--oboon-text-title)">
                      유사한 현장이 있어요. 비교할 기존 현장을 선택하세요.
                    </div>

                    <div className="space-y-2">
                      {similarCandidates.map((candidate) => (
                        <button
                          key={candidate.id}
                          type="button"
                          onClick={() => setSelectedCandidateId(candidate.id)}
                          className={[
                            "w-full rounded-lg border p-3 text-left",
                            selectedCandidateId === candidate.id
                              ? "border-(--oboon-primary) bg-(--oboon-primary)/5"
                              : "border-(--oboon-border-default) bg-(--oboon-bg-surface)",
                          ].join(" ")}
                        >
                          <div className="ob-typo-body text-(--oboon-text-title)">
                            {candidate.name}
                          </div>
                          <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                            유사도 {(candidate.score * 100).toFixed(1)}% / 상태{" "}
                            {displayValue(candidate.status, "status")}
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={loadComparison}
                        loading={loadingComparison}
                        disabled={!selectedCandidateId}
                      >
                        다시 비교하기
                      </Button>
                    </div>
                  </div>
                ) : null}
              </Card>
            ) : null}

            {showNewPropertyAction ? (
              <Card className="p-5">
                <div className="ob-typo-subtitle text-(--oboon-text-title)">
                  유사 현장 없음
                </div>
                <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                  기존 유사 현장이 없어 새 현장으로 등록할 수 있습니다.
                </div>
                <div className="mt-3">
                  <Button
                    size="sm"
                    onClick={createNewPropertyFromExtract}
                    loading={creatingNewProperty}
                  >
                    새 현장 등록하기
                  </Button>
                </div>
              </Card>
            ) : null}

            <Card className="p-5">
              <div className="ob-typo-subtitle text-(--oboon-text-title)">
                PDF 더 올리기
              </div>
              <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                추가 PDF를 업로드하면 현재 추출 데이터에 병합됩니다. (최대
                100MB)
              </div>
              <input
                ref={additionalFileInputRef}
                type="file"
                accept="application/pdf"
                multiple
                className="sr-only"
                onChange={(e) => {
                  const selected = e.target.files
                    ? Array.from(e.target.files)
                    : [];
                  const totalSize = selected.reduce(
                    (sum, f) => sum + f.size,
                    0,
                  );
                  if (totalSize > 100 * 1024 * 1024) {
                    setStatus(
                      `PDF 합산 용량이 100MB를 초과합니다. (${(totalSize / 1024 / 1024).toFixed(1)}MB)`,
                    );
                    setStatusTone("danger");
                    e.target.value = "";
                    return;
                  }
                  setAdditionalFiles(selected);
                }}
              />
              <div className="mt-3 flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => additionalFileInputRef.current?.click()}
                >
                  추가 PDF 선택
                </Button>
                {additionalFiles.length > 0 && (
                  <>
                    <span className="ob-typo-caption text-(--oboon-text-muted)">
                      {additionalFiles.map((f) => f.name).join(", ")}
                    </span>
                    <Button
                      size="sm"
                      onClick={handleAdditionalPdf}
                      loading={additionalLoading}
                    >
                      추출 &amp; 병합
                    </Button>
                  </>
                )}
                {additionalLoading && (
                  <span className="ob-typo-caption text-(--oboon-text-muted)">
                    ({elapsedSeconds}초 경과)
                  </span>
                )}
              </div>
              <div className="mt-3 border-t border-(--oboon-border-default) pt-3">
                <div className="ob-typo-caption text-(--oboon-text-muted)">
                  이미지는 유지하고 텍스트 데이터만 다시 추출합니다.
                </div>
                <div className="mt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleTextOnlyReExtract}
                    loading={textOnlyLoading}
                  >
                    텍스트만 재추출
                  </Button>
                </div>
              </div>
            </Card>

            {existingSnapshot ? (
              <Card className="p-5">
                <div className="ob-typo-subtitle text-(--oboon-text-title)">
                  비교 결과 ({existingSnapshot.property.name})
                </div>

                {compareFields.length === 0 ? (
                  <div className="mt-3 rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-3 ob-typo-body text-(--oboon-text-muted)">
                    일치하는 값만 있어 추가 비교가 필요 없습니다.
                  </div>
                ) : (
                  <>
                    <div className="mt-3 overflow-x-auto rounded-lg border border-(--oboon-border-default)">
                      <table className="w-full min-w-[820px] table-fixed border-collapse">
                        <thead className="bg-(--oboon-bg-subtle)">
                          <tr>
                            <th className="w-28 border-b border-(--oboon-border-default) px-3 py-2 text-left ob-typo-caption text-(--oboon-text-muted)">
                              구분
                            </th>
                            <th className="w-36 border-b border-(--oboon-border-default) px-3 py-2 text-left ob-typo-caption text-(--oboon-text-muted)">
                              필드
                            </th>
                            <th className="w-1/2 border-b border-(--oboon-border-default) px-3 py-2 text-left ob-typo-caption text-(--oboon-text-muted)">
                              기존 값 유지
                            </th>
                            <th className="w-1/2 border-b border-(--oboon-border-default) px-3 py-2 text-left ob-typo-caption text-(--oboon-text-muted)">
                              AI 추출 값 반영
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {compareFields.map((field) => (
                            <tr key={field.key} className="align-top">
                              <td className="border-b border-(--oboon-border-default) px-3 py-3 ob-typo-caption text-(--oboon-text-muted)">
                                {field.sectionLabel}
                              </td>
                              <td className="border-b border-(--oboon-border-default) px-3 py-3 ob-typo-body text-(--oboon-text-title)">
                                {field.label}
                              </td>
                              <td className="border-b border-(--oboon-border-default) px-3 py-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectionMap((prev) => ({
                                      ...prev,
                                      [field.key]: "existing",
                                    }))
                                  }
                                  className={[
                                    "w-full rounded-lg border p-2 text-left whitespace-normal",
                                    selectionMap[field.key] === "existing"
                                      ? "border-(--oboon-primary) bg-(--oboon-primary)/5"
                                      : "border-(--oboon-border-default)",
                                  ].join(" ")}
                                >
                                  <div className="break-words ob-typo-body text-(--oboon-text-body)">
                                    {displayValue(
                                      field.existingValue,
                                      field.key,
                                    )}
                                  </div>
                                </button>
                              </td>
                              <td className="border-b border-(--oboon-border-default) px-3 py-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectionMap((prev) => ({
                                      ...prev,
                                      [field.key]: "incoming",
                                    }))
                                  }
                                  className={[
                                    "w-full rounded-lg border p-2 text-left whitespace-normal",
                                    selectionMap[field.key] === "incoming"
                                      ? "border-(--oboon-primary) bg-(--oboon-primary)/5"
                                      : "border-(--oboon-border-default)",
                                  ].join(" ")}
                                >
                                  <div className="break-words ob-typo-body text-(--oboon-text-body)">
                                    {displayValue(
                                      field.incomingValue,
                                      field.key,
                                    )}
                                  </div>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        onClick={applySelectedMerge}
                        loading={savingCompareMerge}
                      >
                        선택한 값 반영하기
                      </Button>
                    </div>
                  </>
                )}
              </Card>
            ) : null}

            {result._meta ? (
              <Card className="p-4">
                <div className="ob-typo-caption text-(--oboon-text-muted)">
                  PDF {result._meta.fileCount}개 / 텍스트{" "}
                  {result._meta.textLength.toLocaleString()}자
                  {result._meta.truncated ? " (일부만 분석됨)" : ""}
                  {result._meta.geocoded ? " / 지오코딩 완료" : ""}
                  {result._meta.imageStats && result._meta.imageStats.imagesExtracted > 0
                    ? ` / 이미지 ${result._meta.imageStats.imagesExtracted}장 추출 성공`
                    : ""}
                </div>
              </Card>
            ) : null}

            {/* PDF에서 추출된 이미지 (현장사진 위에 배치) */}
            {extractedImages.length > 0 && (
              <Section title={`추출된 이미지 (${extractedImages.length}개)`}>
                <div className="space-y-3">
                  <p className="ob-typo-caption text-(--oboon-text-muted)">
                    PDF에서 추출한 이미지를 어디에 사용할지 선택하세요. 이미지를 클릭하면 크게 볼 수 있습니다.
                  </p>
                  <div className="space-y-2">
                    {extractedImages.map((img, idx) => (
                      <div
                        key={img.id}
                        className="flex gap-3 rounded-lg border border-(--oboon-border-default) bg-white p-3"
                      >
                        {/* 이미지 미리보기 (왼쪽) — 클릭 시 확대 */}
                        <div
                          className="relative h-28 w-36 shrink-0 cursor-pointer overflow-hidden rounded"
                          onClick={() => setPreviewImage(img.base64)}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeExtractedImage(idx);
                            }}
                            className="absolute top-1 right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-red-500"
                            title="이미지 제거"
                          >
                            ×
                          </button>
                          <Image
                            src={img.base64}
                            alt={`추출 이미지 ${idx + 1}`}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>

                        {/* 선택 옵션 (오른쪽) */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <label className="ob-typo-caption font-medium text-(--oboon-text-title) w-20">
                              이미지 용도
                            </label>
                            <select
                              value={img.destination}
                              onChange={(e) =>
                                updateImageDestination(idx, e.target.value)
                              }
                              className="flex-1 rounded border border-(--oboon-border-default) px-2 py-1.5 ob-typo-body"
                            >
                              <option value="none">사용 안 함</option>
                              <option value="main">대표 이미지</option>
                              <option value="gallery">추가 현장사진</option>
                              <option value="floor_plan">평면도</option>
                            </select>
                          </div>

                          {/* 평면도 선택 시: 타입 선택 */}
                          {img.destination === "floor_plan" && (
                            <div className="flex items-center gap-2">
                              <label className="ob-typo-caption font-medium text-(--oboon-text-title) w-20">
                                평면 타입
                              </label>
                              <select
                                value={img.unitTypeIndex ?? ""}
                                onChange={(e) =>
                                  updateImageUnitType(
                                    idx,
                                    parseInt(e.target.value),
                                  )
                                }
                                className="flex-1 rounded border border-(--oboon-border-default) px-2 py-1.5 ob-typo-body"
                              >
                                <option value="">타입 선택</option>
                                {result?.unit_types?.map((type, i) => (
                                  <option key={i} value={i}>
                                    {type.type_name ||
                                      `${type.exclusive_area}㎡`}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* 상태 표시 */}
                          <div className="ob-typo-caption text-(--oboon-text-muted)">
                            {img.destination === "none" && "미사용"}
                            {img.destination === "main" &&
                              "✓ 대표 이미지로 설정됨"}
                            {img.destination === "gallery" &&
                              "✓ 현장사진에 추가됨"}
                            {img.destination === "floor_plan" &&
                              img.unitTypeIndex !== undefined &&
                              `✓ ${
                                result?.unit_types?.[img.unitTypeIndex]
                                  ?.type_name || "평면도"
                              }에 배치됨`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>
            )}

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
                      onChange={(e) =>
                        handleGalleryImagesChange(e.target.files)
                      }
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
              <Row
                label="현장명"
                value={val(result.properties?.name)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "properties",
                    "name",
                    normalizeTextInput(value),
                  )
                }
              />
              <Row
                label="분양 유형"
                value={val(result.properties?.property_type)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "properties",
                    "property_type",
                    normalizeTextInput(value),
                  )
                }
              />
              <Row
                label="분양 상태"
                value={val(result.properties?.status)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "properties",
                    "status",
                    normalizeTextInput(value)?.toUpperCase() ?? null,
                  )
                }
              />
              <Row
                label="설명"
                value={val(result.properties?.description)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "properties",
                    "description",
                    normalizeTextInput(value),
                  )
                }
              />
            </Section>

            <Section title="사업 개요">
              <Row
                label="시행사"
                value={val(result.specs?.developer)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "specs",
                    "developer",
                    normalizeTextInput(value),
                  )
                }
              />
              <Row
                label="시공사"
                value={val(result.specs?.builder)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "specs",
                    "builder",
                    normalizeTextInput(value),
                  )
                }
              />
              <Row
                label="신탁사"
                value={val(result.specs?.trust_company)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "specs",
                    "trust_company",
                    normalizeTextInput(value),
                  )
                }
              />
              <Row
                label="분양 방식"
                value={val(result.specs?.sale_type)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "specs",
                    "sale_type",
                    normalizeTextInput(value),
                  )
                }
              />
              <Row
                label="용도지역"
                value={val(result.specs?.land_use_zone)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "specs",
                    "land_use_zone",
                    normalizeTextInput(value),
                  )
                }
              />
              <Row
                label="대지면적"
                value={val(result.specs?.site_area)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "specs",
                    "site_area",
                    toNullableNumberInput(value),
                  )
                }
              />
              <Row
                label="건축면적"
                value={val(result.specs?.building_area)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "specs",
                    "building_area",
                    toNullableNumberInput(value),
                  )
                }
              />
              <Row
                label="지하층"
                value={val(result.specs?.floor_underground)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "specs",
                    "floor_underground",
                    toNullableNumberInput(value),
                  )
                }
              />
              <Row
                label="지상층"
                value={val(result.specs?.floor_ground)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "specs",
                    "floor_ground",
                    toNullableNumberInput(value),
                  )
                }
              />
              <Row
                label="동 수"
                value={val(result.specs?.building_count)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "specs",
                    "building_count",
                    toNullableNumberInput(value),
                  )
                }
              />
              <Row
                label="총 세대수"
                value={val(result.specs?.household_total)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "specs",
                    "household_total",
                    toNullableNumberInput(value),
                  )
                }
              />
              <Row
                label="총 주차대수"
                value={val(result.specs?.parking_total)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "specs",
                    "parking_total",
                    toNullableNumberInput(value),
                  )
                }
              />
              <Row
                label="세대당 주차"
                value={val(result.specs?.parking_per_household)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "specs",
                    "parking_per_household",
                    toNullableNumberInput(value),
                  )
                }
              />
              <Row
                label="난방"
                value={val(result.specs?.heating_type)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "specs",
                    "heating_type",
                    normalizeTextInput(value),
                  )
                }
              />
              <Row
                label="용적률"
                value={val(result.specs?.floor_area_ratio)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "specs",
                    "floor_area_ratio",
                    toNullableNumberInput(value),
                  )
                }
              />
              <Row
                label="건폐율"
                value={val(result.specs?.building_coverage_ratio)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "specs",
                    "building_coverage_ratio",
                    toNullableNumberInput(value),
                  )
                }
              />
              <Row
                label="부대시설"
                value={val(result.specs?.amenities)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "specs",
                    "amenities",
                    normalizeTextInput(value),
                  )
                }
              />
            </Section>

            <Section title="일정">
              <Row
                label="모집공고일"
                value={val(result.timeline?.announcement_date)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "timeline",
                    "announcement_date",
                    normalizeTextInput(value),
                  )
                }
              />
              <Row
                label="청약 시작"
                value={val(result.timeline?.application_start)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "timeline",
                    "application_start",
                    normalizeTextInput(value),
                  )
                }
              />
              <Row
                label="청약 종료"
                value={val(result.timeline?.application_end)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "timeline",
                    "application_end",
                    normalizeTextInput(value),
                  )
                }
              />
              <Row
                label="당첨자 발표"
                value={val(result.timeline?.winner_announce)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "timeline",
                    "winner_announce",
                    normalizeTextInput(value),
                  )
                }
              />
              <Row
                label="계약 시작"
                value={val(result.timeline?.contract_start)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "timeline",
                    "contract_start",
                    normalizeTextInput(value),
                  )
                }
              />
              <Row
                label="계약 종료"
                value={val(result.timeline?.contract_end)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "timeline",
                    "contract_end",
                    normalizeTextInput(value),
                  )
                }
              />
              <Row
                label="입주 예정"
                value={val(result.timeline?.move_in_date)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "timeline",
                    "move_in_date",
                    normalizeTextInput(value),
                  )
                }
              />
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
                          <EditableText
                            value={val(u?.type_name)}
                            center
                            onCommit={(value) =>
                              updateResultUnitField(
                                i,
                                "type_name",
                                normalizeTextInput(value),
                              )
                            }
                          />
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
                                    u.floor_plan_url || u.image_url || "",
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
                          <EditableText
                            value={val(u?.exclusive_area)}
                            center
                            onCommit={(value) =>
                              updateResultUnitField(
                                i,
                                "exclusive_area",
                                toNullableNumberInput(value),
                              )
                            }
                          />
                        </td>
                        <td className="border border-(--oboon-border-default) px-2 py-2">
                          <EditableText
                            value={val(u?.supply_area)}
                            center
                            onCommit={(value) =>
                              updateResultUnitField(
                                i,
                                "supply_area",
                                toNullableNumberInput(value),
                              )
                            }
                          />
                        </td>
                        <td className="border border-(--oboon-border-default) px-2 py-2">
                          <EditableText
                            value={val(u?.rooms)}
                            center
                            onCommit={(value) =>
                              updateResultUnitField(
                                i,
                                "rooms",
                                toNullableNumberInput(value),
                              )
                            }
                          />
                        </td>
                        <td className="border border-(--oboon-border-default) px-2 py-2">
                          <EditableText
                            value={val(u?.bathrooms)}
                            center
                            onCommit={(value) =>
                              updateResultUnitField(
                                i,
                                "bathrooms",
                                toNullableNumberInput(value),
                              )
                            }
                          />
                        </td>
                        <td className="border border-(--oboon-border-default) px-2 py-2">
                          <EditableText
                            value={val(u?.building_layout)}
                            center
                            onCommit={(value) =>
                              updateResultUnitField(
                                i,
                                "building_layout",
                                normalizeTextInput(value),
                              )
                            }
                          />
                        </td>
                        <td className="border border-(--oboon-border-default) px-2 py-2">
                          <EditableText
                            value={val(u?.orientation)}
                            center
                            onCommit={(value) =>
                              updateResultUnitField(
                                i,
                                "orientation",
                                normalizeTextInput(value),
                              )
                            }
                          />
                        </td>
                        <td className="border border-(--oboon-border-default) px-2 py-2">
                          <EditableText
                            value={val(u?.supply_count)}
                            center
                            onCommit={(value) =>
                              updateResultUnitField(
                                i,
                                "supply_count",
                                toNullableNumberInput(value),
                              )
                            }
                          />
                        </td>
                        <td className="border border-(--oboon-border-default) px-2 py-2">
                          <EditableText
                            value={
                              u && (u.price_min != null || u.price_max != null)
                                ? `${u.price_min?.toLocaleString() ?? "?"} ~ ${u.price_max?.toLocaleString() ?? "?"}`
                                : "-"
                            }
                            center
                            onCommit={(value) => {
                              const parsed = parsePriceRangeInput(value);
                              updateResultUnitField(i, "price_min", parsed.min);
                              updateResultUnitField(i, "price_max", parsed.max);
                            }}
                          />
                        </td>
                        <td className="border border-(--oboon-border-default) px-2 py-2">
                          <EditableText
                            value={val(u?.unit_count)}
                            center
                            onCommit={(value) =>
                              updateResultUnitField(
                                i,
                                "unit_count",
                                toNullableNumberInput(value),
                              )
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="위치">
              <Row
                label="도로명 주소"
                value={val(result.location?.road_address)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "location",
                    "road_address",
                    normalizeTextInput(value),
                  )
                }
              />
              <Row
                label="지번 주소"
                value={val(result.location?.jibun_address)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "location",
                    "jibun_address",
                    normalizeTextInput(value),
                  )
                }
              />
              <Row
                label="시/도"
                value={val(result.location?.region_1depth)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "location",
                    "region_1depth",
                    normalizeTextInput(value),
                  )
                }
              />
              <Row
                label="시/군/구"
                value={val(result.location?.region_2depth)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "location",
                    "region_2depth",
                    normalizeTextInput(value),
                  )
                }
              />
              <Row
                label="읍/면/동"
                value={val(result.location?.region_3depth)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "location",
                    "region_3depth",
                    normalizeTextInput(value),
                  )
                }
              />
              <Row
                label="위도"
                value={val(result.location?.lat)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "location",
                    "lat",
                    toNullableNumberInput(value),
                  )
                }
              />
              <Row
                label="경도"
                value={val(result.location?.lng)}
                onCommit={(value) =>
                  updateResultSectionField(
                    "location",
                    "lng",
                    toNullableNumberInput(value),
                  )
                }
              />

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
                {(result.facilities.length > 0
                  ? result.facilities
                  : [null]
                ).map((f: ExtractFacilityType | null, i: number) => (
                  <div
                    key={`${f?.name ?? "facility"}-${i}`}
                    className="rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-3"
                  >
                    <div className="ob-typo-body text-(--oboon-text-title)">
                      유형:{" "}
                      <EditableText
                        value={f?.type ?? "-"}
                        onCommit={(value) =>
                          updateResultFacilityField(
                            i,
                            "type",
                            normalizeTextInput(value),
                          )
                        }
                      />
                    </div>
                    <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                      명칭:{" "}
                      <EditableText
                        value={f?.name ?? "-"}
                        onCommit={(value) =>
                          updateResultFacilityField(
                            i,
                            "name",
                            normalizeTextInput(value),
                          )
                        }
                      />
                    </div>
                    <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                      주소:{" "}
                      <EditableText
                        value={f?.road_address ?? "-"}
                        onCommit={(value) =>
                          updateResultFacilityField(
                            i,
                            "road_address",
                            normalizeTextInput(value),
                          )
                        }
                      />
                    </div>
                    <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                      운영 시작:{" "}
                      <EditableText
                        value={f?.open_start ?? "-"}
                        onCommit={(value) =>
                          updateResultFacilityField(
                            i,
                            "open_start",
                            normalizeTextInput(value),
                          )
                        }
                      />
                    </div>
                    <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                      운영 종료:{" "}
                      <EditableText
                        value={f?.open_end ?? "-"}
                        onCommit={(value) =>
                          updateResultFacilityField(
                            i,
                            "open_end",
                            normalizeTextInput(value),
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
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
      {/* 이미지 확대 모달 */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <Image
              src={previewImage}
              alt="확대 이미지"
              width={1280}
              height={800}
              className="max-h-[90vh] w-auto rounded-lg object-contain"
              unoptimized
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold shadow-lg"
            >
              X
            </button>
          </div>
        </div>
      )}
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
  onCommit,
}: {
  label: string;
  value: string;
  editable?: boolean;
  onCommit?: (nextValue: string) => void;
}) {
  return (
    <div className="flex gap-3 border-b border-(--oboon-border-default) py-2 last:border-b-0">
      <span className="w-30 shrink-0 ob-typo-caption text-(--oboon-text-muted)">
        {label}
      </span>
      <EditableText value={value} editable={editable} onCommit={onCommit} />
    </div>
  );
}

function EditableText({
  value,
  center = false,
  editable = true,
  onCommit,
}: {
  value: string;
  center?: boolean;
  editable?: boolean;
  onCommit?: (nextValue: string) => void;
}) {
  const normalizeValue = (v: string) => (v === "-" ? "" : v);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(normalizeValue(value));
  const commit = () => {
    setEditing(false);
    onCommit?.(draft.trim());
  };

  useEffect(() => {
    if (!editing) {
      setDraft(normalizeValue(value));
    }
  }, [value, editing]);

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
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
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
