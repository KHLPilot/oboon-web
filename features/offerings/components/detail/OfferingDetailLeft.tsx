// features/offerings/detail/OfferingDetailLeft.tsx
import type { ReactNode } from "react";
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Info,
  MapPin,
} from "lucide-react";

import Card from "@/components/ui/Card";
import OfferingDetailTabs from "@/features/offerings/components/detail/OfferingDetailTabs.client";
import OfferingUnitTypesAccordion from "./offeringTypesAccordion.client";
import PropertyImageGallery from "./PropertyImageGallery.client";
import { UXCopy } from "@/shared/uxCopy";
import OfferingBadge from "@/features/offerings/components/OfferingBadges";
import { isOfferingStatusValue } from "@/features/offerings/domain/offering.constants";
import { formatPriceRange } from "@/shared/price";

/* ---------------- Types (최소 필요만) ---------------- */

export type PropertyRow = {
  id: number;
  created_at: string;
  name: string;
  property_type: string;
  status: string | null;
  description: string | null;
  image_url: string | null;
  floor_plan_url: string | null;

  confirmed_comment: string | null;
  estimated_comment: string | null;
  pending_comment: string | null;

  property_locations: PropertyLocationRow[] | PropertyLocationRow | null;
  property_specs: PropertySpecRow[] | PropertySpecRow | null;
  property_timeline: PropertyTimelineRow[] | PropertyTimelineRow | null;
  property_unit_types: PropertyUnitTypeRow[] | PropertyUnitTypeRow | null;
  property_gallery_images?:
    | PropertyGalleryImageRow[]
    | PropertyGalleryImageRow
    | null;
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
  is_price_public?: boolean | null;
  floor_plan_url: string | null;
  image_url: string | null;
  exclusive_area: number | null;
  supply_area: number | null;
  rooms: number | null;
  bathrooms: number | null;
  building_layout: string | null;
  orientation: string | null;
  unit_count: number | null;
  supply_count: number | null;
};

type PropertyGalleryImageRow = {
  id: string;
  property_id: number;
  image_url: string;
  sort_order: number;
  created_at: string;
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
  if (!u) return false;
  if (u.startsWith("data:image/")) return true;
  return /\.(jpg|jpeg|png|webp|gif|avif|svg)(\?.*)?$/i.test(u);
}

function pickHeroImageUrl(p: PropertyRow) {
  if (isLikelyImageUrl(p.image_url)) return p.image_url;

  const unitTypes = asArray<PropertyUnitTypeRow>(p.property_unit_types);
  const fallback = unitTypes.find((u) =>
    isLikelyImageUrl(u.image_url)
  )?.image_url;
  return fallback ?? null;
}

