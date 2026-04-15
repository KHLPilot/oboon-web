"use client";

// features/offerings/components/detail/OfferingInlineCompare.client.tsx
import { useState, useCallback, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ChevronDown, Clock, GitCompareArrows, Heart } from "lucide-react";
import WorkplaceSelector from "@/features/offerings/components/detail/WorkplaceSelector.client";
import {
  OFFERING_STATUS_VALUES,
  statusLabelOf,
} from "@/features/offerings/domain/offering.constants";
import type { OfferingCompareItem } from "@/features/offerings/domain/offering.types";
import { useWorkplace } from "@/features/offerings/hooks/useWorkplace";

interface Props {
  currentItem: OfferingCompareItem;
  availableItems: { id: string; name: string; location: string }[];
  scrappedIds?: string[];
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

type TabId = "glance" | "price" | "scale" | "schedule" | "location";

const TABS: { id: TabId; label: string }[] = [
  { id: "glance",   label: "한눈에 보기" },
  { id: "price",    label: "분양가"     },
  { id: "scale",    label: "규모·시설"  },
  { id: "schedule", label: "분양 일정"  },
  { id: "location", label: "교통·입지"  },
];
const STATUS_READY = OFFERING_STATUS_VALUES[0];
const STATUS_OPEN = OFFERING_STATUS_VALUES[1];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusMeta(s: OfferingCompareItem["status"]) {
  if (s === STATUS_OPEN) {
    return { label: statusLabelOf(s), cls: "text-(--oboon-safe)" };
  }
  if (s === STATUS_READY) {
    return { label: statusLabelOf(s), cls: "text-(--oboon-primary)" };
  }
  return { label: statusLabelOf(s), cls: "text-(--oboon-text-muted)" };
}

function schoolCls(g: OfferingCompareItem["schoolGrade"]) {
  if (g === "우수") return "text-(--oboon-safe)";
  if (g === "보통") return "text-(--oboon-warning)";
  return "text-(--oboon-text-muted)";
}

// ─── Shared cell primitives ───────────────────────────────────────────────────

/** 큰 값 셀 (한눈에 보기 탭) */
function BigCell({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="px-5 py-4">
      <div className="ob-typo-caption text-(--oboon-text-muted) mb-1.5">{label}</div>
      <div className="text-xl font-bold leading-snug text-(--oboon-text-title)">{value}</div>
      {sub && <div className="mt-0.5 ob-typo-caption text-(--oboon-text-muted)">{sub}</div>}
    </div>
  );
}

/** 일반 스펙 셀 */
function SpecCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-5 py-4">
      <div className="ob-typo-caption text-(--oboon-text-muted) mb-1">{label}</div>
      <div className="ob-typo-subtitle text-(--oboon-text-title)">{value ?? "—"}</div>
    </div>
  );
}

/** 빈 셀 — 오른쪽 현장 미선택 시 */
function EmptyCell({ label }: { label: string }) {
  return (
    <div className="px-5 py-4">
      <div className="ob-typo-caption text-(--oboon-text-muted) mb-1.5">{label}</div>
      <div className="text-xl font-bold text-(--oboon-border-default)">—</div>
    </div>
  );
}

// ─── Schedule timeline ────────────────────────────────────────────────────────

function parseDateCmp(s: string | null | undefined): Date | null {
  if (!s) return null;
  const v = s.trim();
  if (/^\d{4}-\d{2}$/.test(v)) return new Date(v + "-01");
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(v);
  return null;
}

function getStepStatusCmp(
  startDate: string | null | undefined,
  endDate?: string | null | undefined,
): "done" | "active" | "upcoming" {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = parseDateCmp(startDate);
  const end = parseDateCmp(endDate);
  const effectiveEnd = end ?? start;
  if (!start) return "upcoming";
  if (effectiveEnd && effectiveEnd < today) return "done";
  if (start <= today) return "active";
  return "upcoming";
}

