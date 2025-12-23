// app/company/properties/[id]/page.tsx
"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  CalendarDays,
  Image as ImageIcon,
  Landmark,
  LayoutTemplate,
  MapPin,
} from "lucide-react";
import { createSupabaseClient } from "@/lib/supabaseClient";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FormField } from "@/app/components/FormField";

const STATUS_OPTIONS = [
  { value: "ONGOING", label: "분양 중" },
  { value: "READY", label: "분양 예정" },
  { value: "CLOSED", label: "분양 마감" },
];

type PropertyRow = {
  id: number;
  name: string;
  property_type: string | null;
  phone_number: string | null;
  status: string | null;
  description: string | null;
  image_url: string | null;
};

type RelationRow = { id: number };

type SpecsRow = {
  id: number;
  sale_type?: string | null;
  trust_company?: string | null;
  developer?: string | null;
  builder?: string | null;
  land_use_zone?: string | null;
  site_area?: number | null;
  building_area?: number | null;
  building_coverage_ratio?: number | null;
  floor_area_ratio?: number | null;
  floor_ground?: number | null;
  floor_underground?: number | null;
  building_count?: number | null;
  household_total?: number | null;
  parking_total?: number | null;
  parking_per_household?: number | null;
  heating_type?: string | null;
  amenities?: string | null;
};

type TimelineRow = {
  id: number;
  announcement_date?: string | null;
  application_start?: string | null;
  application_end?: string | null;
  winner_announce?: string | null;
  contract_start?: string | null;
  contract_end?: string | null;
  move_in_date?: string | null;
};

type PropertyDetail = PropertyRow & {
  property_locations?: RelationRow[] | null;
  property_facilities?: RelationRow[] | null;
  property_specs?: SpecsRow | SpecsRow[] | null;
  property_timeline?: TimelineRow | TimelineRow[] | null;
  property_unit_types?: RelationRow[] | null;
};

type SectionStatus = "none" | "partial" | "full";

type SectionCardProps = {
  title: string;
  description: string;
  href: string;
  status: SectionStatus;
  summary?: string | null;
  icon: ComponentType<{ className?: string }>;
};

type Completion = {
  siteLocationStatus: SectionStatus;
  facilityStatus: SectionStatus;
  specsStatus: SectionStatus;
  timelineStatus: SectionStatus;
  unitStatus: SectionStatus;
};

