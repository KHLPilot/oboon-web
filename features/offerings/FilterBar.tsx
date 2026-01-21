"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import type {
  OfferingRegionTab,
  OfferingStatusValue,
} from "@/features/offerings/domain/offering.types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import {
  OFFERING_REGION_TABS,
  OFFERING_STATUS_LABEL,
  OFFERING_STATUS_VALUES,
  isOfferingStatusValue,
} from "@/features/offerings/domain/offering.constants";
import { cn } from "@/app/company/properties/[id]/units/utils";

const REGIONS: OfferingRegionTab[] = [...OFFERING_REGION_TABS];

const STATUSES: Array<OfferingStatusValue | "전체"> = [
  "전체",
  ...OFFERING_STATUS_VALUES,
];

const BUDGET_PRESETS = [
  { label: "1억 미만", min: 0, max: 1 },
  { label: "1–3억", min: 1, max: 3 },
  { label: "3–5억", min: 3, max: 5 },
  { label: "5–10억", min: 5, max: 10 },
  { label: "10–20억", min: 10, max: 20 },
  { label: "20–30억", min: 20, max: 30 },
  { label: "30–50억", min: 30, max: 50 },
];

const PURPOSES = [
  { label: "실거주", value: "residence" },
  { label: "투자", value: "investment" },
  { label: "기타", value: "other" },
];

function MobileChipRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("sm:hidden -mx-5", className)}>
      <div className="relative px-5">
        <div
          className={cn(
            "flex gap-2 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]",
            "scrollbar-none",
            "scroll-pl-5 scroll-pr-5"
          )}
        >
          {children}
          <div className="shrink-0 w-3" />
        </div>

        {/* edge fade */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-linear-to-r from-(--oboon-bg-surface) to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-(--oboon-bg-surface) to-transparent" />
      </div>
    </div>
  );
}

function cx(...v: (string | false | null | undefined)[]) {
  return v.filter(Boolean).join(" ");
}

function isRegionTab(v: string): v is OfferingRegionTab {
  return (OFFERING_REGION_TABS as readonly string[]).includes(v);
}

// 예산 입력 정규화
function normalizeBudgetInput(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  // iOS 등에서 소수점 콤마 입력 가능성 대비
  const v = trimmed.replace(/,/g, ".");

  // 음수 입력 즉시 제거
  if (v.startsWith("-")) return "";

  // 숫자/점만 남기기
  const cleaned = v.replace(/[^0-9.]/g, "");

  // 점 1개만 허용
  const parts = cleaned.split(".");
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

function blockNegativeNumberKeys(e: React.KeyboardEvent<HTMLInputElement>) {
  // number input에서 흔한 문제: -, +, e/E 입력 가능(지수 표기)
  if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") {
    e.preventDefault();
  }
}

function parseEok(v: string) {
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  // 소수 1자리(천 단위)까지만 유지
  return Math.floor(n * 10) / 10;
}

function formatEokPreview(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;

  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;

  const eok = Math.floor(n);
  const frac = n - eok;

  // 0.1억 단위(=천)로 반올림
  let cheon = Math.round(frac * 10);
  let eokCarry = eok;
  if (cheon >= 10) {
    eokCarry += 1;
    cheon = 0;
  }

  // 표기 조합
  if (eokCarry > 0 && cheon > 0) return `${eokCarry}억 ${cheon}천`;
  if (eokCarry > 0) return `${eokCarry}억`;
  if (cheon > 0) return `${cheon}천`;
  return "0";
}

type ToggleSetter = (value: boolean | ((prev: boolean) => boolean)) => void;

type FilterBarBodyProps = {
  sp: ReturnType<typeof useSearchParams>;
  open: boolean;
  setOpen: ToggleSetter;
  urlQ: string;
  urlBudgetMin: string;
  urlBudgetMax: string;
};

