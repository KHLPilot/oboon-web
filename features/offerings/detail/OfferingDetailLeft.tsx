// features/offerings/detail/OfferingDetailLeft.tsx
import type { ReactNode } from "react";
import Image from "next/image";
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Info,
  MapPin,
  Phone,
} from "lucide-react";

import Card from "@/components/ui/Card";
import OfferingDetailTabs from "@/features/offerings/detail/OfferingDetailTabs.client";
import { UXCopy } from "@/shared/uxCopy";
import OfferingBadge from "@/features/offerings/OfferingBadges";
import { isOfferingStatusValue } from "@/features/offerings/domain/offering.constants";

/* ---------------- Types (최소 필요만) ---------------- */

export type PropertyRow = {
  id: number;
  created_at: string;
  name: string;
  property_type: string;
  phone_number: string | null;
  status: string | null;
  description: string | null;
  image_url: string | null;

  confirmed_comment: string | null;
  estimated_comment: string | null;
  pending_comment: string | null;

  property_locations: PropertyLocationRow[] | PropertyLocationRow | null;
  property_specs: PropertySpecRow[] | PropertySpecRow | null;
  property_timeline: PropertyTimelineRow[] | PropertyTimelineRow | null;
  property_unit_types: PropertyUnitTypeRow[] | PropertyUnitTypeRow | null;
};

type PropertyLocationRow = {
  road_address: string | null;
  jibun_address: string | null;
  lat: number | null;
  lng: number | null;
  region_1depth: string | null;
  region_2depth: string | null;
  region_3depth: string | null;
};

type PropertySpecRow = {
  household_total: number | null;
  parking_total: number | null;
};

type PropertyTimelineRow = {
  announcement_date: string | null;
  application_start: string | null;
  application_end: string | null;
  winner_announce: string | null;
  contract_start: string | null;
  contract_end: string | null;
  move_in_date: string | null;
};

type PropertyUnitTypeRow = {
  id: number;
  type_name: string | null;
  price_min: number | null;
  price_max: number | null;
  image_url: string | null;
};

/* ---------------- Utils ---------------- */

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