function fmtDateCmp(v: string | null | undefined): string {
  if (!v) return "미정";
  const s = v.trim();
  if (/^\d{4}-\d{2}$/.test(s) || /^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return v; // move_in_text 같은 자유 문자열
}

function fmtRangeCmp(
  a: string | null | undefined,
  b: string | null | undefined,
): string {
  return `${fmtDateCmp(a)} ~ ${fmtDateCmp(b)}`;
}

function buildScheduleSteps(item: OfferingCompareItem) {
  return [
    { label: "모집공고",   date: fmtDateCmp(item.announcementDate),                         startRaw: item.announcementDate, endRaw: undefined         },
    { label: "청약 접수",  date: fmtRangeCmp(item.applicationStart, item.applicationEnd),   startRaw: item.applicationStart, endRaw: item.applicationEnd },
    { label: "당첨자 발표", date: fmtDateCmp(item.winnerAnnounce),                          startRaw: item.winnerAnnounce,   endRaw: undefined         },
    { label: "계약",       date: fmtRangeCmp(item.contractStart, item.contractEnd),         startRaw: item.contractStart,    endRaw: item.contractEnd  },
    { label: "입주 예정",  date: item.moveInText ? fmtDateCmp(item.moveInText) : fmtDateCmp(item.moveInDate), startRaw: item.moveInDate, endRaw: undefined },
  ] as const;
}

const scheduleDotStyle = (st: "done" | "active" | "upcoming") =>
  st === "done"
    ? { backgroundColor: "var(--oboon-safe)",    borderColor: "var(--oboon-safe)",           color: "#fff" }
    : st === "active"
      ? { backgroundColor: "var(--oboon-primary)", borderColor: "var(--oboon-primary)",       color: "#fff" }
      : { backgroundColor: "var(--oboon-bg-surface)", borderColor: "var(--oboon-border-default)", color: "var(--oboon-text-muted)" };

const scheduleLineColor = (st: "done" | "active" | "upcoming") =>
  st === "done" ? "var(--oboon-safe)" : "var(--oboon-border-default)";

const scheduleLabelColor = (st: "done" | "active" | "upcoming") =>
  st === "active" ? "var(--oboon-primary)" : st === "done" ? "var(--oboon-text-primary)" : "var(--oboon-text-muted)";

function ScheduleStepCell({
  label, date, status, idx, isLast,
}: {
  label: string; date: string; status: "done" | "active" | "upcoming"; idx: number; isLast: boolean;
}) {
  return (
    <div className="flex gap-3 px-4">
      <div className="flex shrink-0 flex-col items-center">
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2"
          style={{ marginTop: "0.75rem", ...scheduleDotStyle(status) }}
        >
          {status === "done" ? <Check className="h-3 w-3" /> : status === "active" ? <Clock className="h-3 w-3" /> : <span className="ob-typo-caption font-bold">{idx + 1}</span>}
        </div>
        {isLast
          ? <div style={{ height: "0.75rem" }} />
          : <div className="w-0.5 flex-1" style={{ marginTop: "2px", marginBottom: "-0.75rem", minHeight: "0.5rem", backgroundColor: scheduleLineColor(status) }} />
        }
      </div>
      <div className="min-w-0 flex-1" style={{ paddingTop: "0.75rem", paddingBottom: "0.75rem" }}>
        <div className="flex items-center gap-1.5">
          <p className="ob-typo-subtitle" style={{ color: scheduleLabelColor(status) }}>{label}</p>
          {status === "active" && (
            <span className="ob-typo-caption rounded-full px-1.5 py-0.5" style={{ backgroundColor: "color-mix(in srgb, var(--oboon-primary) 12%, transparent)", color: "var(--oboon-primary)" }}>
              진행 중
            </span>
          )}
        </div>
        <p className="ob-typo-caption mt-0.5" style={{ color: "var(--oboon-text-muted)" }}>{date}</p>
      </div>
    </div>
  );
}

function ScheduleEmptyCell({ label, idx, isLast }: { label: string; idx: number; isLast: boolean }) {
  return (
    <div className="flex gap-3 px-4">
      <div className="flex shrink-0 flex-col items-center">
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2"
          style={{ marginTop: "0.75rem", backgroundColor: "var(--oboon-bg-surface)", borderColor: "var(--oboon-border-default)", color: "var(--oboon-text-muted)" }}
        >
          <span className="ob-typo-caption font-bold">{idx + 1}</span>
        </div>
        {isLast
          ? <div style={{ height: "0.75rem" }} />
          : <div className="w-0.5 flex-1" style={{ marginTop: "2px", marginBottom: "-0.75rem", minHeight: "0.5rem", backgroundColor: "var(--oboon-border-default)" }} />
        }
      </div>
      <div className="min-w-0 flex-1" style={{ paddingTop: "0.75rem", paddingBottom: "0.75rem" }}>
        <p className="ob-typo-subtitle" style={{ color: "var(--oboon-border-default)" }}>{label}</p>
        <p className="ob-typo-caption mt-0.5" style={{ color: "var(--oboon-border-default)" }}>—</p>
      </div>
    </div>
  );
}

// ─── Tab content ──────────────────────────────────────────────────────────────

type RowDef = { label: string; leftVal: React.ReactNode; rightVal: React.ReactNode };
type WorkplaceValue = NonNullable<ReturnType<typeof useWorkplace>["workplace"]>;

function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);

    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isMobile;
}