function FilterBarBody({
  sp,
  open,
  setOpen,
  urlQ,
  urlBudgetMin,
  urlBudgetMax,
}: FilterBarBodyProps) {
  const router = useRouter();
  const pathname = usePathname();

  const rawRegion = sp.get("region");
  const region: OfferingRegionTab =
    rawRegion && isRegionTab(rawRegion) ? rawRegion : "전체";

  const rawStatus = sp.get("status");
  const status: OfferingStatusValue | "전체" =
    rawStatus && isOfferingStatusValue(rawStatus) ? rawStatus : "전체";
  const purpose = sp.get("purpose") ?? "";

  const [q, setQ] = useState(urlQ);
  const [budgetMin, setBudgetMin] = useState(urlBudgetMin);
  const [budgetMax, setBudgetMax] = useState(urlBudgetMax);

  const qs = useMemo(() => new URLSearchParams(sp.toString()), [sp]);

  function pushParams(pairs: Record<string, string | null | undefined>) {
    const next = new URLSearchParams(qs.toString());

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
    setOpen(true);
    router.replace(pathname, { scroll: false });
  }

  const activeCount =
    (region !== "전체" ? 1 : 0) +
    (status !== "전체" ? 1 : 0) +
    (purpose ? 1 : 0) +
    (urlBudgetMin || urlBudgetMax ? 1 : 0);

  const minVal = parseEok(budgetMin);
  const maxVal = parseEok(budgetMax);

  const budgetError =
    minVal != null && maxVal != null && minVal > maxVal
      ? "최소 예산이 최대 예산보다 커요"
      : null;

  const applyDisabled = Boolean(budgetError);

  // [적용] 버튼과 Enter 적용이 같은 로직을 사용하도록 통합
  function applyBudget() {
    if (applyDisabled) return;

    const normalizedMin = minVal == null ? "" : String(minVal);
    const normalizedMax = maxVal == null ? "" : String(maxVal);

    setBudgetMin(normalizedMin);
    setBudgetMax(normalizedMax);

    pushParams({
      budgetMin: normalizedMin || null,
      budgetMax: normalizedMax || null,
    });
    setOpen(false);
  }

  function onBudgetEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    applyBudget();
  }

  return (
    <div className="space-y-4">
      {/* ---------------- Mobile: Search bar + icon buttons ---------------- */}
      <div className="sm:hidden">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Label className="sr-only" htmlFor="q_mobile">
              검색
            </Label>
            <Input
              id="q_mobile"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="지역, 단지명으로 검색"
              className={cx(
                "h-10 w-full rounded-full px-5 ob-typo-body",
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
                open && activeCount > 0
                  ? "text-(--oboon-text-inverse)"
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
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Label className="sr-only" htmlFor="q">
              검색
            </Label>
            <Input
              id="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="지역, 단지명으로 검색"
              className={cx(
                "h-10 w-full rounded-full px-5 ob-typo-body",
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
                open && activeCount > 0
                  ? "text-(--oboon-text-inverse)"
                  : activeCount > 0
                  ? "text-(--oboon-primary)"
                  : "text-(--oboon-text-muted)"
              )}
            />
          </Button>
        </div>
      </div>

      {/* ---------------- Filter Panel ---------------- */}
      <div
        className={cx(
          // Mobile/desktop 공통: open=false면 숨김 (데스크탑도 접기/펼치기 가능)
          !open && "hidden",
          // Desktop도 스샷처럼 '박스' 유지
          "mt-4 rounded-3xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-5"
        )}
      >
        {/* Panel top row: 안내 + 초기화 (Desktop에서도 우측에 노출) */}
        <div className="flex items-center justify-between pb-3">
          <div className="ob-typo-body text-(--oboon-text-muted)">
            조건을 선택해보세요.
          </div>
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
        {/* 지역 */}
        <div className="space-y-2">
          <div className="ob-typo-subtitle text-(--oboon-text-title)">지역</div>
          {/* Mobile */}
          <MobileChipRow>
            {REGIONS.map((r) => {
              const active = r === region;
              return (
                <Button
                  key={r}
                  type="button"
                  size="sm"
                  shape="pill"
                  variant={active ? "primary" : "secondary"}
                  className="h-9 px-4 ob-typo-button shrink-0"
                  onClick={() => pushParams({ region: r })}
                >
                  {r}
                </Button>
              );
            })}
          </MobileChipRow>

          {/* Desktop */}
          <div className="hidden sm:flex flex-wrap gap-2">
            {REGIONS.map((r) => {
              const active = r === region;
              return (
                <Button
                  key={r}
                  type="button"
                  size="sm"
                  shape="pill"
                  variant={active ? "primary" : "secondary"}
                  className="h-9 px-4 ob-typo-button"
                  onClick={() => pushParams({ region: r })}
                >
                  {r}
                </Button>
              );
            })}
          </div>
        </div>

        {/* 분양 상태 */}
        <div className="mt-5 space-y-2">
          <div className="ob-typo-subtitle text-(--oboon-text-title)">
            분양 상태
          </div>
          <MobileChipRow>
            {STATUSES.map((s) => {
              const active = s === status;
              const label = s === "전체" ? "전체" : OFFERING_STATUS_LABEL[s];
              return (
                <Button
                  key={s}
                  type="button"
                  size="sm"
                  shape="pill"
                  variant={active ? "primary" : "secondary"}
                  className="h-9 px-4 ob-typo-button shrink-0"
                  onClick={() => pushParams({ status: s })}
                >
                  {label}
                </Button>
              );
            })}
          </MobileChipRow>

          <div className="hidden sm:flex flex-wrap gap-2">
            {STATUSES.map((s) => {
              const active = s === status;
              const label = s === "전체" ? "전체" : OFFERING_STATUS_LABEL[s];
              return (
                <Button
                  key={s}
                  type="button"
                  size="sm"
                  shape="pill"
                  variant={active ? "primary" : "secondary"}
                  className="h-9 px-4 ob-typo-button"
                  onClick={() => pushParams({ status: s })}
                >
                  {label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* 예산 */}
        <div className="mt-5 space-y-2">
          <div className="ob-typo-subtitle text-(--oboon-text-title)">예산</div>

          <MobileChipRow>
            <Button
              type="button"
              size="sm"
              shape="pill"
              variant={!urlBudgetMin && !urlBudgetMax ? "primary" : "secondary"}
              className="h-9 px-4 ob-typo-button shrink-0"
              onClick={() => {
                setBudgetMin("");
                setBudgetMax("");
                pushParams({ budgetMin: null, budgetMax: null });
              }}
            >
              전체
            </Button>

            {BUDGET_PRESETS.map((p) => {
              const active =
                String(p.min) === urlBudgetMin &&
                String(p.max) === urlBudgetMax;
              return (
                <Button
                  key={p.label}
                  type="button"
                  size="sm"
                  shape="pill"
                  variant={active ? "primary" : "secondary"}
                  className="h-9 px-4 ob-typo-button shrink-0"
                  onClick={() => {
                    const nextMin = String(p.min);
                    const nextMax = String(p.max);
                    setBudgetMin(nextMin);
                    setBudgetMax(nextMax);
                    pushParams({ budgetMin: nextMin, budgetMax: nextMax });
                  }}
                >
                  {p.label}
                </Button>
              );
            })}
          </MobileChipRow>

          <div className="hidden sm:flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              shape="pill"
              variant={!urlBudgetMin && !urlBudgetMax ? "primary" : "secondary"}
              className="h-9 px-4 ob-typo-button shrink-0"
              onClick={() => {
                setBudgetMin("");
                setBudgetMax("");
                pushParams({ budgetMin: null, budgetMax: null });
              }}
            >
              전체
            </Button>
            {BUDGET_PRESETS.map((p) => {
              const active =
                String(p.min) === urlBudgetMin &&
                String(p.max) === urlBudgetMax;
              return (
                <Button
                  key={p.label}
                  type="button"
                  size="sm"
                  shape="pill"
                  variant={active ? "primary" : "secondary"}
                  className="h-9 px-4 ob-typo-button shrink-0"
                  onClick={() => {
                    const nextMin = String(p.min);
                    const nextMax = String(p.max);
                    setBudgetMin(nextMin);
                    setBudgetMax(nextMax);
                    pushParams({ budgetMin: nextMin, budgetMax: nextMax });
                  }}
                >
                  {p.label}
                </Button>
              );
            })}{" "}
          </div>

          {/* 최소~최대 + 적용 */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step={0.1}
                placeholder="최소"
                value={budgetMin}
                onKeyDown={(e) => {
                  blockNegativeNumberKeys(e);
                  onBudgetEnter(e);
                }}
                onChange={(e) =>
                  setBudgetMin(normalizeBudgetInput(e.target.value))
                }
                className={cx(
                  "h-11 w-full rounded-full px-4 pr-16 ob-typo-body",
                  budgetError
                    ? "border-(--oboon-warning-border) focus:ring-(--oboon-warning)/20"
                    : "border-(--oboon-border-default) focus:ring-(--oboon-primary)/20"
                )}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ob-typo-caption text-(--oboon-text-muted)">
                {formatEokPreview(budgetMin) ?? "억"}
              </span>
            </div>

            <span className="text-(--oboon-text-muted)">~</span>

            <div className="relative flex-1">
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step={0.1}
                placeholder="최대"
                value={budgetMax}
                onKeyDown={(e) => {
                  blockNegativeNumberKeys(e);
                  onBudgetEnter(e);
                }}
                onChange={(e) =>
                  setBudgetMax(normalizeBudgetInput(e.target.value))
                }
                className={cx(
                  "h-11 w-full rounded-full px-4 pr-16 ob-typo-body",
                  budgetError
                    ? "border-(--oboon-warning-border) focus:ring-(--oboon-warning)/20"
                    : "border-(--oboon-border-default) focus:ring-(--oboon-primary)/20"
                )}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ob-typo-caption text-(--oboon-text-muted)">
                {formatEokPreview(budgetMax) ?? "억"}
              </span>
            </div>

            <Button
              type="button"
              disabled={applyDisabled}
              onClick={applyBudget}
              variant="primary"
              shape="pill"
              size="md"
              className={cx(
                "h-11 rounded-full px-4 ob-typo-button",
                applyDisabled ? "opacity-60 cursor-not-allowed" : ""
              )}
            >
              적용
            </Button>
          </div>

          {budgetError ? (
            <div className="mt-2 ob-typo-caption text-(--oboon-warning-text)">
              {budgetError}
            </div>
          ) : null}
        </div>

        {/* 용도 */}
        <div className="mt-5 space-y-2">
          <div className="ob-typo-subtitle text-(--oboon-text-title)">용도</div>
          <MobileChipRow>
            <Button
              type="button"
              size="sm"
              shape="pill"
              variant={!purpose ? "primary" : "secondary"}
              className="h-9 px-4 ob-typo-button shrink-0"
              onClick={() => pushParams({ purpose: null })}
            >
              전체
            </Button>
            {PURPOSES.map((p) => {
              const active = purpose === p.value;
              return (
                <Button
                  key={p.value}
                  type="button"
                  size="sm"
                  shape="pill"
                  variant={active ? "primary" : "secondary"}
                  className="h-9 px-4 ob-typo-button shrink-0"
                  onClick={() => pushParams({ purpose: p.value })}
                >
                  {p.label}
                </Button>
              );
            })}
          </MobileChipRow>

          <div className="hidden sm:flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              shape="pill"
              variant={!purpose ? "primary" : "secondary"}
              className="h-9 px-4 ob-typo-button shrink-0"
              onClick={() => pushParams({ purpose: null })}
            >
              전체
            </Button>
            {PURPOSES.map((p) => {
              const active = purpose === p.value;
              return (
                <Button
                  key={p.value}
                  type="button"
                  size="sm"
                  shape="pill"
                  variant={active ? "primary" : "secondary"}
                  className="h-9 px-4 ob-typo-button shrink-0"
                  onClick={() => pushParams({ purpose: p.value })}
                >
                  {p.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FilterBar() {
  const sp = useSearchParams();
  // 기본값: 모바일 닫힘 / 데스크탑 열림
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // SSR 안전: client에서만 실행
    const mq = window.matchMedia("(min-width: 640px)"); // sm
    // 첫 진입 시 데스크탑이면 열어둠
    if (mq.matches) setOpen(true);

    // 뷰포트 변경 시에도 자연스럽게 동작(선택 사항이지만 UX 안정적)
    const onChange = (e: MediaQueryListEvent) => setOpen(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
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
    />
  );
}