function pickFirstNonEmpty(...values: Array<string | null | undefined>) {
  for (const v of values) {
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return null;
}

function asArray<T>(v: T | T[] | null | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function firstRow<T>(v: T | T[] | null | undefined): T | null {
  const arr = asArray(v);
  return arr[0] ?? null;
}

function isLikelyImageUrl(url: string | null | undefined) {
  if (!url) return false;
  const u = url.trim();
  if (!/^https?:\/\//i.test(u)) return false;
  return /\.(jpg|jpeg|png|webp|gif|avif)(\?|#|$)/i.test(u);
}

function pickBestImageUrl(p: PropertyRow) {
  if (isLikelyImageUrl(p.image_url)) return p.image_url;

  const unitTypes = asArray<PropertyUnitTypeRow>(p.property_unit_types);
  const unitImg = unitTypes.find((u) =>
    isLikelyImageUrl(u.image_url)
  )?.image_url;
  return unitImg ?? null;
}

function fmtAddr(loc0: PropertyLocationRow | null) {
  return (
    pickFirstNonEmpty(loc0?.road_address, loc0?.jibun_address) ?? UXCopy.address
  );
}

function fmtYMOrYMD(value: string | null | undefined) {
  if (!value) return UXCopy.preNotice;
  const v = value.trim();
  if (!v) return UXCopy.preNotice;
  if (/^\d{4}-\d{2}$/.test(v)) return v;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return UXCopy.preNotice;
}

function fmtRange(a: string | null | undefined, b: string | null | undefined) {
  const fa = fmtYMOrYMD(a);
  const fb = fmtYMOrYMD(b);
  if (fa === UXCopy.preNotice && fb === UXCopy.preNotice)
    return `${UXCopy.preNoticeShort} ~ ${UXCopy.preNoticeShort}`;
  return `${fa} ~ ${fb}`;
}

function toNumberSafe(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function formatEok(n: number | null) {
  if (n === null) return UXCopy.priceRangeShort;
  const eok = n / 100000000;
  if (!Number.isFinite(eok)) return UXCopy.priceRangeShort;
  const rounded = Math.round(eok * 10) / 10;
  return `${rounded}억`;
}

/* ---------------- Page-local UI atoms ---------------- */

function CardBox({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)",
        className
      )}
    >
      {children}
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 text-(--oboon-text-muted)">{icon}</div>
      <div>
        <div className="text-base font-semibold text-(--oboon-text-title)">
          {title}
        </div>
        {desc ? (
          <div className="text-sm text-(--oboon-text-muted)">{desc}</div>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <CardBox className="p-0">
      <div className="px-4 py-3">
        <div className="text-[11px] font-medium text-(--oboon-text-muted)">
          {label}
        </div>
        <div className="mt-1 text-[15px] font-semibold text-(--oboon-text-title)">
          {value}
        </div>
      </div>
    </CardBox>
  );
}

/* ---------------- Component ---------------- */

export default function OfferingDetailLeft({
  property,
}: {
  property: PropertyRow;
}) {
  const p = property as PropertyRow;

  const loc0 = firstRow<PropertyLocationRow>(p.property_locations);
  const specs0 = firstRow<PropertySpecRow>(p.property_specs);
  const timeline0 = firstRow<PropertyTimelineRow>(p.property_timeline);

  const unitTypes = asArray<PropertyUnitTypeRow>(p.property_unit_types)
    .slice()
    .sort((a, b) => (a.type_name ?? "").localeCompare(b.type_name ?? ""));

  const address = fmtAddr(loc0);
  const statusValue =
    typeof p.status === "string" && isOfferingStatusValue(p.status)
      ? p.status
      : null;

  const heroImg = pickBestImageUrl(p);

  const priceMin =
    unitTypes
      .map((u) => toNumberSafe(u.price_min))
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b)[0] ?? null;

  const priceMax =
    unitTypes
      .map((u) => toNumberSafe(u.price_max))
      .filter((n): n is number => n !== null)
      .sort((a, b) => b - a)[0] ?? null;

  const moveIn = fmtYMOrYMD(timeline0?.move_in_date);

  return (
    <div className="[--oboon-shadow-card:none]">
      {/* Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <OfferingBadge type="status" value={statusValue} />
        <OfferingBadge type="region" value={loc0?.region_1depth} />
        <OfferingBadge type="propertyType" value={property.property_type} />
      </div>

      {/* Title */}
      <div className="mt-2 text-2xl font-bold text-(--oboon-text-title)">
        {p.name}
      </div>

      {/* Address / phone */}
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-(--oboon-text-muted)">
        <div className="flex items-center gap-1">
          <MapPin className="h-4 w-4" />
          <span>{address}</span>
        </div>

        {p.phone_number ? (
          <div className="flex items-center gap-1">
            <Phone className="h-4 w-4" />
            <span>{p.phone_number}</span>
          </div>
        ) : null}
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="분양가 범위"
          value={
            priceMin === null && priceMax === null
              ? UXCopy.priceRange
              : `${formatEok(priceMin)} ~ ${formatEok(priceMax)}`
          }
        />
        <StatCard
          label="총 세대수"
          value={
            specs0?.household_total
              ? `${specs0.household_total}세대`
              : UXCopy.checking
          }
        />
        <StatCard
          label="주차"
          value={
            specs0?.parking_total
              ? `${specs0.parking_total}대`
              : UXCopy.checking
          }
        />
        <StatCard label="입주 예정" value={moveIn} />
      </div>

      {/* Hero image */}
      <div className="mt-4">
        <CardBox className="overflow-hidden p-0">
          <div className="relative aspect-video w-full bg-(--oboon-bg-subtle)">
            {heroImg ? (
              <Image
                src={heroImg}
                alt={p.name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-(--oboon-text-muted)">
                {UXCopy.imagePlaceholder}
              </div>
            )}
          </div>
        </CardBox>
      </div>

      {/* Tabs (sticky) */}
      <div className="sticky top-16 z-10 -mx-5 px-5 bg-(--oboon-bg-page) py-3">
        <OfferingDetailTabs />
      </div>

      {/* Basic */}
      <div id="basic" className="mt-4 scroll-mt-32">
        <SectionTitle
          icon={<Building2 className="h-5 w-5" />}
          title="기본 정보"
          desc="판단에 필요한 현장 정보를 한 화면에서 확인합니다."
        />

        <div className="mt-3">
          <Card className="p-5">
            <div className="grid grid-cols-1 gap-y-4 md:grid-cols-2 md:gap-x-10">
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-medium text-(--oboon-text-muted)">
                    건물 유형
                  </div>
                  <div className="mt-1 text-sm font-semibold text-(--oboon-text-title)">
                    {p.property_type || UXCopy.checking}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium text-(--oboon-text-muted)">
                    주소
                  </div>
                  <div className="mt-1 text-sm font-semibold text-(--oboon-text-title)">
                    {address}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-xs font-medium text-(--oboon-text-muted)">
                    총 세대수
                  </div>
                  <div className="mt-1 text-sm font-semibold text-(--oboon-text-title)">
                    {specs0?.household_total
                      ? `${specs0.household_total}세대`
                      : UXCopy.checking}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium text-(--oboon-text-muted)">
                    주차
                  </div>
                  <div className="mt-1 text-sm font-semibold text-(--oboon-text-title)">
                    {specs0?.parking_total
                      ? `${specs0.parking_total}대`
                      : UXCopy.checking}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Memo */}
      <div id="memo" className="mt-8 scroll-mt-32">
        <SectionTitle
          icon={<Info className="h-5 w-5" />}
          title="감정평가사 메모"
          desc="등록된 항목만 노출합니다."
        />

        <div className="mt-3 space-y-3">
          <Card className="p-5">
            <div className="text-xs font-medium text-(--oboon-text-muted)">
              확정 내용
            </div>
            <div className="mt-2 whitespace-pre-wrap text-sm text-(--oboon-text-title)">
              {pickFirstNonEmpty(p.confirmed_comment) ?? UXCopy.notRegistered}
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-xs font-medium text-(--oboon-text-muted)">
              추정 내용
            </div>
            <div className="mt-2 whitespace-pre-wrap text-sm text-(--oboon-text-title)">
              {pickFirstNonEmpty(p.estimated_comment) ?? UXCopy.notRegistered}
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-xs font-medium text-(--oboon-text-muted)">
              미정 내용
            </div>
            <div className="mt-2 whitespace-pre-wrap text-sm text-(--oboon-text-title)">
              {pickFirstNonEmpty(p.pending_comment) ?? UXCopy.notRegistered}
            </div>
          </Card>
        </div>
      </div>

      {/* Prices */}
      <div id="prices" className="mt-10 scroll-mt-32">
        <SectionTitle
          icon={<BadgeCheck className="h-5 w-5" />}
          title="분양가표"
          desc="전용면적별 최소/최대 범위를 요약합니다."
        />

        <div className="mt-3">
          <Card className="p-5">
            {unitTypes.length === 0 ? (
              <div className="text-sm text-(--oboon-text-muted)">
                {UXCopy.checking}
              </div>
            ) : (
              <div className="divide-y divide-(--oboon-border-default)">
                {unitTypes.map((u) => {
                  const minEok = formatEok(toNumberSafe(u.price_min));
                  const maxEok = formatEok(toNumberSafe(u.price_max));

                  return (
                    <div
                      key={u.id}
                      className="flex items-center justify-between py-3"
                    >
                      <div className="text-sm font-semibold text-(--oboon-text-title)">
                        {u.type_name ?? UXCopy.typeCheckingShort}
                      </div>
                      <div className="text-sm text-(--oboon-text-muted)">
                        {minEok} ~ {maxEok}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Timeline */}
      <div id="timeline" className="mt-10 scroll-mt-32">
        <SectionTitle
          icon={<CalendarDays className="h-5 w-5" />}
          title="분양 일정"
          desc="공고/청약/계약/입주 핵심만 요약합니다."
        />

        <div className="mt-3">
          <Card className="p-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <StatCard
                label="모집공고"
                value={fmtYMOrYMD(timeline0?.announcement_date)}
              />
              <StatCard
                label="청약 접수"
                value={fmtRange(
                  timeline0?.application_start,
                  timeline0?.application_end
                )}
              />
              <StatCard
                label="당첨자 발표"
                value={fmtYMOrYMD(timeline0?.winner_announce)}
              />
              <StatCard
                label="계약"
                value={fmtRange(
                  timeline0?.contract_start,
                  timeline0?.contract_end
                )}
              />
              <StatCard
                label="입주 예정"
                value={fmtYMOrYMD(timeline0?.move_in_date)}
              />
            </div>

            <div className="mt-4 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-4 py-3 text-xs text-(--oboon-text-muted)">
              입주 예정일은 “YYYY-MM” 또는 “YYYY-MM-DD” 형식이 혼재할 수 있어요.
              월 단위 표기는 해당 월로 안내되는 정보를 의미합니다.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
