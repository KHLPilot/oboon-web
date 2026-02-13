"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { UXCopy } from "@/shared/uxCopy";

import OfferingCard from "@/features/offerings/components/OfferingCard";
import { fetchPropertiesForOfferings } from "@/features/offerings/services/offering.query";
import {
  mapPropertyRowToOffering,
  hasAppraiserComment,
  type PropertyRow,
} from "@/features/offerings/mappers/offering.mapper";
import { OFFERING_REGION_TABS } from "@/features/offerings/domain/offering.constants";
import type { OfferingRegionTab } from "@/features/offerings/domain/offering.types";

import { createSupabaseClient } from "@/lib/supabaseClient";
import type { Offering } from "@/types/index";
import { toKoreanErrorMessage } from "@/shared/errorMessage";

export default function HomeOfferingsSection() {
  const supabase = useMemo(() => createSupabaseClient(), []);

  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [consultablePropertyIds, setConsultablePropertyIds] = useState<number[]>(
    [],
  );
  const [selectedRegion, setSelectedRegion] =
    useState<OfferingRegionTab>("전체");

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await fetchPropertiesForOfferings(supabase, {
        limit: 24,
      });

      if (!mounted) return;

      if (error) {
        setLoadError(toKoreanErrorMessage(error, "데이터를 불러오지 못했어요."));
        setRows([]);
        return;
      }

      setLoadError(null);
      const nextRows = (data ?? []) as PropertyRow[];
      setRows(nextRows);

      const propertyIds = nextRows
        .map((row) => Number(row.id))
        .filter((id) => Number.isFinite(id));

      if (propertyIds.length === 0) {
        setConsultablePropertyIds([]);
        return;
      }

      const { data: propertyAgents, error: agentError } = await supabase
        .from("property_agents")
        .select("property_id")
        .in("property_id", propertyIds)
        .eq("status", "approved");

      if (agentError) {
        console.error("[home consultable properties] load error:", agentError);
        setConsultablePropertyIds([]);
        return;
      }

      const uniqueIds = [
        ...new Set(
          (propertyAgents ?? [])
            .map((row) => Number(row.property_id))
            .filter((id) => Number.isFinite(id)),
        ),
      ];
      setConsultablePropertyIds(uniqueIds);
    })();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const fallback = useMemo(
    () => ({
      addressShort: UXCopy.addressShort,
      regionShort: UXCopy.regionShort,
    }),
    [],
  );

  const offerings: Offering[] = useMemo(
    () => rows.map((row) => mapPropertyRowToOffering(row, fallback)),
    [rows, fallback],
  );

  const reviewOfferings: Offering[] = useMemo(() => {
    return rows
      .filter(hasAppraiserComment)
      .map((row) => mapPropertyRowToOffering(row, fallback));
  }, [rows, fallback]);

  const consultableOfferings: Offering[] = useMemo(() => {
    const idSet = new Set(consultablePropertyIds);
    return offerings.filter((offering) => idSet.has(Number(offering.id)));
  }, [consultablePropertyIds, offerings]);

  const popularOfferings: Offering[] = useMemo(() => {
    const base =
      selectedRegion === "전체"
        ? offerings
        : offerings.filter((o) => o.region === selectedRegion);

    return base;
  }, [offerings, selectedRegion]);

  return (
    <>
      {/* 상담 신청 가능 현장 */}
      <section className="mt-8 sm:mt-10 flex flex-col gap-2">
        <SectionHeader
          title="상담 신청 가능 현장"
          caption="상담사 연결이 완료되어 바로 상담 예약이 가능한 현장입니다."
          rightLink={{ href: "/offerings", label: "전체보기" }}
        />

        {consultableOfferings.length === 0 ? (
          <Card className="p-6 ob-typo-body text-(--oboon-text-muted)">
            지금은 상담 신청 가능한 현장이 아직 없어요.
          </Card>
        ) : (
          <ResponsiveOfferingRow items={consultableOfferings} />
        )}
      </section>

      {/* 감정평가사 한줄평 */}
      <section className="mt-8 sm:mt-10 flex flex-col gap-2">
        <SectionHeader
          title="감정평가사 한줄평"
          caption="전문가들이 직접 남긴 솔직한 평가를 확인해보세요."
          rightLink={{ href: "/offerings", label: "전체보기" }}
        />

        {loadError && (
          <div className="ob-typo-caption text-(--oboon-danger)">
            데이터를 불러오지 못했어요. ({loadError})
          </div>
        )}

        {reviewOfferings.length === 0 ? (
          <Card className="p-6 ob-typo-body text-(--oboon-text-muted)">
            아직 등록된 감정평가사 한줄평이 없어요.
          </Card>
        ) : (
          <ResponsiveOfferingRow items={reviewOfferings} />
        )}
      </section>

      {/* 지역별 인기 분양 */}
      <section className="mt-8 sm:mt-10 flex flex-col gap-2">
        <SectionHeader
          title="지역별 인기 분양"
          caption="지역별로 인기있는 분양 현장을 확인해보세요."
        />
        <div>
          <RegionFilterRow
            value={selectedRegion}
            onChange={setSelectedRegion}
          />
        </div>

        <div className="mt-3">
          {popularOfferings.length === 0 ? (
            <Card className="p-6 ob-typo-body text-(--oboon-text-muted)">
              선택한 지역에서 보여줄 분양이 아직 없어요.
            </Card>
          ) : (
            <ResponsiveOfferingRow items={popularOfferings} />
          )}
        </div>
      </section>
    </>
  );
}

