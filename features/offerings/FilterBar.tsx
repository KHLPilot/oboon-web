"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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

function cx(...v: (string | false | null | undefined)[]) {
  return v.filter(Boolean).join(" ");
}

function isRegionTab(v: string): v is OfferingRegionTab {
  return (OFFERING_REGION_TABS as readonly string[]).includes(v);
}

function parseEok(v: string) {
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  // 소수 1자리(천 단위)까지만 유지
  return Math.floor(n * 10) / 10;
}

function formatEokPreview(v: string) {
  const n = parseEok(v);
  if (n == null) return null;
  if (n === 0) return "0";

  const eokInt = Math.floor(n);
  const cheon = Math.floor((n - eokInt) * 10 + 1e-9);

  if (eokInt > 0 && cheon > 0) return `${eokInt}억 ${cheon}천`;
  if (eokInt > 0) return `${eokInt}억`;
  if (cheon > 0) return `${cheon}천`;
  return null;
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
  const region: OfferingRegionTab = rawRegion && isRegionTab(rawRegion)
    ? rawRegion
    : "전체";

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
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function resetAll() {
    setQ("");
    setBudgetMin("");
    setBudgetMax("");
    setOpen(true);
    router.push(pathname);
  }

  const activeCount =
    (region !== "전체" ? 1 : 0) +
    (status !== "전체" ? 1 : 0) +
    (purpose ? 1 : 0) +
    (urlQ ? 1 : 0) +
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
  }

  function onBudgetEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    applyBudget();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
              "h-11 w-full rounded-xl px-4 text-[14px]",
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

        <div className="flex gap-2">
          <Button
            type="button"
            variant="primary"
            size="md"
            className="h-11 rounded-xl px-4 text-[14px]"
            onClick={() => pushParams({ q })}
          >
            검색
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="md"
            className="h-11 rounded-xl px-4 text-[14px]"
            onClick={resetAll}
          >
            초기화
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="md"
            className="h-11 rounded-xl px-4 text-[14px] sm:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            필터 {activeCount > 0 ? `(${activeCount})` : ""}
          </Button>
        </div>
      </div>

      <div className={cx(!open && "hidden sm:block")}>
        <div className="flex flex-wrap items-center gap-2">
          {REGIONS.map((r) => {
            const active = r === region;
            return (
              <Button
                key={r}
                type="button"
                size="sm"
                shape="pill"
                variant={active ? "primary" : "secondary"}
                className="h-9 px-4 text-[13px]"
                onClick={() => pushParams({ region: r })}
              >
                {r}
              </Button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {STATUSES.map((s) => {
            const active = s === status;
            const label = s === "전체" ? "전체" : OFFERING_STATUS_LABEL[s];

            return (
              <Button
                key={s}
                type="button"
                size="sm"
                shape="pill"
                variant={active ? "secondary" : "ghost"}
                className={cx(
                  "h-9 px-4 text-[13px]",
                  !active && "text-(--oboon-text-muted)"
                )}
                onClick={() => pushParams({ status: s })}
              >
                {label}
              </Button>
            );
          })}
        </div>

        <div className="mt-5 space-y-2">
          <div className="text-[14px] font-semibold text-(--oboon-text-title)">
            예산
          </div>

          <div className="flex flex-wrap gap-2">
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
                  className="h-9 px-4 text-[13px]"
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
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                placeholder="최소 (억)"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                onKeyDown={onBudgetEnter}
                className={cx(
                  "h-10 w-32 rounded-[10px] px-3 pr-12 text-[13px]",
                  budgetError
                    ? "border-orange-300 focus:ring-orange-200"
                    : "border-(--oboon-border-default) focus:ring-(--oboon-primary)/20"
                )}
              />
              {formatEokPreview(budgetMin) && (
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-(--oboon-text-muted)">
                  {formatEokPreview(budgetMin)}
                </span>
              )}
            </div>

            <span className="text-(--oboon-text-muted)">~</span>

            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                placeholder="최대 (억)"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                onKeyDown={onBudgetEnter}
                className={cx(
                  "h-10 w-32 rounded-[10px] px-3 pr-12 text-[13px]",
                  budgetError
                    ? "border-orange-300 focus:ring-orange-200"
                    : "border-(--oboon-border-default) focus:ring-(--oboon-primary)/20"
                )}
              />
              {formatEokPreview(budgetMax) && (
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-(--oboon-text-muted)">
                  {formatEokPreview(budgetMax)}
                </span>
              )}
            </div>

            <Button
              type="button"
              disabled={applyDisabled}
              onClick={applyBudget}
              variant="secondary"
              size="sm"
              className={cx(
                "h-10 rounded-[10px] px-4 text-[13px]",
                applyDisabled ? "opacity-60 cursor-not-allowed" : ""
              )}
            >
              적용
            </Button>
          </div>

          {budgetError ? (
            <div className="mt-2 text-[12px] text-orange-600">
              {budgetError}
            </div>
          ) : (
            <div className="mt-2 text-[12px] text-(--oboon-text-muted)">
              소수 1자리까지 입력할 수 있어요. (예: 15.6 → 15억 6천)
            </div>
          )}
        </div>

        <div className="mt-5 space-y-2">
          <div className="text-[14px] font-semibold text-(--oboon-text-title)">
            어떤 용도로 찾으시나요?
          </div>

          <div className="flex flex-wrap gap-2">
            {PURPOSES.map((p) => {
              const active = purpose === p.value;
              return (
                <Button
                  key={p.value}
                  type="button"
                  size="sm"
                  shape="pill"
                  variant={active ? "primary" : "secondary"}
                  className="h-9 px-4 text-[13px]"
                  onClick={() => pushParams({ purpose: p.value })}
                >
                  {p.label}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 sm:hidden">
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="h-11 w-full rounded-xl px-4 text-[14px]"
            onClick={() => setOpen(false)}
          >
            필터 닫기
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function FilterBar() {
  const sp = useSearchParams();
  const [open, setOpen] = useState(true);

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