function buildGalleryImageUrls(p: PropertyRow) {
  const hero = pickHeroImageUrl(p);
  const galleryRows = asArray<PropertyGalleryImageRow>(p.property_gallery_images)
    .slice()
    .sort((a, b) => {
      if ((a.sort_order ?? 0) !== (b.sort_order ?? 0)) {
        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      }
      return (a.created_at ?? "").localeCompare(b.created_at ?? "");
    });

  const urls = [hero, ...galleryRows.map((row) => row.image_url)].filter(
    (url): url is string => isLikelyImageUrl(url),
  );

  return Array.from(new Set(urls));
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
        <div className="ob-typo-h3 text-(--oboon-text-title)">{title}</div>
        {desc ? (
          <div className="ob-typo-caption text-(--oboon-text-muted)">
            {desc}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <CardBox className="p-0">
      <div className="px-4 py-3">
        <div className="ob-typo-caption text-(--oboon-text-muted)">{label}</div>
        <div className="mt-1 ob-typo-h4 text-(--oboon-text-title)">{value}</div>
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

  const hasPrivatePriceUnits = unitTypes.some((u) => u.is_price_public === false);
  const hasPublicPriceUnits = unitTypes.some((u) => u.is_price_public !== false);
  const isPricePrivate = hasPrivatePriceUnits && !hasPublicPriceUnits;

  const address = fmtAddr(loc0);
  const statusValue =
    typeof p.status === "string" && isOfferingStatusValue(p.status)
      ? p.status
      : null;

  const galleryImageUrls = buildGalleryImageUrls(p);

  const priceMin =
    unitTypes
      .filter((u) => u.is_price_public !== false)
      .map((u) => u.price_min)
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b)[0] ?? null;

  const priceMax =
    unitTypes
      .filter((u) => u.is_price_public !== false)
      .map((u) => u.price_max)
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
      <div className="mt-2 px-1 ob-typo-h1 text-(--oboon-text-title)">
        {p.name}
      </div>

      {/* Address */}
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 ob-typo-body text-(--oboon-text-muted)">
        <div className="flex items-center gap-1">
          <MapPin className="h-4 w-4" />
          <span>{address}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="분양가 범위"
          value={formatPriceRange(priceMin, priceMax, {
            unknownLabel: isPricePrivate
              ? UXCopy.pricePrivate
              : UXCopy.priceRange,
          })}
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
          label="세대 당 주차대수"
          value={
            specs0?.parking_total
              ? `${specs0.parking_total}대`
              : UXCopy.checking
          }
        />
        <StatCard label="입주 예정" value={moveIn} />
      </div>

      {/* Hero image + additional images */}
      <div className="mt-4">
        <PropertyImageGallery
          imageUrls={galleryImageUrls}
          title={p.name}
          placeholderText={UXCopy.imagePlaceholder}
        />
      </div>

      {/* Tabs (sticky) */}
      <div
        className={[
          "sticky top-16 z-20",
          "mx-0 mt-8 md:-mx-5 md:px-5 py-3",
          "isolate",
          "bg-(--oboon-bg-default)",
        ].join(" ")}
      >
        <OfferingDetailTabs />
      </div>

      {/* Basic */}
      <div id="basic" className="mt-4 scroll-mt-30 lg:scroll-mt-30">
        <SectionTitle
          icon={<Building2 className="h-5 w-5" />}
          title="기본 정보"
          desc="판단에 필요한 현장 정보를 한 화면에서 확인합니다."
        />

        <div className="mt-3">
          <Card className="px-5 py-3">
            <div className="grid grid-cols-1 gap-y-4 md:grid-cols-2 md:gap-x-10">
              <div className="space-y-3">
                <div>
                  <div className="ob-typo-caption text-(--oboon-text-muted)">
                    건물 유형
                  </div>
                  <div className="mt-1 ob-typo-h4 text-(--oboon-text-title)">
                    {p.property_type || UXCopy.checking}
                  </div>
                </div>

                <div>
                  <div className="ob-typo-caption text-(--oboon-text-muted)">
                    주소
                  </div>
                  <div className="mt-1 ob-typo-h4 text-(--oboon-text-title)">
                    {address}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="ob-typo-caption text-(--oboon-text-muted)">
                    총 세대수
                  </div>
                  <div className="mt-1 ob-typo-h4 text-(--oboon-text-title)">
                    {specs0?.household_total
                      ? `${specs0.household_total}세대`
                      : UXCopy.checking}
                  </div>
                </div>

                <div>
                  <div className="ob-typo-caption text-(--oboon-text-muted)">
                    세대 당 주차대수
                  </div>
                  <div className="mt-1 ob-typo-h4 text-(--oboon-text-title)">
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
      <div id="memo" className="mt-10 scroll-mt-30 lg:scroll-mt-30">
        <SectionTitle
          icon={<Info className="h-5 w-5" />}
          title="감정평가사 메모"
          desc="등록된 항목만 노출합니다."
        />

        <div className="mt-3 space-y-3">
          <Card className="px-5 py-3">
            <div className="ob-typo-caption text-(--oboon-text-muted)">
              확정 내용
            </div>
            <div className="mt-2 whitespace-pre-wrap ob-typo-h4 text-(--oboon-text-title)">
              {pickFirstNonEmpty(p.confirmed_comment) ?? UXCopy.notRegistered}
            </div>
          </Card>

          <Card className="px-5 py-3">
            <div className="ob-typo-caption text-(--oboon-text-muted)">
              추정 내용
            </div>
            <div className="mt-2 whitespace-pre-wrap ob-typo-h4 text-(--oboon-text-title)">
              {pickFirstNonEmpty(p.estimated_comment) ?? UXCopy.notRegistered}
            </div>
          </Card>

          <Card className="px-5 py-3">
            <div className="ob-typo-caption text-(--oboon-text-muted)">
              미정 내용
            </div>
            <div className="mt-2 whitespace-pre-wrap ob-typo-h4 text-(--oboon-text-title)">
              {pickFirstNonEmpty(p.pending_comment) ?? UXCopy.notRegistered}
            </div>
          </Card>
        </div>
      </div>

      {/* Prices */}
      <div id="prices" className="mt-10 scroll-mt-30 lg:scroll-mt-30">
        <SectionTitle
          icon={<BadgeCheck className="h-5 w-5" />}
          title="분양가표"
          desc="전용면적별 최소/최대 범위를 요약합니다."
        />

        <div className="mt-3">
          <Card className="p-3">
            <OfferingUnitTypesAccordion
              unitTypes={unitTypes}
              emptyText={UXCopy.checking}
              imagePlaceholderText={UXCopy.imagePlaceholder}
            />
          </Card>
        </div>
      </div>

      {/* Timeline */}
      <div id="timeline" className="mt-10 scroll-mt-30 lg:scroll-mt-30">
        <SectionTitle
          icon={<CalendarDays className="h-5 w-5" />}
          title="분양 일정"
          desc="공고/청약/계약/입주 핵심만 요약합니다."
        />

        <div className="mt-3">
          <Card className="p-3">
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

            <div className="mt-2 px-2 py-1 ob-typo-caption text-(--oboon-text-muted)">
              입주 예정일은 &quot;년도-월&quot; 또는 &quot;년도-월-일&quot; 형식이 혼재할 수 있어요.
              <br />월 단위 표기는 해당 월로 안내되는 정보를 의미합니다.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
