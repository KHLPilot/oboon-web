"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { ChevronDown, Upload } from "lucide-react";
import type { PropertyExtractionData } from "@/lib/schema/property-schema";
import NaverMap, { type MapMarker } from "@/features/map/components/NaverMap";
import { createSupabaseClient } from "@/lib/supabaseClient";

type ExtractResult = PropertyExtractionData & {
  responseVersion?: number;
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
    classificationFailed?: boolean;
    filesMeta?: Array<{
      fileName: string;
      sizeBytes: number;
      pages: number | null;
      textLength: number;
      textExtracted: boolean;
      extractedImageCount: number;
      renderedImageCount: number;
    }>;
  };
};

type ExtractUnitType = PropertyExtractionData["unit_types"][number];
type ExtractUnitTypeExtended = ExtractUnitType & {
  unit_type_id?: number | null;
  building_layout?: string | null;
  orientation?: string | null;
  supply_count?: number | null;
  floor_plan_url?: string | null;
  image_url?: string | null;
  is_price_public?: boolean | null;
  is_public?: boolean | null;
};
type ExtractFacilityType = PropertyExtractionData["facilities"][number];
type ExtractFacilityWithCoords = ExtractFacilityType & {
  lat?: unknown;
  lng?: unknown;
  address_detail?: unknown;
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
    image_url?: string | null;
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
    move_in_text?: string | null;
  } | null;
  images: {
    main_image_url: string | null;
    main_image_hash: string | null;
    existing_hashes: string[];
    existing_dct_phashes: string[];
    existing_image_urls: string[];
    asset_hash_by_url: Record<string, string>;
    asset_dct_phash_by_url: Record<string, string>;
    gallery: Array<{
      id: string;
      image_url: string;
      sort_order: number | null;
      caption: string | null;
      image_hash: string | null;
    }>;
  };
  unit_types: Array<{
    id: number;
    type_name: string | null;
    exclusive_area: number | null;
    supply_area: number | null;
    rooms: number | null;
    bathrooms: number | null;
    building_layout: string | null;
    orientation: string | null;
    supply_count: number | null;
    price_min: number | null;
    price_max: number | null;
    unit_count: number | null;
    floor_plan_url: string | null;
    is_price_public: boolean | null;
    is_public: boolean | null;
  }>;
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

const NUMERIC_COMPARE_KEYS = new Set([
  "specs.site_area",
  "specs.building_area",
  "specs.floor_ground",
  "specs.floor_underground",
  "specs.building_count",
  "specs.household_total",
  "specs.parking_total",
  "specs.parking_per_household",
  "specs.floor_area_ratio",
  "specs.building_coverage_ratio",
]);

type UnitMergePreviewCandidate = {
  leftIndex: number;
  rightIndex: number;
  score: number;
  nameNumberScore: number;
  columnScore: number;
};
type UnitConflictSource = "left" | "right";
type UnitConflictField = {
  key: string;
  label: string;
  leftIndex: number;
  rightIndex: number;
  leftValue: unknown;
  rightValue: unknown;
};
type ExistingSnapshotImageCard = {
  key: string;
  url: string;
  label: string;
  hash: string | null;
  dctPHash: string | null;
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
  "세대수",
  "분양가(만원)",
  "가격 공개",
  "타입 공개",
  "삭제",
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

  if (
    lower.includes("access-control-allow-origin") ||
    lower.includes("cors") ||
    lower.includes("origin https://oboon.co.kr is not allowed")
  ) {
    return "R2 CORS 설정으로 인해 PDF 업로드가 차단되었습니다. 버킷 CORS에 https://oboon.co.kr, https://www.oboon.co.kr 를 추가하고 PUT/GET/HEAD 메서드를 허용해주세요.";
  }

  if (lower.includes("network") || lower.includes("failed to fetch")) {
    return "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.";
  }

  if (raw.startsWith("서버 에러:")) {
    return `${raw} (서버 처리 중 오류가 발생했습니다.)`;
  }

  return raw;
}

function extractImageHashFromCaption(caption: string | null | undefined) {
  if (!caption) return null;
  const normalized = caption.trim().toLowerCase();
  const match = normalized.match(/extract-hash:\s*([a-f0-9]{64})/);
  return match?.[1] ?? null;
}

function extractImageDctPHashFromCaption(caption: string | null | undefined) {
  if (!caption) return null;
  const normalized = caption.trim().toLowerCase();
  const match = normalized.match(/extract-phash-dct:\s*([a-f0-9]{16})/);
  return match?.[1] ?? null;
}

function extractImageHashFromUrl(imageUrl: string | null | undefined) {
  if (!imageUrl) return null;
  const normalized = imageUrl.trim().toLowerCase();
  const match = normalized.match(/([a-f0-9]{64})/);
  return match?.[1] ?? null;
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

function toNumberOrNullLoose(value: unknown) {
  const strict = toNumberOrNull(value);
  if (strict != null) return strict;
  if (typeof value !== "string") return null;
  const match = value.match(/-?\d[\d,]*(?:\.\d+)?/);
  if (!match?.[0]) return null;
  return toNumberOrNull(match[0]);
}

function toManwonFromWon(value: unknown) {
  if (value == null || value === "") return null;
  const num = typeof value === "number" ? value : Number(String(value).replaceAll(",", ""));
  if (!Number.isFinite(num)) return null;
  return Math.round((num / 10000) * 100) / 100;
}

function normalizePriceRange<T extends number | null>(min: T, max: T) {
  if (typeof min === "number" && typeof max === "number" && min > max) {
    return { min: max as T, max: min as T };
  }
  return { min, max };
}

function hammingDistanceHex64(left: string, right: string) {
  if (left.length !== 16 || right.length !== 16) return Number.POSITIVE_INFINITY;
  let distance = 0;
  for (let i = 0; i < 16; i += 1) {
    const l = parseInt(left[i], 16);
    const r = parseInt(right[i], 16);
    if (Number.isNaN(l) || Number.isNaN(r)) return Number.POSITIVE_INFINITY;
    const xor = l ^ r;
    distance += xor.toString(2).split("1").length - 1;
  }
  return distance;
}

function toWonFromManwon(value: unknown) {
  const manwon = toNumberOrNull(value);
  if (manwon == null) return null;
  return Math.round(manwon * 10000);
}

function sanitizePercentInput(value: string): string {
  const onlyAllowed = value.replace(/[^\d.]/g, "");
  const [head, ...tail] = onlyAllowed.split(".");
  return tail.length > 0 ? `${head}.${tail.join("")}` : head;
}

function parsePercentToRatio(value: string): number | null {
  const normalized = value.replaceAll(",", "").trim();
  if (!normalized) return null;
  const percent = Number(normalized);
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) return null;
  return Math.round((percent / 100) * 10000) / 10000;
}

function formatRatioToPercentText(value: unknown): string {
  const parsed = toNumberOrNull(value);
  if (parsed == null || parsed <= 0) return "";
  const percent = parsed <= 1 ? parsed * 100 : parsed;
  const rounded = Math.round(percent * 100) / 100;
  return String(rounded).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}

function formatTransferRestrictionText(
  value: boolean | null,
  period: string | null,
): string {
  if (typeof period === "string" && period.trim().length > 0) {
    return period.trim();
  }
  if (value === true) return "있음";
  if (value === false) return "없음";
  return "미설정";
}

function parseTransferRestrictionText(value: string): {
  transferRestriction: boolean | null;
  transferRestrictionPeriod: string | null;
} {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return { transferRestriction: null, transferRestrictionPeriod: null };
  }
  if (["있음", "예", "yes", "y", "true", "1"].includes(normalized)) {
    return { transferRestriction: true, transferRestrictionPeriod: null };
  }
  if (["없음", "아니오", "no", "n", "false", "0"].includes(normalized)) {
    return { transferRestriction: false, transferRestrictionPeriod: null };
  }
  if (["미설정", "null", "-", "unknown"].includes(normalized)) {
    return { transferRestriction: null, transferRestrictionPeriod: null };
  }
  return {
    transferRestriction: true,
    transferRestrictionPeriod: value.trim(),
  };
}

