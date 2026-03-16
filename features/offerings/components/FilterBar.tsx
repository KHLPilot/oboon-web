"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import type {
  OfferingRegionTab,
  OfferingStatusValue,
} from "@/features/offerings/domain/offering.types";
import Button from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import {
  OFFERING_REGION_TABS,
  OFFERING_STATUS_LABEL,
  OFFERING_STATUS_VALUES,
  isOfferingStatusValue,
} from "@/features/offerings/domain/offering.constants";
import { formatEokPreview, parseEok } from "@/lib/format/currency";
import { cn } from "@/lib/utils/cn";
import OfferingsViewToggle from "@/features/offerings/components/OfferingsViewToggle";

const REGIONS: OfferingRegionTab[] = [...OFFERING_REGION_TABS];
const SEOUL_SUB_REGIONS = [
  "전체",
  "강남구",
  "강동구",
  "강북구",
  "강서구",
  "관악구",
  "광진구",
  "구로구",
  "금천구",
  "노원구",
  "도봉구",
  "동대문구",
  "동작구",
  "마포구",
  "서대문구",
  "서초구",
  "성동구",
  "성북구",
  "송파구",
  "양천구",
  "영등포구",
  "용산구",
  "은평구",
  "종로구",
  "중구",
  "중랑구",
] as const;
const GYEONGGI_SUB_REGIONS = [
  { label: "전체", value: "전체" },
  { label: "경기 북부", value: "north" },
  { label: "경기 남부", value: "south" },
] as const;

const STATUSES: Array<OfferingStatusValue | "전체"> = [
  "전체",
  ...OFFERING_STATUS_VALUES,
];

const BUDGET_SLIDER_POSITION_MIN = 0;
const BUDGET_SLIDER_POSITION_MAX = 37;
const BUDGET_VALUE_MAX = 100;

const AGENT_FILTERS = [
  { label: "전체", value: "전체" },
  { label: "상담 가능", value: "has" },
] as const;
type AgentFilterValue = (typeof AGENT_FILTERS)[number]["value"];

const APPRAISAL_FILTERS = [
  { label: "전체", value: "전체" },
  { label: "감정평가 완료", value: "done" },
] as const;
type AppraisalFilterValue = (typeof APPRAISAL_FILTERS)[number]["value"];

function isRegionTab(v: string): v is OfferingRegionTab {
  return (OFFERING_REGION_TABS as readonly string[]).includes(v);
}

function sliderPositionToBudget(position: number) {
  if (position <= 10) return Math.floor(position) / 10;
  if (position <= 19) return position - 9;
  return 10 + (position - 19) * 5;
}

function budgetToSliderPosition(value: number) {
  if (value <= 1) return Math.round(value * 10);
  if (value <= 10) return Math.round(value + 9);
  return Math.round((value - 10) / 5) + 19;
}

function clampBudgetPosition(value: number) {
  return Math.min(
    BUDGET_SLIDER_POSITION_MAX,
    Math.max(BUDGET_SLIDER_POSITION_MIN, value)
  );
}

function clampBudgetValue(value: number) {
  if (value <= 1) {
    return Math.min(1, Math.max(0, Math.round(value * 10) / 10));
  }
  if (value <= 10) return Math.max(1, Math.round(value));
  return Math.min(BUDGET_VALUE_MAX, Math.max(10, Math.round(value / 5) * 5));
}

function formatBudgetSummary(min: number | null, max: number | null) {
  if (min == null && max == null) return "전체";
  if (min != null && max == null) return `${formatEokPreview(min)} 이상`;
  if (min == null && max != null) return `${formatEokPreview(max)} 이하`;
  return formatEokPreview(min as number, max as number);
}

type ToggleSetter = (value: boolean | ((prev: boolean) => boolean)) => void;
type OfferingsView = "list" | "map";