function buildNaverMapSearchHref(item: OfferingCompareItem) {
  const query = [item.name, item.location].filter(Boolean).join(" ").trim();
  return `https://map.naver.com/p/search/${encodeURIComponent(query)}`;
}

function buildNaverMapWebDirectionsHref(
  workplace: WorkplaceValue,
  item: OfferingCompareItem,
) {
  if (item.siteLat == null || item.siteLng == null) {
    return buildNaverMapSearchHref(item);
  }

  const originType = workplace.type === "station" ? "SUBWAY_STATION" : "ADDRESS_POI";
  const destinationType = "ADDRESS_POI";
  const originName = encodeURIComponent(workplace.label);
  const destinationName = encodeURIComponent(item.name);

  return `https://map.naver.com/p/directions/${workplace.lng},${workplace.lat},${originName},-,${originType}/${item.siteLng},${item.siteLat},${destinationName},-,${destinationType}/-/transit`;
}

function buildNaverMapMobileRouteHref(
  workplace: WorkplaceValue,
  item: OfferingCompareItem,
) {
  if (item.siteLat == null || item.siteLng == null) {
    return buildNaverMapSearchHref(item);
  }

  const params = new URLSearchParams({
    menu: "route",
    sname: workplace.label,
    sx: String(workplace.lng),
    sy: String(workplace.lat),
    ename: item.name,
    ex: String(item.siteLng),
    ey: String(item.siteLat),
  });

  return `https://m.map.naver.com/route.nhn?${params.toString()}`;
}

