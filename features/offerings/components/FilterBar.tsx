"use client";

import dynamic from "next/dynamic";
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
  GYEONGGI_SUB_REGION_OPTIONS,
  OFFERING_REGION_TABS,
  OFFERING_STATUS_LABEL,
  OFFERING_STATUS_VALUES,
  isOfferingStatusValue,
} from "@/features/offerings/domain/offering.constants";
import { formatEokPreview, parseEok } from "@/lib/format/currency";
import { cn } from "@/lib/utils/cn";
import OfferingsViewToggle from "@/features/offerings/components/OfferingsViewToggle";
import { Copy } from "@/shared/copy";
import type { ComponentType } from "react";

const REGIONS: OfferingRegionTab[] = [...OFFERING_REGION_TABS];
const STATUSES: Array<OfferingStatusValue | "전체"> = [
  "전체",
  ...OFFERING_STATUS_VALUES,
];

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

type FilterBarBudgetSectionProps = {
  budgetMin: string;
  budgetMax: string;
  budgetMaxUnlimited: boolean;
  onBudgetMinChange: (next: string) => void;
  onBudgetMaxChange: (next: string) => void;
  onBudgetMaxUnlimitedChange: (next: boolean) => void;
  onApply: () => void;
  onReset: () => void;
};

const FilterBarBudgetSection = dynamic(
  () => import("@/features/offerings/components/FilterBarBudgetSection"),
  {
    ssr: false,
  },
) as unknown as ComponentType<FilterBarBudgetSectionProps>;

function isRegionTab(v: string): v is OfferingRegionTab {
  return (OFFERING_REGION_TABS as readonly string[]).includes(v);
}

type ToggleSetter = (value: boolean | ((prev: boolean) => boolean)) => void;
type OfferingsView = "list" | "map";
type OfferingsSortKey = "latest" | "priceLow" | "priceHigh";

const SORT_OPTIONS: Array<{
  value: OfferingsSortKey;
  label: string;
  mobileLabel: string;
}> = [
  { value: "latest", label: "최신순", mobileLabel: "최신순" },
  { value: "priceLow", label: "낮은 분양가순", mobileLabel: "낮은가격" },
  { value: "priceHigh", label: "높은 분양가순", mobileLabel: "높은가격" },
];

function isOfferingsSortKey(v: string): v is OfferingsSortKey {
  return v === "latest" || v === "priceLow" || v === "priceHigh";
}

function formatBudgetSummary(min: number | null, max: number | null) {
  if (min == null && max == null) return "전체";
  if (min != null && max == null) return `${formatEokPreview(min)} 이상`;
  if (min == null && max != null) return `${formatEokPreview(max)} 이하`;
  return formatEokPreview(min as number, max as number);
}

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
              "flex h-11 w-full items-center justify-between rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-4 text-left",
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

