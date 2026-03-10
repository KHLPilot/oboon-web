"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Edit3, Loader2, RefreshCcw } from "lucide-react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { Badge } from "@/components/ui/Badge";
import OboonDatePicker from "@/components/ui/DatePicker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import NaverMap, {
  type MapFocusBounds,
  type MapFocusOverlayTone,
  type MapFocusPolygonGroup,
  type MapFocusPolygonPath,
  type NaverMapHandle,
} from "@/features/map/components/NaverMap";
import { oboonFieldBaseClass } from "@/lib/ui/formFieldStyles";
import { toKoreanErrorMessage } from "@/shared/errorMessage";

type RegulationArea =
  | "non_regulated"
  | "adjustment_target"
  | "speculative_overheated";

type RegulationRuleItem = {
  id: number;
  region_key: string;
  region_1depth: string;
  region_2depth: string | null;
  region_3depth: string | null;
  regulation_area: RegulationArea;
  source: "manual" | "derived";
  derived_count: number;
  is_active: boolean;
  effective_from: string | null;
  effective_to: string | null;
  note: string | null;
  updated_at: string;
};

type EditorState = {
  region1: string;
  region2: string;
  region3: string;
  regulationAreas: RegulationArea[];
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo: string;
  note: string;
};

type AdminRegulationRulesTabProps = {
  active: boolean;
};

const EMPTY_EDITOR: EditorState = {
  region1: "",
  region2: "",
  region3: "",
  regulationAreas: [],
  isActive: true,
  effectiveFrom: "",
  effectiveTo: "",
  note: "",
};

const REGULATION_AREA_LABEL: Record<RegulationArea, string> = {
  non_regulated: "비규제",
  adjustment_target: "조정대상지역",
  speculative_overheated: "투기과열지구",
};

const REGULATION_AREA_OPTIONS: Array<{ value: RegulationArea; label: string }> = [
  { value: "adjustment_target", label: "조정대상지역" },
  { value: "speculative_overheated", label: "투기과열지구" },
];

const INLINE_REGULATION_AREA_OPTIONS: Array<{
  value: RegulationArea;
  label: string;
}> = [
  { value: "non_regulated", label: "비규제" },
  { value: "adjustment_target", label: "조정대상지역" },
  { value: "speculative_overheated", label: "투기과열지구" },
];

const LIST_REGULATION_FILTER_OPTIONS: Array<{
  value: "all" | RegulationArea;
  label: string;
}> = [
  { value: "all", label: "전체" },
  { value: "speculative_overheated", label: "투기과열지구" },
  { value: "adjustment_target", label: "조정대상지역" },
  { value: "non_regulated", label: "비규제" },
];

const SEOUL_GU_BOUNDARY_REGION_KEY: Record<string, string> = {
  강남구: "seoul_gangnam",
  강동구: "seoul_gangdong",
  강북구: "seoul_gangbuk",
  강서구: "seoul_gangseo",
  관악구: "seoul_gwanak",
  광진구: "seoul_gwangjin",
  구로구: "seoul_guro",
  금천구: "seoul_geumcheon",
  노원구: "seoul_nowon",
  도봉구: "seoul_dobong",
  동대문구: "seoul_dongdaemun",
  동작구: "seoul_dongjak",
  마포구: "seoul_mapo",
  서대문구: "seoul_seodaemun",
  서초구: "seoul_seocho",
  성동구: "seoul_seongdong",
  성북구: "seoul_seongbuk",
  송파구: "seoul_songpa",
  양천구: "seoul_yangcheon",
  영등포구: "seoul_yeongdeungpo",
  용산구: "seoul_yongsan",
  은평구: "seoul_eunpyeong",
  종로구: "seoul_jongno",
  중구: "seoul_jung",
  중랑구: "seoul_jungnang",
};

type RegionBoundaryPayload = {
  region: string;
  bounds: MapFocusBounds;
  polygons: MapFocusPolygonPath[];
};