function SectionCard({
  title,
  description,
  href,
  status,
  summary,
  icon: Icon,
}: SectionCardProps) {
  const statusLabel =
    status === "full" ? "완료" : status === "partial" ? "입력중" : "미입력";
  return (
    <div
      className={[
        "flex flex-col gap-3 rounded-xl border p-4",
        "bg-(--oboon-bg-surface) border-(--oboon-border-default)",
        "shadow-none transition hover:-translate-y-[1px] hover:shadow-(--oboon-shadow-card)",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className="rounded-lg bg-(--oboon-bg-subtle) p-2 text-(--oboon-text-muted)">
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-(--oboon-text-title)">
              {title}
            </span>
            <span className="text-xs text-(--oboon-text-muted)">
              {description}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="status" className="text-[11px]">
            {statusLabel}
          </Badge>
          <Link href={href} className="inline-flex">
            <Button variant="secondary" size="sm" shape="pill" className="px-2">
              편집
            </Button>
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-subtle)/50 px-3 py-2 text-sm text-(--oboon-text-muted)">
        {status !== "none" && summary ? summary : "아직 입력된 정보가 없어요"}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-(--oboon-bg-subtle)/50 px-3 py-3">
      <span className="text-xs font-medium text-(--oboon-text-muted)">
        {label}
      </span>
      <span className="text-sm font-medium text-(--oboon-text-title)">
        {value || "-"}
      </span>
    </div>
  );
}

export default function PropertyDetailPage() {
  const supabase = createSupabaseClient();
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [showFullDesc, setShowFullDesc] = useState(false);

  const [data, setData] = useState<PropertyDetail | null>(null);
  const [form, setForm] = useState<PropertyRow | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    const { data, error } = await supabase
      .from("properties")
      .select(
        `
        id,
        name,
        property_type,
        phone_number,
        status,
        description,
        image_url,
        property_locations(id),
        property_facilities(id),
        property_specs!properties_id(
          id,
          sale_type,
          trust_company,
          developer,
          builder,
          land_use_zone,
          site_area,
          building_area,
          building_coverage_ratio,
          floor_area_ratio,
          floor_ground,
          floor_underground,
          building_count,
          household_total,
          parking_total,
          parking_per_household,
          heating_type,
          amenities
        ),
        property_timeline(
          id,
          announcement_date,
          application_start,
          application_end,
          winner_announce,
          contract_start,
          contract_end,
          move_in_date
        ),
        property_unit_types(id)
      `
      )
      .eq("id", id)
      .single();

    if (!error && data) {
      setData(data as PropertyDetail);
      setForm({
        id: data.id,
        name: data.name,
        property_type: data.property_type,
        phone_number: data.phone_number,
        status: data.status,
        description: data.description,
        image_url: data.image_url,
      });
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  const completion = useMemo<Completion | null>(() => {
    if (!data) return null;

    const hasMany = (v?: RelationRow[] | null) =>
      Array.isArray(v) && v.length > 0;
    const statusFromValues = (
      vals: (string | number | null | undefined)[]
    ): SectionStatus => {
      const filled = vals.filter(
        (v) => v !== null && v !== undefined && v !== ""
      ).length;
      if (filled === 0) return "none";
      if (filled === vals.length) return "full";
      return "partial";
    };

    const specsRow = Array.isArray(data.property_specs)
      ? data.property_specs[0]
      : data.property_specs ?? null;

    const timelineRow = Array.isArray(data.property_timeline)
      ? data.property_timeline[0]
      : data.property_timeline ?? null;

    const specsStatus = specsRow
      ? statusFromValues([
          specsRow.sale_type,
          specsRow.trust_company,
          specsRow.developer,
          specsRow.builder,
          specsRow.land_use_zone,
          specsRow.site_area,
          specsRow.building_area,
          specsRow.building_coverage_ratio,
          specsRow.floor_area_ratio,
          specsRow.floor_ground,
          specsRow.floor_underground,
          specsRow.building_count,
          specsRow.household_total,
          specsRow.parking_total,
          specsRow.parking_per_household,
          specsRow.heating_type,
          specsRow.amenities,
        ])
      : "none";

    const timelineStatus = timelineRow
      ? statusFromValues([
          timelineRow.announcement_date,
          timelineRow.application_start,
          timelineRow.application_end,
          timelineRow.winner_announce,
          timelineRow.contract_start,
          timelineRow.contract_end,
          timelineRow.move_in_date,
        ])
      : "none";

    const unitStatus =
      Array.isArray(data.property_unit_types) &&
      data.property_unit_types.length > 0
        ? "full"
        : "none";

    return {
      siteLocationStatus: hasMany(data.property_locations) ? "full" : "none",
      facilityStatus: hasMany(data.property_facilities) ? "full" : "none",
      specsStatus,
      timelineStatus,
      unitStatus,
    };
  }, [data]);

  async function saveBasicInfo() {
    if (!form) return;
    setSaving(true);

    const { error } = await supabase
      .from("properties")
      .update({
        name: form.name,
        property_type: form.property_type || null,
        phone_number: form.phone_number || null,
        status: form.status || null,
        description: form.description || null,
        image_url: form.image_url || null,
      })
      .eq("id", id);

    setSaving(false);

    if (error) {
      alert("저장 실패: " + error.message);
      return;
    }

    setEditMode(false);
    await load();
  }

  async function handleDelete() {
    if (!confirm("정말 현장을 삭제할까요?\n복구할 수 없어요.")) return;

    try {
      await supabase
        .from("property_locations")
        .delete()
        .eq("properties_id", id);
      await supabase
        .from("property_facilities")
        .delete()
        .eq("properties_id", id);
      await supabase.from("property_specs").delete().eq("properties_id", id);
      await supabase.from("property_timeline").delete().eq("properties_id", id);
      await supabase
        .from("property_unit_types")
        .delete()
        .eq("properties_id", id);
      await supabase.from("properties").delete().eq("id", id);

      router.push("/company/properties");
    } catch (err: any) {
      alert("삭제 실패: " + err.message);
    }
  }

  if (loading)
    return (
      <div className="p-6 text-sm text-(--oboon-text-muted)">
        불러오는 중...
      </div>
    );
  if (!data || !form)
    return (
      <div className="p-6 text-sm text-(--oboon-text-muted)">
        데이터가 없어요
      </div>
    );

  const c = completion!;
  const statusLabel =
    STATUS_OPTIONS.find((s) => s.value === data.status)?.label ?? "상태 미정";
  const statusList = [
    c.siteLocationStatus,
    c.specsStatus,
    c.timelineStatus,
    c.unitStatus,
    c.facilityStatus,
  ];
  const completedCount = statusList.filter((s) => s !== "none").length;
  const totalSections = statusList.length;
  const progressPercent = Math.round((completedCount / totalSections) * 100);

  return (
    <div className="bg-(--oboon-bg-page) px-4 py-6 md:px-6 md:py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <div className="space-y-1 pt-1">
              <p className="text-2xl font-bold text-(--oboon-text-title)">
                현장 상세
              </p>
              <p className="text-sm text-(--oboon-text-muted)">
                이 현장의 핵심 정보와 입력 상태를 한눈에 확인해요
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="status" className="text-[11px]">
              {statusLabel}
            </Badge>
            {!editMode ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  shape="pill"
                  onClick={() => router.push("/company/properties")}
                >
                  취소
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  shape="pill"
                  className="text-red-500"
                  onClick={handleDelete}
                >
                  삭제
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  shape="pill"
                  onClick={() => {
                    setForm({
                      id: data.id,
                      name: data.name,
                      property_type: data.property_type,
                      phone_number: data.phone_number,
                      status: data.status,
                      description: data.description,
                      image_url: data.image_url,
                    });
                    setEditMode(false);
                  }}
                >
                  취소
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  shape="pill"
                  className="text-red-500"
                  onClick={handleDelete}
                >
                  삭제
                </Button>
              </>
            )}
          </div>
        </header>

        <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-3 py-2">
          <div className="flex items-center justify-between text-xs text-(--oboon-text-muted)">
            <span>
              입력 완료 {completedCount} / {totalSections}
            </span>
            <span className="text-(--oboon-text-title)">
              {progressPercent}%
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-(--oboon-border-default)/35">
            <div
              className="h-full rounded-full bg-(--oboon-primary) transition-[width] duration-300"
              style={{
                width: `${progressPercent}%`,
                minWidth: progressPercent > 0 ? "8px" : "0px",
              }}
            />
          </div>
        </div>

        <section className="space-y-3 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-6 py-5 md:px-6 md:py-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-(--oboon-text-title)">
              기본 정보
            </h2>
            {!editMode ? (
              <Button
                variant="secondary"
                size="sm"
                shape="pill"
                onClick={() => setEditMode(true)}
              >
                편집
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  shape="pill"
                  onClick={() => {
                    setForm({
                      id: data.id,
                      name: data.name,
                      property_type: data.property_type,
                      phone_number: data.phone_number,
                      status: data.status,
                      description: data.description,
                      image_url: data.image_url,
                    });
                    setEditMode(false);
                  }}
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  shape="pill"
                  onClick={saveBasicInfo}
                  loading={saving}
                >
                  저장
                </Button>
              </div>
            )}
          </div>

          {!editMode ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="md:col-span-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                <InfoRow label="현장명" value={data.name} />
                <InfoRow label="연락처" value={data.phone_number ?? "-"} />
                <InfoRow label="분양 유형" value={data.property_type ?? "-"} />
                <InfoRow label="분양 상태" value={statusLabel} />
              </div>
              <div className="relative flex flex-wrap items-start gap-3 rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-subtle)/40 p-3">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border border-(--oboon-border-default) bg-(--oboon-bg-subtle)">
                  {data.image_url ? (
                    <img
                      src={data.image_url}
                      alt="대표 이미지"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-(--oboon-text-muted)" />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1 pt-3">
                  <p className="text-xs text-(--oboon-text-muted)">
                    대표 이미지
                  </p>
                  <p className="text-sm font-medium text-(--oboon-text-title) whitespace-nowrap">
                    {data.image_url
                      ? "이미지가 등록되어 있어요"
                      : "등록된 이미지가 없어요"}
                  </p>
                </div>
              </div>
              <div className="md:col-span-3">
                <div className="rounded-lg bg-(--oboon-bg-subtle)/40 px-3 py-2">
                  <p className="text-xs font-medium text-(--oboon-text-muted)">
                    설명
                  </p>

                  <p
                    className={`mt-2 text-sm leading-relaxed text-(--oboon-text-title) ${
                      showFullDesc ? "" : "line-clamp-3"
                    }`}
                  >
                    {data.description || "설명이 없습니다"}
                  </p>

                  {data.description && data.description.length > 80 && (
                    <button
                      type="button"
                      className="mt-3 text-xs font-medium text-(--oboon-text-muted) underline"
                      onClick={() => setShowFullDesc((v) => !v)}
                    >
                      {showFullDesc ? "접기" : "더보기"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="현장명">
                <input
                  className="input-basic rounded-md border border-(--oboon-border-default) bg-(--oboon-bg-subtle)/70 px-3 py-2 transition focus:border-(--oboon-accent) focus:outline-none focus:ring-2 focus:ring-(--oboon-accent)/50"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </FormField>

              <FormField label="연락처">
                <input
                  className="input-basic rounded-md border border-(--oboon-border-default) bg-(--oboon-bg-subtle)/70 px-3 py-2 transition focus:border-(--oboon-accent) focus:outline-none focus:ring-2 focus:ring-(--oboon-accent)/50"
                  value={form.phone_number ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, phone_number: e.target.value })
                  }
                />
              </FormField>

              <FormField label="분양 유형">
                <input
                  className="input-basic rounded-md border border-(--oboon-border-default) bg-(--oboon-bg-subtle)/70 px-3 py-2 transition focus:border-(--oboon-accent) focus:outline-none focus:ring-2 focus:ring-(--oboon-accent)/50"
                  value={form.property_type ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, property_type: e.target.value })
                  }
                />
              </FormField>

              <FormField label="분양 상태">
                <select
                  className="input-basic rounded-md border border-(--oboon-border-default) bg-(--oboon-bg-subtle)/70 px-3 py-2 transition focus:border-(--oboon-accent) focus:outline-none focus:ring-2 focus:ring-(--oboon-accent)/50"
                  value={form.status ?? ""}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="">선택</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="설명" className="md:col-span-2">
                <textarea
                  className="input-basic min-h-[100px] rounded-md border border-(--oboon-border-default) bg-(--oboon-bg-subtle)/70 px-3 py-2 transition focus:border-(--oboon-accent) focus:outline-none focus:ring-2 focus:ring-(--oboon-accent)/50"
                  value={form.description ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </FormField>

              <FormField label="대표 이미지 URL" className="md:col-span-2">
                <input
                  className="input-basic rounded-md border border-(--oboon-border-default) bg-(--oboon-bg-subtle)/70 px-3 py-2 transition focus:border-(--oboon-accent) focus:outline-none focus:ring-2 focus:ring-(--oboon-accent)/50"
                  value={form.image_url ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, image_url: e.target.value })
                  }
                />
              </FormField>
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SectionCard
            title="현장 위치"
            description="주소 입력 및 위치 확인"
            status={c.siteLocationStatus}
            summary={
              c.siteLocationStatus !== "none" ? "주소가 등록되어 있어요" : null
            }
            href={`/company/properties/${id}/location`}
            icon={MapPin}
          />
          <SectionCard
            title="건물 스펙"
            description="규모, 구조, 주차 등 주요 스펙"
            status={c.specsStatus}
            summary={
              c.specsStatus !== "none"
                ? "건물 스펙 정보가 등록되어 있어요"
                : null
            }
            href={`/company/properties/${id}/specs`}
            icon={Building2}
          />
          <SectionCard
            title="일정"
            description="착공, 분양, 입주 등 주요 일정"
            status={c.timelineStatus}
            summary={
              c.timelineStatus !== "none"
                ? "주요 일정 정보가 등록되어 있어요"
                : null
            }
            href={`/company/properties/${id}/timeline`}
            icon={CalendarDays}
          />
          <SectionCard
            title="평면 타입"
            description="유형별 평면/전용면적 입력"
            status={c.unitStatus}
            summary={
              c.unitStatus !== "none"
                ? "평면 타입 정보가 등록되어 있어요"
                : null
            }
            href={`/company/properties/${id}/units`}
            icon={LayoutTemplate}
          />
          <SectionCard
            title="홍보시설"
            description="모델하우스 등 홍보/운영 정보"
            status={c.facilityStatus}
            summary={
              c.facilityStatus !== "none"
                ? "홍보시설 정보가 등록되어 있어요"
                : null
            }
            href={`/company/properties/${id}/facilities`}
            icon={Landmark}
          />
        </section>
      </div>
    </div>
  );
}
