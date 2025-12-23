// /features/offerings/FilterBar.tsx
"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { OfferingRegion, OfferingStatus } from "@/types/index";

const REGIONS: OfferingRegion[] = [
  "전체",
  "서울",
  "경기",
  "인천",
  "충청",
  "강원",
  "경상",
  "전라",
  "제주",
];
const STATUSES: (OfferingStatus | "전체")[] = [
  "전체",
  "분양중",
  "청약예정",
  "모집공고",
  "마감",
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

export default function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const region = (sp.get("region") ?? "전체") as OfferingRegion;
  const status = (sp.get("status") ?? "전체") as OfferingStatus | "전체";
  const budgetMin = sp.get("budgetMin") ?? "";
  const budgetMax = sp.get("budgetMax") ?? "";
  const q = sp.get("q") ?? "";

  const qs = useMemo(() => new URLSearchParams(sp.toString()), [sp]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(qs.toString());
    if (!value || value === "전체") next.delete(key);
    else next.set(key, value);
    // 페이지네이션 쓴다면 page=1 리셋
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="space-y-4">
      {/* 검색 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <label className="sr-only" htmlFor="q">
            검색
          </label>
          <input
            id="q"
            defaultValue={q}
            placeholder="지역, 단지명으로 검색"
            className={cx(
              "h-11 w-full rounded-[12px] px-4 text-[14px]",
              "bg-(--oboon-bg-surface) text-(--oboon-text-body)",
              "border border-(--oboon-border-default)",
              "outline-none focus:ring-2 focus:ring-(--oboon-primary)/30"
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter")
                setParam("q", (e.target as HTMLInputElement).value.trim());
            }}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className={cx(
              "h-11 rounded-[12px] px-4 text-[14px] font-medium",
              "bg-(--oboon-primary) text-white",
              "hover:bg-(--oboon-primary-hover)"
            )}
            onClick={() => {
              const el = document.getElementById(
                "q"
              ) as HTMLInputElement | null;
              setParam("q", el?.value.trim() ?? "");
            }}
          >
            검색
          </button>

          <button
            type="button"
            className={cx(
              "h-11 rounded-[12px] px-4 text-[14px] font-medium",
              "bg-(--oboon-bg-surface) text-(--oboon-text-body)",
              "border border-(--oboon-border-default)",
              "hover:bg-(--oboon-bg-subtle)"
            )}
            onClick={() => router.push(pathname)}
          >
            초기화
          </button>
        </div>
      </div>

      {/* RegionFilterRow (여기에서 버튼 색/가독성 해결) */}
      <div className="flex flex-wrap items-center gap-2">
        {REGIONS.map((r) => {
          const active = r === region;
          return (
            <button
              key={r}
              type="button"
              className={cx(
                "h-9 rounded-full px-4 text-[13px] font-medium transition-colors",
                active
                  ? "bg-(--oboon-primary) text-white"
                  : "bg-(--oboon-bg-surface) text-(--oboon-text-body) border border-(--oboon-border-default) hover:bg-(--oboon-bg-subtle)"
              )}
              onClick={() => setParam("region", r)}
            >
              {r}
            </button>
          );
        })}
      </div>

      {/* 상태 필터 */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => {
          const active = s === status;
          return (
            <button
              key={s}
              type="button"
              className={cx(
                "h-9 rounded-full px-4 text-[13px] font-medium transition-colors",
                active
                  ? "bg-(--oboon-bg-subtle) text-(--oboon-text-title)"
                  : "bg-transparent text-(--oboon-text-muted) hover:bg-(--oboon-bg-subtle)"
              )}
              onClick={() => setParam("status", s)}
            >
              {s}
            </button>
          );
        })}
      </div>

      {/* 예산 필터 */}
      <div className="space-y-2">
        <div className="text-[14px] font-semibold text-(--oboon-text-title)">
          예산
        </div>

        {/* 프리셋 */}
        <div className="flex flex-wrap gap-2">
          {BUDGET_PRESETS.map((p) => {
            const active =
              String(p.min) === budgetMin && String(p.max) === budgetMax;

            return (
              <button
                key={p.label}
                type="button"
                className={cx(
                  "h-9 rounded-full px-4 text-[13px] font-medium",
                  active
                    ? "bg-(--oboon-primary) text-white"
                    : "bg-(--oboon-bg-surface) border border-(--oboon-border-default) text-(--oboon-text-body)"
                )}
                onClick={() => {
                  setParam("budgetMin", String(p.min));
                  setParam("budgetMax", String(p.max));
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* 직접 입력 */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="최소 (억)"
            defaultValue={budgetMin}
            className="h-10 w-28 rounded-[10px] border border-(--oboon-border-default) px-3 text-[13px]"
            id="budgetMin"
          />
          <span className="text-(--oboon-text-muted)">~</span>
          <input
            type="number"
            placeholder="최대 (50억)"
            defaultValue={budgetMax}
            className="h-10 w-28 rounded-[10px] border border-(--oboon-border-default) px-3 text-[13px]"
            id="budgetMax"
          />
          <button
            type="button"
            className="h-10 rounded-[10px] px-4 text-[13px] font-medium bg-(--oboon-bg-subtle)"
            onClick={() => {
              const min = (
                document.getElementById("budgetMin") as HTMLInputElement
              )?.value;
              const max = (
                document.getElementById("budgetMax") as HTMLInputElement
              )?.value;

              setParam("budgetMin", min);
              setParam("budgetMax", max);
            }}
          >
            적용
          </button>
        </div>
      </div>

      {/* 목적 필터 */}
      <div className="space-y-2">
        <div className="text-[14px] font-semibold text-(--oboon-text-title)">
          어떤 용도로 찾으시나요?
        </div>

        <div className="flex flex-wrap gap-2">
          {PURPOSES.map((p) => {
            const active = sp.get("purpose") === p.value;

            return (
              <button
                key={p.value}
                type="button"
                className={cx(
                  "h-9 rounded-full px-4 text-[13px] font-medium",
                  active
                    ? "bg-(--oboon-primary) text-white"
                    : "bg-(--oboon-bg-surface) border border-(--oboon-border-default) text-(--oboon-text-body)"
                )}
                onClick={() => setParam("purpose", p.value)}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