function normalizeEvidenceFieldPath(path: string) {
  return path.trim().replace(/\[\d+\]/g, "");
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
  const noSpace = status.replace(/\s+/g, "");
  if (noSpace === "분양예정" || noSpace === "예정") return "READY";
  if (noSpace === "분양중" || noSpace === "진행중" || noSpace === "중") {
    return "OPEN";
  }
  if (noSpace === "분양종료" || noSpace === "종료") return "CLOSED";
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

function normalizeFacilityOpenDateForDb(value: unknown): string | null {
  const normalized = normalizeComparableValue(value);
  if (typeof normalized !== "string") return null;

  const compact = normalized.trim();
  if (!compact) return null;

  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(compact)) return compact;
  if (/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(compact)) {
    const [year, month, day] = compact.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const isValid =
      date.getUTCFullYear() === year &&
      date.getUTCMonth() + 1 === month &&
      date.getUTCDate() === day;
    return isValid ? compact : null;
  }

  const dotted = compact.match(
    /^(\d{4})[./\s년]+(0?[1-9]|1[0-2])(?:[./\s월]+(0?[1-9]|[12]\d|3[01]))?일?$/,
  );
  if (!dotted) return null;
  const year = Number(dotted[1]);
  const month = Number(dotted[2]);
  const day = dotted[3] ? Number(dotted[3]) : null;

  if (day == null) {
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  const isValid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day;
  if (!isValid) return null;

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function splitFacilityRoadAddress(value: unknown): {
  roadAddress: string | null;
  addressDetail: string | null;
} {
  const raw = String(normalizeComparableValue(value) ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (!raw) return { roadAddress: null, addressDetail: null };

  const commaIndex = raw.indexOf(",");
  if (commaIndex > 0) {
    return {
      roadAddress: raw.slice(0, commaIndex).trim() || null,
      addressDetail: raw.slice(commaIndex + 1).trim() || null,
    };
  }

  const trailingDetailMatch = raw.match(
    /^(.*\d)\s+((?:지하\s*)?B?\d+\s*층(?:\s+.*)?|\d+\s*호(?:\s+.*)?)$/i,
  );
  if (trailingDetailMatch) {
    return {
      roadAddress: trailingDetailMatch[1].trim() || null,
      addressDetail: trailingDetailMatch[2].trim() || null,
    };
  }

  return { roadAddress: raw, addressDetail: null };
}

function normalizeFacilitySyncKeyPart(value: unknown) {
  return String(normalizeComparableValue(value) ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
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

function normalizeLooseText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^0-9a-z가-힣]/gi, "");
}

function extractNumberTokens(value: unknown) {
  const raw = String(value ?? "");
  const matches = raw.match(/\d+(?:\.\d+)?/g) ?? [];
  return Array.from(new Set(matches));
}

function jaccardScore(tokensA: string[], tokensB: string[]) {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const a = new Set(tokensA);
  const b = new Set(tokensB);
  let intersection = 0;
  a.forEach((token) => {
    if (b.has(token)) intersection += 1;
  });
  const union = new Set([...tokensA, ...tokensB]).size;
  return union === 0 ? 0 : intersection / union;
}

function numericFieldScore(a: unknown, b: unknown, toleranceRatio = 0.03) {
  const na = toNumberOrNull(a);
  const nb = toNumberOrNull(b);
  if (na == null || nb == null) return null;
  if (na === nb) return 1;
  const base = Math.max(Math.abs(na), Math.abs(nb), 1);
  const diffRatio = Math.abs(na - nb) / base;
  if (diffRatio <= toleranceRatio) return 0.85;
  if (diffRatio <= toleranceRatio * 2) return 0.6;
  return 0;
}

function textFieldScore(a: unknown, b: unknown) {
  const ta = normalizeLooseText(a);
  const tb = normalizeLooseText(b);
  if (!ta || !tb) return null;
  if (ta === tb) return 1;
  if (ta.includes(tb) || tb.includes(ta)) return 0.65;
  return 0;
}

function buildUnitMergePreviewCandidates(units: ExtractUnitTypeExtended[]) {
  const out: UnitMergePreviewCandidate[] = [];
  for (let i = 0; i < units.length; i += 1) {
    for (let j = i + 1; j < units.length; j += 1) {
      const left = units[i];
      const right = units[j];

      const nameNumberScore = jaccardScore(
        extractNumberTokens(left.type_name),
        extractNumberTokens(right.type_name),
      );
      if (nameNumberScore <= 0) continue;

      const fieldScores: number[] = [];
      const pushScore = (score: number | null) => {
        if (score != null) fieldScores.push(score);
      };

      pushScore(numericFieldScore(left.exclusive_area, right.exclusive_area, 0.02));
      pushScore(numericFieldScore(left.supply_area, right.supply_area, 0.02));
      pushScore(numericFieldScore(left.rooms, right.rooms, 0));
      pushScore(numericFieldScore(left.bathrooms, right.bathrooms, 0));
      pushScore(numericFieldScore(left.price_min, right.price_min, 0.05));
      pushScore(numericFieldScore(left.price_max, right.price_max, 0.05));
      pushScore(numericFieldScore(left.unit_count, right.unit_count, 0.08));
      pushScore(numericFieldScore(left.supply_count, right.supply_count, 0.08));
      pushScore(textFieldScore(left.building_layout, right.building_layout));
      pushScore(textFieldScore(left.orientation, right.orientation));

      const columnScore =
        fieldScores.length > 0
          ? fieldScores.reduce((sum, score) => sum + score, 0) /
            fieldScores.length
          : 0;

      const finalScore = nameNumberScore * 0.45 + columnScore * 0.55;
      if (finalScore < 0.78) continue;

      out.push({
        leftIndex: i,
        rightIndex: j,
        score: finalScore,
        nameNumberScore,
        columnScore,
      });
    }
  }

  return out.sort((a, b) => b.score - a.score);
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
  const koreanYmd = raw.match(/^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일(?:\s*예정)?$/);
  if (koreanYmd) {
    const year = koreanYmd[1];
    const month = koreanYmd[2].padStart(2, "0");
    const day = koreanYmd[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const koreanYm = raw.match(/^(\d{4})년\s*(\d{1,2})월(?:\s*예정)?$/);
  if (koreanYm) {
    const year = koreanYm[1];
    const month = koreanYm[2].padStart(2, "0");
    return `${year}-${month}-01`;
  }
  const dottedYmd = raw.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})(?:\s*예정)?$/);
  if (dottedYmd) {
    const year = dottedYmd[1];
    const month = dottedYmd[2].padStart(2, "0");
    const day = dottedYmd[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const dottedYm = raw.match(/^(\d{4})[./](\d{1,2})(?:\s*예정)?$/);
  if (dottedYm) {
    const year = dottedYm[1];
    const month = dottedYm[2].padStart(2, "0");
    return `${year}-${month}-01`;
  }
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
      existingValue: existing.timeline?.move_in_text ?? existing.timeline?.move_in_date,
      incomingValue: incoming.timeline?.move_in_date,
    },
  ];

  return fields.filter(
    (field) => !isSameValue(field.existingValue, field.incomingValue),
  );
}

export default function TestUploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [allUploadedFiles, setAllUploadedFiles] = useState<File[]>([]);
  const [status, setStatus] = useState("PDF를 선택하거나 파일을 드래그앤드롭 하세요.");
  const [statusTone, setStatusTone] = useState<StatusTone>("idle");
  const [isPrimaryDropActive, setIsPrimaryDropActive] = useState(false);
  const [loading, setLoading] = useState(false);
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
  const modelhouseMainImageInputRef = useRef<HTMLInputElement>(null);
  const modelhouseGalleryImageInputRef = useRef<HTMLInputElement>(null);
  const [mainImageUrl, setMainImageUrl] = useState("");
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [galleryImageUrls, setGalleryImageUrls] = useState<string[]>([]);
  const [galleryImageFiles, setGalleryImageFiles] = useState<File[]>([]);
  const [modelhouseMainImageUrl, setModelhouseMainImageUrl] = useState("");
  const [modelhouseMainImageFile, setModelhouseMainImageFile] =
    useState<File | null>(null);
  const [modelhouseGalleryImageUrls, setModelhouseGalleryImageUrls] = useState<
    string[]
  >([]);
  const [modelhouseGalleryImageFiles, setModelhouseGalleryImageFiles] =
    useState<File[]>([]);
  const [validationContractRatioPercent, setValidationContractRatioPercent] =
    useState("");
  const [validationTransferRestriction, setValidationTransferRestriction] =
    useState<boolean | null>(null);
  const [
    validationTransferRestrictionPeriod,
    setValidationTransferRestrictionPeriod,
  ] = useState<string | null>(null);

  // PDF에서 추출된 이미지 (A안: 이미지 추출)
  type ExtractedImageWithDestination = {
    localKey: string;
    id: string;
    base64: string;
    source: string;
    aiType?: "building" | "floor_plan" | "other";
    destination:
      | "none"
      | "main"
      | "gallery"
      | "modelhouse_main"
      | "modelhouse_gallery"
      | "floor_plan";
    unitTypeIndex?: number;
    unitTypeId?: number;
  };
  const [extractedImages, setExtractedImages] = useState<
    ExtractedImageWithDestination[]
  >([]);
  const extractedShaCacheRef = useRef<Map<string, string>>(new Map());
  const extractedDctPHashCacheRef = useRef<Map<string, string>>(new Map());
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const pendingFloorPlanClearUnitTypeIdsRef = useRef<Set<number>>(new Set());

  const mainImageUrlRef = useRef<string>("");
  const galleryImageUrlsRef = useRef<string[]>([]);
  const modelhouseMainImageUrlRef = useRef<string>("");
  const modelhouseGalleryImageUrlsRef = useRef<string[]>([]);

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
  const [createdPropertyId, setCreatedPropertyId] = useState<number | null>(
    null,
  );
  const [showNewPropertyAction, setShowNewPropertyAction] = useState(false);
  const additionalFileInputRef = useRef<HTMLInputElement>(null);
  const [additionalLoading, setAdditionalLoading] = useState(false);
  const [textOnlyLoading, setTextOnlyLoading] = useState(false);
  const [duplicateExtractedImageKeys, setDuplicateExtractedImageKeys] =
    useState<string[]>([]);
  const [nearDuplicateDistanceByImageKey, setNearDuplicateDistanceByImageKey] =
    useState<Record<string, number>>({});
  const [matchedExistingImageKeys, setMatchedExistingImageKeys] = useState<
    string[]
  >([]);
  const [nearMatchedExistingImageKeys, setNearMatchedExistingImageKeys] =
    useState<string[]>([]);
  const [showNearDuplicateOnly, setShowNearDuplicateOnly] = useState(false);
  const [dismissedMergeCandidateKeys, setDismissedMergeCandidateKeys] = useState<
    string[]
  >([]);
  const [hideUnitMergeRecommendations, setHideUnitMergeRecommendations] =
    useState(false);
  const [analysisInProgress, setAnalysisInProgress] = useState(false);
  const [analysisFileCount, setAnalysisFileCount] = useState(0);
  const [analysisElapsedSec, setAnalysisElapsedSec] = useState(0);

  // 이 화면은 대형 표/미리보기 블록이 많아 문서 가로폭이 늘어나기 쉬워
  // 페이지 단위로만 가로 스크롤을 차단한다.
  useEffect(() => {
    const prevBodyOverflowX = document.body.style.overflowX;
    const prevHtmlOverflowX = document.documentElement.style.overflowX;
    document.body.style.overflowX = "hidden";
    document.documentElement.style.overflowX = "hidden";

    return () => {
      document.body.style.overflowX = prevBodyOverflowX;
      document.documentElement.style.overflowX = prevHtmlOverflowX;
    };
  }, []);
  const [editBaselineVersion, setEditBaselineVersion] = useState(0);
  const analysisTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [selectedUnitMergeRows, setSelectedUnitMergeRows] = useState<number[]>(
    [],
  );
  const [unitConflictFields, setUnitConflictFields] = useState<UnitConflictField[]>(
    [],
  );
  const [unitConflictSelection, setUnitConflictSelection] = useState<
    Record<string, UnitConflictSource>
  >({});
  const [draggedUnitRowIndex, setDraggedUnitRowIndex] = useState<number | null>(
    null,
  );
  const [dragOverUnitRowIndex, setDragOverUnitRowIndex] = useState<number | null>(
    null,
  );
  const destinationOptions: Array<{
    value: ExtractedImageWithDestination["destination"];
    label: string;
  }> = [
    { value: "none", label: "사용 안 함" },
    { value: "main", label: "대표 이미지" },
    { value: "gallery", label: "추가 현장사진" },
    { value: "modelhouse_main", label: "모델하우스 대표" },
    { value: "modelhouse_gallery", label: "모델하우스 추가" },
    { value: "floor_plan", label: "평면도" },
  ];

  const applyPrimaryPdfFiles = useCallback(
    (selected: File[]) => {
      if (selected.length === 0) return;

      const pdfFiles = selected.filter(
        (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
      );

      if (pdfFiles.length !== selected.length) {
        setStatus("PDF 파일만 업로드할 수 있습니다.");
        setStatusTone("danger");
        return;
      }

      const totalSize = pdfFiles.reduce((sum, f) => sum + f.size, 0);
      if (totalSize > 150 * 1024 * 1024) {
        setStatus(
          `PDF 합산 용량이 150MB를 초과합니다. (${(totalSize / 1024 / 1024).toFixed(1)}MB)`,
        );
        setStatusTone("danger");
        return;
      }

      setFiles(pdfFiles);
      setStatusTone("idle");
    },
    [],
  );

  const fileNames = useMemo(() => files.map((f) => f.name), [files]);
  const webEvidenceFieldPathSet = useMemo(() => {
    const paths = new Set<string>();
    (result?.web_evidence ?? []).forEach((item) => {
      const rawPath = typeof item?.field_path === "string" ? item.field_path : "";
      const normalized = normalizeEvidenceFieldPath(rawPath);
      if (normalized) paths.add(normalized);
    });
    return paths;
  }, [result?.web_evidence]);
  const isWebEvidenceField = useCallback(
    (fieldPath: string) => {
      const normalizedTarget = normalizeEvidenceFieldPath(fieldPath);
      if (!normalizedTarget) return false;
      if (webEvidenceFieldPathSet.has(normalizedTarget)) return true;
      for (const candidate of webEvidenceFieldPathSet) {
        if (
          normalizedTarget.startsWith(`${candidate}.`) ||
          candidate.startsWith(`${normalizedTarget}.`)
        ) {
          return true;
        }
      }
      return false;
    },
    [webEvidenceFieldPathSet],
  );
  const sortedExtractedImages = useMemo(() => {
    const rankByDestination: Record<
      ExtractedImageWithDestination["destination"],
      number
    > = {
      main: 0,
      gallery: 1,
      modelhouse_main: 2,
      modelhouse_gallery: 3,
      none: 4,
      floor_plan: 2,
    };

    return extractedImages
      .map((img, index) => ({
        img,
        index,
        rank: rankByDestination[img.destination],
      }))
      .sort((a, b) => a.rank - b.rank || a.index - b.index)
      .map((entry) => entry.img);
  }, [extractedImages]);
  const visibleExtractedImages = useMemo(
    () => {
      if (!showNearDuplicateOnly) return sortedExtractedImages;
      return sortedExtractedImages.filter(
        (img) =>
          duplicateExtractedImageKeys.includes(img.localKey) ||
          nearDuplicateDistanceByImageKey[img.localKey] != null,
      );
    },
    [
      sortedExtractedImages,
      duplicateExtractedImageKeys,
      showNearDuplicateOnly,
      nearDuplicateDistanceByImageKey,
    ],
  );
  const similarImageCount = useMemo(() => {
    const keys = new Set<string>(duplicateExtractedImageKeys);
    Object.keys(nearDuplicateDistanceByImageKey).forEach((key) => keys.add(key));
    return keys.size;
  }, [duplicateExtractedImageKeys, nearDuplicateDistanceByImageKey]);
  const existingSnapshotImages = useMemo(() => {
    if (!existingSnapshot) return [] as ExistingSnapshotImageCard[];

    const cards: ExistingSnapshotImageCard[] = [];
    const seen = new Set<string>();
    const hashByUrl = existingSnapshot.images.asset_hash_by_url ?? {};
    const dctByUrl = existingSnapshot.images.asset_dct_phash_by_url ?? {};
    const pushUnique = (card: ExistingSnapshotImageCard) => {
      if (!card.url) return;
      const normalized = card.url.trim();
      if (!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      cards.push({ ...card, url: normalized });
    };

    if (existingSnapshot.images.main_image_url) {
      const mainUrl = existingSnapshot.images.main_image_url;
      pushUnique({
        key: `main:${mainUrl}`,
        url: mainUrl,
        label: "대표 이미지",
        hash:
          hashByUrl[mainUrl] ??
          existingSnapshot.images.main_image_hash ??
          extractImageHashFromUrl(mainUrl),
        dctPHash: dctByUrl[mainUrl] ?? null,
      });
    }

    existingSnapshot.images.gallery.forEach((img, index) => {
      const hashFromCaption = extractImageHashFromCaption(img.caption);
      const hashFromUrl = extractImageHashFromUrl(img.image_url);
      pushUnique({
        key: `gallery:${img.id || index}:${img.image_url}`,
        url: img.image_url,
        label: "갤러리",
        hash: img.image_hash ?? hashByUrl[img.image_url] ?? hashFromCaption ?? hashFromUrl,
        dctPHash:
          extractImageDctPHashFromCaption(img.caption) ??
          dctByUrl[img.image_url] ??
          null,
      });
    });

    existingSnapshot.unit_types.forEach((unit, index) => {
      const floorPlanUrl = String(unit.floor_plan_url ?? "").trim();
      if (!floorPlanUrl) return;
      pushUnique({
        key: `floor:${unit.id || index}:${floorPlanUrl}`,
        url: floorPlanUrl,
        label: `평면도${unit.type_name ? ` · ${unit.type_name}` : ""}`,
        hash: hashByUrl[floorPlanUrl] ?? extractImageHashFromUrl(floorPlanUrl),
        dctPHash: dctByUrl[floorPlanUrl] ?? null,
      });
    });

    return cards;
  }, [existingSnapshot]);
  const getUnitMergeCandidateSessionKey = useCallback((
    leftIndex: number,
    rightIndex: number,
  ) => {
    const units = result?.unit_types ?? [];
    const leftName = String(normalizeComparableValue(units[leftIndex]?.type_name) ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
    const rightName = String(
      normalizeComparableValue(units[rightIndex]?.type_name) ?? "",
    )
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
    if (leftName && rightName) {
      const [a, b] = [leftName, rightName].sort();
      return `name:${a}|${b}`;
    }
    return `idx:${Math.min(leftIndex, rightIndex)}-${Math.max(leftIndex, rightIndex)}`;
  }, [result?.unit_types]);
  const unitMergePreviewCandidates = useMemo(
    () => buildUnitMergePreviewCandidates(result?.unit_types ?? []),
    [result?.unit_types],
  );
  const visibleUnitMergeCandidates = useMemo(
    () => {
      if (hideUnitMergeRecommendations) return [];
      return unitMergePreviewCandidates.filter(
        (candidate) =>
          !dismissedMergeCandidateKeys.includes(
            getUnitMergeCandidateSessionKey(
              candidate.leftIndex,
              candidate.rightIndex,
            ),
          ),
      );
    },
    [
      unitMergePreviewCandidates,
      dismissedMergeCandidateKeys,
      hideUnitMergeRecommendations,
      getUnitMergeCandidateSessionKey,
    ],
  );
  const recommendedUnitRowIndexSet = useMemo(() => {
    const set = new Set<number>();
    visibleUnitMergeCandidates.forEach((candidate) => {
      set.add(candidate.leftIndex);
      set.add(candidate.rightIndex);
    });
    return set;
  }, [visibleUnitMergeCandidates]);
  const sortedUnitRows = useMemo(() => {
    const units = (result?.unit_types ?? []) as ExtractUnitTypeExtended[];
    if (units.length === 0) {
      return [{ unit: null as ExtractUnitTypeExtended | null, rowIndex: 0 }];
    }
    return units.map((unit, rowIndex) => ({ unit, rowIndex }));
  }, [result?.unit_types]);
  const getDestinationLabel = (
    destination: ExtractedImageWithDestination["destination"],
  ) => destinationOptions.find((option) => option.value === destination)?.label ?? "미지정";

  useEffect(() => {
    if (typeof window === "undefined") return;
    // 이전 버전에서 저장된 전체 숨김 상태는 더 이상 사용하지 않는다.
    window.localStorage.removeItem("hide-unit-merge-recommendations");
    setHideUnitMergeRecommendations(false);
  }, []);

  const revokeBlobUrl = (url?: string | null) => {
    if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
  };
  const makeExtractedImage = (
    img: {
      id: string;
      base64: string;
      source: string;
      aiType?: "building" | "floor_plan" | "other";
    },
    destination: ExtractedImageWithDestination["destination"],
  ): ExtractedImageWithDestination => ({
    localKey: crypto.randomUUID(),
    ...img,
    destination,
    unitTypeIndex: undefined,
    unitTypeId: undefined,
  });

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
    const mergeFilesMeta = () => {
      const all = [
        ...(existing._meta?.filesMeta ?? []),
        ...(incoming._meta?.filesMeta ?? []),
      ];
      const seen = new Set<string>();
      return all.filter((meta) => {
        const key = `${meta.fileName}|${meta.sizeBytes}|${meta.pages ?? "-"}|${meta.textLength}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };
    const mergedFilesMeta = mergeFilesMeta();
    const mergedImageStats = {
      totalPages:
        (existing._meta?.imageStats?.totalPages ?? 0) +
        (incoming._meta?.imageStats?.totalPages ?? 0),
      imagesFound:
        (existing._meta?.imageStats?.imagesFound ?? 0) +
        (incoming._meta?.imageStats?.imagesFound ?? 0),
      imagesExtracted:
        (existing._meta?.imageStats?.imagesExtracted ?? 0) +
        (incoming._meta?.imageStats?.imagesExtracted ?? 0),
      imagesFailed:
        (existing._meta?.imageStats?.imagesFailed ?? 0) +
        (incoming._meta?.imageStats?.imagesFailed ?? 0),
      renderFallbackUsed:
        Boolean(existing._meta?.imageStats?.renderFallbackUsed) ||
        Boolean(incoming._meta?.imageStats?.renderFallbackUsed),
    };
    const mergedTextLengthFromFiles = mergedFilesMeta.reduce(
      (sum, meta) => sum + (meta.textLength ?? 0),
      0,
    );

    return {
      ...existing,
      responseVersion: incoming.responseVersion ?? existing.responseVersion,
      properties: mergeSection(existing.properties, incoming.properties),
      location: mergeSection(existing.location, incoming.location),
      specs: mergeSection(existing.specs, incoming.specs),
      timeline: mergeSection(existing.timeline, incoming.timeline),
      validation: mergeSection(existing.validation, incoming.validation),
      web_evidence:
        (incoming.web_evidence ?? []).length > 0
          ? incoming.web_evidence
          : existing.web_evidence,
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
      _meta: {
        fileCount:
          mergedFilesMeta.length ||
          (existing._meta?.fileCount ?? 0) + (incoming._meta?.fileCount ?? 0),
        textLength:
          mergedTextLengthFromFiles ||
          (existing._meta?.textLength ?? 0) + (incoming._meta?.textLength ?? 0),
        truncated:
          Boolean(existing._meta?.truncated) || Boolean(incoming._meta?.truncated),
        geocoded:
          incoming._meta?.geocoded ?? existing._meta?.geocoded ?? false,
        imageStats: mergedImageStats,
        classificationFailed:
          Boolean(existing._meta?.classificationFailed) ||
          Boolean(incoming._meta?.classificationFailed),
        filesMeta: mergedFilesMeta,
      },
    };
  };

  const normalizeTypeNameKey = (value: unknown) =>
    String(normalizeComparableValue(value) ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");

  const mergeExistingUnitsIntoResult = (
    currentUnits: ExtractUnitTypeExtended[],
    existingUnits: ExistingPropertySnapshot["unit_types"],
  ) => {
    const merged = [...currentUnits];
    const isMissing = (value: unknown) =>
      value == null || (typeof value === "string" && value.trim() === "");

    existingUnits.forEach((unit) => {
      const nameKey = normalizeTypeNameKey(unit.type_name);
      const normalizedPrice = normalizePriceRange(unit.price_min, unit.price_max);
      const matchedIndex = merged.findIndex((current) => {
        if (typeof current.unit_type_id === "number") {
          return current.unit_type_id === unit.id;
        }
        const currentNameKey = normalizeTypeNameKey(current.type_name);
        return Boolean(nameKey) && currentNameKey === nameKey;
      });

      if (matchedIndex >= 0) {
        const current = merged[matchedIndex];
        merged[matchedIndex] = {
          ...current,
          unit_type_id:
            typeof current.unit_type_id === "number"
              ? current.unit_type_id
              : unit.id,
          type_name: isMissing(current.type_name)
            ? unit.type_name ?? ""
            : current.type_name,
          exclusive_area: isMissing(current.exclusive_area)
            ? unit.exclusive_area
            : current.exclusive_area,
          supply_area: isMissing(current.supply_area)
            ? unit.supply_area
            : current.supply_area,
          rooms: isMissing(current.rooms) ? unit.rooms : current.rooms,
          bathrooms: isMissing(current.bathrooms)
            ? unit.bathrooms
            : current.bathrooms,
          building_layout: isMissing(current.building_layout)
            ? unit.building_layout
            : current.building_layout,
          orientation: isMissing(current.orientation)
            ? unit.orientation
            : current.orientation,
          supply_count: isMissing(current.supply_count)
            ? unit.supply_count
            : current.supply_count,
          price_min: isMissing(current.price_min)
            ? normalizedPrice.min
            : current.price_min,
          price_max: isMissing(current.price_max)
            ? normalizedPrice.max
            : current.price_max,
          unit_count: isMissing(current.unit_count)
            ? unit.unit_count
            : current.unit_count,
          is_price_public:
            typeof current.is_price_public === "boolean"
              ? current.is_price_public
              : unit.is_price_public !== false,
          is_public:
            typeof current.is_public === "boolean"
              ? current.is_public
              : unit.is_public !== false,
          floor_plan_url: isMissing(current.floor_plan_url)
            ? unit.floor_plan_url
            : current.floor_plan_url,
          image_url: isMissing(current.image_url)
            ? unit.floor_plan_url
            : current.image_url,
        };
        return;
      }

      merged.push({
        unit_type_id: unit.id,
        type_name: unit.type_name ?? "",
        exclusive_area: unit.exclusive_area,
        supply_area: unit.supply_area,
        rooms: unit.rooms,
        bathrooms: unit.bathrooms,
        building_layout: unit.building_layout,
        orientation: unit.orientation,
        supply_count: unit.supply_count,
        price_min: normalizedPrice.min,
        price_max: normalizedPrice.max,
        unit_count: unit.unit_count,
        is_price_public: unit.is_price_public !== false,
        is_public: unit.is_public !== false,
        floor_plan_url: unit.floor_plan_url,
        image_url: unit.floor_plan_url,
      });
    });

    return merged;
  };

  const uploadEditedFloorPlans = async (propertyId: number) => {
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
        String(result?.unit_types?.[rowIndex]?.type_name ?? `type-${rowIndex}`),
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

    return uploadedFloorPlanUrls;
  };

  const syncUnitTypesForProperty = async (
    supabase: ReturnType<typeof createSupabaseClient>,
    propertyId: number,
  ) => {
    const uploadedFloorPlanUrls = await uploadEditedFloorPlans(propertyId);
    const units = result?.unit_types ?? [];
    const rowIndexToUnitId: Record<number, number> = {};

    const { data: existingUnitRows, error: existingUnitsError } = await supabase
      .from("property_unit_types")
      .select("id, type_name")
      .eq("properties_id", propertyId);
    if (existingUnitsError) throw existingUnitsError;

    const existingUnitIdSet = new Set<number>();
    const existingByTypeKey = new Map<string, number>();
    (existingUnitRows ?? []).forEach((row) => {
      const rowId = Number(row.id);
      if (Number.isFinite(rowId)) existingUnitIdSet.add(rowId);
      const key = normalizeTypeNameKey(row.type_name);
      if (!key) return;
      if (!existingByTypeKey.has(key)) {
        existingByTypeKey.set(key, rowId);
      }
    });

    let updated = 0;
    let inserted = 0;
    const seenExistingIds = new Set<number>();
    const seenTypeKeys = new Set<string>();

    for (let index = 0; index < units.length; index += 1) {
      const unit = units[index] as ExtractUnitTypeExtended;
      const typeName = String(normalizeComparableValue(unit.type_name) ?? "").trim();
      if (!typeName) continue;
      const key = normalizeTypeNameKey(typeName);
      const explicitUnitId =
        typeof unit.unit_type_id === "number" ? unit.unit_type_id : null;
      const existingId =
        explicitUnitId && existingUnitIdSet.has(explicitUnitId)
          ? explicitUnitId
          : existingByTypeKey.get(key);

      if (existingId) {
        if (seenExistingIds.has(existingId)) continue;
        seenExistingIds.add(existingId);
      } else {
        if (!key || seenTypeKeys.has(key)) continue;
        seenTypeKeys.add(key);
      }

      const floorPlanUrl = resolveFloorPlanUrl(unit, index);
      const floorPlanAssetUrl =
        uploadedFloorPlanUrls[index] ??
        (floorPlanUrl && !floorPlanUrl.startsWith("blob:")
          ? floorPlanUrl
          : normalizeComparableValue(unit.floor_plan_url ?? unit.image_url));
        const payload = {
          type_name: typeName,
          exclusive_area: toNumberOrNull(unit.exclusive_area),
          supply_area: toNumberOrNull(unit.supply_area),
        rooms: toNumberOrNull(unit.rooms),
        bathrooms: toNumberOrNull(unit.bathrooms),
        price_min: toWonFromManwon(unit.price_min),
        price_max: toWonFromManwon(unit.price_max),
          unit_count: toNumberOrNull(unit.unit_count),
          supply_count: toNumberOrNull(unit.supply_count),
          building_layout: normalizeComparableValue(unit.building_layout),
          orientation: normalizeComparableValue(unit.orientation),
          is_price_public: unit.is_price_public !== false,
          is_public: unit.is_public !== false,
        };

      if (existingId) {
        let { error: updateError } = await supabase
          .from("property_unit_types")
          .update(payload)
          .eq("id", existingId)
          .eq("properties_id", propertyId);
        if (updateError?.code === "42703") {
          const fallbackPayload = { ...payload };
          Reflect.deleteProperty(fallbackPayload, "floor_plan_url");
          const fallbackUpdate = await supabase
            .from("property_unit_types")
            .update(fallbackPayload)
            .eq("id", existingId)
            .eq("properties_id", propertyId);
          updateError = fallbackUpdate.error;
        }
        if (updateError) throw updateError;
        rowIndexToUnitId[index] = existingId;
        updated += 1;
        if (floorPlanAssetUrl) {
          await upsertPropertyImageAsset(supabase, {
            property_id: propertyId,
            unit_type_id: existingId,
            kind: "floor_plan",
            image_url: String(floorPlanAssetUrl),
            image_hash: extractImageHashFromUrl(String(floorPlanAssetUrl)),
            caption: null,
            sort_order: 0,
          });
        }
      } else {
        const insertPayload = { ...payload, properties_id: propertyId };
        let { data: insertedRow, error: insertError } = await supabase
          .from("property_unit_types")
          .insert(insertPayload)
          .select("id")
          .single();
        if (insertError?.code === "42703") {
          const fallbackPayload = { ...insertPayload };
          Reflect.deleteProperty(fallbackPayload, "floor_plan_url");
          const fallbackInsert = await supabase
            .from("property_unit_types")
            .insert(fallbackPayload)
            .select("id")
            .single();
          insertedRow = fallbackInsert.data;
          insertError = fallbackInsert.error;
        }
        if (insertError) throw insertError;
        if (!insertedRow) {
          throw new Error("주택형 insert 결과가 비어 있습니다.");
        }
        const insertedId = Number(insertedRow.id);
        rowIndexToUnitId[index] = insertedId;
        existingByTypeKey.set(key, insertedId);
        existingUnitIdSet.add(insertedId);
        seenExistingIds.add(insertedId);
        inserted += 1;
        if (floorPlanAssetUrl) {
          await upsertPropertyImageAsset(supabase, {
            property_id: propertyId,
            unit_type_id: insertedId,
            kind: "floor_plan",
            image_url: String(floorPlanAssetUrl),
            image_hash: extractImageHashFromUrl(String(floorPlanAssetUrl)),
            caption: null,
            sort_order: 0,
          });
        }
      }
    }

    setResult((prev) => {
      if (!prev) return prev;
      const nextUnits = [...(prev.unit_types ?? [])] as ExtractUnitTypeExtended[];
      nextUnits.forEach((unit, index) => {
        if (rowIndexToUnitId[index]) {
          nextUnits[index] = {
            ...unit,
            unit_type_id: rowIndexToUnitId[index],
          };
        }
      });
      return { ...prev, unit_types: nextUnits };
    });

    setExtractedImages((prev) =>
      prev.map((img) => {
        if (img.destination !== "floor_plan" || img.unitTypeIndex === undefined) {
          return img;
        }
        const unitTypeId = rowIndexToUnitId[img.unitTypeIndex];
        return {
          ...img,
          unitTypeId: unitTypeId ?? img.unitTypeId,
        };
      }),
    );

    return {
      rowIndexToUnitId,
      updated,
      inserted,
      uploadedFloorPlans: Object.keys(uploadedFloorPlanUrls).length,
    };
  };

  const hashExtractedImage = useCallback(async (img: ExtractedImageWithDestination) => {
    const cached = extractedShaCacheRef.current.get(img.localKey);
    if (cached) return cached;
    const blob = base64ToBlob(img.base64);
    const arrayBuffer = await blob.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    extractedShaCacheRef.current.set(img.localKey, hex);
    return hex;
  }, []);
  const DCT_PHASH_DUPLICATE_DISTANCE_THRESHOLD = 18;
  const DCT_PHASH_NEAR_DUPLICATE_DISTANCE_THRESHOLD = 22;
  const pHashExtractedImage = useCallback(async (img: ExtractedImageWithDestination) => {
    const cached = extractedDctPHashCacheRef.current.get(img.localKey);
    if (cached) return cached;

    const blob = base64ToBlob(img.base64);
    const bitmap = await createImageBitmap(blob);
    const size = 32;
    const dctSize = 8;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.drawImage(bitmap, 0, 0, size, size);
    bitmap.close();

    const pixels = ctx.getImageData(0, 0, size, size).data;
    const gray = new Array<number>(size * size);
    for (let i = 0; i < size * size; i += 1) {
      const p = i * 4;
      gray[i] = pixels[p] * 0.299 + pixels[p + 1] * 0.587 + pixels[p + 2] * 0.114;
    }

    const dctVals: number[] = [];
    for (let v = 0; v < dctSize; v += 1) {
      for (let u = 0; u < dctSize; u += 1) {
        let sum = 0;
        for (let y = 0; y < size; y += 1) {
          for (let x = 0; x < size; x += 1) {
            const pixel = gray[y * size + x];
            sum +=
              pixel *
              Math.cos(((2 * x + 1) * u * Math.PI) / (2 * size)) *
              Math.cos(((2 * y + 1) * v * Math.PI) / (2 * size));
          }
        }
        const cu = u === 0 ? 1 / Math.sqrt(2) : 1;
        const cv = v === 0 ? 1 / Math.sqrt(2) : 1;
        dctVals.push((2 / size) * cu * cv * sum);
      }
    }

    const sorted = [...dctVals].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
    const bits = dctVals.map((value) => (value > median ? 1 : 0));
    const bytes = new Uint8Array(8);
    for (let i = 0; i < bits.length; i += 1) {
      if (bits[i] === 1) {
        bytes[Math.floor(i / 8)] |= 1 << (7 - (i % 8));
      }
    }
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    extractedDctPHashCacheRef.current.set(img.localKey, hex);
    return hex;
  }, []);
  const hashFile = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", arrayBuffer);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  const upsertPropertyImageAsset = async (
    supabase: ReturnType<typeof createSupabaseClient>,
    payload: {
      property_id: number;
      unit_type_id?: number | null;
      kind:
        | "main"
        | "gallery"
        | "modelhouse_main"
        | "modelhouse_gallery"
        | "floor_plan";
      image_url: string;
      storage_path?: string | null;
      image_hash?: string | null;
      caption?: string | null;
      sort_order?: number;
    },
  ) => {
    const base = {
      property_id: payload.property_id,
      unit_type_id: payload.unit_type_id ?? null,
      kind: payload.kind,
      image_url: payload.image_url,
      storage_path: payload.storage_path ?? null,
      image_hash: payload.image_hash ?? null,
      caption: payload.caption ?? null,
      sort_order: payload.sort_order ?? 0,
      is_active: true,
    };

    if (payload.kind === "main" || payload.kind === "modelhouse_main") {
      const { error: deactivateError } = await supabase
        .from("property_image_assets")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("property_id", payload.property_id)
        .eq("kind", payload.kind)
        .eq("is_active", true);
      if (deactivateError) {
        if (deactivateError.code === "42P01") return false;
        throw deactivateError;
      }
    }

    const { error: insertError } = await supabase
      .from("property_image_assets")
      .insert(base);
    if (insertError) {
      if (insertError.code === "42P01") return false;
      throw insertError;
    }
    return true;
  };

  const collectHashesFromSnapshot = (
    snapshot: ExistingPropertySnapshot | null | undefined,
  ) => {
    const hashes = new Set<string>();
    if (!snapshot) return hashes;

    snapshot.images.existing_hashes.forEach((hash) => {
      if (hash) hashes.add(hash);
    });
    if (snapshot.images.main_image_hash) {
      hashes.add(snapshot.images.main_image_hash);
    }
    const mainHashFromUrl = extractImageHashFromUrl(
      snapshot.images.main_image_url,
    );
    if (mainHashFromUrl) hashes.add(mainHashFromUrl);
    snapshot.images.gallery.forEach((img) => {
      if (img.image_hash) hashes.add(img.image_hash);
      const captionHash = extractImageHashFromCaption(img.caption);
      const urlHash = extractImageHashFromUrl(img.image_url);
      if (captionHash) hashes.add(captionHash);
      if (urlHash) hashes.add(urlHash);
    });

    return hashes;
  };

  const collectPHashesFromSnapshot = (
    snapshot: ExistingPropertySnapshot | null | undefined,
  ) => {
    const dctPHashes = new Set<string>();
    if (!snapshot) return dctPHashes;

    snapshot.images.existing_dct_phashes.forEach((phash) => {
      if (phash) dctPHashes.add(phash);
    });
    snapshot.images.gallery.forEach((img) => {
      const dctCaptionPHash = extractImageDctPHashFromCaption(img.caption);
      if (dctCaptionPHash) dctPHashes.add(dctCaptionPHash);
    });

    return dctPHashes;
  };

  useEffect(() => {
    let cancelled = false;

    async function filterDuplicateExtractedImages() {
      if (!existingSnapshot || extractedImages.length === 0) {
        if (!cancelled) {
          setDuplicateExtractedImageKeys([]);
          setNearDuplicateDistanceByImageKey({});
          setMatchedExistingImageKeys([]);
          setNearMatchedExistingImageKeys([]);
        }
        return;
      }

      const existingHashes = collectHashesFromSnapshot(existingSnapshot);
      const existingDctPHashes = collectPHashesFromSnapshot(existingSnapshot);
      const existingHashToImageKeys = new Map<string, Set<string>>();
      const existingDctPHashRows: Array<{ imageKey: string; dctPHash: string }> =
        [];
      existingSnapshotImages.forEach((image) => {
        if (image.hash) {
          const keySet =
            existingHashToImageKeys.get(image.hash) ?? new Set<string>();
          keySet.add(image.key);
          existingHashToImageKeys.set(image.hash, keySet);
        }
        if (image.dctPHash) {
          existingDctPHashRows.push({
            imageKey: image.key,
            dctPHash: image.dctPHash,
          });
        }
      });
      if (
        existingHashes.size === 0 &&
        existingDctPHashes.size === 0
      ) {
        if (!cancelled) {
          setDuplicateExtractedImageKeys([]);
          setNearDuplicateDistanceByImageKey({});
          setMatchedExistingImageKeys([]);
          setNearMatchedExistingImageKeys([]);
        }
        return;
      }

      const duplicateKeys: string[] = [];
      const matchedExistingKeys = new Set<string>();
      const nearMatchedExistingKeys = new Set<string>();
      const extractedHashRows: Array<{
        localKey: string;
        hash: string;
        dctPHash: string | null;
        matched: boolean;
        minKnownDctPHashDistance: number | null;
      }> = [];
      for (const img of extractedImages) {
        const hash = await hashExtractedImage(img);
        let dctPHash: string | null = null;
        try {
          dctPHash = await pHashExtractedImage(img);
        } catch {
          dctPHash = null;
        }
        if (existingHashToImageKeys.has(hash)) {
          existingHashToImageKeys.get(hash)?.forEach((key) => {
            matchedExistingKeys.add(key);
          });
        }
        const dctPHashMatched =
          Boolean(dctPHash) &&
          Array.from(existingDctPHashes).some(
            (known) =>
              hammingDistanceHex64(known, dctPHash as string) <=
              DCT_PHASH_DUPLICATE_DISTANCE_THRESHOLD,
          );
        const minKnownDctPHashDistance = dctPHash
          ? Array.from(existingDctPHashes).reduce<number | null>(
              (min, known) => {
                const distance = hammingDistanceHex64(known, dctPHash as string);
                if (!Number.isFinite(distance)) return min;
                if (min == null || distance < min) return distance;
                return min;
              },
              null,
            )
          : null;
        const nearestExistingByDct = dctPHash
          ? existingDctPHashRows.reduce<{
              imageKey: string;
              distance: number;
            } | null>((min, row) => {
              const distance = hammingDistanceHex64(row.dctPHash, dctPHash as string);
              if (!Number.isFinite(distance)) return min;
              if (!min || distance < min.distance) {
                return { imageKey: row.imageKey, distance };
              }
              return min;
            }, null)
          : null;
        if (
          nearestExistingByDct &&
          nearestExistingByDct.distance <= DCT_PHASH_DUPLICATE_DISTANCE_THRESHOLD
        ) {
          matchedExistingKeys.add(nearestExistingByDct.imageKey);
        } else if (
          nearestExistingByDct &&
          nearestExistingByDct.distance <= DCT_PHASH_NEAR_DUPLICATE_DISTANCE_THRESHOLD
        ) {
          nearMatchedExistingKeys.add(nearestExistingByDct.imageKey);
        }
        const matched = existingHashes.has(hash) || dctPHashMatched;
        extractedHashRows.push({
          localKey: img.localKey,
          hash,
          dctPHash,
          matched,
          minKnownDctPHashDistance,
        });
        if (matched) {
          duplicateKeys.push(img.localKey);
        }
      }

      if (!cancelled) {
        const nearDuplicateDistances = extractedHashRows.reduce<
          Record<string, number>
        >((acc, row) => {
          if (row.matched) return acc;
          if (row.minKnownDctPHashDistance == null) return acc;
          if (
            row.minKnownDctPHashDistance >
              DCT_PHASH_DUPLICATE_DISTANCE_THRESHOLD &&
            row.minKnownDctPHashDistance <=
              DCT_PHASH_NEAR_DUPLICATE_DISTANCE_THRESHOLD
          ) {
            acc[row.localKey] = row.minKnownDctPHashDistance;
          }
          return acc;
        }, {});
        setDuplicateExtractedImageKeys(duplicateKeys);
        setNearDuplicateDistanceByImageKey(nearDuplicateDistances);
        setMatchedExistingImageKeys(Array.from(matchedExistingKeys));
        setNearMatchedExistingImageKeys(Array.from(nearMatchedExistingKeys));
      }
    }

    void filterDuplicateExtractedImages();

    return () => {
      cancelled = true;
    };
  }, [
    existingSnapshot,
    extractedImages,
    existingSnapshotImages,
    hashExtractedImage,
    pHashExtractedImage,
  ]);

  const buildExtractedImageAssignmentMap = async () => {
    const unitNameById = new Map<number, string>();
    (result?.unit_types ?? []).forEach((unit, index) => {
      const unitId = (unit as ExtractUnitTypeExtended).unit_type_id;
      const unitName = String(unit.type_name ?? "").trim();
      if (typeof unitId === "number" && unitName) {
        unitNameById.set(unitId, unitName);
      } else if (unitName) {
        unitNameById.set(-(index + 1), unitName);
      }
    });

    const map = new Map<
      string,
      {
        destination: ExtractedImageWithDestination["destination"];
        unitTypeId?: number;
        unitTypeName?: string;
      }
    >();

    for (const img of extractedImages) {
      const hash = await hashExtractedImage(img);
      const unitTypeName =
        typeof img.unitTypeId === "number"
          ? unitNameById.get(img.unitTypeId)
          : img.unitTypeIndex !== undefined
            ? String(result?.unit_types?.[img.unitTypeIndex]?.type_name ?? "").trim() ||
              undefined
            : undefined;
      map.set(hash, {
        destination: img.destination,
        unitTypeId: img.unitTypeId,
        unitTypeName,
      });
    }

    return map;
  };

  const applyExtractedImageAssignmentsByHash = async (
    incomingImages: ExtractedImageWithDestination[],
    assignmentMap: Map<
      string,
      {
        destination: ExtractedImageWithDestination["destination"];
        unitTypeId?: number;
        unitTypeName?: string;
      }
    >,
    targetUnits: ExtractUnitTypeExtended[],
  ) => {
    if (assignmentMap.size === 0) return incomingImages;

    const unitIndexById = new Map<number, number>();
    const unitIndexByName = new Map<string, number>();
    targetUnits.forEach((unit, index) => {
      if (typeof unit.unit_type_id === "number") {
        unitIndexById.set(unit.unit_type_id, index);
      }
      const name = String(unit.type_name ?? "").trim();
      if (name && !unitIndexByName.has(name)) {
        unitIndexByName.set(name, index);
      }
    });

    const patched: ExtractedImageWithDestination[] = [];
    for (const img of incomingImages) {
      const hash = await hashExtractedImage(img);
      const prev = assignmentMap.get(hash);
      if (!prev) {
        patched.push(img);
        continue;
      }

      const next: ExtractedImageWithDestination = {
        ...img,
        destination: prev.destination,
      };

      if (prev.destination === "floor_plan") {
        if (typeof prev.unitTypeId === "number" && unitIndexById.has(prev.unitTypeId)) {
          next.unitTypeId = prev.unitTypeId;
          next.unitTypeIndex = unitIndexById.get(prev.unitTypeId);
        } else if (prev.unitTypeName && unitIndexByName.has(prev.unitTypeName)) {
          const matchedIndex = unitIndexByName.get(prev.unitTypeName);
          if (matchedIndex !== undefined) {
            next.unitTypeIndex = matchedIndex;
            const matchedId = targetUnits[matchedIndex]?.unit_type_id;
            if (typeof matchedId === "number") next.unitTypeId = matchedId;
          }
        }
      }

      patched.push(next);
    }
    return patched;
  };

  const syncExtractedImagesForProperty = async (
    supabase: ReturnType<typeof createSupabaseClient>,
    propertyId: number,
    rowIndexToUnitId: Record<number, number>,
  ) => {
    const galleryHashByImageId = new Map<
      string,
      { hash: string; dctPHash: string | null }
    >();
    for (const img of extractedImages) {
      if (
        img.destination !== "gallery" &&
        img.destination !== "modelhouse_gallery"
      ) {
        continue;
      }
      const hash = await hashExtractedImage(img);
      let dctPHash: string | null = null;
      try {
        dctPHash = await pHashExtractedImage(img);
      } catch {
        dctPHash = null;
      }
      galleryHashByImageId.set(img.id, { hash, dctPHash });
    }
    const desiredGalleryHashes = new Set<string>(
      Array.from(galleryHashByImageId.values()).map((v) => v.hash),
    );

    const desiredFloorPlanUnitTypeIds = new Set<number>();
    extractedImages.forEach((img) => {
      if (img.destination !== "floor_plan") return;
      const unitTypeId =
        img.unitTypeId ??
        (img.unitTypeIndex !== undefined
          ? rowIndexToUnitId[img.unitTypeIndex]
          : undefined);
      if (unitTypeId) desiredFloorPlanUnitTypeIds.add(unitTypeId);
    });

    const { data: imageAssetRows, error: imageAssetFetchError } = await supabase
      .from("property_image_assets")
      .select("id, kind, unit_type_id, image_hash, image_url, caption, sort_order, is_active")
      .eq("property_id", propertyId)
      .eq("is_active", true);
    if (imageAssetFetchError && imageAssetFetchError.code !== "42P01") {
      throw imageAssetFetchError;
    }
    const canUseImageAssets = !imageAssetFetchError;

    const existingHashes = new Set<string>();
    const existingDctPHashes = new Set<string>();
    const galleryAssetRows = (imageAssetRows ?? []).filter(
      (row) => row.kind === "gallery" || row.kind === "modelhouse_gallery",
    );
    if (canUseImageAssets) {
      galleryAssetRows.forEach((row) => {
        if (row.image_hash) existingHashes.add(row.image_hash);
        const hashFromUrl = extractImageHashFromUrl(row.image_url);
        if (hashFromUrl) existingHashes.add(hashFromUrl);
        const dctPHash = extractImageDctPHashFromCaption(row.caption);
        if (dctPHash) existingDctPHashes.add(dctPHash);
      });
    }
    let maxSortOrder = 0;
    galleryAssetRows.forEach((row) => {
      const hash = extractImageHashFromCaption(
        row.caption,
      );
      if (hash) existingHashes.add(hash);
      const dctPHash = extractImageDctPHashFromCaption(
        row.caption,
      );
      if (dctPHash) existingDctPHashes.add(dctPHash);
      const sort = Number(row.sort_order ?? 0);
      if (Number.isFinite(sort) && sort > maxSortOrder) maxSortOrder = sort;
    });

    const galleryDeleteAssets = galleryAssetRows
      .filter((row) => {
        const hashFromUrl = extractImageHashFromUrl(row.image_url);
        const knownHash = row.image_hash ?? hashFromUrl;
        if (!knownHash) return false;
        return !desiredGalleryHashes.has(knownHash);
      });

    const galleryDeleteAssetIds = galleryDeleteAssets.map((row) => row.id);

    if (galleryDeleteAssetIds.length > 0 && canUseImageAssets) {
      const { error: deactivateGalleryAssetsError } = await supabase
        .from("property_image_assets")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("property_id", propertyId)
        .in("id", galleryDeleteAssetIds)
        .eq("is_active", true);
      if (deactivateGalleryAssetsError) throw deactivateGalleryAssetsError;

      galleryDeleteAssetIds.forEach((id) => {
        const deleted = galleryDeleteAssets.find((row) => row.id === id);
        const hash = deleted?.image_hash ?? extractImageHashFromUrl(deleted?.image_url);
        if (hash) existingHashes.delete(hash);
      });
    }

    const floorPlanClearIds = Array.from(
      pendingFloorPlanClearUnitTypeIdsRef.current,
    ).filter((unitTypeId) => !desiredFloorPlanUnitTypeIds.has(unitTypeId));

    if (floorPlanClearIds.length > 0) {
      if (canUseImageAssets) {
        const { error: deactivateFloorPlanAssetsError } = await supabase
          .from("property_image_assets")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("property_id", propertyId)
          .eq("kind", "floor_plan")
          .in("unit_type_id", floorPlanClearIds)
          .eq("is_active", true);
        if (deactivateFloorPlanAssetsError) throw deactivateFloorPlanAssetsError;
      }
    }
    pendingFloorPlanClearUnitTypeIdsRef.current.clear();

    let mainUpdated = 0;
    let galleryUploaded = 0;
    const galleryDeleted = galleryDeleteAssetIds.length;
    let gallerySkippedByHash = 0;
    let floorPlanUpdated = 0;
    const floorPlanCleared = floorPlanClearIds.length;
    let failed = 0;

    for (const img of extractedImages) {
      if (img.destination === "none") continue;
      try {
        if (img.destination === "main" || img.destination === "modelhouse_main") {
          const hash = await hashExtractedImage(img);
          let dctPHash: string | null = null;
          try {
            dctPHash = await pHashExtractedImage(img);
          } catch {
            dctPHash = null;
          }
          const { url, storagePath } = await uploadSingleExtractedImage(
            img,
            "property_main",
            propertyId,
          );
          if (canUseImageAssets) {
            await upsertPropertyImageAsset(supabase, {
              property_id: propertyId,
              kind: img.destination === "main" ? "main" : "modelhouse_main",
              image_url: url,
              storage_path: storagePath,
              image_hash: hash,
              caption: `extract-hash:${hash}${dctPHash ? `;extract-phash-dct:${dctPHash}` : ""}`,
              sort_order: 0,
            });
          }
          mainUpdated += 1;
          continue;
        }

        if (
          img.destination === "gallery" ||
          img.destination === "modelhouse_gallery"
        ) {
          const hashEntry = galleryHashByImageId.get(img.id);
          if (!hashEntry) continue;
          const { hash, dctPHash } = hashEntry;
          const hasDctPHashMatch =
            Boolean(dctPHash) &&
            Array.from(existingDctPHashes).some(
              (known) =>
                hammingDistanceHex64(known, dctPHash as string) <=
                DCT_PHASH_DUPLICATE_DISTANCE_THRESHOLD,
            );
          if (existingHashes.has(hash) || hasDctPHashMatch) {
            gallerySkippedByHash += 1;
            continue;
          }
          const { url, storagePath } = await uploadSingleExtractedImage(
            img,
            "property_additional",
            propertyId,
          );
          maxSortOrder += 1;
          if (canUseImageAssets) {
            await upsertPropertyImageAsset(supabase, {
              property_id: propertyId,
              kind:
                img.destination === "gallery"
                  ? "gallery"
                  : "modelhouse_gallery",
              image_url: url,
              storage_path: storagePath,
              image_hash: hash,
              caption: `extract-hash:${hash}${dctPHash ? `;extract-phash-dct:${dctPHash}` : ""}`,
              sort_order: maxSortOrder,
            });
          }
          existingHashes.add(hash);
          if (dctPHash) existingDctPHashes.add(dctPHash);
          galleryUploaded += 1;
          continue;
        }

        if (img.destination === "floor_plan") {
          const unitTypeId =
            img.unitTypeId ??
            (img.unitTypeIndex !== undefined
              ? rowIndexToUnitId[img.unitTypeIndex]
              : undefined);
          if (!unitTypeId) continue;

          const { url, storagePath } = await uploadSingleExtractedImage(
            img,
            "property_floor_plan",
            propertyId,
          );
          if (canUseImageAssets) {
            const hash = await hashExtractedImage(img);
            let dctPHash: string | null = null;
            try {
              dctPHash = await pHashExtractedImage(img);
            } catch {
              dctPHash = null;
            }
            await upsertPropertyImageAsset(supabase, {
              property_id: propertyId,
              unit_type_id: unitTypeId,
              kind: "floor_plan",
              image_url: url,
              storage_path: storagePath,
              image_hash: hash,
              caption: `extract-hash:${hash}${dctPHash ? `;extract-phash-dct:${dctPHash}` : ""}`,
              sort_order: 0,
            });
          }
          floorPlanUpdated += 1;
        }
      } catch (err) {
        console.warn("추출 이미지 업로드/동기화 실패:", img.id, err);
        failed += 1;
      }
    }

    return {
      mainUpdated,
      galleryUploaded,
      galleryDeleted,
      gallerySkippedByHash,
      floorPlanUpdated,
      floorPlanCleared,
      failed,
    };
  };

  const syncManualGalleryFilesForProperty = async (propertyId: number) => {
    if (galleryImageFiles.length === 0) return 0;

    const galleryFormData = new FormData();
    galleryFormData.append("propertyId", String(propertyId));
    galleryImageFiles.forEach((file) => galleryFormData.append("files", file));

    const galleryRes = await fetch("/api/property/gallery", {
      method: "POST",
      body: galleryFormData,
    });
    const galleryPayload = await galleryRes.json().catch(() => null);
    if (!galleryRes.ok) {
      throw new Error(galleryPayload?.error || "추가 사진 업로드 실패");
    }

    const uploadedCount = Array.isArray(galleryPayload?.images)
      ? (galleryPayload.images as Array<unknown>).length
      : 0;
    setGalleryImageFiles([]);
    setGalleryImageUrls((prev) => {
      prev.forEach((url) => revokeBlobUrl(url));
      return [];
    });
    return uploadedCount;
  };

  const uploadSingleFileToR2 = async (
    file: File,
    mode: "property_main" | "property_additional",
    propertyId: number,
  ): Promise<{ url: string; storagePath: string | null }> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);
    formData.append("propertyId", propertyId.toString());

    const res = await fetch("/api/r2/upload", {
      method: "POST",
      body: formData,
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.url) {
      throw new Error(payload?.error || "이미지 업로드 실패");
    }
    let storagePath: string | null = null;
    try {
      const parsed = new URL(String(payload.url));
      storagePath = parsed.pathname.replace(/^\/+/, "") || null;
    } catch {
      storagePath = null;
    }
    return { url: String(payload.url), storagePath };
  };

  const syncManualModelhouseFilesForProperty = async (
    supabase: ReturnType<typeof createSupabaseClient>,
    propertyId: number,
  ) => {
    let uploadedCount = 0;

    if (modelhouseMainImageFile) {
      const hash = await hashFile(modelhouseMainImageFile);
      const { url, storagePath } = await uploadSingleFileToR2(
        modelhouseMainImageFile,
        "property_additional",
        propertyId,
      );
      await upsertPropertyImageAsset(supabase, {
        property_id: propertyId,
        kind: "modelhouse_main",
        image_url: url,
        storage_path: storagePath,
        image_hash: hash,
        caption: null,
        sort_order: 0,
      });
      uploadedCount += 1;
    }

    for (let i = 0; i < modelhouseGalleryImageFiles.length; i += 1) {
      const file = modelhouseGalleryImageFiles[i];
      const hash = await hashFile(file);
      const { url, storagePath } = await uploadSingleFileToR2(
        file,
        "property_additional",
        propertyId,
      );
      await upsertPropertyImageAsset(supabase, {
        property_id: propertyId,
        kind: "modelhouse_gallery",
        image_url: url,
        storage_path: storagePath,
        image_hash: hash,
        caption: null,
        sort_order: i + 1,
      });
      uploadedCount += 1;
    }

    setModelhouseMainImageFile(null);
    setModelhouseMainImageUrl((prev) => {
      revokeBlobUrl(prev);
      return "";
    });
    setModelhouseGalleryImageFiles([]);
    setModelhouseGalleryImageUrls((prev) => {
      prev.forEach((url) => revokeBlobUrl(url));
      return [];
    });

    return uploadedCount;
  };

  const uploadPdfsToR2Temp = async (targetFiles: File[]) => {
    const keys: string[] = [];

    for (let i = 0; i < targetFiles.length; i += 1) {
      const file = targetFiles[i];
      setStatus(`PDF 업로드 중... (${i + 1}/${targetFiles.length})`);

      const signRes = await fetch("/api/r2/upload/sign-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type || "application/pdf",
        }),
      });
      const signPayload = await signRes.json().catch(() => null);
      if (!signRes.ok || !signPayload?.uploadUrl || !signPayload?.key) {
        throw new Error(signPayload?.error || "PDF 업로드 서명 발급 실패");
      }

      const uploadRes = await fetch(String(signPayload.uploadUrl), {
        method: "PUT",
        body: file,
      });
      if (!uploadRes.ok) {
        throw new Error(`PDF 업로드 실패: ${file.name}`);
      }

      keys.push(String(signPayload.key));
    }

    return keys;
  };

  const stopAnalysisTimer = useCallback(() => {
    if (analysisTimerRef.current) {
      clearInterval(analysisTimerRef.current);
      analysisTimerRef.current = null;
    }
    setAnalysisInProgress(false);
  }, []);

  const startAnalysisTimer = useCallback((fileCount: number) => {
    if (analysisTimerRef.current) {
      clearInterval(analysisTimerRef.current);
      analysisTimerRef.current = null;
    }
    setAnalysisFileCount(fileCount);
    setAnalysisElapsedSec(0);
    setAnalysisInProgress(true);
    analysisTimerRef.current = setInterval(() => {
      setAnalysisElapsedSec((prev) => prev + 1);
    }, 1000);
  }, []);

  const handleSubmit = async () => {
    if (files.length === 0) {
      setStatus("파일을 선택해주세요.");
      setStatusTone("danger");
      return;
    }

    setStatusTone("idle");
    setLoading(true);
    setStatus(`PDF ${files.length}개 업로드 준비 중...`);
    setResult(null);
    setSimilarCandidates([]);
    setSelectedCandidateId(null);
    setExistingSnapshot(null);
    setCompareFields([]);
    setSelectionMap({});
    setCreatedPropertyId(null);
    setShowNewPropertyAction(false);

    try {
      const previousAssignmentMap = await buildExtractedImageAssignmentMap();
      const fileKeys = await uploadPdfsToR2Temp(files);
      setStatus(`PDF ${files.length}개 분석 중...`);
      startAnalysisTimer(files.length);
      const response = await fetch("/api/extract-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKeys, cleanupTempKeys: true }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || `서버 에러: ${response.status}`);
      }

      const data = await response.json();
      stopAnalysisTimer();
      setAllUploadedFiles(files);
      setResult(data);
      setValidationContractRatioPercent(
        formatRatioToPercentText(data.validation?.contract_ratio),
      );
      setValidationTransferRestriction(
        typeof data.validation?.transfer_restriction === "boolean"
          ? data.validation.transfer_restriction
          : null,
      );
      setValidationTransferRestrictionPeriod(
        typeof data.validation?.transfer_restriction_period === "string" &&
          data.validation.transfer_restriction_period.trim().length > 0
          ? data.validation.transfer_restriction_period.trim()
          : null,
      );
      setEditBaselineVersion((prev) => prev + 1);
      setDismissedMergeCandidateKeys([]);
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
      setModelhouseMainImageUrl("");
      setModelhouseMainImageFile(null);
      setModelhouseGalleryImageUrls([]);
      setModelhouseGalleryImageFiles([]);

      // 추출된 이미지 초기화 (AI 분류 결과로 자동 배정)
      if (data.extractedImages && Array.isArray(data.extractedImages)) {
        let mainAssigned = false;
        const drafted = data.extractedImages
          .filter(
            (img: { aiType?: "building" | "floor_plan" | "other" }) =>
              img.aiType !== "other",
          )
          .map(
          (img: {
            id: string;
            base64: string;
            source: string;
            aiType?: "building" | "floor_plan" | "other";
          }) => {
            let destination: ExtractedImageWithDestination["destination"] = "none";
            if (img.aiType === "building" && !mainAssigned) {
              destination = "main";
              mainAssigned = true;
            } else if (img.aiType === "building") {
              destination = "gallery";
            } else if (img.aiType === "floor_plan") {
              destination = "floor_plan";
            }
            return makeExtractedImage(img, destination);
          },
        );
        const assigned = await applyExtractedImageAssignmentsByHash(
          drafted,
          previousAssignmentMap,
          (data.unit_types ?? []) as ExtractUnitTypeExtended[],
        );
        // 추출된 이미지는 우선 모두 표시한다.
        setExtractedImages(assigned);
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
      stopAnalysisTimer();
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      setStatus(`오류: ${toKoreanErrorMessage(message)}`);
      setStatusTone("danger");
    } finally {
      stopAnalysisTimer();
      setLoading(false);
    }
  };

  const handleTextOnlyReExtract = async () => {
    const targetFiles = allUploadedFiles.length > 0 ? allUploadedFiles : files;
    if (targetFiles.length === 0 || !result) return;

    setTextOnlyLoading(true);
    setStatusTone("idle");
    setStatus("텍스트만 재추출 중...");

    try {
      const fileKeys = await uploadPdfsToR2Temp(targetFiles);
      setStatus("텍스트만 재추출 중...");
      const response = await fetch("/api/extract-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileKeys,
          textOnly: true,
          cleanupTempKeys: true,
        }),
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
          responseVersion: data.responseVersion ?? prev.responseVersion,
          properties: data.properties ?? prev.properties,
          location: data.location ?? prev.location,
          specs: data.specs ?? prev.specs,
          timeline: data.timeline ?? prev.timeline,
          validation: data.validation ?? prev.validation,
          unit_types: data.unit_types ?? prev.unit_types,
          facilities: data.facilities ?? prev.facilities,
          web_evidence: data.web_evidence ?? prev.web_evidence,
          _meta: data._meta ?? prev._meta,
        };
      });
      setValidationContractRatioPercent(
        formatRatioToPercentText(data.validation?.contract_ratio),
      );
      setValidationTransferRestriction(
        typeof data.validation?.transfer_restriction === "boolean"
          ? data.validation.transfer_restriction
          : null,
      );
      setValidationTransferRestrictionPeriod(
        typeof data.validation?.transfer_restriction_period === "string" &&
          data.validation.transfer_restriction_period.trim().length > 0
          ? data.validation.transfer_restriction_period.trim()
          : null,
      );
      setEditBaselineVersion((prev) => prev + 1);
      setDismissedMergeCandidateKeys([]);

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

  const handleAdditionalPdf = async (filesToMerge: File[]) => {
    if (filesToMerge.length === 0 || !result) return;

    setAdditionalLoading(true);
    setStatusTone("idle");
    setStatus(`추가 PDF ${filesToMerge.length}개 분석 중...`);

    try {
      const previousAssignmentMap = await buildExtractedImageAssignmentMap();
      const fileKeys = await uploadPdfsToR2Temp(filesToMerge);
      setStatus(`추가 PDF ${filesToMerge.length}개 분석 중...`);
      const response = await fetch("/api/extract-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKeys, cleanupTempKeys: true }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || `서버 에러: ${response.status}`);
      }

      const data = await response.json();
      const merged = mergeExtractResults(result, data);
      setResult(merged);
      setValidationContractRatioPercent(
        formatRatioToPercentText(merged.validation?.contract_ratio),
      );
      setValidationTransferRestriction(
        typeof merged.validation?.transfer_restriction === "boolean"
          ? merged.validation.transfer_restriction
          : null,
      );
      setValidationTransferRestrictionPeriod(
        typeof merged.validation?.transfer_restriction_period === "string" &&
          merged.validation.transfer_restriction_period.trim().length > 0
          ? merged.validation.transfer_restriction_period.trim()
          : null,
      );
      setEditBaselineVersion((prev) => prev + 1);
      setDismissedMergeCandidateKeys([]);
      setAllUploadedFiles((prev) => [...prev, ...filesToMerge]);
      setFiles((prev) => [...prev, ...filesToMerge]);

      // 추출된 이미지 합산
      if (data.extractedImages && Array.isArray(data.extractedImages)) {
        const drafted: ExtractedImageWithDestination[] = data.extractedImages
          .filter(
            (img: { aiType?: "building" | "floor_plan" | "other" }) =>
              img.aiType !== "other",
          )
          .map(
          (img: {
            id: string;
            base64: string;
            source: string;
            aiType?: "building" | "floor_plan" | "other";
          }) => {
            let destination: ExtractedImageWithDestination["destination"] =
              "none";
            if (img.aiType === "building") {
              destination = "gallery";
            } else if (img.aiType === "floor_plan") {
              destination = "floor_plan";
            }
            return makeExtractedImage(img, destination);
          },
        );
        const newImages = await applyExtractedImageAssignmentsByHash(
          drafted,
          previousAssignmentMap,
          (merged.unit_types ?? []) as ExtractUnitTypeExtended[],
        );
        setExtractedImages((prev) => [...prev, ...newImages]);
      }
      setStatus(
        `추가 PDF 병합 완료! 데이터가 업데이트되었습니다.`,
      );
      setStatusTone("safe");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      setStatus(`추가 PDF 오류: ${toKoreanErrorMessage(message)}`);
      setStatusTone("danger");
    } finally {
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
    setCreatedPropertyId(null);
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
      const fetchUnitTypesForComparison = async () => {
        const unitTypes = await supabase
          .from("property_unit_types")
          .select(
            "id, type_name, exclusive_area, supply_area, rooms, bathrooms, building_layout, orientation, supply_count, price_min, price_max, unit_count, is_price_public, is_public",
          )
          .eq("properties_id", selectedCandidateId)
          .order("id", { ascending: true });

        if (unitTypes.error) throw unitTypes.error;
        return ((unitTypes.data ?? []) as Array<
          Omit<ExistingPropertySnapshot["unit_types"][number], "floor_plan_url">
        >).map((unit) => ({
          ...unit,
          floor_plan_url: null,
        }));
      };

      const [
        propertyRes,
        locationRes,
        specsRes,
        timelineRes,
        unitTypeRows,
        imageAssetsRes,
      ] =
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
              "id, announcement_date, application_start, application_end, winner_announce, contract_start, contract_end, move_in_date, move_in_text",
            )
            .eq("properties_id", selectedCandidateId)
            .maybeSingle(),
          fetchUnitTypesForComparison(),
          supabase
            .from("property_image_assets")
            .select(
              "id, property_id, unit_type_id, kind, image_url, sort_order, caption, image_hash, is_active, created_at",
            )
            .eq("property_id", selectedCandidateId)
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true }),
        ]);

      if (propertyRes.error) throw propertyRes.error;
      if (locationRes.error) throw locationRes.error;
      if (specsRes.error) throw specsRes.error;
      if (timelineRes.error) throw timelineRes.error;
      if (
        imageAssetsRes.error &&
        imageAssetsRes.error.code !== "42P01"
      ) {
        throw imageAssetsRes.error;
      }

      const assetRows = (imageAssetsRes.data ??
        []) as Array<{
        id: string;
        property_id: number;
        unit_type_id: number | null;
        kind:
          | "main"
          | "gallery"
          | "modelhouse_main"
          | "modelhouse_gallery"
          | "floor_plan";
        image_url: string;
        sort_order: number | null;
        caption: string | null;
        image_hash: string | null;
        is_active: boolean;
        created_at: string;
      }>;
      const activeMainAsset = assetRows.find((row) => row.kind === "main");
      const activeGalleryAssets = assetRows.filter((row) => row.kind === "gallery");
      const activeModelhouseMainAsset = assetRows.find(
        (row) => row.kind === "modelhouse_main",
      );
      const activeModelhouseGalleryAssets = assetRows.filter(
        (row) => row.kind === "modelhouse_gallery",
      );
      const floorPlanAssetByUnitTypeId = new Map<number, string>();
      const assetHashByUrl: Record<string, string> = {};
      const assetDctPHashByUrl: Record<string, string> = {};
      assetRows.forEach((row) => {
        if (row.image_hash) {
          assetHashByUrl[row.image_url] = row.image_hash;
        }
        const dctPHash = extractImageDctPHashFromCaption(row.caption);
        if (dctPHash) {
          assetDctPHashByUrl[row.image_url] = dctPHash;
        }
        if (row.kind !== "floor_plan") return;
        if (typeof row.unit_type_id !== "number") return;
        if (!floorPlanAssetByUnitTypeId.has(row.unit_type_id)) {
          floorPlanAssetByUnitTypeId.set(row.unit_type_id, row.image_url);
        }
      });
      const galleryRowsForSnapshot = activeGalleryAssets.map((row) => ({
        id: row.id,
        image_url: row.image_url,
        sort_order: row.sort_order,
        caption: row.caption,
        image_hash: row.image_hash,
      }));
      const modelhouseRowsForSnapshot = [
        ...(activeModelhouseMainAsset ? [activeModelhouseMainAsset] : []),
        ...activeModelhouseGalleryAssets,
      ].map((row) => ({
        id: row.id,
        image_url: row.image_url,
        sort_order: row.sort_order,
        caption: row.caption,
        image_hash: row.image_hash,
      }));
      const existingUnitTypes = unitTypeRows.map(
        (unit) => {
          const convertedMin = toManwonFromWon(unit.price_min);
          const convertedMax = toManwonFromWon(unit.price_max);
          const normalized = normalizePriceRange(convertedMin, convertedMax);
          return {
            ...unit,
            floor_plan_url:
              floorPlanAssetByUnitTypeId.get(unit.id) ?? unit.floor_plan_url,
            price_min: normalized.min,
            price_max: normalized.max,
            is_price_public: unit.is_price_public,
            is_public: unit.is_public,
          };
        },
      );
      const existingImageUrls = Array.from(
        new Set(
          [
            activeMainAsset?.image_url,
            ...assetRows.map((row) => row.image_url),
            ...galleryRowsForSnapshot.map((row) => row.image_url),
            ...modelhouseRowsForSnapshot.map((row) => row.image_url),
            ...existingUnitTypes.map((unit) => unit.floor_plan_url),
          ].filter((url): url is string => Boolean(url)),
        ),
      );
      const existingDctPHashes = Array.from(
        new Set(
          [
            ...assetRows
              .map((row) => extractImageDctPHashFromCaption(row.caption))
              .filter((phash): phash is string => Boolean(phash)),
            ...galleryRowsForSnapshot
              .map((row) => extractImageDctPHashFromCaption(row.caption))
              .filter((phash): phash is string => Boolean(phash)),
            ...modelhouseRowsForSnapshot
              .map((row) => extractImageDctPHashFromCaption(row.caption))
              .filter((phash): phash is string => Boolean(phash)),
          ],
        ),
      );

      const snapshot: ExistingPropertySnapshot = {
        property: {
          id: Number(propertyRes.data.id),
          name: String(propertyRes.data.name ?? ""),
          property_type:
            (propertyRes.data.property_type as string | null) ?? null,
          status: (propertyRes.data.status as string | null) ?? null,
          description: (propertyRes.data.description as string | null) ?? null,
          image_url: null,
        },
        location:
          (locationRes.data as ExistingPropertySnapshot["location"]) ?? null,
        specs: (specsRes.data as ExistingPropertySnapshot["specs"]) ?? null,
        timeline:
          (timelineRes.data as ExistingPropertySnapshot["timeline"]) ?? null,
        images: {
          main_image_url: activeMainAsset?.image_url ?? null,
          main_image_hash: activeMainAsset?.image_hash ?? null,
          existing_hashes: Array.from(
            new Set(
              assetRows
                .map((row) => row.image_hash)
                .filter((hash): hash is string => Boolean(hash)),
            ),
          ),
          existing_dct_phashes: existingDctPHashes,
          existing_image_urls: existingImageUrls,
          asset_hash_by_url: assetHashByUrl,
          asset_dct_phash_by_url: assetDctPHashByUrl,
          gallery: galleryRowsForSnapshot,
        },
        unit_types: existingUnitTypes,
      };

      const diffFields = buildCompareFields(snapshot, result);
      const initialSelections = Object.fromEntries(
        diffFields.map((field) => [field.key, "existing" as CompareSource]),
      );

      setResult((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          unit_types: mergeExistingUnitsIntoResult(
            (prev.unit_types ?? []) as ExtractUnitTypeExtended[],
            snapshot.unit_types,
          ),
        };
      });

      setExistingSnapshot(snapshot);
      setCompareFields(diffFields);
      setSelectionMap(initialSelections);
      await loadConditionValidationProfile(snapshot.property.id);

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

  useEffect(() => {
    if (!existingSnapshot || !result) return;
    const nextCompareFields = buildCompareFields(existingSnapshot, result);
    setCompareFields(nextCompareFields);
    setSelectionMap((prev) =>
      Object.fromEntries(
        nextCompareFields.map((field) => [
          field.key,
          prev[field.key] ?? ("existing" as CompareSource),
        ]),
      ) as Record<string, CompareSource>,
    );
  }, [existingSnapshot, result]);

  const handleSaveByContext = async <T,>(
    callback: (propertyId: number) => Promise<T>,
  ): Promise<T> => {
    const propertyId = existingSnapshot?.property.id ?? createdPropertyId;
    if (!propertyId) {
      throw new Error("저장 대상 현장을 먼저 선택하거나 생성해주세요.");
    }
    return callback(propertyId);
  };

  const loadConditionValidationProfile = async (propertyId: number) => {
    try {
      const response = await fetch(
        `/api/condition-validation/profiles/upsert?propertyId=${propertyId}`,
      );
      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            resolved?: {
              contract_ratio?: number | null;
              transfer_restriction?: boolean | null;
              transfer_restriction_period?: string | null;
            };
          }
        | null;

      if (!response.ok) return;

      const nextContractRatioPercent = formatRatioToPercentText(
        payload?.resolved?.contract_ratio,
      );
      const nextTransferRestriction = Boolean(
        payload?.resolved?.transfer_restriction,
      );
      setValidationContractRatioPercent(nextContractRatioPercent);
      setValidationTransferRestriction(
        typeof payload?.resolved?.transfer_restriction === "boolean"
          ? nextTransferRestriction
          : null,
      );
      setValidationTransferRestrictionPeriod(
        typeof payload?.resolved?.transfer_restriction_period === "string" &&
          payload.resolved.transfer_restriction_period.trim().length > 0
          ? payload.resolved.transfer_restriction_period.trim()
          : null,
      );
    } catch {
      // 조회 실패 시 기존 입력값을 유지한다.
    }
  };

  const syncConditionValidationProfile = async (params: {
    propertyId: number;
    propertyType: unknown;
    unitTypes: ExtractUnitTypeExtended[] | null | undefined;
    contractRatio: number | null;
    transferRestriction: boolean | null;
    transferRestrictionPeriod: string | null;
  }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const response = await fetch("/api/condition-validation/profiles/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: params.propertyId,
          propertyType:
            normalizeComparableValue(params.propertyType) ?? null,
          unitTypes: params.unitTypes ?? [],
          contractRatio: params.contractRatio,
          transferRestriction: params.transferRestriction,
          transferRestrictionPeriod: params.transferRestrictionPeriod,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        return {
          ok: false,
          error:
            typeof payload?.error === "string"
              ? payload.error
              : `HTTP ${response.status}`,
        };
      }

      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "조건 검증 기준 동기화 실패",
      };
    }
  };

  const buildFacilityRowsForProperty = (propertyId: number) => {
    const source = result?.facilities ?? [];
    const basePropertyName =
      String(normalizeComparableValue(result?.properties?.name) ?? "").trim() ||
      "현장";

    return source.map((facility) => {
      const facilityWithCoords = facility as ExtractFacilityWithCoords;
      const splitAddress = splitFacilityRoadAddress(facility.road_address);
      const normalizedType =
        String(normalizeComparableValue(facility.type) ?? "").trim() ||
        "모델하우스";
      const normalizedName = String(
        normalizeComparableValue(facility.name) ?? "",
      ).trim();
      const fallbackName = `${basePropertyName} ${normalizedType}`.trim();
      const normalizedAddressDetail = normalizeComparableValue(
        facility.address_detail,
      );
      const rawLat = toNumberOrNull(facilityWithCoords.lat);
      const rawLng = toNumberOrNull(facilityWithCoords.lng);
      const { lat, lng } = normalizeKoreaCoords(rawLat, rawLng);

      return {
        properties_id: propertyId,
        type: mapFacilityTypeToDb(facility.type),
        name: normalizedName || fallbackName,
        road_address: splitAddress.roadAddress,
        address_detail: normalizedAddressDetail ?? splitAddress.addressDetail,
        lat,
        lng,
        open_start: normalizeFacilityOpenDateForDb(facility.open_start),
        open_end: normalizeFacilityOpenDateForDb(facility.open_end),
        is_active: true,
      };
    });
  };

  const makeFacilitySyncKey = (facility: {
    type: unknown;
    name: unknown;
    road_address: unknown;
    address_detail: unknown;
    open_start: unknown;
    open_end: unknown;
  }) =>
    [
      normalizeFacilitySyncKeyPart(facility.type),
      normalizeFacilitySyncKeyPart(facility.name),
      normalizeFacilitySyncKeyPart(facility.road_address),
      normalizeFacilitySyncKeyPart(facility.address_detail),
      normalizeFacilitySyncKeyPart(facility.open_start),
      normalizeFacilitySyncKeyPart(facility.open_end),
    ].join("|");

  const syncFacilitiesForProperty = async (
    supabase: ReturnType<typeof createSupabaseClient>,
    propertyId: number,
  ) => {
    const preparedRows = buildFacilityRowsForProperty(propertyId).filter(
      (row) => String(row.name ?? "").trim().length > 0,
    );
    if (preparedRows.length === 0) {
      return { prepared: 0, inserted: 0, updated: 0, skippedDuplicates: 0 };
    }

    const { data: existingFacilities, error: existingFacilitiesError } =
      await supabase
        .from("property_facilities")
        .select(
          "id, type, name, road_address, address_detail, lat, lng, open_start, open_end",
        )
        .eq("properties_id", propertyId);
    if (existingFacilitiesError) throw existingFacilitiesError;

    const existingByKey = new Map<
      string,
      {
        id: number;
        road_address: string | null;
        address_detail: string | null;
        lat: number | null;
        lng: number | null;
        open_start: string | null;
        open_end: string | null;
      }
    >();
    for (const row of existingFacilities ?? []) {
      const key = makeFacilitySyncKey(row);
      if (existingByKey.has(key)) continue;
      existingByKey.set(key, {
        id: row.id,
        road_address: row.road_address ?? null,
        address_detail: row.address_detail ?? null,
        lat: toNumberOrNull(row.lat),
        lng: toNumberOrNull(row.lng),
        open_start: row.open_start ?? null,
        open_end: row.open_end ?? null,
      });
    }

    const rowsToInsert: typeof preparedRows = [];
    const rowsToUpdate: Array<{ id: number; payload: Record<string, unknown> }> = [];

    for (const row of preparedRows) {
      const key = makeFacilitySyncKey(row);
      const existing = existingByKey.get(key);
      if (!existing) {
        rowsToInsert.push(row);
        continue;
      }

      const payload: Record<string, unknown> = {};
      if (existing.road_address == null && row.road_address != null) {
        payload.road_address = row.road_address;
      }
      if (existing.address_detail == null && row.address_detail != null) {
        payload.address_detail = row.address_detail;
      }
      if (existing.open_start == null && row.open_start != null) {
        payload.open_start = row.open_start;
      }
      if (existing.open_end == null && row.open_end != null) {
        payload.open_end = row.open_end;
      }
      if (existing.lat == null && row.lat != null) {
        payload.lat = row.lat;
      }
      if (existing.lng == null && row.lng != null) {
        payload.lng = row.lng;
      }

      if (Object.keys(payload).length > 0) {
        rowsToUpdate.push({ id: existing.id, payload });
      }
    }

    if (rowsToInsert.length > 0) {
      const { error: facilitiesError } = await supabase
        .from("property_facilities")
        .insert(rowsToInsert);
      if (facilitiesError) throw facilitiesError;
    }
    for (const row of rowsToUpdate) {
      const { error: updateError } = await supabase
        .from("property_facilities")
        .update(row.payload)
        .eq("id", row.id);
      if (updateError) throw updateError;
    }

    return {
      prepared: preparedRows.length,
      inserted: rowsToInsert.length,
      updated: rowsToUpdate.length,
      skippedDuplicates:
        preparedRows.length - rowsToInsert.length - rowsToUpdate.length,
    };
  };

  const applyHouseholdTotalOverride = async (
    supabase: ReturnType<typeof createSupabaseClient>,
    propertyId: number,
    householdTotal: number | null,
  ) => {
    if (householdTotal == null) return;

    const { error } = await supabase.from("property_specs").upsert(
      {
        properties_id: propertyId,
        household_total: householdTotal,
      },
      { onConflict: "properties_id" },
    );
    if (error) throw error;
  };

  const applySelectedMerge = async () => {
    if (!existingSnapshot || !result) return;
    if (!confirm(`"${existingSnapshot.property.name}" 현장에 선택한 값을 반영하시겠습니까?`)) return;
    const parsedContractRatio = parsePercentToRatio(validationContractRatioPercent);
    if (parsedContractRatio === null) {
      setStatus("계약금 비율은 0~100 사이 숫자로 입력해주세요. (예: 10)");
      setStatusTone("danger");
      return;
    }

    setSavingCompareMerge(true);
    try {
      const supabase = createSupabaseClient();
      const activeCompareFields = buildCompareFields(existingSnapshot, result);
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
          move_in_date:
            existingSnapshot.timeline?.move_in_text ??
            existingSnapshot.timeline?.move_in_date ??
            null,
        },
      };

      for (const field of activeCompareFields) {
        const selected = selectionMap[field.key] ?? "existing";
        if (selected !== "incoming") continue;

        const normalizedIncoming =
          field.key === "properties.status"
            ? normalizeStatusForDb(String(field.incomingValue ?? ""))
            : NUMERIC_COMPARE_KEYS.has(field.key)
              ? toNumberOrNullLoose(field.incomingValue)
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

      const syncSummary = await handleSaveByContext(async (targetId) => {
        const selectedIncomingHouseholdTotal =
          selectionMap["specs.household_total"] === "incoming";
        const selectedHouseholdTotal = selectedIncomingHouseholdTotal
          ? toNumberOrNullLoose(merged.specs.household_total)
          : null;
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
          site_area: toNumberOrNullLoose(merged.specs.site_area),
          building_area: toNumberOrNullLoose(merged.specs.building_area),
          floor_ground: toNumberOrNullLoose(merged.specs.floor_ground),
          floor_underground: toNumberOrNullLoose(merged.specs.floor_underground),
          building_count: toNumberOrNullLoose(merged.specs.building_count),
          household_total: toNumberOrNullLoose(merged.specs.household_total),
          parking_total: toNumberOrNullLoose(merged.specs.parking_total),
          parking_per_household: toNumberOrNullLoose(
            merged.specs.parking_per_household,
          ),
          heating_type: normalizeComparableValue(merged.specs.heating_type),
          floor_area_ratio: toNumberOrNullLoose(merged.specs.floor_area_ratio),
          building_coverage_ratio: toNumberOrNullLoose(
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
          move_in_text: normalizeComparableValue(merged.timeline.move_in_date),
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

        const facilitySync = await syncFacilitiesForProperty(supabase, targetId);
        const unitSync = await syncUnitTypesForProperty(supabase, targetId);
        const manualGalleryUploaded = await syncManualGalleryFilesForProperty(
          targetId,
        );
        const manualModelhouseUploaded =
          await syncManualModelhouseFilesForProperty(supabase, targetId);
        const imageSync = await syncExtractedImagesForProperty(
          supabase,
          targetId,
          unitSync.rowIndexToUnitId,
        );
        const validationProfileSync = await syncConditionValidationProfile({
          propertyId: targetId,
          propertyType: merged.properties.property_type,
          unitTypes: (result.unit_types ?? []) as ExtractUnitTypeExtended[],
          contractRatio: parsedContractRatio,
          transferRestriction: validationTransferRestriction,
          transferRestrictionPeriod: validationTransferRestrictionPeriod,
        });
        await applyHouseholdTotalOverride(
          supabase,
          targetId,
          selectedHouseholdTotal,
        );
        return {
          targetId,
          unitSync,
          imageSync,
          manualGalleryUploaded,
          manualModelhouseUploaded,
          facilitySync,
          validationProfileSynced: validationProfileSync.ok,
        };
      });

      const appliedCount = activeCompareFields.filter(
        (field) => selectionMap[field.key] === "incoming",
      ).length;

      setStatus(
        appliedCount > 0
          ? `선택 반영 완료: ${appliedCount}개 항목, 타입 업데이트 ${syncSummary.unitSync.updated}개, 타입 추가 ${syncSummary.unitSync.inserted}개, 시설 추가 ${syncSummary.facilitySync.inserted}개/보완 ${syncSummary.facilitySync.updated}개(중복 스킵 ${syncSummary.facilitySync.skippedDuplicates}개), 수동 추가사진 ${syncSummary.manualGalleryUploaded}개, 수동 모델하우스사진 ${syncSummary.manualModelhouseUploaded}개, 추출 갤러리 업로드 ${syncSummary.imageSync.galleryUploaded}개/삭제 ${syncSummary.imageSync.galleryDeleted}개(중복 스킵 ${syncSummary.imageSync.gallerySkippedByHash}개), 평면도 업데이트 ${syncSummary.imageSync.floorPlanUpdated}개/해제 ${syncSummary.imageSync.floorPlanCleared}개, 검증기준 ${syncSummary.validationProfileSynced ? "동기화 완료" : "동기화 실패"} — 2초 후 새로고침됩니다.`
          : `선택된 변경 항목은 없지만 동기화 완료: 타입 업데이트 ${syncSummary.unitSync.updated}개, 타입 추가 ${syncSummary.unitSync.inserted}개, 시설 추가 ${syncSummary.facilitySync.inserted}개/보완 ${syncSummary.facilitySync.updated}개(중복 스킵 ${syncSummary.facilitySync.skippedDuplicates}개), 수동 추가사진 ${syncSummary.manualGalleryUploaded}개, 수동 모델하우스사진 ${syncSummary.manualModelhouseUploaded}개, 추출 갤러리 업로드 ${syncSummary.imageSync.galleryUploaded}개/삭제 ${syncSummary.imageSync.galleryDeleted}개(중복 스킵 ${syncSummary.imageSync.gallerySkippedByHash}개), 평면도 업데이트 ${syncSummary.imageSync.floorPlanUpdated}개/해제 ${syncSummary.imageSync.floorPlanCleared}개, 검증기준 ${syncSummary.validationProfileSynced ? "동기화 완료" : "동기화 실패"} — 2초 후 새로고침됩니다.`,
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
    const parsedContractRatio = parsePercentToRatio(validationContractRatioPercent);
    if (parsedContractRatio === null) {
      setStatus("계약금 비율은 0~100 사이 숫자로 입력해주세요. (예: 10)");
      setStatusTone("danger");
      return;
    }

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
        const mainImageHash = await hashFile(mainImageFile);
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
        await upsertPropertyImageAsset(supabase, {
          property_id: propertyId,
          kind: "main",
          image_url: mainImagePublicUrl,
          image_hash: mainImageHash,
          caption: null,
          sort_order: 0,
        });
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
        move_in_text: normalizeComparableValue(result.timeline?.move_in_date),
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
      const unitSync = await syncUnitTypesForProperty(supabase, propertyId);
      const facilitySync = await syncFacilitiesForProperty(supabase, propertyId);

      const manualGalleryUploaded =
        await syncManualGalleryFilesForProperty(propertyId);
      const manualModelhouseUploaded =
        await syncManualModelhouseFilesForProperty(supabase, propertyId);

      const imageSync = await syncExtractedImagesForProperty(
        supabase,
        propertyId,
        unitSync.rowIndexToUnitId,
      );
      const validationProfileSync = await syncConditionValidationProfile({
        propertyId,
        propertyType: propertyPayload.property_type,
        unitTypes: (result.unit_types ?? []) as ExtractUnitTypeExtended[],
        contractRatio: parsedContractRatio,
        transferRestriction: validationTransferRestriction,
        transferRestrictionPeriod: validationTransferRestrictionPeriod,
      });
      await applyHouseholdTotalOverride(
        supabase,
        propertyId,
        toNumberOrNullLoose(result.specs?.household_total),
      );
      setCreatedPropertyId(propertyId);

      setStatus(
        `새 현장 등록 완료 (ID: ${propertyId}, 대표사진 ${mainImagePublicUrl ? 1 : 0}장, 추가사진 ${manualGalleryUploaded}장, 모델하우스사진 ${manualModelhouseUploaded}장, 평면도 ${unitSync.uploadedFloorPlans + imageSync.floorPlanUpdated}장, PDF추출이미지 ${imageSync.galleryUploaded + imageSync.mainUpdated + imageSync.floorPlanUpdated}장, 타입 추가 ${unitSync.inserted}개, 시설 추가 ${facilitySync.inserted}개/보완 ${facilitySync.updated}개(중복 스킵 ${facilitySync.skippedDuplicates}개), 갤러리 삭제 ${imageSync.galleryDeleted}개, 평면도 해제 ${imageSync.floorPlanCleared}개, 중복스킵 ${imageSync.gallerySkippedByHash}개, 검증기준 ${validationProfileSync.ok ? "동기화 완료" : "동기화 실패"}) — 2초 후 새로고침됩니다.`,
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
    setAllUploadedFiles((prev) =>
      prev.filter((_, index) => index !== removeIndex),
    );
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
    const key = `${section}.${field}`;
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
    if (existingSnapshot) {
      setSelectionMap((prev) => ({ ...prev, [key]: "incoming" }));
    }
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
  const isUnitPricePublic = (unit: ExtractUnitTypeExtended | null | undefined) =>
    unit?.is_price_public !== false;
  const isUnitPublic = (unit: ExtractUnitTypeExtended | null | undefined) =>
    unit?.is_public !== false;
  const setUnitPricePublic = (index: number, isPublic: boolean) => {
    const current = (result?.unit_types?.[index] as ExtractUnitTypeExtended | undefined) ?? null;
    if (!current) return;
    updateResultUnitField(index, "is_price_public", isPublic);
  };
  const setUnitPublic = (index: number, isPublic: boolean) => {
    const current = (result?.unit_types?.[index] as ExtractUnitTypeExtended | undefined) ?? null;
    if (!current) return;
    updateResultUnitField(index, "is_public", isPublic);
  };
  const addUnitTypeRow = () => {
    setResult((prev) => {
      if (!prev) return prev;
      const nextUnits = [...(prev.unit_types ?? [])] as ExtractUnitTypeExtended[];
      nextUnits.push({
        type_name: "",
        exclusive_area: null,
        supply_area: null,
        rooms: null,
        bathrooms: null,
        price_min: null,
        price_max: null,
        unit_count: null,
        supply_count: null,
        building_layout: null,
        orientation: null,
        is_price_public: true,
        is_public: true,
        floor_plan_url: null,
        image_url: null,
      });
      return { ...prev, unit_types: nextUnits };
    });
  };
  const removeUnitTypeRow = (removeIndex: number) => {
    const removedPreviewUrl = unitFloorPlanUrlsRef.current[removeIndex];
    revokeBlobUrl(removedPreviewUrl);

    setResult((prev) => {
      if (!prev) return prev;
      const nextUnits = [...(prev.unit_types ?? [])] as ExtractUnitTypeExtended[];
      if (!nextUnits[removeIndex]) return prev;
      nextUnits.splice(removeIndex, 1);
      return { ...prev, unit_types: nextUnits };
    });

    setUnitFloorPlanFiles((prev) => {
      const next: Record<number, File | null> = {};
      Object.entries(prev).forEach(([key, file]) => {
        const index = Number(key);
        if (!Number.isFinite(index) || index === removeIndex) return;
        const target = index > removeIndex ? index - 1 : index;
        next[target] = file;
      });
      return next;
    });

    setUnitFloorPlanUrls((prev) => {
      const next: Record<number, string> = {};
      Object.entries(prev).forEach(([key, url]) => {
        const index = Number(key);
        if (!Number.isFinite(index) || index === removeIndex) return;
        const target = index > removeIndex ? index - 1 : index;
        next[target] = url;
      });
      return next;
    });

    setExtractedImages((prev) =>
      prev.map((img) => {
        if (img.destination !== "floor_plan") return img;
        if (img.unitTypeIndex === undefined) return img;
        if (img.unitTypeIndex === removeIndex) {
          if (typeof img.unitTypeId === "number") {
            pendingFloorPlanClearUnitTypeIdsRef.current.add(img.unitTypeId);
          }
          return {
            ...img,
            destination: "none",
            unitTypeIndex: undefined,
            unitTypeId: undefined,
          };
        }
        if (img.unitTypeIndex > removeIndex) {
          return {
            ...img,
            unitTypeIndex: img.unitTypeIndex - 1,
            unitTypeId: undefined,
          };
        }
        return img;
      }),
    );
    setSelectedUnitMergeRows((prev) =>
      prev
        .filter((index) => index !== removeIndex)
        .map((index) => (index > removeIndex ? index - 1 : index)),
    );
  };
  const mergeUnitTypeRows = (leftIndex: number, rightIndex: number) => {
    if (!result?.unit_types?.length) return;
    applyUnitSyncPair(leftIndex, rightIndex);
  };
  const dismissMergeCandidate = (leftIndex: number, rightIndex: number) => {
    const key = getUnitMergeCandidateSessionKey(leftIndex, rightIndex);
    setDismissedMergeCandidateKeys((prev) =>
      prev.includes(key) ? prev : [...prev, key],
    );
  };
  const toggleUnitMergeRowSelection = (rowIndex: number, checked: boolean) => {
    setSelectedUnitMergeRows((prev) => {
      if (checked) return prev.includes(rowIndex) ? prev : [...prev, rowIndex];
      return prev.filter((index) => index !== rowIndex);
    });
  };
  const selectRecommendedUnitRows = () => {
    setSelectedUnitMergeRows(Array.from(recommendedUnitRowIndexSet).sort((a, b) => a - b));
  };
  const clearSelectedUnitRows = () => {
    setSelectedUnitMergeRows([]);
  };
  const unitSyncColumns = [
    { key: "type_name", label: "타입명" },
    { key: "exclusive_area", label: "전용" },
    { key: "supply_area", label: "공급" },
    { key: "rooms", label: "방" },
    { key: "bathrooms", label: "욕실" },
    { key: "building_layout", label: "구조" },
    { key: "orientation", label: "향" },
    { key: "supply_count", label: "공급수" },
    { key: "price_min", label: "최저 분양가" },
    { key: "price_max", label: "최고 분양가" },
    { key: "unit_count", label: "세대수" },
    { key: "floor_plan_url", label: "평면도 URL" },
    { key: "image_url", label: "이미지 URL" },
  ] as const;
  const isEmptyUnitValue = (value: unknown) =>
    value == null || (typeof value === "string" && value.trim() === "");
  const buildUnitSyncDraft = (
    leftIndex: number,
    rightIndex: number,
    selection?: Record<string, UnitConflictSource>,
  ) => {
    const units = (result?.unit_types ?? []) as ExtractUnitTypeExtended[];
    const leftUnit = units[leftIndex];
    const rightUnit = units[rightIndex];
    if (!leftUnit || !rightUnit) return null;

    const nextLeft: ExtractUnitTypeExtended = { ...leftUnit };
    const nextRight: ExtractUnitTypeExtended = { ...rightUnit };
    const conflicts: UnitConflictField[] = [];

    unitSyncColumns.forEach(({ key, label }) => {
      const leftValue = nextLeft[key];
      const rightValue = nextRight[key];
      const leftEmpty = isEmptyUnitValue(leftValue);
      const rightEmpty = isEmptyUnitValue(rightValue);

      if (leftEmpty && !rightEmpty) {
        nextLeft[key] = rightValue as never;
        return;
      }
      if (!leftEmpty && rightEmpty) {
        nextRight[key] = leftValue as never;
        return;
      }
      if (leftEmpty && rightEmpty) return;
      if (isSameValue(leftValue, rightValue)) return;

      const conflictKey = `${leftIndex}-${rightIndex}-${key}`;
      const picked = selection?.[conflictKey];
      if (!picked) {
        conflicts.push({
          key: conflictKey,
          label,
          leftIndex,
          rightIndex,
          leftValue,
          rightValue,
        });
        return;
      }
      const resolvedValue = picked === "left" ? leftValue : rightValue;
      nextLeft[key] = resolvedValue as never;
      nextRight[key] = resolvedValue as never;
    });

    if (typeof nextLeft.unit_type_id !== "number" && typeof nextRight.unit_type_id === "number") {
      nextLeft.unit_type_id = nextRight.unit_type_id;
    }
    if (typeof nextRight.unit_type_id !== "number" && typeof nextLeft.unit_type_id === "number") {
      nextRight.unit_type_id = nextLeft.unit_type_id;
    }

    const leftPrice = normalizePriceRange(
      toNumberOrNull(nextLeft.price_min),
      toNumberOrNull(nextLeft.price_max),
    );
    nextLeft.price_min = leftPrice.min;
    nextLeft.price_max = leftPrice.max;

    const rightPrice = normalizePriceRange(
      toNumberOrNull(nextRight.price_min),
      toNumberOrNull(nextRight.price_max),
    );
    nextRight.price_min = rightPrice.min;
    nextRight.price_max = rightPrice.max;

    return { nextLeft, nextRight, conflicts };
  };
  const applyUnitSyncPair = (
    leftIndex: number,
    rightIndex: number,
    selection?: Record<string, UnitConflictSource>,
  ) => {
    const normalizedLeft = Math.min(leftIndex, rightIndex);
    const normalizedRight = Math.max(leftIndex, rightIndex);
    const draft = buildUnitSyncDraft(normalizedLeft, normalizedRight, selection);
    if (!draft) return false;
    if (draft.conflicts.length > 0) {
      setUnitConflictFields(draft.conflicts);
      setUnitConflictSelection((prev) =>
        Object.fromEntries(
          draft.conflicts.map((field) => [field.key, prev[field.key] ?? "left"]),
        ) as Record<string, UnitConflictSource>,
      );
      setStatus("값이 다른 항목이 있어 선택이 필요합니다.");
      setStatusTone("danger");
      return false;
    }

    const mergedUnitTypeId = draft.nextLeft.unit_type_id ?? null;

    setResult((prev) => {
      if (!prev) return prev;
      const nextUnits = [...(prev.unit_types ?? [])] as ExtractUnitTypeExtended[];
      if (!nextUnits[normalizedLeft] || !nextUnits[normalizedRight]) return prev;
      nextUnits[normalizedLeft] = draft.nextLeft;
      nextUnits.splice(normalizedRight, 1);
      return { ...prev, unit_types: nextUnits };
    });
    setUnitFloorPlanFiles((prev) => {
      const next: Record<number, File | null> = {};
      const leftFile = prev[normalizedLeft];
      const rightFile = prev[normalizedRight];
      Object.entries(prev).forEach(([key, file]) => {
        const index = Number(key);
        if (!Number.isFinite(index) || index === normalizedRight) return;
        const target = index > normalizedRight ? index - 1 : index;
        next[target] = file;
      });
      if (!next[normalizedLeft] && rightFile) {
        next[normalizedLeft] = rightFile;
      } else if (!next[normalizedLeft] && leftFile) {
        next[normalizedLeft] = leftFile;
      }
      return next;
    });
    setUnitFloorPlanUrls((prev) => {
      const next: Record<number, string> = {};
      const leftUrl = prev[normalizedLeft];
      const rightUrl = prev[normalizedRight];
      Object.entries(prev).forEach(([key, url]) => {
        const index = Number(key);
        if (!Number.isFinite(index) || index === normalizedRight) return;
        const target = index > normalizedRight ? index - 1 : index;
        next[target] = url;
      });
      if (!next[normalizedLeft] && rightUrl) {
        next[normalizedLeft] = rightUrl;
      } else if (!next[normalizedLeft] && leftUrl) {
        next[normalizedLeft] = leftUrl;
      }
      return next;
    });
    setExtractedImages((prev) =>
      prev.map((img) => {
        if (img.destination !== "floor_plan") return img;
        let nextIndex = img.unitTypeIndex;
        if (typeof nextIndex === "number") {
          if (nextIndex === normalizedRight) nextIndex = normalizedLeft;
          else if (nextIndex > normalizedRight) nextIndex -= 1;
        }
        let nextUnitTypeId = img.unitTypeId;
        if (typeof mergedUnitTypeId === "number" && nextIndex === normalizedLeft) {
          nextUnitTypeId = mergedUnitTypeId;
        }
        return {
          ...img,
          unitTypeIndex: nextIndex,
          unitTypeId: nextUnitTypeId,
        };
      }),
    );
    setUnitConflictFields([]);
    setUnitConflictSelection({});
    setSelectedUnitMergeRows([]);
    setDismissedMergeCandidateKeys([]);
    setStatus("타입 병합 완료: 빈 값은 채우고, 동일/선택값을 반영한 뒤 중복 행 1개를 제거했습니다.");
    setStatusTone("safe");
    return true;
  };
  const remapIndexByMove = (index: number, from: number, to: number) => {
    if (index === from) return to;
    if (from < to && index > from && index <= to) return index - 1;
    if (from > to && index >= to && index < from) return index + 1;
    return index;
  };
  const moveUnitTypeRow = (fromIndex: number, toIndex: number) => {
    if (!result?.unit_types?.length) return;
    if (fromIndex === toIndex) return;

    setResult((prev) => {
      if (!prev) return prev;
      const nextUnits = [...(prev.unit_types ?? [])] as ExtractUnitTypeExtended[];
      if (!nextUnits[fromIndex] || !nextUnits[toIndex]) return prev;
      const [moved] = nextUnits.splice(fromIndex, 1);
      nextUnits.splice(toIndex, 0, moved);
      return { ...prev, unit_types: nextUnits };
    });

    setUnitFloorPlanFiles((prev) => {
      const next: Record<number, File | null> = {};
      Object.entries(prev).forEach(([key, file]) => {
        const index = Number(key);
        if (!Number.isFinite(index)) return;
        next[remapIndexByMove(index, fromIndex, toIndex)] = file;
      });
      return next;
    });

    setUnitFloorPlanUrls((prev) => {
      const next: Record<number, string> = {};
      Object.entries(prev).forEach(([key, url]) => {
        const index = Number(key);
        if (!Number.isFinite(index)) return;
        next[remapIndexByMove(index, fromIndex, toIndex)] = url;
      });
      return next;
    });

    setExtractedImages((prev) =>
      prev.map((img) => {
        if (img.destination !== "floor_plan") return img;
        if (img.unitTypeIndex === undefined) return img;
        return {
          ...img,
          unitTypeIndex: remapIndexByMove(img.unitTypeIndex, fromIndex, toIndex),
        };
      }),
    );

    setSelectedUnitMergeRows((prev) =>
      Array.from(
        new Set(prev.map((index) => remapIndexByMove(index, fromIndex, toIndex))),
      ),
    );
    setDismissedMergeCandidateKeys([]);
  };
  const mergeSelectedUnitTypeRows = () => {
    if (!result?.unit_types?.length) return;
    const selected = Array.from(new Set(selectedUnitMergeRows)).sort((a, b) => a - b);
    if (selected.length !== 2) {
      setStatus("선택 병합은 타입 2개를 선택했을 때만 가능합니다.");
      setStatusTone("danger");
      return;
    }
    const [leftIndex, rightIndex] = selected;
    const applied = applyUnitSyncPair(leftIndex, rightIndex);
    if (applied) setSelectedUnitMergeRows([]);
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
    const strictParsed = toNumberOrNull(trimmed);
    if (strictParsed != null) return strictParsed;
    const looseMatch = trimmed.match(/-?\d[\d,]*(?:\.\d+)?/);
    if (!looseMatch?.[0]) return null;
    return toNumberOrNull(looseMatch[0]);
  };
  const parsePriceRangeInput = (value: string) => {
    const normalized = value.replaceAll("~", " ").replaceAll("-", " ");
    const numbers = normalized
      .split(" ")
      .map((part) => toNumberOrNull(part))
      .filter((part): part is number => part != null);
    if (numbers.length === 0) return { min: null, max: null };
    if (numbers.length === 1) return { min: numbers[0], max: numbers[0] };
    return normalizePriceRange(numbers[0], numbers[1]);
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

  const handleModelhouseMainImageChange = (file: File | null) => {
    if (!file) return;
    setModelhouseMainImageFile(file);
    setModelhouseMainImageUrl((prev) => {
      revokeBlobUrl(prev);
      return URL.createObjectURL(file);
    });
  };

  const handleModelhouseGalleryImagesChange = (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return;
    const nextFiles = Array.from(filesList);
    const nextUrls = nextFiles.map((file) => URL.createObjectURL(file));
    setModelhouseGalleryImageFiles((prev) => [...prev, ...nextFiles]);
    setModelhouseGalleryImageUrls((prev) => [...prev, ...nextUrls]);
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImageFiles((prev) => prev.filter((_, i) => i !== index));
    setGalleryImageUrls((prev) => {
      const target = prev[index];
      revokeBlobUrl(target);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeModelhouseGalleryImage = (index: number) => {
    setModelhouseGalleryImageFiles((prev) => prev.filter((_, i) => i !== index));
    setModelhouseGalleryImageUrls((prev) => {
      const target = prev[index];
      revokeBlobUrl(target);
      return prev.filter((_, i) => i !== index);
    });
  };

  // 추출된 이미지 배치 변경 함수
  const updateImageDestination = (localKey: string, destination: string) => {
    setExtractedImages((prev) =>
      prev.map((img) => {
        if (img.localKey !== localKey) return img;
        if (
          img.destination === "floor_plan" &&
          destination !== "floor_plan" &&
          typeof img.unitTypeId === "number"
        ) {
          pendingFloorPlanClearUnitTypeIdsRef.current.add(img.unitTypeId);
        }
        return {
          ...img,
          destination: destination as ExtractedImageWithDestination["destination"],
          unitTypeIndex: undefined,
          unitTypeId: undefined,
        };
      }),
    );
  };

  const removeExtractedImage = (localKey: string) => {
    setExtractedImages((prev) => {
      const target = prev.find((img) => img.localKey === localKey);
      if (
        target?.destination === "floor_plan" &&
        typeof target.unitTypeId === "number"
      ) {
        pendingFloorPlanClearUnitTypeIdsRef.current.add(target.unitTypeId);
      }
      return prev.filter((img) => img.localKey !== localKey);
    });
  };

  const updateImageUnitType = (localKey: string, unitTypeIndex: number) => {
    const mappedUnitTypeId = (result?.unit_types?.[unitTypeIndex] as
      | ExtractUnitTypeExtended
      | undefined)?.unit_type_id;
    setExtractedImages((prev) =>
      prev.map((img) =>
        img.localKey === localKey
          ? {
              ...img,
              unitTypeIndex,
              unitTypeId:
                typeof mappedUnitTypeId === "number" ? mappedUnitTypeId : undefined,
            }
          : img,
      ),
    );
  };

  // base64를 Blob으로 변환
  function base64ToBlob(base64: string): Blob {
    const [header, data] = base64.split(",");
    const mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
    const binary = atob(data);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type: mime });
  }

  // 단일 이미지 업로드 (R2)
  const uploadSingleExtractedImage = async (
    img: ExtractedImageWithDestination,
    mode: string,
    propertyId: number,
  ): Promise<{ url: string; storagePath: string | null }> => {
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
    let storagePath: string | null = null;
    try {
      const parsed = new URL(String(url));
      storagePath = parsed.pathname.replace(/^\/+/, "") || null;
    } catch {
      storagePath = null;
    }
    return { url: String(url), storagePath };
  };

  useEffect(() => {
    mainImageUrlRef.current = mainImageUrl;
  }, [mainImageUrl]);

  useEffect(() => {
    galleryImageUrlsRef.current = galleryImageUrls;
  }, [galleryImageUrls]);

  useEffect(() => {
    modelhouseMainImageUrlRef.current = modelhouseMainImageUrl;
  }, [modelhouseMainImageUrl]);

  useEffect(() => {
    modelhouseGalleryImageUrlsRef.current = modelhouseGalleryImageUrls;
  }, [modelhouseGalleryImageUrls]);

  useEffect(() => {
    return () => {
      if (analysisTimerRef.current) {
        clearInterval(analysisTimerRef.current);
        analysisTimerRef.current = null;
      }
      Object.values(unitFloorPlanUrlsRef.current).forEach((url) => {
        revokeBlobUrl(url);
      });
      revokeBlobUrl(mainImageUrlRef.current);
      galleryImageUrlsRef.current.forEach((url) => revokeBlobUrl(url));
      revokeBlobUrl(modelhouseMainImageUrlRef.current);
      modelhouseGalleryImageUrlsRef.current.forEach((url) => revokeBlobUrl(url));
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

  const hasExtractionResult = Boolean(result);
  const isExtractSuccess = hasExtractionResult && !loading && statusTone === "safe";
  const isComparingStatus =
    status.includes("유사 현장 자동 비교 중") ||
    status.includes("유사한 현장을 자동으로 찾았습니다");
  const shouldShowStatusMessage =
    !loading && (statusTone === "danger" || isComparingStatus);
  const displayStatusMessage =
    statusTone === "danger" ? status.replace(/^오류:\s*/, "") : status;
  const analysisElapsedLabel = String(analysisElapsedSec).padStart(2, "0");
  const loadingButtonLabel = analysisInProgress
    ? `PDF ${analysisFileCount}개 분석 중...(${analysisElapsedLabel}초)`
    : status;

  return (
    <div className="max-w-full overflow-x-hidden">
      <PageContainer className="max-w-240">
        <div className="space-y-4 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="ob-typo-h1 text-(--oboon-text-title)">
            새 현장 등록
          </div>
        </div>
        <p className="ob-typo-body text-(--oboon-text-muted) mb-4">
          PDF를 업로드하면 추출 API 결과를 토큰 기반 UI로 검증할 수 있습니다.
        </p>

        <Card
          className={[
            "p-4 border-dashed bg-(--oboon-bg-subtle) transition-colors",
            isPrimaryDropActive
              ? "border-(--oboon-primary) ring-2 ring-(--oboon-primary)/20"
              : "border-(--oboon-border-strong)",
          ].join(" ")}
          onDragEnter={(e) => {
            e.preventDefault();
            setIsPrimaryDropActive(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsPrimaryDropActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsPrimaryDropActive(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsPrimaryDropActive(false);
            const dropped = e.dataTransfer?.files
              ? Array.from(e.dataTransfer.files)
              : [];
            applyPrimaryPdfFiles(dropped);
          }}
        >
          <div className="ob-typo-body text-(--oboon-text-muted)">
            PDF를 선택하거나 파일을 드래그 앤 드롭 하세요. (최대 150MB)
          </div>
          <Input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            onChange={(e) => {
              const selected = e.target.files
                ? Array.from(e.target.files)
                : [];
              applyPrimaryPdfFiles(selected);
              e.currentTarget.value = "";
            }}
            className="sr-only"
          />

          <div className="mt-3 min-h-12 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-3">
            <div className="ob-typo-caption text-(--oboon-text-muted)">
              선택된 파일 ({files.length}개, 합계{" "}
              {(
                files.reduce((s, f) => s + f.size, 0) /
                1024 /
                1024
              ).toFixed(1)}
              MB)
            </div>
            <div className="mt-2 flex min-h-7 flex-wrap content-start gap-2">
              {fileNames.length > 0 ? (
                files.map((f, index) => (
                  <span
                    key={`${f.name}-${index}`}
                    className="inline-flex max-w-full items-center gap-1 rounded-full bg-(--oboon-bg-subtle) px-2 py-1 ob-typo-caption text-(--oboon-text-body)"
                  >
                    <span className="break-all">
                      {f.name} ({(f.size / 1024 / 1024).toFixed(1)}MB)
                    </span>
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
                ))
              ) : (
                <span className="ob-typo-caption text-(--oboon-text-muted)">
                  &nbsp;
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            {isExtractSuccess ? (
              <span className="inline-flex h-8 items-center rounded-xl border border-emerald-300 bg-emerald-100 px-3 ob-typo-button text-emerald-600">
                데이터 추출 완료
              </span>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={files.length === 0}
                loading={loading}
                size="sm"
              >
                {loading
                  ? loadingButtonLabel
                  : hasExtractionResult
                    ? `다시 추출하기 (PDF ${files.length}개)`
                    : `데이터 추출 시작 (${files.length}개 PDF)`}
              </Button>
            )}
            {!hasExtractionResult ? (
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                size="sm"
              >
                파일 선택
              </Button>
            ) : null}
            {hasExtractionResult ? (
              <>
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
                    if (totalSize > 150 * 1024 * 1024) {
                      setStatus(
                        `PDF 합산 용량이 150MB를 초과합니다. (${(totalSize / 1024 / 1024).toFixed(1)}MB)`,
                      );
                      setStatusTone("danger");
                      e.currentTarget.value = "";
                      return;
                    }
                    void handleAdditionalPdf(selected);
                    e.currentTarget.value = "";
                  }}
                />
                <Button
                  variant="secondary"
                  onClick={() => additionalFileInputRef.current?.click()}
                  loading={additionalLoading}
                  disabled={loading || textOnlyLoading}
                  size="sm"
                >
                  추가 PDF 선택
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleTextOnlyReExtract}
                  loading={textOnlyLoading}
                  disabled={loading || additionalLoading}
                  size="sm"
                >
                  텍스트만 재추출
                </Button>
              </>
            ) : null}
          </div>
          {shouldShowStatusMessage ? (
            <div
              className={[
                "mt-2 ob-typo-caption",
                statusTone === "safe" ? "text-(--oboon-safe)" : "",
                statusTone === "danger" ? "text-(--oboon-danger)" : "",
                isComparingStatus ? "text-(--oboon-primary)" : "",
              ].join(" ")}
            >
              {displayStatusMessage}
            </div>
          ) : null}
        </Card>

        {result ? (
          <div key={`extract-ui-${editBaselineVersion}`} className="space-y-4 min-w-0">
            <div className="flex flex-wrap items-center gap-2 ob-typo-caption">
              <span className="inline-flex items-center rounded-full border border-emerald-400/50 bg-emerald-500/10 px-2 py-1 text-(--oboon-text-body)">
                직접 수정한 셀
              </span>
              {webEvidenceFieldPathSet.size > 0 ? (
                <span className="inline-flex items-center rounded-full border border-(--oboon-warning-border) bg-(--oboon-warning-bg) px-2 py-1 text-(--oboon-text-body)">
                  웹 검색 채택 셀
                </span>
              ) : null}
            </div>
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

            {/* PDF에서 추출된 이미지 (상단 배치) */}
            {visibleExtractedImages.length > 0 && (
              <Section
                title={`추출된 이미지 (${visibleExtractedImages.length}개)`}
                className="mb-10"
              >
                <div className="space-y-3">
                  <p className="ob-typo-caption text-(--oboon-text-muted)">
                    PDF에서 추출한 이미지를 어디에 사용할지 선택하세요. 이미지를 클릭하면 크게 볼 수 있습니다.
                  </p>
                  {similarImageCount > 0 && (
                    <div className="flex items-center justify-between rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 ob-typo-caption">
                      <span className="text-amber-200">
                        기존 이미지와 유사한 항목 {similarImageCount}건이 감지됐어요.
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setShowNearDuplicateOnly((prev) => !prev)
                        }
                      >
                        {showNearDuplicateOnly ? "전체 보기" : "유사 항목만 보기"}
                      </Button>
                    </div>
                  )}
                  <div className="grid gap-3 md:grid-cols-4">
                    {visibleExtractedImages.map((img, idx) => {
                      const nearDistance =
                        nearDuplicateDistanceByImageKey[img.localKey];
                      const isSimilarMatched =
                        duplicateExtractedImageKeys.includes(img.localKey);
                      return (
                      <div
                        key={img.localKey}
                        className={`flex h-full flex-col rounded-xl border p-3 ${
                          nearDistance != null
                            ? "border-amber-400/50 bg-amber-500/10"
                            : "border-(--oboon-border-default) bg-(--oboon-bg-surface)"
                        }`}
                      >
                        <div
                          className="relative aspect-video w-full cursor-pointer overflow-hidden rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-subtle)"
                          onClick={() => setPreviewImage(img.base64)}
                        >
                          <div className="absolute left-2 top-2 z-10 flex items-center gap-1.5">
                            <span className="rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-2 py-0.5 ob-typo-caption text-(--oboon-text-body)">
                              {getDestinationLabel(img.destination)}
                            </span>
                            {(isSimilarMatched || nearDistance != null) && (
                              <span className="rounded-full border border-(--oboon-warning-border) bg-(--oboon-warning-bg) px-2 py-0.5 ob-typo-caption text-(--oboon-warning)">
                                {isSimilarMatched ? "유사 이미지" : "유사 후보"}
                              </span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            shape="pill"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeExtractedImage(img.localKey);
                            }}
                            className="absolute right-2 top-2 z-10 h-5 min-w-5 rounded-full bg-(--oboon-danger-bg) !text-(--oboon-danger) hover:bg-(--oboon-danger-bg)"
                            title="이미지 제거"
                          >
                            ×
                          </Button>
                          <Image
                            src={img.base64}
                            alt={`추출 이미지 ${idx + 1}`}
                            fill
                            className="object-contain"
                            unoptimized
                          />
                        </div>

                        <div className="mt-3 flex-1 space-y-2">
                            <div className="ob-typo-caption text-(--oboon-text-muted)">
                              이미지 용도
                            </div>
                            <div className="mt-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="w-full justify-between"
                                  >
                                    <span>{getDestinationLabel(img.destination)}</span>
                                    <span className="text-(--oboon-text-muted)">▼</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="start"
                                  matchTriggerWidth
                                >
                                  {destinationOptions.map((option) => (
                                    <DropdownMenuItem
                                      key={option.value}
                                      onClick={() =>
                                        updateImageDestination(
                                          img.localKey,
                                          option.value,
                                        )
                                      }
                                    >
                                      {option.label}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                          </div>

                          {img.destination === "floor_plan" && (
                            <div>
                              <div className="ob-typo-caption text-(--oboon-text-muted)">
                                평면 타입
                              </div>
                              <div className="mt-2">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      className="w-full justify-between"
                                    >
                                      <span>
                                        {img.unitTypeIndex !== undefined
                                          ? (result?.unit_types?.[img.unitTypeIndex]
                                              ?.type_name ??
                                            `${result?.unit_types?.[img.unitTypeIndex]
                                              ?.exclusive_area ?? ""}㎡`)
                                          : "타입 선택"}
                                      </span>
                                      <span className="text-(--oboon-text-muted)">▼</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="start"
                                    matchTriggerWidth
                                  >
                                    {(result?.unit_types ?? []).map((type, i) => (
                                      <DropdownMenuItem
                                        key={`${type.type_name ?? "type"}-${i}`}
                                        onClick={() =>
                                          updateImageUnitType(img.localKey, i)
                                        }
                                      >
                                        {type.type_name || `${type.exclusive_area}㎡`}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              </Section>
            )}
            {extractedImages.length > 0 && visibleExtractedImages.length === 0 ? (
              <Section title="추출된 이미지" className="mb-10">
                <div className="rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-3 ob-typo-caption text-(--oboon-text-muted)">
                  {showNearDuplicateOnly
                    ? "유사 항목 필터 결과, 현재 표시할 이미지가 없습니다."
                    : "표시할 추출 이미지가 없습니다."}
                </div>
              </Section>
            ) : null}

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
                    <div className="mt-3 max-w-full overflow-x-auto rounded-lg border border-(--oboon-border-default)">
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
                              Ai 추출 값 반영
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

            {existingSnapshotImages.length > 0 && (
              <Section title={`DB 저장 이미지 (${existingSnapshotImages.length}개)`}>
                <div className="space-y-3">
                  <p className="ob-typo-caption text-(--oboon-text-muted)">
                    현재 DB에 저장된 이미지입니다. 이미지를 클릭하면 크게 볼 수 있습니다.
                  </p>
                  <div className="grid gap-3 md:grid-cols-4">
                    {existingSnapshotImages.map((img, idx) => {
                      const isMatched = matchedExistingImageKeys.includes(img.key);
                      const isNearMatched =
                        !isMatched && nearMatchedExistingImageKeys.includes(img.key);
                      return (
                        <div
                          key={img.key}
                          className={`flex h-full flex-col rounded-xl border p-3 ${
                            isMatched || isNearMatched
                              ? "border-amber-400/50 bg-amber-500/10"
                              : "border-(--oboon-border-default) bg-(--oboon-bg-surface)"
                          }`}
                        >
                          <div
                            className="relative aspect-video w-full cursor-pointer overflow-hidden rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-subtle)"
                            onClick={() => setPreviewImage(img.url)}
                          >
                            <div className="absolute left-2 top-2 z-10 flex items-center gap-1.5">
                              <span className="rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-2 py-0.5 ob-typo-caption text-(--oboon-text-body)">
                                {img.label}
                              </span>
                              {(isMatched || isNearMatched) && (
                                <span className="rounded-full border border-(--oboon-warning-border) bg-(--oboon-warning-bg) px-2 py-0.5 ob-typo-caption text-(--oboon-warning)">
                                  {isMatched ? "유사 이미지" : "유사 후보"}
                                </span>
                              )}
                            </div>
                            <Image
                              src={img.url}
                              alt={`DB 이미지 ${idx + 1}`}
                              fill
                              className="object-contain"
                              unoptimized
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Section>
            )}

            <Section title="현장 사진">
              <div className="grid gap-y-4 gap-x-5 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="ob-typo-body text-(--oboon-text-title)">대표 사진</div>
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
                      대표 사진 업로드
                    </Button>
                  </div>
                  <div className="rounded-lg border border-dashed border-(--oboon-border-default) p-3 ob-typo-caption text-(--oboon-text-muted)">
                    {mainImageUrl ? (
                      <div className="relative h-24 w-40 overflow-hidden rounded-md border border-(--oboon-border-default)">
                        <Image
                          src={mainImageUrl}
                          alt="대표사진"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      "대표 사진이 없습니다."
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="ob-typo-body text-(--oboon-text-title)">추가 사진</div>
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
                      추가 사진 업로드
                    </Button>
                  </div>
                  <div className="rounded-lg border border-dashed border-(--oboon-border-default) p-3 ob-typo-caption text-(--oboon-text-muted)">
                    {galleryImageUrls.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{galleryImageUrls.length}장 선택됨</span>
                        {galleryImageUrls.slice(0, 3).map((url, i) => (
                          <button
                            key={`${url}-${i}`}
                            type="button"
                            onClick={() => removeGalleryImage(i)}
                            className="rounded-full border border-(--oboon-border-default) px-2 py-0.5 text-(--oboon-text-muted) hover:bg-(--oboon-bg-subtle)"
                          >
                            {i + 1}번 제거
                          </button>
                        ))}
                      </div>
                    ) : (
                      "추가 사진이 없습니다."
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-y-4 gap-x-5 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="ob-typo-body text-(--oboon-text-title)">
                    모델하우스 대표 사진
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={modelhouseMainImageInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) =>
                        handleModelhouseMainImageChange(
                          e.target.files?.[0] ?? null,
                        )
                      }
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => modelhouseMainImageInputRef.current?.click()}
                    >
                      모델하우스 대표 업로드
                    </Button>
                  </div>
                  <div className="rounded-lg border border-dashed border-(--oboon-border-default) p-3 ob-typo-caption text-(--oboon-text-muted)">
                    {modelhouseMainImageUrl ? (
                      <div className="relative h-24 w-40 overflow-hidden rounded-md border border-(--oboon-border-default)">
                        <Image
                          src={modelhouseMainImageUrl}
                          alt="모델하우스 대표사진"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      "모델하우스 대표 사진이 없습니다."
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="ob-typo-body text-(--oboon-text-title)">
                    모델하우스 추가 사진
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={modelhouseGalleryImageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(e) =>
                        handleModelhouseGalleryImagesChange(e.target.files)
                      }
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        modelhouseGalleryImageInputRef.current?.click()
                      }
                    >
                      모델하우스 추가 업로드
                    </Button>
                  </div>
                  <div className="rounded-lg border border-dashed border-(--oboon-border-default) p-3 ob-typo-caption text-(--oboon-text-muted)">
                    {modelhouseGalleryImageUrls.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{modelhouseGalleryImageUrls.length}장 선택됨</span>
                        {modelhouseGalleryImageUrls.slice(0, 3).map((url, i) => (
                          <button
                            key={`${url}-${i}`}
                            type="button"
                            onClick={() => removeModelhouseGalleryImage(i)}
                            className="rounded-full border border-(--oboon-border-default) px-2 py-0.5 text-(--oboon-text-muted) hover:bg-(--oboon-bg-subtle)"
                          >
                            {i + 1}번 제거
                          </button>
                        ))}
                      </div>
                    ) : (
                      "모델하우스 추가 사진이 없습니다."
                    )}
                  </div>
                </div>
              </div>
            </Section>

            <Section title="기본 정보">
              <div className="grid gap-y-4 gap-x-5 md:grid-cols-2">
                <div className="space-y-1">
                  <CompactInfoRow
                    label="현장명"
                    value={val(result.properties?.name)}
                    isWebEnriched={isWebEvidenceField("properties.name")}
                    onCommit={(value) =>
                      updateResultSectionField(
                        "properties",
                        "name",
                        normalizeTextInput(value),
                      )
                    }
                  />
                  <CompactInfoRow
                    label="분양 상태"
                    value={displayValue(result.properties?.status, "status")}
                    isWebEnriched={isWebEvidenceField("properties.status")}
                    onCommit={(value) =>
                      updateResultSectionField(
                        "properties",
                        "status",
                        normalizeStatusForDb(normalizeTextInput(value)),
                      )
                    }
                  />
                </div>
                <div className="space-y-1">
                  <CompactInfoRow
                    label="분양 유형"
                    value={val(result.properties?.property_type)}
                    isWebEnriched={isWebEvidenceField("properties.property_type")}
                    onCommit={(value) =>
                      updateResultSectionField(
                        "properties",
                        "property_type",
                        normalizeTextInput(value),
                      )
                    }
                  />
                  <CompactInfoRow
                    label="설명"
                    value={val(result.properties?.description)}
                    isWebEnriched={isWebEvidenceField("properties.description")}
                    onCommit={(value) =>
                      updateResultSectionField(
                        "properties",
                        "description",
                        normalizeTextInput(value),
                      )
                    }
                  />
                </div>
              </div>
              <div className="mt-4 grid gap-y-4 gap-x-5 md:grid-cols-2">
                <div className="space-y-1">
                  <CompactInfoRow
                    label="계약금 비율(%)"
                    value={validationContractRatioPercent || "-"}
                    onCommit={(value) =>
                      setValidationContractRatioPercent(sanitizePercentInput(value))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <CompactInfoRow
                    label="전매 제한"
                    value={formatTransferRestrictionText(
                      validationTransferRestriction,
                      validationTransferRestrictionPeriod,
                    )}
                    onCommit={(value) => {
                      const parsed = parseTransferRestrictionText(value);
                      setValidationTransferRestriction(parsed.transferRestriction);
                      setValidationTransferRestrictionPeriod(
                        parsed.transferRestrictionPeriod,
                      );
                    }}
                  />
                </div>
              </div>
            </Section>

            <Section title="사업 개요">
              <div className="grid gap-y-4 gap-x-5 md:grid-cols-2">
                <div className="space-y-1">
                  <CompactInfoRow label="시행사" value={val(result.specs?.developer)} isWebEnriched={isWebEvidenceField("specs.developer")} onCommit={(value) => updateResultSectionField("specs", "developer", normalizeTextInput(value))} />
                  <CompactInfoRow label="신탁사" value={val(result.specs?.trust_company)} isWebEnriched={isWebEvidenceField("specs.trust_company")} onCommit={(value) => updateResultSectionField("specs", "trust_company", normalizeTextInput(value))} />
                  <CompactInfoRow label="건축면적" value={val(result.specs?.building_area)} isWebEnriched={isWebEvidenceField("specs.building_area")} onCommit={(value) => updateResultSectionField("specs", "building_area", toNullableNumberInput(value))} />
                  <CompactInfoRow label="지상층" value={val(result.specs?.floor_ground)} isWebEnriched={isWebEvidenceField("specs.floor_ground")} onCommit={(value) => updateResultSectionField("specs", "floor_ground", toNullableNumberInput(value))} />
                  <CompactInfoRow label="총 세대수" value={val(result.specs?.household_total)} isWebEnriched={isWebEvidenceField("specs.household_total")} onCommit={(value) => updateResultSectionField("specs", "household_total", toNullableNumberInput(value))} />
                  <CompactInfoRow label="세대당 주차" value={val(result.specs?.parking_per_household)} isWebEnriched={isWebEvidenceField("specs.parking_per_household")} onCommit={(value) => updateResultSectionField("specs", "parking_per_household", toNullableNumberInput(value))} />
                  <CompactInfoRow label="용적률" value={val(result.specs?.floor_area_ratio)} isWebEnriched={isWebEvidenceField("specs.floor_area_ratio")} onCommit={(value) => updateResultSectionField("specs", "floor_area_ratio", toNullableNumberInput(value))} />
                  <CompactInfoRow label="난방" value={val(result.specs?.heating_type)} isWebEnriched={isWebEvidenceField("specs.heating_type")} onCommit={(value) => updateResultSectionField("specs", "heating_type", normalizeTextInput(value))} />
                </div>
                <div className="space-y-1">
                  <CompactInfoRow label="시공사" value={val(result.specs?.builder)} isWebEnriched={isWebEvidenceField("specs.builder")} onCommit={(value) => updateResultSectionField("specs", "builder", normalizeTextInput(value))} />
                  <CompactInfoRow label="분양 방식" value={val(result.specs?.sale_type)} isWebEnriched={isWebEvidenceField("specs.sale_type")} onCommit={(value) => updateResultSectionField("specs", "sale_type", normalizeTextInput(value))} />
                  <CompactInfoRow label="대지면적" value={val(result.specs?.site_area)} isWebEnriched={isWebEvidenceField("specs.site_area")} onCommit={(value) => updateResultSectionField("specs", "site_area", toNullableNumberInput(value))} />
                  <CompactInfoRow label="지하층" value={val(result.specs?.floor_underground)} isWebEnriched={isWebEvidenceField("specs.floor_underground")} onCommit={(value) => updateResultSectionField("specs", "floor_underground", toNullableNumberInput(value))} />
                  <CompactInfoRow label="동 수" value={val(result.specs?.building_count)} isWebEnriched={isWebEvidenceField("specs.building_count")} onCommit={(value) => updateResultSectionField("specs", "building_count", toNullableNumberInput(value))} />
                  <CompactInfoRow label="총 주차대수" value={val(result.specs?.parking_total)} isWebEnriched={isWebEvidenceField("specs.parking_total")} onCommit={(value) => updateResultSectionField("specs", "parking_total", toNullableNumberInput(value))} />
                  <CompactInfoRow label="건폐율" value={val(result.specs?.building_coverage_ratio)} isWebEnriched={isWebEvidenceField("specs.building_coverage_ratio")} onCommit={(value) => updateResultSectionField("specs", "building_coverage_ratio", toNullableNumberInput(value))} />
                  <CompactInfoRow label="부대시설" value={val(result.specs?.amenities)} isWebEnriched={isWebEvidenceField("specs.amenities")} onCommit={(value) => updateResultSectionField("specs", "amenities", normalizeTextInput(value))} />
                </div>
              </div>
            </Section>

            <Section title="일정">
              <div className="grid gap-y-4 gap-x-5 md:grid-cols-2">
                <div className="space-y-1">
                  <CompactInfoRow label="모집공고일" value={val(result.timeline?.announcement_date)} isWebEnriched={isWebEvidenceField("timeline.announcement_date")} onCommit={(value) => updateResultSectionField("timeline", "announcement_date", normalizeTextInput(value))} />
                  <CompactInfoRow label="청약 종료" value={val(result.timeline?.application_end)} isWebEnriched={isWebEvidenceField("timeline.application_end")} onCommit={(value) => updateResultSectionField("timeline", "application_end", normalizeTextInput(value))} />
                  <CompactInfoRow label="계약 시작" value={val(result.timeline?.contract_start)} isWebEnriched={isWebEvidenceField("timeline.contract_start")} onCommit={(value) => updateResultSectionField("timeline", "contract_start", normalizeTextInput(value))} />
                  <CompactInfoRow label="입주 예정" value={val(result.timeline?.move_in_date)} isWebEnriched={isWebEvidenceField("timeline.move_in_date")} onCommit={(value) => updateResultSectionField("timeline", "move_in_date", normalizeTextInput(value))} />
                </div>
                <div className="space-y-1">
                  <CompactInfoRow label="청약 시작" value={val(result.timeline?.application_start)} isWebEnriched={isWebEvidenceField("timeline.application_start")} onCommit={(value) => updateResultSectionField("timeline", "application_start", normalizeTextInput(value))} />
                  <CompactInfoRow label="당첨자 발표" value={val(result.timeline?.winner_announce)} isWebEnriched={isWebEvidenceField("timeline.winner_announce")} onCommit={(value) => updateResultSectionField("timeline", "winner_announce", normalizeTextInput(value))} />
                  <CompactInfoRow label="계약 종료" value={val(result.timeline?.contract_end)} isWebEnriched={isWebEvidenceField("timeline.contract_end")} onCommit={(value) => updateResultSectionField("timeline", "contract_end", normalizeTextInput(value))} />
                </div>
              </div>
            </Section>

            <Section
              title="주택형 (타입)"
              headerRight={
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={selectRecommendedUnitRows}>
                    추천만 선택
                  </Button>
                  <Button size="sm" variant="ghost" onClick={clearSelectedUnitRows}>
                    선택 해제
                  </Button>
                  <Button size="sm" variant="secondary" onClick={mergeSelectedUnitTypeRows}>
                    선택 병합(2개)
                  </Button>
                  <Button size="sm" variant="secondary" onClick={addUnitTypeRow}>
                    행 추가
                  </Button>
                </div>
              }
            >
              {unitConflictFields.length > 0 ? (
                <div className="mb-3 rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-3">
                  <div className="ob-typo-caption text-(--oboon-text-muted)">
                    병합 충돌 항목: 값이 달라 선택이 필요합니다.
                  </div>
                  <div className="mt-2 max-w-full overflow-x-auto rounded-lg border border-(--oboon-border-default)">
                    <table className="w-full min-w-[760px] table-fixed border-collapse">
                      <thead className="bg-(--oboon-bg-surface)">
                        <tr>
                          <th className="w-36 border-b border-(--oboon-border-default) px-3 py-2 text-left ob-typo-caption text-(--oboon-text-muted)">
                            항목
                          </th>
                          <th className="w-1/2 border-b border-(--oboon-border-default) px-3 py-2 text-left ob-typo-caption text-(--oboon-text-muted)">
                            기존 값 유지
                          </th>
                          <th className="w-1/2 border-b border-(--oboon-border-default) px-3 py-2 text-left ob-typo-caption text-(--oboon-text-muted)">
                            Ai 추출 값 반영
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {unitConflictFields.map((field) => (
                          <tr key={field.key} className="align-top">
                            <td className="border-b border-(--oboon-border-default) px-3 py-3 ob-typo-caption text-(--oboon-text-muted)">
                              {field.label}
                            </td>
                            <td className="border-b border-(--oboon-border-default) px-3 py-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setUnitConflictSelection((prev) => ({
                                    ...prev,
                                    [field.key]: "right",
                                  }))
                                }
                                className={[
                                  "w-full rounded-lg border p-2 text-left whitespace-normal",
                                  unitConflictSelection[field.key] === "right"
                                    ? "border-(--oboon-primary) bg-(--oboon-primary)/5"
                                    : "border-(--oboon-border-default)",
                                ].join(" ")}
                              >
                                <div className="break-words ob-typo-body text-(--oboon-text-body)">
                                  {displayValue(field.rightValue)}
                                </div>
                              </button>
                            </td>
                            <td className="border-b border-(--oboon-border-default) px-3 py-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setUnitConflictSelection((prev) => ({
                                    ...prev,
                                    [field.key]: "left",
                                  }))
                                }
                                className={[
                                  "w-full rounded-lg border p-2 text-left whitespace-normal",
                                  unitConflictSelection[field.key] === "left"
                                    ? "border-(--oboon-primary) bg-(--oboon-primary)/5"
                                    : "border-(--oboon-border-default)",
                                ].join(" ")}
                              >
                                <div className="break-words ob-typo-body text-(--oboon-text-body)">
                                  {displayValue(field.leftValue)}
                                </div>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        const first = unitConflictFields[0];
                        if (!first) return;
                        applyUnitSyncPair(
                          first.leftIndex,
                          first.rightIndex,
                          unitConflictSelection,
                        );
                      }}
                    >
                      선택한 값 반영
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setUnitConflictFields([]);
                        setUnitConflictSelection({});
                      }}
                    >
                      취소
                    </Button>
                  </div>
                </div>
              ) : null}
              {visibleUnitMergeCandidates.length > 0 ? (
                <div className="mb-3 rounded-lg border border-(--oboon-warning-border) bg-(--oboon-warning-bg) p-3">
                  <div className="ob-typo-caption text-(--oboon-warning)">
                    병합 전 미리보기: 타입명 숫자 + 칼럼 유사도가 높은 후보
                    {` (${visibleUnitMergeCandidates.length}개)`}
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                    {visibleUnitMergeCandidates.slice(0, 8).map((candidate) => {
                      const left = result.unit_types[candidate.leftIndex];
                      const right = result.unit_types[candidate.rightIndex];
                      return (
                        <div
                          key={`merge-preview-${candidate.leftIndex}-${candidate.rightIndex}`}
                          className="rounded-md border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-2"
                        >
                          <div className="ob-typo-caption text-(--oboon-text-title)">
                            {`${left?.type_name ?? "-"}  ↔  ${right?.type_name ?? "-"}`}
                          </div>
                          <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                            {`총 유사도 ${(candidate.score * 100).toFixed(1)}% · 타입명 숫자 ${(candidate.nameNumberScore * 100).toFixed(1)}% · 칼럼 ${(candidate.columnScore * 100).toFixed(1)}%`}
                          </div>
                          <div className="mt-2 flex gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                mergeUnitTypeRows(
                                  candidate.leftIndex,
                                  candidate.rightIndex,
                                )
                              }
                            >
                              병합하기(빈 값 채움)
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                dismissMergeCandidate(
                                  candidate.leftIndex,
                                  candidate.rightIndex,
                                )
                              }
                            >
                              건너뛰기
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {hideUnitMergeRecommendations ? (
                <div className="mb-3 flex items-center justify-between rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-2">
                  <div className="ob-typo-caption text-(--oboon-text-muted)">
                    병합 추천 표시가 꺼져 있습니다.
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setHideUnitMergeRecommendations(false);
                      if (typeof window !== "undefined") {
                        window.localStorage.removeItem(
                          "hide-unit-merge-recommendations",
                        );
                      }
                    }}
                  >
                    추천 다시 보기
                  </Button>
                </div>
              ) : null}
              {!hideUnitMergeRecommendations &&
              visibleUnitMergeCandidates.length === 0 &&
              unitMergePreviewCandidates.length > 0 ? (
                <div className="mb-3 flex items-center justify-between rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-2">
                  <div className="ob-typo-caption text-(--oboon-text-muted)">
                    병합 추천 후보를 모두 건너뛰었습니다.
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDismissedMergeCandidateKeys([])}
                  >
                    추천 초기화
                  </Button>
                </div>
              ) : null}
              <div className="mb-3 ob-typo-caption text-(--oboon-text-muted)">
                체크박스로 병합할 타입을 선택한 뒤 일괄 병합할 수 있습니다.
              </div>
              <div className="max-w-full overflow-x-auto rounded-xl border border-(--oboon-border-default)">
                <table className="min-w-[1380px] w-full border-collapse bg-(--oboon-bg-surface) text-center ob-typo-body text-(--oboon-text-body)">
                  <colgroup>
                    <col className="w-[46px]" />
                    <col className="w-[38px]" />
                    <col className="w-[108px]" />
                    <col className="w-[78px]" />
                    <col className="w-[92px]" />
                    <col className="w-[92px]" />
                    <col className="w-[52px]" />
                    <col className="w-[52px]" />
                    <col className="w-[52px]" />
                    <col className="w-[52px]" />
                    <col className="w-[68px]" />
                    <col className="w-[48px]" />
                    <col className="w-[148px]" />
                    <col className="w-[64px]" />
                    <col className="w-[64px]" />
                    <col className="w-[42px]" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="sticky top-0 z-10 bg-(--oboon-bg-subtle) px-1 py-2 text-center ob-typo-body text-(--oboon-text-muted) font-medium">
                        순서
                      </th>
                      <th className="sticky top-0 z-10 bg-(--oboon-bg-subtle) px-1 py-2 text-center ob-typo-body text-(--oboon-text-muted) font-medium">
                        병합
                      </th>
                      {tableHeaders.map((h) => (
                        <th
                          key={h}
                          className="sticky top-0 z-10 bg-(--oboon-bg-subtle) px-1 py-2 text-center ob-typo-body text-(--oboon-text-muted) font-medium"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUnitRows.map(({ unit: u, rowIndex: i }) => (
                      <tr
                        key={`${u?.type_name ?? "unit"}-${i}`}
                        draggable={Boolean(u)}
                        onDragStart={(event) => {
                          if (!u) return;
                          setDraggedUnitRowIndex(i);
                          setDragOverUnitRowIndex(i);
                          event.dataTransfer.effectAllowed = "move";
                        }}
                        onDragOver={(event) => {
                          if (draggedUnitRowIndex == null || !u) return;
                          event.preventDefault();
                          if (dragOverUnitRowIndex !== i) setDragOverUnitRowIndex(i);
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          if (draggedUnitRowIndex == null || !u) return;
                          moveUnitTypeRow(draggedUnitRowIndex, i);
                          setDraggedUnitRowIndex(null);
                          setDragOverUnitRowIndex(null);
                        }}
                        onDragEnd={() => {
                          setDraggedUnitRowIndex(null);
                          setDragOverUnitRowIndex(null);
                        }}
                        className={[
                          recommendedUnitRowIndexSet.has(i)
                            ? "bg-(--oboon-warning-bg)/40"
                            : "",
                          dragOverUnitRowIndex === i && draggedUnitRowIndex !== i
                            ? "outline outline-(--oboon-primary)"
                            : "",
                          draggedUnitRowIndex === i ? "opacity-60" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <td className="px-1 py-2 align-middle border-t border-(--oboon-border-default)">
                          <button
                            type="button"
                            className="h-7 w-7 rounded border border-(--oboon-border-default) text-(--oboon-text-muted) cursor-grab active:cursor-grabbing mx-auto"
                            title="드래그해서 행 순서 변경"
                          >
                            ≡
                          </button>
                        </td>
                        <td className="px-1 py-2 align-middle border-t border-(--oboon-border-default)">
                          <input
                            type="checkbox"
                            checked={selectedUnitMergeRows.includes(i)}
                            onChange={(e) =>
                              toggleUnitMergeRowSelection(i, e.target.checked)
                            }
                            className="h-4 w-4 accent-(--oboon-primary)"
                          />
                        </td>
                        <td className="p-0 align-middle border-t border-(--oboon-border-default)">
                          <EditableText
                            value={val(u?.type_name)}
                            center
                            cellMode
                            isWebEnriched={isWebEvidenceField("unit_types.type_name")}
                            onCommit={(value) =>
                              updateResultUnitField(
                                i,
                                "type_name",
                                normalizeTextInput(value),
                              )
                            }
                          />
                        </td>
                        <td className="p-0 align-middle border-t border-(--oboon-border-default)">
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

                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  unitFloorPlanInputRefs.current[i]?.click()
                                }
                                className="h-8 w-8 p-0"
                                title="평면도 업로드"
                              >
                                <Upload className="h-4 w-4" aria-hidden />
                              </Button>
                            </div>
                          ) : (
                            <span className="ob-typo-caption text-(--oboon-text-muted)">
                              -
                            </span>
                          )}
                        </td>
                        <td className="p-0 align-middle border-t border-(--oboon-border-default)">
                          <EditableText
                            value={val(u?.exclusive_area)}
                            center
                            cellMode
                            isWebEnriched={isWebEvidenceField("unit_types.exclusive_area")}
                            onCommit={(value) =>
                              updateResultUnitField(
                                i,
                                "exclusive_area",
                                toNullableNumberInput(value),
                              )
                            }
                          />
                        </td>
                        <td className="p-0 align-middle border-t border-(--oboon-border-default)">
                          <EditableText
                            value={val(u?.supply_area)}
                            center
                            cellMode
                            isWebEnriched={isWebEvidenceField("unit_types.supply_area")}
                            onCommit={(value) =>
                              updateResultUnitField(
                                i,
                                "supply_area",
                                toNullableNumberInput(value),
                              )
                            }
                          />
                        </td>
                        <td className="p-0 align-middle border-t border-(--oboon-border-default)">
                          <EditableText
                            value={val(u?.rooms)}
                            center
                            cellMode
                            isWebEnriched={isWebEvidenceField("unit_types.rooms")}
                            onCommit={(value) =>
                              updateResultUnitField(
                                i,
                                "rooms",
                                toNullableNumberInput(value),
                              )
                            }
                          />
                        </td>
                        <td className="p-0 align-middle border-t border-(--oboon-border-default)">
                          <EditableText
                            value={val(u?.bathrooms)}
                            center
                            cellMode
                            isWebEnriched={isWebEvidenceField("unit_types.bathrooms")}
                            onCommit={(value) =>
                              updateResultUnitField(
                                i,
                                "bathrooms",
                                toNullableNumberInput(value),
                              )
                            }
                          />
                        </td>
                        <td className="p-0 align-middle border-t border-(--oboon-border-default)">
                          <EditableText
                            value={val(u?.building_layout)}
                            center
                            cellMode
                            isWebEnriched={isWebEvidenceField("unit_types.building_layout")}
                            onCommit={(value) =>
                              updateResultUnitField(
                                i,
                                "building_layout",
                                normalizeTextInput(value),
                              )
                            }
                          />
                        </td>
                        <td className="p-0 align-middle border-t border-(--oboon-border-default)">
                          <EditableText
                            value={val(u?.orientation)}
                            center
                            cellMode
                            isWebEnriched={isWebEvidenceField("unit_types.orientation")}
                            onCommit={(value) =>
                              updateResultUnitField(
                                i,
                                "orientation",
                                normalizeTextInput(value),
                              )
                            }
                          />
                        </td>
                        <td className="p-0 align-middle border-t border-(--oboon-border-default)">
                          <EditableText
                            value={val(u?.supply_count)}
                            center
                            cellMode
                            isWebEnriched={isWebEvidenceField("unit_types.supply_count")}
                            onCommit={(value) =>
                              updateResultUnitField(
                                i,
                                "supply_count",
                                toNullableNumberInput(value),
                              )
                            }
                          />
                        </td>
                        <td className="p-0 align-middle border-t border-(--oboon-border-default)">
                          <EditableText
                            value={val(u?.unit_count)}
                            center
                            cellMode
                            isWebEnriched={isWebEvidenceField("unit_types.unit_count")}
                            onCommit={(value) =>
                              updateResultUnitField(
                                i,
                                "unit_count",
                                toNullableNumberInput(value),
                              )
                            }
                          />
                        </td>
                        <td className="p-0 align-middle border-t border-(--oboon-border-default)">
                          <EditableText
                            value={
                              u && (u.price_min != null || u.price_max != null)
                                ? `${u.price_min?.toLocaleString() ?? "?"} ~ ${u.price_max?.toLocaleString() ?? "?"}`
                                : "-"
                            }
                            center
                            cellMode
                            isWebEnriched={
                              isWebEvidenceField("unit_types.price_min") ||
                              isWebEvidenceField("unit_types.price_max")
                            }
                            onCommit={(value) => {
                              const parsed = parsePriceRangeInput(value);
                              updateResultUnitField(i, "price_min", parsed.min);
                              updateResultUnitField(i, "price_max", parsed.max);
                            }}
                          />
                        </td>
                        <td className="px-1 py-2 align-middle border-t border-(--oboon-border-default)">
                          {u ? (
                            <label className="inline-flex items-center gap-1 text-xs whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={isUnitPricePublic(u)}
                                onChange={(e) => setUnitPricePublic(i, e.target.checked)}
                                className="h-3.5 w-3.5 accent-(--oboon-primary)"
                              />
                              <span>{isUnitPricePublic(u) ? "공개" : "비공개"}</span>
                            </label>
                          ) : (
                            <span className="ob-typo-caption text-(--oboon-text-muted)">
                              -
                            </span>
                          )}
                        </td>
                        <td className="px-1 py-2 align-middle border-t border-(--oboon-border-default)">
                          {u ? (
                            <label className="inline-flex items-center gap-1 text-xs whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={isUnitPublic(u)}
                                onChange={(e) => setUnitPublic(i, e.target.checked)}
                                className="h-3.5 w-3.5 accent-(--oboon-primary)"
                              />
                              <span>{isUnitPublic(u) ? "공개" : "비공개"}</span>
                            </label>
                          ) : (
                            <span className="ob-typo-caption text-(--oboon-text-muted)">
                              -
                            </span>
                          )}
                        </td>
                        <td className="px-1 py-2 align-middle border-t border-(--oboon-border-default)">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeUnitTypeRow(i)}
                            className="h-7 w-7 min-w-7 rounded-full p-0 text-(--oboon-text-muted) hover:text-(--oboon-danger)"
                            title="행 삭제"
                          >
                            ×
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="현장 위치">
              <div className="grid gap-y-4 gap-x-5 md:grid-cols-2">
                <div className="space-y-1">
                  <CompactInfoRow label="도로명 주소" value={val(result.location?.road_address)} isWebEnriched={isWebEvidenceField("location.road_address")} onCommit={(value) => updateResultSectionField("location", "road_address", normalizeTextInput(value))} />
                  <CompactInfoRow label="지번 주소" value={val(result.location?.jibun_address)} isWebEnriched={isWebEvidenceField("location.jibun_address")} onCommit={(value) => updateResultSectionField("location", "jibun_address", normalizeTextInput(value))} />
                  <CompactInfoRow label="시/도" value={val(result.location?.region_1depth)} isWebEnriched={isWebEvidenceField("location.region_1depth")} onCommit={(value) => updateResultSectionField("location", "region_1depth", normalizeTextInput(value))} />
                  <CompactInfoRow label="시/군/구" value={val(result.location?.region_2depth)} isWebEnriched={isWebEvidenceField("location.region_2depth")} onCommit={(value) => updateResultSectionField("location", "region_2depth", normalizeTextInput(value))} />
                  <CompactInfoRow label="읍/면/동" value={val(result.location?.region_3depth)} isWebEnriched={isWebEvidenceField("location.region_3depth")} onCommit={(value) => updateResultSectionField("location", "region_3depth", normalizeTextInput(value))} />
                </div>
                <div>
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
              </div>
            </Section>

            <Section title="모델하우스 위치">
              <div className="grid gap-y-4 gap-x-5 md:grid-cols-2">
                <div className="space-y-2">
                  {(result.facilities.length > 0 ? result.facilities : [null]).map(
                    (f: ExtractFacilityWithCoords | null, i: number) => {
                      const splitAddress = splitFacilityRoadAddress(
                        f?.road_address ?? null,
                      );
                      return (
                        <div
                          key={`${f?.name ?? "facility"}-${i}`}
                          className="space-y-0"
                        >
                        <CompactInfoRow
                          label="유형"
                          value={f?.type ?? "-"}
                          isWebEnriched={isWebEvidenceField(`facilities[${i}].type`)}
                          onCommit={(value) =>
                            updateResultFacilityField(
                              i,
                              "type",
                              normalizeTextInput(value),
                            )
                          }
                        />
                        <CompactInfoRow
                          label="명칭"
                          value={f?.name ?? "-"}
                          isWebEnriched={isWebEvidenceField(`facilities[${i}].name`)}
                          onCommit={(value) =>
                            updateResultFacilityField(
                              i,
                              "name",
                              normalizeTextInput(value),
                            )
                          }
                        />
                        <CompactInfoRow
                          label="주소"
                          value={f?.road_address ?? "-"}
                          isWebEnriched={isWebEvidenceField(`facilities[${i}].road_address`)}
                          onCommit={(value) =>
                            updateResultFacilityField(
                              i,
                              "road_address",
                              normalizeTextInput(value),
                            )
                          }
                        />
                        <CompactInfoRow
                          label="상세주소"
                          value={
                            val(
                              normalizeComparableValue(f?.address_detail) ??
                                splitAddress.addressDetail,
                            )
                          }
                          isWebEnriched={isWebEvidenceField(
                            `facilities[${i}].address_detail`,
                          )}
                          onCommit={(value) =>
                            updateResultFacilityField(
                              i,
                              "address_detail",
                              normalizeTextInput(value),
                            )
                          }
                        />
                        <CompactInfoRow
                          label="운영 시작"
                          value={f?.open_start ?? "-"}
                          isWebEnriched={isWebEvidenceField(`facilities[${i}].open_start`)}
                          onCommit={(value) =>
                            updateResultFacilityField(
                              i,
                              "open_start",
                              normalizeTextInput(value),
                            )
                          }
                        />
                        <CompactInfoRow
                          label="운영 종료"
                          value={f?.open_end ?? "-"}
                          isWebEnriched={isWebEvidenceField(`facilities[${i}].open_end`)}
                          onCommit={(value) =>
                            updateResultFacilityField(
                              i,
                              "open_end",
                              normalizeTextInput(value),
                            )
                          }
                        />
                      </div>
                      );
                    },
                  )}
                </div>
                <div>
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
                      모델하우스 좌표가 없어 지도를 표시할 수 없습니다.
                    </div>
                  )}
                </div>
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
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-[80vh] w-[90vw] max-w-[1200px] overflow-hidden rounded-lg">
              <Image
                src={previewImage}
                alt="확대 이미지"
                fill
                className="object-contain"
                unoptimized
                sizes="90vw"
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              shape="pill"
              onClick={() => setPreviewImage(null)}
              className="absolute right-2 top-3 z-10 h-8 w-8 rounded-full bg-black/40 p-0 text-white hover:bg-black/60"
              aria-label="닫기"
            >
              &times;
            </Button>
          </div>
        </div>
        )}
      </PageContainer>
    </div>
  );
}

function Section({
  title,
  children,
  headerRight,
  className,
}: {
  title: string;
  children: ReactNode;
  headerRight?: ReactNode;
  className?: string;
}) {
  return (
    <div className={["pt-5 space-y-2", className].filter(Boolean).join(" ")}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="ob-typo-h2 text-(--oboon-text-title)">{title}</h2>
        {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
      </div>
      <Card className="p-5">
        <div className="space-y-1">{children}</div>
      </Card>
    </div>
  );
}

function CompactInfoRow({
  label,
  value,
  editable = true,
  isWebEnriched = false,
  onCommit,
}: {
  label: string;
  value: string;
  editable?: boolean;
  isWebEnriched?: boolean;
  onCommit?: (nextValue: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-(--oboon-border-default) py-2 last:border-b-0">
      <span className="w-20 shrink-0 ob-typo-body text-(--oboon-text-muted)">
        {label}
      </span>
      <div className="min-w-0 flex-1">
        <EditableText
          value={value}
          editable={editable}
          isWebEnriched={isWebEnriched}
          onCommit={onCommit}
        />
      </div>
    </div>
  );
}

function EditableText({
  value,
  center = false,
  cellMode = false,
  editable = true,
  isWebEnriched = false,
  onCommit,
}: {
  value: string;
  center?: boolean;
  cellMode?: boolean;
  editable?: boolean;
  isWebEnriched?: boolean;
  onCommit?: (nextValue: string) => void;
}) {
  const normalizeValue = (v: string) => (v === "-" ? "" : v);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(normalizeValue(value));
  const [initialValue] = useState(() => normalizeValue(value).trim());
  const commit = () => {
    setEditing(false);
    onCommit?.(draft.trim());
  };
  const currentValue = editing ? draft : normalizeValue(value);
  const displayValue = currentValue.trim() ? currentValue : "-";
  const normalizedCurrentValue = normalizeValue(value).trim();
  const isUserEdited = normalizedCurrentValue !== initialValue;
  const valueBaseClass = "border border-transparent bg-transparent";
  const highlightClass = isUserEdited
    ? "bg-emerald-500/10"
    : isWebEnriched
      ? "bg-(--oboon-warning-bg)"
      : "";
  const cellHighlightClass = [
    highlightClass,
    cellMode
      ? "h-full w-full px-1 py-2"
      : highlightClass
        ? "w-full min-h-8 rounded-md box-border"
        : "",
  ]
    .filter(Boolean)
    .join(" ");
  const withCellHighlight = (content: ReactNode) =>
    cellHighlightClass ? <div className={cellHighlightClass}>{content}</div> : content;

  if (!editable) {
    const content = (
      <span
        className={[
          "min-w-0 max-w-full overflow-hidden rounded-md px-2 py-1 ob-typo-body",
          valueBaseClass,
          center
            ? "inline-flex h-8 w-full items-center justify-center text-center"
            : "inline-flex h-8 w-fit items-center",
        ].join(" ")}
      >
        {displayValue}
      </span>
    );
    return <>{withCellHighlight(content)}</>;
  }

  if (editing) {
    const content = (
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setEditing(false);
          }
        }}
        className={
          center
            ? "!h-8 !w-full !rounded-md !px-2 !border-transparent !bg-transparent min-w-0 max-w-full overflow-hidden text-center"
            : "h-9 w-full !border-transparent !bg-transparent min-w-0 max-w-full overflow-hidden"
        }
      />
    );
    return <>{withCellHighlight(content)}</>;
  }

  const content = (
    <button
      type="button"
      onClick={() => {
        setDraft(normalizeValue(value));
        setEditing(true);
      }}
      className={[
        "min-w-0 max-w-full overflow-hidden rounded-md px-2 py-1 ob-typo-body transition-colors",
        valueBaseClass,
        "hover:bg-transparent",
        center
          ? "inline-flex h-8 w-full items-center justify-center text-center"
          : "w-fit min-h-8 text-left",
      ].join(" ")}
      title="클릭해서 수정"
    >
      {displayValue}
    </button>
  );
  return <>{withCellHighlight(content)}</>;
}