function FilterDropdown<T extends string>({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: T;
  options: readonly { label: string; value: T }[];
  onSelect: (next: T) => void;
}) {
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? label;

  return (
    <div className="space-y-2">
      <div className="ob-typo-caption text-(--oboon-text-muted)">{label}</div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex h-11 w-full items-center justify-between rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-page) px-4 text-left",
              "ob-typo-body text-(--oboon-text-title)"
            )}
            aria-label={`${label} 선택`}
          >
            <span className="truncate">{selectedLabel}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-(--oboon-text-muted)" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          matchTriggerWidth
          className="max-h-[19.25rem] overflow-y-auto sm:max-h-none"
        >
          {options.map((option) => (
            <DropdownMenuItem
              key={option.value}
              className={cn(
                "flex items-center justify-between gap-2",
                option.value === value ? "bg-(--oboon-bg-subtle)" : ""
              )}
              onClick={() => onSelect(option.value)}
            >
              <span>{option.label}</span>
              {option.value === value ? (
                <Check className="h-4 w-4 text-(--oboon-primary)" />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

type FilterBarBodyProps = {
  sp: ReturnType<typeof useSearchParams>;
  open: boolean;
  setOpen: ToggleSetter;
  urlQ: string;
  urlBudgetMin: string;
  urlBudgetMax: string;
  view: OfferingsView;
  onViewChange: (next: OfferingsView) => void;
};

function FilterBarBody({
  sp,
  open,
  setOpen,
  urlQ,
  urlBudgetMin,
  urlBudgetMax,
  view,
  onViewChange,
}: FilterBarBodyProps) {
  const router = useRouter();
  const pathname = usePathname();

  const rawRegion = sp.get("region");
  const region: OfferingRegionTab =
    rawRegion && isRegionTab(rawRegion) ? rawRegion : "전체";

  const rawStatus = sp.get("status");
  const status: OfferingStatusValue | "전체" =
    rawStatus && isOfferingStatusValue(rawStatus) ? rawStatus : "전체";
  const subRegion = sp.get("subRegion") ?? "전체";
  const rawAgent = sp.get("agent");
  const agentFilter: AgentFilterValue = rawAgent === "has" ? "has" : "전체";
  const rawAppraisal = sp.get("appraisal");
  const appraisalFilter: AppraisalFilterValue =
    rawAppraisal === "done" ? "done" : "전체";

  const [q, setQ] = useState(urlQ);
  const [budgetMin, setBudgetMin] = useState(urlBudgetMin);
  const [budgetMax, setBudgetMax] = useState(urlBudgetMax);
  const [budgetMaxUnlimited, setBudgetMaxUnlimited] = useState(!urlBudgetMax);

  const qs = useMemo(() => new URLSearchParams(sp.toString()), [sp]);

  function pushParams(pairs: Record<string, string | null | undefined>) {
    const next = new URLSearchParams(qs.toString());
    next.delete("purpose");

    for (const [key, value] of Object.entries(pairs)) {
      const v = (value ?? "").trim();
      if (!v || v === "전체") next.delete(key);
      else next.set(key, v);
    }

    next.delete("page");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  function resetAll() {
    setQ("");
    setBudgetMin("");
    setBudgetMax("");
    setBudgetMaxUnlimited(true);
    setOpen(true);
    router.replace(pathname, { scroll: false });
  }

  const activeCount =
    (region !== "전체" ? 1 : 0) +
    (subRegion !== "전체" ? 1 : 0) +
    (status !== "전체" ? 1 : 0) +
    (agentFilter !== "전체" ? 1 : 0) +
    (appraisalFilter !== "전체" ? 1 : 0) +
    (urlBudgetMin || urlBudgetMax ? 1 : 0);

  const minVal = parseEok(budgetMin);
  const maxVal = parseEok(budgetMax);
  const effectiveMaxVal = budgetMaxUnlimited ? null : maxVal;
  const sliderMinPosition = clampBudgetPosition(
    budgetToSliderPosition(minVal ?? 0)
  );
  const sliderMaxPosition = clampBudgetPosition(
    budgetToSliderPosition(budgetMaxUnlimited ? BUDGET_VALUE_MAX : maxVal ?? BUDGET_VALUE_MAX)
  );
  const sliderProgressStart =
    (sliderMinPosition / BUDGET_SLIDER_POSITION_MAX) * 100;
  const sliderProgressEnd =
    (sliderMaxPosition / BUDGET_SLIDER_POSITION_MAX) * 100;
  const regionOptions = REGIONS.map((item) => ({ label: item, value: item }));
  const statusOptions = STATUSES.map((item) => ({
    label: item === "전체" ? "전체" : OFFERING_STATUS_LABEL[item],
    value: item,
  }));
  const agentOptions = AGENT_FILTERS.map((item) => ({
    label: item.label,
    value: item.value,
  }));
  const appraisalOptions = APPRAISAL_FILTERS.map((item) => ({
    label: item.label,
    value: item.value,
  }));
  const subRegionOptions =
    region === "서울"
      ? SEOUL_SUB_REGIONS.map((item) => ({ label: item, value: item }))
      : region === "경기"
        ? GYEONGGI_SUB_REGIONS.map((item) => ({
            label: item.label,
            value: item.value,
          }))
        : [];

  const budgetError =
    minVal != null && effectiveMaxVal != null && minVal > effectiveMaxVal
      ? "최소 예산이 최대 예산보다 커요"
      : null;

  const applyDisabled = Boolean(budgetError);

  // [적용] 버튼과 Enter 적용이 같은 로직을 사용하도록 통합
  function applyBudget() {
    if (applyDisabled) return;

    const normalizedMin = minVal == null ? "" : String(minVal);
    const normalizedMax =
      budgetMaxUnlimited || maxVal == null ? "" : String(maxVal);

    setBudgetMin(normalizedMin);
    setBudgetMax(normalizedMax);

    pushParams({
      budgetMin: normalizedMin || null,
      budgetMax: normalizedMax || null,
    });
    setOpen(false);
  }

  function handleSliderMinChange(nextRaw: string) {
    const nextPosition = clampBudgetPosition(Number(nextRaw));
    const boundedPosition = Math.min(nextPosition, sliderMaxPosition);
    const bounded = clampBudgetValue(sliderPositionToBudget(boundedPosition));
    setBudgetMin(String(bounded));
    if (budgetMaxUnlimited) return;
    if (boundedPosition > sliderMaxPosition) {
      setBudgetMax(String(bounded));
    }
  }

  function handleSliderMaxChange(nextRaw: string) {
    const nextPosition = clampBudgetPosition(Number(nextRaw));
    const boundedPosition = Math.max(nextPosition, sliderMinPosition);
    const bounded = clampBudgetValue(sliderPositionToBudget(boundedPosition));
    setBudgetMaxUnlimited(false);
    setBudgetMax(String(bounded));
  }

  const filterPanelContent = (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <FilterDropdown
          label="지역"
          value={region}
          options={regionOptions}
          onSelect={(next) => pushParams({ region: next, subRegion: null })}
        />
        {subRegionOptions.length > 0 ? (
          <FilterDropdown
            label={region === "서울" ? "서울 세부 지역" : "경기 세부 지역"}
            value={subRegion}
            options={subRegionOptions}
            onSelect={(next) =>
              pushParams({ subRegion: next === "전체" ? null : next })
            }
          />
        ) : null}
        <FilterDropdown
          label="분양 상태"
          value={status}
          options={statusOptions}
          onSelect={(next) => pushParams({ status: next })}
        />
        <FilterDropdown
          label="상담사"
          value={agentFilter}
          options={agentOptions}
          onSelect={(next) =>
            pushParams({ agent: next === "전체" ? null : next })
          }
        />
        <FilterDropdown
          label="감정평가"
          value={appraisalFilter}
          options={appraisalOptions}
          onSelect={(next) =>
            pushParams({ appraisal: next === "전체" ? null : next })
          }
        />
      </div>

      <div className="mt-5 space-y-2">
        <div className="ob-typo-subtitle text-(--oboon-text-title)">예산</div>
        <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-page) p-4">
          {/* 헤더: 범위 요약 + 전체 버튼 */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="ob-typo-subtitle text-(--oboon-text-title)">
              {formatBudgetSummary(minVal, effectiveMaxVal)}
            </div>
            <Button
              type="button"
              size="sm"
              shape="pill"
              variant="primary"
              disabled={applyDisabled}
              className={cn(
                "h-8 px-4 ob-typo-button shrink-0",
                applyDisabled ? "opacity-60 cursor-not-allowed" : ""
              )}
              onClick={applyBudget}
            >
              적용
            </Button>
          </div>

          {/* 최소/최대 현재값 칩 */}
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-2xl bg-(--oboon-bg-subtle) px-3 py-2">
              <div className="ob-typo-caption text-(--oboon-text-muted)">최소</div>
              <div className="ob-typo-body font-semibold text-(--oboon-primary)">
                {minVal != null && minVal > 0
                  ? formatEokPreview(minVal)
                  : "0"}
              </div>
            </div>
            <span className="ob-typo-caption text-(--oboon-text-muted)">~</span>
            <div className="flex-1 rounded-2xl bg-(--oboon-bg-subtle) px-3 py-2 text-right">
              <div className="ob-typo-caption text-(--oboon-text-muted)">최대</div>
              <div className="ob-typo-body font-semibold text-(--oboon-primary)">
                {budgetMaxUnlimited || maxVal == null
                  ? "제한 없음"
                  : formatEokPreview(maxVal)}
              </div>
            </div>
          </div>

          {/* 슬라이더 — 트랙 두께↑, 썸 크기↑ */}
          <div className="mb-2 px-1">
            <div className="relative h-12">
              <div className="absolute left-0 right-0 top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-(--oboon-bg-subtle)" />
              <div
                className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-(--oboon-primary)"
                style={{
                  left: `${sliderProgressStart}%`,
                  width: `${Math.max(sliderProgressEnd - sliderProgressStart, 0)}%`,
                }}
              />
              <input
                type="range"
                min={BUDGET_SLIDER_POSITION_MIN}
                max={BUDGET_SLIDER_POSITION_MAX}
                step={1}
                value={sliderMinPosition}
                onChange={(e) => handleSliderMinChange(e.target.value)}
                className="pointer-events-none absolute inset-0 h-12 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-(--oboon-bg-surface) [&::-webkit-slider-thumb]:bg-(--oboon-primary) [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-(--oboon-bg-surface) [&::-moz-range-thumb]:bg-(--oboon-primary)"
                aria-label="최소 예산 슬라이더"
              />
              <input
                type="range"
                min={BUDGET_SLIDER_POSITION_MIN}
                max={BUDGET_SLIDER_POSITION_MAX}
                step={1}
                value={sliderMaxPosition}
                onChange={(e) => handleSliderMaxChange(e.target.value)}
                className="pointer-events-none absolute inset-0 h-12 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-(--oboon-bg-surface) [&::-webkit-slider-thumb]:bg-(--oboon-primary) [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-(--oboon-bg-surface) [&::-moz-range-thumb]:bg-(--oboon-primary)"
                aria-label="최대 예산 슬라이더"
              />
            </div>
            <div className="flex items-center justify-between ob-typo-body text-(--oboon-text-muted)">
              <span>0</span>
              <span>1억</span>
              <span>10억</span>
              <span>100억+</span>
            </div>
          </div>
        </div>

        {budgetError ? (
          <div className="mt-2 ob-typo-caption text-(--oboon-warning-text)">
            {budgetError}
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 ob-typo-button text-(--oboon-text-muted)"
          onClick={resetAll}
        >
          초기화
        </Button>
      </div>
    </>
  );

  return (
    <div className="space-y-4">
      {/* ---------------- Mobile: Search bar + icon buttons ---------------- */}
      <div className="sm:hidden">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Label className="sr-only" htmlFor="q_mobile">
              검색
            </Label>
            <Input
              id="q_mobile"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="지역, 단지명으로 검색"
              className={cn(
                "h-10 w-full rounded-xl px-5 ob-typo-body",
                "outline-none focus:ring-2 focus:ring-(--oboon-primary)/30"
              )}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  pushParams({ q });
                }
              }}
            />
          </div>

          <Button
            type="button"
            variant="secondary"
            shape="pill"
            size="md"
            className="h-10 w-10 rounded-full p-0"
            onClick={() => pushParams({ q })}
            aria-label="검색"
          >
            <Search className="h-4 w-4" />
          </Button>

          <OfferingsViewToggle value={view} onChange={onViewChange} />

          <Button
            type="button"
            variant={open ? "primary" : "secondary"}
            shape="pill"
            size="md"
            className="h-10 w-10 rounded-full p-0"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="필터"
          >
            <SlidersHorizontal
              className={cn(
                "h-4 w-4 transition-colors",
                open
                  ? "text-(--oboon-on-primary)"
                  : activeCount > 0
                  ? "text-(--oboon-primary)"
                  : "text-(--oboon-text-muted)"
              )}
            />
          </Button>
        </div>
      </div>

      {/* ---------------- Desktop: 스샷처럼 (검색 인풋 + 아이콘 버튼) ---------------- */}
      <div className="hidden sm:block">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Label className="sr-only" htmlFor="q">
              검색
            </Label>
            <Input
              id="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="지역, 단지명으로 검색"
              className={cn(
                "h-10 w-full rounded-xl px-5 ob-typo-body",
                "outline-none focus:ring-2 focus:ring-(--oboon-primary)/30"
              )}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  pushParams({ q });
                }
              }}
            />
          </div>

          <Button
            type="button"
            variant="secondary"
            shape="pill"
            size="md"
            className="h-10 w-10 rounded-full p-0"
            onClick={() => pushParams({ q })}
            aria-label="검색"
          >
            <Search className="h-4 w-4" />
          </Button>

          <OfferingsViewToggle value={view} onChange={onViewChange} />

          <Button
            type="button"
            variant={open ? "primary" : "secondary"}
            shape="pill"
            size="md"
            className="h-10 w-10 rounded-full p-0"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="필터"
          >
            <SlidersHorizontal
              className={cn(
                "h-4 w-4 transition-colors",
                open
                  ? "text-(--oboon-on-primary)"
                  : activeCount > 0
                  ? "text-(--oboon-primary)"
                  : "text-(--oboon-text-muted)"
              )}
            />
          </Button>
        </div>
      </div>

      {/* ---------------- Mobile Filter Drawer ---------------- */}
      {open ? (
        <div className="sm:hidden">
          <div
            className="fixed inset-0 z-(--oboon-z-modal) bg-(--oboon-overlay) backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-x-0 bottom-0 z-(--oboon-z-modal) max-h-[88dvh] overflow-y-auto rounded-t-xl border border-b-0 border-(--oboon-border-default) bg-(--oboon-bg-surface) p-5 shadow-(--oboon-shadow-card) pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
            <div className="mb-4 flex items-center justify-between">
              <div className="ob-typo-h3 text-(--oboon-text-title)">필터</div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-page)"
                aria-label="필터 닫기"
              >
                <X className="h-4 w-4 text-(--oboon-text-muted)" />
              </button>
            </div>
            {filterPanelContent}
          </div>
        </div>
      ) : null}

      {/* ---------------- Desktop Filter Panel ---------------- */}
      <div
        className={cn(
          "hidden sm:block",
          !open && "sm:hidden",
          "mt-4 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-5"
        )}
      >
        {filterPanelContent}
      </div>
    </div>
  );
}

export default function FilterBar({
  view,
  onViewChange,
}: {
  view: OfferingsView;
  onViewChange: (next: OfferingsView) => void;
}) {
  const sp = useSearchParams();
  // 하이드레이션 일치: 최초 렌더는 항상 닫힘으로 시작하고,
  // 마운트 이후에만 뷰포트 기준 상태를 반영한다.
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // SSR 안전: client에서만 실행
    const mq = window.matchMedia("(min-width: 640px)"); // sm
    const rafId = window.requestAnimationFrame(() => {
      setOpen(mq.matches);
    });
    // 뷰포트 변경 시에도 자연스럽게 동작(선택 사항이지만 UX 안정적)
    const onChange = (e: MediaQueryListEvent) => setOpen(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => {
      window.cancelAnimationFrame(rafId);
      mq.removeEventListener?.("change", onChange);
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    if (!open || mq.matches) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const urlQ = sp.get("q") ?? "";
  const urlBudgetMin = sp.get("budgetMin") ?? "";
  const urlBudgetMax = sp.get("budgetMax") ?? "";
  const syncKey = `${urlQ}|${urlBudgetMin}|${urlBudgetMax}`;

  return (
    <FilterBarBody
      key={syncKey}
      sp={sp}
      open={open}
      setOpen={setOpen}
      urlQ={urlQ}
      urlBudgetMin={urlBudgetMin}
      urlBudgetMax={urlBudgetMax}
      view={view}
      onViewChange={onViewChange}
    />
  );
}