function TabContent({
  tab,
  left,
  right,
  workplace,
  isMobile,
}: {
  tab: TabId;
  left: OfferingCompareItem;
  right: OfferingCompareItem | null;
  workplace: WorkplaceValue | null;
  isMobile: boolean;
}) {
  let rows: RowDef[] = [];

  if (tab === "glance") {
    const [lMin, lMax] = left.priceRange.split(" ~ ");
    const [rMin, rMax] = right ? right.priceRange.split(" ~ ") : [];
    const ls = statusMeta(left.status);
    const rs = right ? statusMeta(right.status) : null;

    rows = [
      {
        label: "분양가 범위",
        leftVal: (
          <div>
            <div className="text-xl font-bold leading-snug text-(--oboon-text-title)">
              {lMax ? <>{lMin}<br className="lg:hidden" /><span className="hidden lg:inline"> ~ </span>{lMax}</> : left.priceRange}
            </div>
            <div className="mt-0.5 ob-typo-caption text-(--oboon-text-muted)">{left.pricePerPyeong}</div>
          </div>
        ),
        rightVal: right ? (
          <div>
            <div className="text-xl font-bold leading-snug text-(--oboon-text-title)">
              {rMax ? <>{rMin}<br className="lg:hidden" /><span className="hidden lg:inline"> ~ </span>{rMax}</> : right.priceRange}
            </div>
            <div className="mt-0.5 ob-typo-caption text-(--oboon-text-muted)">{right.pricePerPyeong}</div>
          </div>
        ) : null,
      },
      {
        label: "총 세대수",
        leftVal: left.totalUnits > 0
          ? <span className="text-xl font-bold text-(--oboon-text-title)">{left.totalUnits.toLocaleString("ko-KR")}<span className="text-sm font-normal text-(--oboon-text-muted) ml-1">세대</span></span>
          : <span className="text-xl font-bold text-(--oboon-text-title)">—</span>,
        rightVal: right
          ? (right.totalUnits > 0
            ? <span className="text-xl font-bold text-(--oboon-text-title)">{right.totalUnits.toLocaleString("ko-KR")}<span className="text-sm font-normal text-(--oboon-text-muted) ml-1">세대</span></span>
            : <span className="text-xl font-bold text-(--oboon-text-title)">—</span>)
          : null,
      },
      {
        label: "분양 상태",
        leftVal:  <span className={`text-xl font-bold ${ls.cls}`}>{ls.label}</span>,
        rightVal: rs ? <span className={`text-xl font-bold ${rs.cls}`}>{rs.label}</span> : null,
      },
      {
        label: "학군",
        leftVal:  <span className={`text-xl font-bold ${schoolCls(left.schoolGrade)}`}>{left.schoolGrade}</span>,
        rightVal: right ? <span className={`text-xl font-bold ${schoolCls(right.schoolGrade)}`}>{right.schoolGrade}</span> : null,
      },
    ];
  } else if (tab === "price") {
    const [lMin, lMax] = left.priceRange.split(" ~ ");
    const [rMin, rMax] = right ? right.priceRange.split(" ~ ") : [];
    rows = [
      {
        label: "분양가 범위",
        leftVal:  lMax ? <>{lMin}<br />~ {lMax}</> : left.priceRange,
        rightVal: right ? (rMax ? <>{rMin}<br />~ {rMax}</> : right.priceRange) : null,
      },
      { label: "평당가", leftVal: left.pricePerPyeong, rightVal: right?.pricePerPyeong ?? null },
    ];
  } else if (tab === "scale") {
    rows = [
      {
        label: "총 세대수",
        leftVal:  left.totalUnits  > 0 ? `${left.totalUnits.toLocaleString("ko-KR")}세대`  : "미정",
        rightVal: right ? (right.totalUnits > 0 ? `${right.totalUnits.toLocaleString("ko-KR")}세대` : "미정") : null,
      },
      { label: "평형 구성", leftVal: left.unitTypes,  rightVal: right?.unitTypes  ?? null },
      { label: "층수",      leftVal: left.floors,     rightVal: right?.floors     ?? null },
      { label: "주차",      leftVal: left.parking,    rightVal: right?.parking    ?? null },
    ];
  } else if (tab === "schedule") {
    const leftSteps = buildScheduleSteps(left);
    const rightSteps = right ? buildScheduleSteps(right) : null;
    return (
      <div>
        {leftSteps.map((lStep, i) => {
          const lStatus = getStepStatusCmp(lStep.startRaw, lStep.endRaw);
          const rStep = rightSteps?.[i] ?? null;
          const rStatus = rStep ? getStepStatusCmp(rStep.startRaw, rStep.endRaw) : "upcoming" as const;
          const isLast = i === leftSteps.length - 1;
          return (
            <div key={lStep.label} className="grid grid-cols-2">
              <div className="border-r border-(--oboon-border-default)">
                <ScheduleStepCell label={lStep.label} date={lStep.date} status={lStatus} idx={i} isLast={isLast} />
              </div>
              <div>
                {rStep
                  ? <ScheduleStepCell label={rStep.label} date={rStep.date} status={rStatus} idx={i} isLast={isLast} />
                  : <ScheduleEmptyCell label={lStep.label} idx={i} isLast={isLast} />
                }
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (tab === "location") {
    const renderNaverMapCell = (item: OfferingCompareItem | null) => {
      if (!item) {
        return <EmptyCell label="네이버 맵" />;
      }

      if (!workplace) {
        return (
          <div className="px-5 py-4">
            <div className="ob-typo-caption mb-1 text-(--oboon-text-muted)">네이버 맵</div>
            <div className="ob-typo-caption text-(--oboon-text-muted)">
              근무지를 선택하면 길찾기를 열 수 있어요
            </div>
          </div>
        );
      }

      return (
        <div className="px-5 py-4">
          <div className="ob-typo-caption mb-1 text-(--oboon-text-muted)">네이버 맵</div>
          <a
            href={isMobile ? buildNaverMapMobileRouteHref(workplace, item) : buildNaverMapWebDirectionsHref(workplace, item)}
            target={isMobile ? undefined : "_blank"}
            rel={isMobile ? undefined : "noreferrer"}
            className="ob-typo-caption text-(--oboon-primary) underline-offset-2 hover:underline"
          >
            네이버 맵에서 보기
          </a>
        </div>
      );
    };

    return (
      <div>
        <div className="grid grid-cols-2 border-t border-(--oboon-border-default)">
          <div className="border-r border-(--oboon-border-default)">
            <SpecCell label="인근 지하철" value={left.nearestStation} />
          </div>
          <div>
            {right ? <SpecCell label="인근 지하철" value={right.nearestStation} /> : <EmptyCell label="인근 지하철" />}
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-(--oboon-border-default)">
          <div className="border-r border-(--oboon-border-default)">
            {renderNaverMapCell(left)}
          </div>
          <div>
            {renderNaverMapCell(right)}
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-(--oboon-border-default)">
          <div className="border-r border-(--oboon-border-default)">
            <SpecCell
              label="학군"
              value={<span className={schoolCls(left.schoolGrade)}>{left.schoolGrade}</span>}
            />
          </div>
          <div>
            {right ? (
              <SpecCell
                label="학군"
                value={<span className={schoolCls(right.schoolGrade)}>{right.schoolGrade}</span>}
              />
            ) : (
              <EmptyCell label="학군" />
            )}
          </div>
        </div>
      </div>
    );
  }

  const isGlance = tab === "glance";
  const CellComponent = isGlance ? BigCell : SpecCell;

  return (
    <div>
      {rows.map((row, i) => (
        <div
          key={row.label}
          className={["grid grid-cols-2", i > 0 ? "border-t border-(--oboon-border-default)" : ""].join(" ")}
        >
          <div className="border-r border-(--oboon-border-default)">
            <CellComponent label={row.label} value={row.leftVal} />
          </div>
          <div>
            {row.rightVal != null
              ? <CellComponent label={row.label} value={row.rightVal} />
              : <EmptyCell label={row.label} />
            }
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Right column header (selector + selected item) ──────────────────────────

function RightColHeader({
  availableItems,
  excludeId,
  selectedId,
  compareItem,
  onSelect,
  leftHeight,
  scrappedSet,
}: {
  availableItems: { id: string; name: string; location: string }[];
  excludeId: string;
  selectedId: string | null;
  compareItem: OfferingCompareItem | null;
  onSelect: (id: string) => void;
  leftHeight: number;
  scrappedSet: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const rawOptions = availableItems.filter((i) => i.id !== excludeId);
  const options = scrappedSet.size > 0
    ? [
        ...rawOptions.filter((i) => scrappedSet.has(i.id)),
        ...rawOptions.filter((i) => !scrappedSet.has(i.id)),
      ]
    : rawOptions;

  return (
    <div className="relative flex flex-col h-full">
      {/* 전체 영역이 클릭 가능한 트리거 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ minHeight: leftHeight || undefined }}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 hover:bg-(--oboon-bg-subtle) transition-colors text-left"
      >
        {compareItem ? (
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden border border-(--oboon-border-default) bg-(--oboon-bg-subtle)">
              {compareItem.imageUrl ? (
                <Image src={compareItem.imageUrl} alt={compareItem.name} fill sizes="64px" className="object-cover" />
              ) : (
                <div className="absolute inset-0 bg-linear-to-br from-(--oboon-bg-subtle) to-(--oboon-border-default)" />
              )}
            </div>
            <div className="min-w-0">
              <div className="ob-typo-caption text-(--oboon-text-muted) leading-tight mb-0.5">비교 현장</div>
              <div className="ob-typo-body font-semibold text-(--oboon-text-title) truncate" title={compareItem.name}>
                {compareItem.name}
              </div>
              <div className="ob-typo-caption text-(--oboon-text-muted) truncate">{compareItem.location}</div>
            </div>
          </div>
        ) : (
          <span className="ob-typo-body text-(--oboon-text-muted)">
            {selectedId ? "불러오는 중…" : "비교할 현장 선택"}
          </span>
        )}
        <ChevronDown
          className={["w-4 h-4 shrink-0 text-(--oboon-text-muted) transition-transform", open ? "rotate-180" : ""].join(" ")}
        />
      </button>

      {/* 드롭다운 */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 max-h-60 overflow-y-auto border border-(--oboon-border-default) bg-(--oboon-bg-surface) shadow-lg rounded-xl mt-1">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={["flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-(--oboon-bg-subtle)", opt.id === selectedId ? "bg-(--oboon-bg-subtle)" : ""].join(" ")}
              onClick={() => { onSelect(opt.id); setOpen(false); }}
            >
              <div className="min-w-0 flex-1">
                <span className="ob-typo-body text-(--oboon-text-title) truncate block">{opt.name}</span>
                <span className="ob-typo-caption text-(--oboon-text-muted)">{opt.location}</span>
              </div>
              {scrappedSet.has(opt.id) && (
                <Heart className="h-3.5 w-3.5 shrink-0 fill-rose-500 text-rose-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Column header ────────────────────────────────────────────────────────────

function ColHeader({ item, tag }: { item: OfferingCompareItem; tag?: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden border border-(--oboon-border-default) bg-(--oboon-bg-subtle)">
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt={item.name} fill sizes="64px" className="object-cover" />
        ) : (
          <div className="absolute inset-0 bg-linear-to-br from-(--oboon-bg-subtle) to-(--oboon-border-default)" />
        )}
      </div>
      <div className="min-w-0">
        {tag && <div className="ob-typo-caption text-(--oboon-primary) leading-tight mb-0.5">{tag}</div>}
        <div className="ob-typo-body font-semibold text-(--oboon-text-title) truncate" title={item.name}>{item.name}</div>
        <div className="ob-typo-caption text-(--oboon-text-muted) truncate">{item.location}</div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function OfferingInlineCompare({ currentItem, availableItems, scrappedIds = [] }: Props) {
  const scrappedSet = useMemo(() => new Set(scrappedIds), [scrappedIds]);
  const [activeTab, setActiveTab] = useState<TabId>("glance");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareItem, setCompareItem] = useState<OfferingCompareItem | null>(null);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobileViewport();
  const { workplace, setWorkplace } = useWorkplace();
  const [leftHeaderHeight, setLeftHeaderHeight] = useState(0);
  const leftHeaderRef = useCallback((node: HTMLDivElement | null) => {
    if (node) setLeftHeaderHeight(node.getBoundingClientRect().height);
  }, []);

  const handleSelect = useCallback(async (id: string) => {
    setSelectedId(id);
    setLoading(true);
    setCompareItem(null);
    try {
      const res = await fetch(`/api/offerings/compare-items?id=${id}`);
      const data = (await res.json()) as { item: OfferingCompareItem | null };
      setCompareItem(data.item ?? null);
    } catch {
      setCompareItem(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const compareHref = compareItem
    ? `/offerings/compare?a=${currentItem.id}&b=${compareItem.id}`
    : `/offerings/compare?a=${currentItem.id}`;

  return (
    <div>
      {/* 섹션 헤더 */}
      <div className="flex items-start gap-2 mb-4">
        <div className="mt-0.5 text-(--oboon-text-muted)">
          <GitCompareArrows className="h-5 w-5" />
        </div>
        <div>
          <div className="ob-typo-h3 text-(--oboon-text-title)">현장 비교</div>
          <div className="ob-typo-caption text-(--oboon-text-muted)">
            비교할 현장을 선택하면 나란히 확인할 수 있어요
          </div>
        </div>
      </div>

      {/* 카드 */}
      <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) overflow-hidden">

        {/* ── 탭 바 ── */}
        <div className="flex items-center gap-1 px-3 py-2.5 border-b border-(--oboon-border-default) overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                "shrink-0 px-3 py-1 rounded-lg ob-typo-caption transition-colors",
                activeTab === tab.id
                  ? "bg-(--oboon-primary) text-white font-semibold"
                  : "text-(--oboon-text-muted) hover:bg-(--oboon-bg-subtle) hover:text-(--oboon-text-body)",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
          <Link
            href={compareHref}
            className="ml-auto shrink-0 ob-typo-caption text-(--oboon-primary) hover:underline pl-3 whitespace-nowrap"
          >
            전체 보기 →
          </Link>
        </div>

        {/* ── 컬럼 헤더 ── */}
        <div className="grid grid-cols-2 border-b border-(--oboon-border-default)">
          {/* 왼쪽: 현재 현장 */}
          <div ref={leftHeaderRef} className="border-r border-(--oboon-border-default) bg-(--oboon-bg-subtle)/40">
            <ColHeader item={currentItem} tag="현재 현장" />
          </div>

          {/* 오른쪽: 전체가 클릭 가능한 선택 영역 */}
          <RightColHeader
            availableItems={availableItems}
            excludeId={currentItem.id}
            selectedId={selectedId}
            compareItem={loading ? null : compareItem}
            onSelect={handleSelect}
            leftHeight={leftHeaderHeight}
            scrappedSet={scrappedSet}
          />
        </div>

        {/* ── 탭 콘텐츠 ── */}
        {loading ? (
          <div className="animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className={["grid grid-cols-2", i > 0 ? "border-t border-(--oboon-border-default)" : ""].join(" ")}>
                <div className="border-r border-(--oboon-border-default) px-5 py-4">
                  <div className="h-3 w-14 rounded bg-(--oboon-bg-subtle) mb-2" />
                  <div className="h-6 w-24 rounded bg-(--oboon-bg-subtle)" />
                </div>
                <div className="px-5 py-4">
                  <div className="h-3 w-14 rounded bg-(--oboon-bg-subtle) mb-2" />
                  <div className="h-6 w-24 rounded bg-(--oboon-bg-subtle)" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {activeTab === "location" && (
              <div className="flex items-center gap-2 border-b border-(--oboon-border-default) bg-(--oboon-bg-subtle)/40 px-4 py-2.5">
                <span className="shrink-0 ob-typo-caption text-(--oboon-text-muted)">근무지</span>
                <WorkplaceSelector workplace={workplace} onSelect={setWorkplace} />
              </div>
            )}
            <TabContent
              tab={activeTab}
              left={currentItem}
              right={compareItem}
              workplace={workplace}
              isMobile={isMobile}
            />
          </div>
        )}

      </div>
    </div>
  );
}