function SortDropdown(props: {
  value: OfferingsSortKey;
  onChange: (value: OfferingsSortKey) => void;
}) {
  const { value, onChange } = props;
  const selectedOption =
    SORT_OPTIONS.find((option) => option.value === value) ?? null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-[6.75rem] items-center justify-between gap-1.5 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-3 text-left",
            "text-[13px] leading-none font-medium text-(--oboon-text-title) sm:h-10 sm:w-auto sm:min-w-[9rem] sm:gap-2 sm:px-4 sm:text-sm sm:leading-normal",
          )}
          aria-label="정렬 선택"
        >
          <span className="truncate sm:hidden">
            {selectedOption?.mobileLabel ?? "정렬"}
          </span>
          <span className="hidden truncate sm:inline">
            {selectedOption?.label ?? "정렬"}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-(--oboon-text-muted) sm:h-4 sm:w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" matchTriggerWidth>
        {SORT_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            className={cn(
              "flex items-center justify-between gap-2 whitespace-nowrap",
              option.value === value ? "bg-(--oboon-bg-subtle)" : "",
            )}
            onClick={() => onChange(option.value)}
          >
            <span className="sm:hidden">{option.mobileLabel}</span>
            <span className="hidden sm:inline">{option.label}</span>
            {option.value === value ? (
              <Check className="h-4 w-4 text-(--oboon-primary)" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileSummaryChip(props: {
  label: string;
  tone?: "default" | "green" | "amber";
}) {
  const { label, tone = "default" } = props;

  const toneClassName =
    tone === "green"
      ? "bg-(--oboon-safe)/15 text-(--oboon-safe)"
      : tone === "amber"
        ? "bg-(--oboon-warning)/15 text-(--oboon-warning-text)"
        : "bg-(--oboon-bg-subtle) text-(--oboon-text-muted)";

  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-full px-3 ob-typo-caption whitespace-nowrap",
        toneClassName,
      )}
    >
      {label}
    </span>
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
  availableRegions: OfferingRegionTab[];
  availableSeoulSubRegions: string[];
  availableGyeonggiSubRegions: string[];
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
  availableRegions,
  availableSeoulSubRegions,
  availableGyeonggiSubRegions,
}: FilterBarBodyProps) {
  const router = useRouter();
  const pathname = usePathname();

  const rawRegion = sp.get("region");
  const regionBaseOptions = availableRegions.length > 0 ? availableRegions : REGIONS;
  const region: OfferingRegionTab =
    rawRegion &&
    isRegionTab(rawRegion) &&
    regionBaseOptions.includes(rawRegion)
      ? rawRegion
      : "전체";

  const rawStatus = sp.get("status");
  const status: OfferingStatusValue | "전체" =
    rawStatus && isOfferingStatusValue(rawStatus) ? rawStatus : "전체";
  const rawSort = sp.get("sort");
  const sortKey: OfferingsSortKey =
    rawSort && isOfferingsSortKey(rawSort) ? rawSort : "latest";
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

  const regionOptions = regionBaseOptions.map((item) => ({ label: item, value: item }));
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
      ? availableSeoulSubRegions.map((item) => ({ label: item, value: item }))
      : region === "경기"
        ? availableGyeonggiSubRegions.map((value) => ({
            label:
              GYEONGGI_SUB_REGION_OPTIONS.find((item) => item.value === value)?.label ??
              value,
            value,
          }))
        : [];
  const normalizedSubRegion =
    subRegionOptions.some((option) => option.value === subRegion)
      ? subRegion
      : "전체";
  const activeCount =
    (region !== "전체" ? 1 : 0) +
    (normalizedSubRegion !== "전체" ? 1 : 0) +
    (status !== "전체" ? 1 : 0) +
    (agentFilter !== "전체" ? 1 : 0) +
    (appraisalFilter !== "전체" ? 1 : 0) +
    (urlBudgetMin || urlBudgetMax ? 1 : 0);

  const appliedBudgetMin = parseEok(urlBudgetMin);
  const appliedBudgetMax = parseEok(urlBudgetMax);

  const subRegionLabel =
    normalizedSubRegion === "north"
      ? "경기 북부"
      : normalizedSubRegion === "south"
        ? "경기 남부"
        : normalizedSubRegion;
  const summaryParts = [
    region !== "전체"
      ? normalizedSubRegion !== "전체"
        ? `${region} ${subRegionLabel}`
        : region
      : null,
    status !== "전체" ? OFFERING_STATUS_LABEL[status] : null,
    agentFilter === "has" ? "상담 가능" : null,
    appraisalFilter === "done" ? "감정평가 완료" : null,
    urlBudgetMin || urlBudgetMax
      ? formatBudgetSummary(appliedBudgetMin, appliedBudgetMax)
      : null,
  ].filter(Boolean) as string[];
  const mobileSummaryLabel =
    summaryParts.length > 0
      ? summaryParts.join(" · ")
      : "지역, 분양 상태, 예산으로 빠르게 좁혀보세요.";

  // [적용] 버튼과 Enter 적용이 같은 로직을 사용하도록 통합
  function applyBudget() {
    setOpen(false);
    pushParams({
      budgetMin: budgetMin || null,
      budgetMax: budgetMaxUnlimited ? null : budgetMax || null,
    });
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
            value={normalizedSubRegion}
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

      <FilterBarBudgetSection
        budgetMin={budgetMin}
        budgetMax={budgetMax}
        budgetMaxUnlimited={budgetMaxUnlimited}
        onBudgetMinChange={setBudgetMin}
        onBudgetMaxChange={setBudgetMax}
        onBudgetMaxUnlimitedChange={setBudgetMaxUnlimited}
        onApply={applyBudget}
        onReset={resetAll}
      />
    </>
  );

  return (
    <div className="space-y-4">
      {/* ---------------- Mobile ---------------- */}
      <div className="sm:hidden">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label className="sr-only" htmlFor="q_mobile">
                검색
              </Label>
              <Input
                id="q_mobile"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={Copy.offerings.search.placeholder}
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
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex w-full items-center gap-3 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-4 py-3 text-left"
          >
            <div className="min-w-0 flex-1">
              <div className="ob-typo-body2 text-(--oboon-text-title)">
                필터 조건
              </div>
              <p className="mt-1 line-clamp-2 ob-typo-caption text-(--oboon-text-muted)">
                {mobileSummaryLabel}
              </p>
            </div>
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-surface)">
              <SlidersHorizontal className="h-4 w-4 text-(--oboon-text-muted)" />
            </span>
          </button>

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              {activeCount > 0 ? (
                <MobileSummaryChip
                  label={`필터 ${activeCount}개`}
                  tone="green"
                />
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <SortDropdown
                value={sortKey}
                onChange={(next) =>
                  pushParams({ sort: next === "latest" ? null : next })
                }
              />
              <OfferingsViewToggle value={view} onChange={onViewChange} />
            </div>
          </div>
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
              placeholder={Copy.offerings.search.placeholder}
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

          <SortDropdown
            value={sortKey}
            onChange={(next) =>
              pushParams({ sort: next === "latest" ? null : next })
            }
          />

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
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-surface)"
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
  availableRegions,
  availableSeoulSubRegions,
  availableGyeonggiSubRegions,
}: {
  view: OfferingsView;
  onViewChange: (next: OfferingsView) => void;
  availableRegions: OfferingRegionTab[];
  availableSeoulSubRegions: string[];
  availableGyeonggiSubRegions: string[];
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
      availableRegions={availableRegions}
      availableSeoulSubRegions={availableSeoulSubRegions}
      availableGyeonggiSubRegions={availableGyeonggiSubRegions}
    />
  );
}