function SectionHeader({
  title,
  caption,
  rightLink,
}: {
  title: string;
  caption?: string;
  rightLink?: { href: string; label: string };
}) {
  return (
    <div className="mb-3 sm:mb-4 flex items-baseline justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="ob-typo-h2 text-(--oboon-text-title)">{title}</h2>
        {caption && (
          <p className="ob-typo-caption text-(--oboon-text-muted)">{caption}</p>
        )}
      </div>

      {rightLink ? (
        <Link
          href={rightLink.href}
          className="shrink-0 ob-typo-caption text-(--oboon-text-muted) hover:text-(--oboon-primary)"
        >
          {rightLink.label}
        </Link>
      ) : null}
    </div>
  );
}

function ProjectRow({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
  );
}

function ResponsiveOfferingRow({ items }: { items: Offering[] }) {
  return (
    <>
      {/* Mobile */}
      <div className="sm:hidden">
        {/* PageContainer(px-4) 밖으로 빼서 스크롤이 화면 끝까지 자연스럽게 */}
        <div className="-mx-4">
          <div className="relative">
            <div
              className={[
                "flex gap-3 overflow-x-auto pb-3 px-4",
                "snap-x snap-mandatory",
                "[-webkit-overflow-scrolling:touch]",
                "scrollbar-none",
                "scroll-pl-4 scroll-pr-4",
              ].join(" ")}
            >
              {items.map((offering) => (
                <div key={offering.id} className="w-70 shrink-0 snap-start">
                  <OfferingCard offering={offering} />
                </div>
              ))}

              <div className="shrink-0 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop/Tablets: grid */}
      <div className="hidden sm:block">
        <ProjectRow>
          {items.map((offering) => (
            <OfferingCard key={offering.id} offering={offering} />
          ))}
        </ProjectRow>
      </div>
    </>
  );
}

function RegionFilterRow({
  value,
  onChange,
}: {
  value: OfferingRegionTab;
  onChange: (v: OfferingRegionTab) => void;
}) {
  return (
    <>
      {/* Mobile: horizontal scroll chips */}
      <div className="sm:hidden -mx-4 pl-4">
        <div className="flex gap-2 overflow-x-auto pb-2 pr-4 [-webkit-overflow-scrolling:touch] scrollbar-none">
          {OFFERING_REGION_TABS.map((region) => {
            const isActive = value === region;
            return (
              <Button
                key={region}
                type="button"
                size="sm"
                shape="pill"
                variant={isActive ? "primary" : "secondary"}
                onClick={() => onChange(region)}
                className="shrink-0"
                aria-pressed={isActive}
              >
                {region}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Tablet/Desktop: 기존 버튼 UI 유지 */}
      <div className="hidden sm:flex flex-wrap gap-2">
        {OFFERING_REGION_TABS.map((region) => {
          const isActive = value === region;
          return (
            <Button
              key={region}
              type="button"
              size="sm"
              shape="pill"
              variant={isActive ? "primary" : "secondary"}
              onClick={() => onChange(region)}
            >
              {region}
            </Button>
          );
        })}
      </div>
    </>
  );
}