type BoundaryRequestTarget = {
  cacheKey: string;
  requestUrl: string;
};

type InlineEditState = {
  id: number;
  region1: string;
  region2: string;
  region3: string;
  regulationArea: RegulationArea;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo: string;
  note: string;
};

function formatDateText(value: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("ko-KR");
}

function parseDateString(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatDateInputValue(date: Date | null): string {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function computeBoundsFromPolygons(
  polygons: MapFocusPolygonPath[],
): MapFocusBounds | null {
  const points = polygons.flat();
  if (points.length === 0) return null;
  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  return {
    south: Math.min(...lats),
    west: Math.min(...lngs),
    north: Math.max(...lats),
    east: Math.max(...lngs),
  };
}

function normalizeRegionSegment(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, "").trim();
}

function boundaryRegionKeyForRule(item: RegulationRuleItem): string | null {
  const region1 = normalizeRegionSegment(item.region_1depth);
  const region2 = normalizeRegionSegment(item.region_2depth);
  const region3 = normalizeRegionSegment(item.region_3depth);

  if (!region1) return null;
  if (region1.includes("경기") && region2) {
    const regionName = `경기도 ${region2}${region3 ? ` ${region3}` : ""}`;
    return `name:${regionName}`;
  }
  if (region1.includes("서울")) {
    return SEOUL_GU_BOUNDARY_REGION_KEY[region2] ?? "seoul";
  }
  if (region1.includes("인천")) return "incheon";
  if (region1.includes("경기")) return "gyeonggi";
  if (region1.includes("부산")) return "busan";
  if (region1.includes("대구")) return "daegu";
  if (region1.includes("광주")) return "gwangju";
  if (region1.includes("대전")) return "daejeon";
  if (region1.includes("울산")) return "ulsan";
  if (region1.includes("세종")) return "sejong";
  if (region1.includes("강원")) return "gangwon";
  if (region1.includes("충북") || region1.includes("충청북")) return "chungbuk";
  if (region1.includes("충남") || region1.includes("충청남")) return "chungnam";
  if (region1.includes("전북") || region1.includes("전라북")) return "jeonbuk";
  if (region1.includes("전남") || region1.includes("전라남")) return "jeonnam";
  if (region1.includes("경북") || region1.includes("경상북")) return "gyeongbuk";
  if (region1.includes("경남") || region1.includes("경상남")) return "gyeongnam";
  if (region1.includes("제주")) return "jeju";
  return null;
}

function boundaryRequestTargetForRule(item: RegulationRuleItem): BoundaryRequestTarget | null {
  const key = boundaryRegionKeyForRule(item);
  if (!key) return null;
  if (key.startsWith("name:")) {
    const name = key.slice(5);
    return {
      cacheKey: key,
      requestUrl: `/api/map/region-boundary?name=${encodeURIComponent(name)}`,
    };
  }
  return {
    cacheKey: key,
    requestUrl: `/api/map/region-boundary?region=${encodeURIComponent(key)}`,
  };
}

function mapToneFromRegulationArea(
  regulationArea: RegulationArea,
): MapFocusOverlayTone {
  if (regulationArea === "speculative_overheated") return "danger";
  if (regulationArea === "adjustment_target") return "warning";
  return "default";
}

function resolveCombinedTone(tones: Set<MapFocusOverlayTone>): MapFocusOverlayTone {
  if (tones.has("danger") && tones.has("warning")) return "mixed";
  if (tones.has("danger")) return "danger";
  if (tones.has("warning")) return "warning";
  return "default";
}

function normalizeEditorRegulationAreas(areas: RegulationArea[]): RegulationArea[] {
  const unique = Array.from(new Set(areas));
  const filtered = unique.filter((area) => area !== "non_regulated");
  const order: RegulationArea[] = ["speculative_overheated", "adjustment_target"];
  return filtered.sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

function regulationAreaTriggerLabel(areas: RegulationArea[]): string {
  const normalized = normalizeEditorRegulationAreas(areas);
  if (normalized.length === 0) return "비규제";
  return normalized.map((area) => REGULATION_AREA_LABEL[area]).join(" · ");
}

export default function AdminRegulationRulesTab({ active }: AdminRegulationRulesTabProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [bootstrapLoading, setBootstrapLoading] = useState<"preview" | "apply" | null>(
    null,
  );
  const [recoPoiBatchLoading, setRecoPoiBatchLoading] = useState(false);
  const [items, setItems] = useState<RegulationRuleItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [listRegulationFilter, setListRegulationFilter] = useState<
    "all" | RegulationArea
  >("all");
  const [mapFocusBounds, setMapFocusBounds] = useState<MapFocusBounds | null>(null);
  const [mapFocusPolygons, setMapFocusPolygons] = useState<MapFocusPolygonPath[]>([]);
  const [mapFocusPolygonGroups, setMapFocusPolygonGroups] = useState<
    MapFocusPolygonGroup[]
  >([]);
  const [mapLoadedBoundaryCount, setMapLoadedBoundaryCount] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [mapBuiltFromQuery, setMapBuiltFromQuery] = useState<string>("");
  const [mapSkippedCount, setMapSkippedCount] = useState(0);
  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR);
  const [inlineEditor, setInlineEditor] = useState<InlineEditState | null>(null);
  const [inlineSaving, setInlineSaving] = useState(false);
  const mapRef = useRef<NaverMapHandle | null>(null);
  const boundaryCacheRef = useRef<Map<string, RegionBoundaryPayload>>(new Map());
  const hasNaverMapClientId = Boolean(process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID);

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/regulation-rules");
      const payload = (await response.json().catch(() => null)) as
        | { items?: RegulationRuleItem[]; error?: string }
        | null;
      if (!response.ok) {
        throw new Error(payload?.error || "규제 룰 조회에 실패했습니다.");
      }
      setItems(payload?.items ?? []);
    } catch (error) {
      toast.error(toKoreanErrorMessage(error, "규제 룰 조회 실패"), "오류");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!active) return;
    void loadRules();
  }, [active, loadRules]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (listRegulationFilter !== "all" && item.regulation_area !== listRegulationFilter) {
        return false;
      }
      if (!query) return true;
      return [
        item.region_key,
        item.region_1depth,
        item.region_2depth ?? "",
        item.region_3depth ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [items, listRegulationFilter, searchQuery]);

  const regionLabel = useCallback((item: RegulationRuleItem) => {
    return [item.region_1depth, item.region_2depth, item.region_3depth]
      .filter(Boolean)
      .join(" ");
  }, []);

  const resetEditor = () => {
    setEditor(EMPTY_EDITOR);
  };

  const saveRule = async () => {
    if (!editor.region1.trim()) {
      toast.error("시/도는 필수입니다.", "오류");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        region1: editor.region1.trim(),
        region2: editor.region2.trim() || null,
        region3: editor.region3.trim() || null,
        regulationAreas:
          editor.regulationAreas.length > 0
            ? editor.regulationAreas
            : (["non_regulated"] as RegulationArea[]),
        replaceAreas: true,
        isActive: editor.isActive,
        effectiveFrom: editor.effectiveFrom || null,
        effectiveTo: editor.effectiveTo || null,
        note: editor.note.trim() || null,
      };

      const response = await fetch("/api/admin/regulation-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error(data?.error || "규제 룰 저장에 실패했습니다.");
      }

      toast.success("규제 룰이 등록되었습니다.", "완료");
      resetEditor();
      await loadRules();
    } catch (error) {
      toast.error(toKoreanErrorMessage(error, "규제 룰 저장 실패"), "오류");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: RegulationRuleItem) => {
    try {
      const response = await fetch("/api/admin/regulation-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, isActive: !item.is_active }),
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error(data?.error || "상태 변경에 실패했습니다.");
      }
      toast.success(item.is_active ? "비활성 처리되었습니다." : "활성 처리되었습니다.", "완료");
      await loadRules();
    } catch (error) {
      toast.error(toKoreanErrorMessage(error, "상태 변경 실패"), "오류");
    }
  };

  const startInlineEdit = (item: RegulationRuleItem) => {
    setInlineEditor({
      id: item.id,
      region1: item.region_1depth,
      region2: item.region_2depth ?? "",
      region3: item.region_3depth ?? "",
      regulationArea: item.regulation_area,
      isActive: item.is_active,
      effectiveFrom: item.effective_from ? item.effective_from.slice(0, 10) : "",
      effectiveTo: item.effective_to ? item.effective_to.slice(0, 10) : "",
      note: item.note ?? "",
    });
  };

  const cancelInlineEdit = () => {
    if (inlineSaving) return;
    setInlineEditor(null);
  };

  const saveInlineEdit = async () => {
    if (!inlineEditor) return;
    if (!inlineEditor.region1.trim()) {
      toast.error("시/도는 필수입니다.", "오류");
      return;
    }

    setInlineSaving(true);
    try {
      const payload = {
        id: inlineEditor.id,
        region1: inlineEditor.region1.trim(),
        region2: inlineEditor.region2.trim() || null,
        region3: inlineEditor.region3.trim() || null,
        regulationArea: inlineEditor.regulationArea,
        isActive: inlineEditor.isActive,
        effectiveFrom: inlineEditor.effectiveFrom || null,
        effectiveTo: inlineEditor.effectiveTo || null,
        note: inlineEditor.note.trim() || null,
      };

      const response = await fetch("/api/admin/regulation-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error(data?.error || "규제 룰 저장에 실패했습니다.");
      }

      toast.success("규제 룰이 수정되었습니다.", "완료");
      setInlineEditor(null);
      await loadRules();
    } catch (error) {
      toast.error(toKoreanErrorMessage(error, "규제 룰 저장 실패"), "오류");
    } finally {
      setInlineSaving(false);
    }
  };

  const runBootstrap = async (dryRun: boolean) => {
    if (!dryRun) {
      const ok = window.confirm(
        "기존 현장 데이터 기반으로 regulation_rules를 자동 적재할까요?\n(수동 입력(manual) 룰은 유지됩니다.)",
      );
      if (!ok) return;
    }

    setBootstrapLoading(dryRun ? "preview" : "apply");
    try {
      const response = await fetch(
        `/api/admin/regulation-rules/bootstrap?dryRun=${dryRun ? "true" : "false"}`,
        { method: "POST" },
      );
      const payload = (await response.json().catch(() => null)) as
        | {
            success?: boolean;
            prepared_rules?: number;
            upserted_rules?: number;
            skipped_manual_override?: number;
            error?: string;
          }
        | null;
      if (!response.ok) {
        throw new Error(payload?.error || "자동 적재 실행 실패");
      }

      toast.success(
        dryRun
          ? `미리보기 완료: 준비 ${payload?.prepared_rules ?? 0}건`
          : `적재 완료: 저장 ${payload?.upserted_rules ?? 0}건`,
        "완료",
      );
      await loadRules();
    } catch (error) {
      toast.error(toKoreanErrorMessage(error, "자동 적재 실행 실패"), "오류");
    } finally {
      setBootstrapLoading(null);
    }
  };

  const runRecoPoiBatch = async () => {
    const ok = window.confirm(
      "주변 인프라 재수집 배치를 지금 실행할까요?\n(대기 중인 큐와 갱신 대상 현장을 처리합니다.)",
    );
    if (!ok) return;

    setRecoPoiBatchLoading(true);
    try {
      const response = await fetch(
        "/api/admin/reco-pois/run?chunk=100&topN=3&radius=2000&concurrency=4",
        { method: "POST" },
      );
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; stats?: { processed?: number; succeeded?: number; failed?: number } }
        | null;
      if (!response.ok) {
        throw new Error(payload?.error || "주변 인프라 재수집 실행 실패");
      }

      toast.success(
        `재수집 완료: 처리 ${payload?.stats?.processed ?? 0}건 / 성공 ${payload?.stats?.succeeded ?? 0}건`,
        "완료",
      );
    } catch (error) {
      toast.error(toKoreanErrorMessage(error, "주변 인프라 재수집 실행 실패"), "오류");
    } finally {
      setRecoPoiBatchLoading(false);
    }
  };

  const loadMapBoundaries = useCallback(async () => {
    if (!hasNaverMapClientId) {
      toast.error("네이버 지도 키가 없어 지도를 표시할 수 없습니다.", "오류");
      return;
    }

    const targets = filteredItems.slice(0, 100);
    if (targets.length === 0) {
      setMapFocusBounds(null);
      setMapFocusPolygons([]);
      setMapFocusPolygonGroups([]);
      setMapLoadedBoundaryCount(0);
      setMapSkippedCount(0);
      setMapBuiltFromQuery(searchQuery.trim());
      return;
    }

    setMapLoading(true);
    try {
      const targetByCacheKey = new Map<string, BoundaryRequestTarget>();
      const regionTonesByKey = new Map<string, Set<MapFocusOverlayTone>>();
      const unsupportedRegions = new Set<string>();
      for (const item of targets) {
        const target = boundaryRequestTargetForRule(item);
        if (!target) {
          unsupportedRegions.add(regionLabel(item) || item.region_key);
          continue;
        }
        targetByCacheKey.set(target.cacheKey, target);
        const tone = mapToneFromRegulationArea(item.regulation_area);
        const existingTones =
          regionTonesByKey.get(target.cacheKey) ?? new Set<MapFocusOverlayTone>();
        existingTones.add(tone);
        regionTonesByKey.set(target.cacheKey, existingTones);
      }

      const payloads: RegionBoundaryPayload[] = [];
      const polygonsByTone: Record<MapFocusOverlayTone, MapFocusPolygonPath[]> = {
        default: [],
        warning: [],
        danger: [],
        mixed: [],
      };
      let failed = 0;
      for (const [key, tones] of regionTonesByKey.entries()) {
        const tone = resolveCombinedTone(tones);
        const target = targetByCacheKey.get(key);
        if (!target) {
          failed += 1;
          continue;
        }
        const cached = boundaryCacheRef.current.get(key);
        if (cached) {
          payloads.push(cached);
          polygonsByTone[tone].push(...cached.polygons);
          continue;
        }

        const response = await fetch(target.requestUrl, { cache: "no-store" });
        if (!response.ok) {
          failed += 1;
          continue;
        }

        const payload = (await response.json().catch(() => null)) as RegionBoundaryPayload | null;
        if (!payload?.bounds || !Array.isArray(payload?.polygons)) {
          failed += 1;
          continue;
        }

        boundaryCacheRef.current.set(key, payload);
        payloads.push(payload);
        polygonsByTone[tone].push(...payload.polygons);
      }

      const polygons = payloads.flatMap((payload) => payload.polygons);
      const polygonGroups: MapFocusPolygonGroup[] = [];
      if (polygonsByTone.danger.length > 0) {
        polygonGroups.push({ tone: "danger", paths: polygonsByTone.danger });
      }
      if (polygonsByTone.warning.length > 0) {
        polygonGroups.push({ tone: "warning", paths: polygonsByTone.warning });
      }
      if (polygonsByTone.mixed.length > 0) {
        polygonGroups.push({ tone: "mixed", paths: polygonsByTone.mixed });
      }
      if (polygonsByTone.default.length > 0) {
        polygonGroups.push({ tone: "default", paths: polygonsByTone.default });
      }
      const bounds = computeBoundsFromPolygons(polygons);
      setMapFocusPolygons(polygons);
      setMapFocusPolygonGroups(polygonGroups);
      setMapFocusBounds(bounds);
      setMapLoadedBoundaryCount(payloads.length);
      setMapSkippedCount(failed + unsupportedRegions.size);
      setMapBuiltFromQuery(searchQuery.trim());
      toast.success(`바운더리 ${payloads.length}건을 불러왔습니다.`, "완료");
    } catch (error) {
      toast.error(toKoreanErrorMessage(error, "지도 바운더리 생성 실패"), "오류");
    } finally {
      setMapLoading(false);
    }
  }, [filteredItems, hasNaverMapClientId, regionLabel, searchQuery, toast]);

  useEffect(() => {
    if (!mapReady || !mapFocusBounds) return;
    mapRef.current?.fitToBounds(mapFocusBounds);
  }, [mapFocusBounds, mapReady]);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="ob-typo-h2 text-(--oboon-text-title)">규제 룰 관리</div>
          <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
            조건 검증에 쓰이는 지역별 규제/전매제한 기준을 수동 입력하거나 자동 적재합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            shape="pill"
            onClick={() => void runRecoPoiBatch()}
            loading={recoPoiBatchLoading}
          >
            주변 인프라 재수집 실행
          </Button>
          <Button
            variant="secondary"
            size="sm"
            shape="pill"
            onClick={() => void runBootstrap(true)}
            loading={bootstrapLoading === "preview"}
          >
            자동 적재 미리보기
          </Button>
          <Button
            variant="primary"
            size="sm"
            shape="pill"
            onClick={() => void runBootstrap(false)}
            loading={bootstrapLoading === "apply"}
          >
            자동 초기 적재
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="ob-typo-subtitle text-(--oboon-text-title)">규제 룰 등록</div>
          <Button variant="secondary" size="sm" shape="pill" onClick={resetEditor}>
            초기화
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input
            value={editor.region1}
            onChange={(e) => setEditor((prev) => ({ ...prev, region1: e.target.value }))}
            placeholder="시/도 (예: 서울특별시)"
          />
          <Input
            value={editor.region2}
            onChange={(e) => setEditor((prev) => ({ ...prev, region2: e.target.value }))}
            placeholder="시/군/구 (선택)"
          />
          <Input
            value={editor.region3}
            onChange={(e) => setEditor((prev) => ({ ...prev, region3: e.target.value }))}
            placeholder="읍/면/동 (선택)"
          />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="md"
                className="h-11 w-full justify-between"
              >
                <span>{regulationAreaTriggerLabel(editor.regulationAreas)}</span>
                <ChevronDown className="h-4 w-4 text-(--oboon-text-muted)" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" matchTriggerWidth>
              {REGULATION_AREA_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => {
                    setEditor((prev) => {
                      const has = prev.regulationAreas.includes(option.value);
                      const nextAreas = has
                        ? prev.regulationAreas.filter((area) => area !== option.value)
                        : [...prev.regulationAreas, option.value];
                      return {
                        ...prev,
                        regulationAreas: normalizeEditorRegulationAreas(nextAreas),
                      };
                    });
                  }}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span>{option.label}</span>
                    {editor.regulationAreas.includes(option.value) ? (
                      <Check className="h-4 w-4 text-(--oboon-primary)" />
                    ) : null}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <OboonDatePicker
            selected={parseDateString(editor.effectiveFrom)}
            onChange={(date) =>
              setEditor((prev) => ({
                ...prev,
                effectiveFrom: formatDateInputValue(date),
              }))
            }
            dateFormat="yyyy-MM-dd"
            textFormat="yyyy-MM-dd"
            placeholder="적용 시작일"
            inputClassName={oboonFieldBaseClass}
          />
          <OboonDatePicker
            selected={parseDateString(editor.effectiveTo)}
            onChange={(date) =>
              setEditor((prev) => ({
                ...prev,
                effectiveTo: formatDateInputValue(date),
              }))
            }
            dateFormat="yyyy-MM-dd"
            textFormat="yyyy-MM-dd"
            placeholder="적용 종료일"
            inputClassName={oboonFieldBaseClass}
          />
        </div>

        <div className="mt-3">
          <Textarea
            value={editor.note}
            onChange={(e) => setEditor((prev) => ({ ...prev, note: e.target.value }))}
            placeholder="메모 (선택)"
            rows={3}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 ob-typo-body text-(--oboon-text-title)">
            <input
              type="checkbox"
              checked={editor.isActive}
              onChange={(e) =>
                setEditor((prev) => ({
                  ...prev,
                  isActive: e.target.checked,
                }))
              }
            />
            활성 룰
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" size="sm" shape="pill" onClick={() => void loadRules()}>
            <RefreshCcw className="h-4 w-4" />
            새로고침
          </Button>
          <Button variant="primary" size="sm" shape="pill" loading={saving} onClick={saveRule}>
            등록
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <div className="ob-typo-subtitle text-(--oboon-text-title)">지도 보기</div>
            <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
              현재 검색 결과 기준 최대 100개 지역의 바운더리를 마스킹으로 표시합니다.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            shape="pill"
            onClick={() => void loadMapBoundaries()}
            loading={mapLoading}
          >
            지도 불러오기
          </Button>
        </div>

        {!hasNaverMapClientId ? (
          <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-6 text-center">
            <p className="ob-typo-body text-(--oboon-text-muted)">
              <code>NEXT_PUBLIC_NAVER_MAP_CLIENT_ID</code>가 없어 지도를 표시할 수 없습니다.
            </p>
          </div>
        ) : mapLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-(--oboon-primary)" />
          </div>
        ) : mapFocusPolygons.length === 0 ? (
          <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-6 text-center">
            <p className="ob-typo-body text-(--oboon-text-muted)">
              지도 불러오기 버튼을 누르면 바운더리 마스킹이 표시됩니다.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-2 flex flex-wrap items-center gap-2 ob-typo-caption text-(--oboon-text-muted)">
              <span>바운더리 {mapLoadedBoundaryCount}건</span>
              <span>·</span>
              <span>미지원/조회 실패 {mapSkippedCount}건</span>
              <span>·</span>
              <span>
                기준 검색어: {mapBuiltFromQuery ? mapBuiltFromQuery : "전체"}
              </span>
            </div>
            <div className="h-[420px] w-full overflow-hidden rounded-2xl border border-(--oboon-border-default)">
              <NaverMap
                ref={mapRef}
                markers={[]}
                focusBounds={mapFocusBounds}
                focusPolygons={mapFocusPolygons}
                focusPolygonGroups={mapFocusPolygonGroups}
                focusMaskMode="inside"
                regionClusterEnabled={false}
                onMapReady={() => setMapReady(true)}
              />
            </div>
          </>
        )}
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="ob-typo-subtitle text-(--oboon-text-title)">
              등록된 규제 룰 ({filteredItems.length})
            </div>
            {LIST_REGULATION_FILTER_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={listRegulationFilter === option.value ? "primary" : "secondary"}
                size="sm"
                shape="pill"
                onClick={() => setListRegulationFilter(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <div className="w-full max-w-sm min-w-[220px]">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="지역 검색 (예: 서울 강남)"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-(--oboon-primary)" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-3"
              >
                {inlineEditor?.id === item.id ? (
                  <div className="space-y-3">
                    <div className="ob-typo-body text-(--oboon-text-title)">
                      {item.region_key}
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Input
                        value={inlineEditor.region1}
                        onChange={(e) =>
                          setInlineEditor((prev) =>
                            prev ? { ...prev, region1: e.target.value } : prev,
                          )
                        }
                        placeholder="시/도"
                      />
                      <Input
                        value={inlineEditor.region2}
                        onChange={(e) =>
                          setInlineEditor((prev) =>
                            prev ? { ...prev, region2: e.target.value } : prev,
                          )
                        }
                        placeholder="시/군/구"
                      />
                      <Input
                        value={inlineEditor.region3}
                        onChange={(e) =>
                          setInlineEditor((prev) =>
                            prev ? { ...prev, region3: e.target.value } : prev,
                          )
                        }
                        placeholder="읍/면/동"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="secondary"
                            size="md"
                            className="h-11 w-full justify-between"
                          >
                            <span>{REGULATION_AREA_LABEL[inlineEditor.regulationArea]}</span>
                            <ChevronDown className="h-4 w-4 text-(--oboon-text-muted)" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" matchTriggerWidth>
                          {INLINE_REGULATION_AREA_OPTIONS.map((option) => (
                            <DropdownMenuItem
                              key={option.value}
                              onClick={() =>
                                setInlineEditor((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        regulationArea: option.value,
                                      }
                                    : prev,
                                )
                              }
                            >
                              {option.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <OboonDatePicker
                        selected={parseDateString(inlineEditor.effectiveFrom)}
                        onChange={(date) =>
                          setInlineEditor((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  effectiveFrom: formatDateInputValue(date),
                                }
                              : prev,
                          )
                        }
                        dateFormat="yyyy-MM-dd"
                        textFormat="yyyy-MM-dd"
                        placeholder="적용 시작일"
                        inputClassName={oboonFieldBaseClass}
                      />
                      <OboonDatePicker
                        selected={parseDateString(inlineEditor.effectiveTo)}
                        onChange={(date) =>
                          setInlineEditor((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  effectiveTo: formatDateInputValue(date),
                                }
                              : prev,
                          )
                        }
                        dateFormat="yyyy-MM-dd"
                        textFormat="yyyy-MM-dd"
                        placeholder="적용 종료일"
                        inputClassName={oboonFieldBaseClass}
                      />
                    </div>

                    <Textarea
                      value={inlineEditor.note}
                      onChange={(e) =>
                        setInlineEditor((prev) =>
                          prev ? { ...prev, note: e.target.value } : prev,
                        )
                      }
                      placeholder="메모 (선택)"
                      rows={2}
                    />

                    <label className="inline-flex items-center gap-2 ob-typo-body text-(--oboon-text-title)">
                      <input
                        type="checkbox"
                        checked={inlineEditor.isActive}
                        onChange={(e) =>
                          setInlineEditor((prev) =>
                            prev ? { ...prev, isActive: e.target.checked } : prev,
                          )
                        }
                      />
                      활성 룰
                    </label>

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        shape="pill"
                        disabled={inlineSaving}
                        onClick={cancelInlineEdit}
                      >
                        취소
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        shape="pill"
                        loading={inlineSaving}
                        onClick={saveInlineEdit}
                      >
                        저장
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="ob-typo-body text-(--oboon-text-title)">
                        {[item.region_1depth, item.region_2depth, item.region_3depth]
                          .filter(Boolean)
                          .join(" ")}
                      </div>
                      <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                        key: {item.region_key}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant="status">{REGULATION_AREA_LABEL[item.regulation_area]}</Badge>
                        <Badge variant={item.source === "manual" ? "primary" : "status"}>
                          {item.source === "manual" ? "수동" : `자동(${item.derived_count})`}
                        </Badge>
                        <Badge variant={item.is_active ? "success" : "status"}>
                          {item.is_active ? "활성" : "비활성"}
                        </Badge>
                      </div>
                      <div className="mt-2 ob-typo-caption text-(--oboon-text-muted)">
                        적용기간: {formatDateText(item.effective_from)} ~ {formatDateText(item.effective_to)}
                      </div>
                      {item.note ? (
                        <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                          메모: {item.note}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        shape="pill"
                        onClick={() => void toggleActive(item)}
                      >
                        {item.is_active ? "비활성" : "활성"}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        shape="pill"
                        disabled={Boolean(inlineEditor)}
                        onClick={() => startInlineEdit(item)}
                      >
                        <Edit3 className="h-4 w-4" />
                        수정
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {!loading && filteredItems.length === 0 ? (
              <div className="py-6 text-center ob-typo-body text-(--oboon-text-muted)">
                등록된 규제 룰이 없습니다.
              </div>
            ) : null}
          </div>
        )}
      </Card>
    </>
  );
}
