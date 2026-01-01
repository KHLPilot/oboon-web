"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
  Loader2,
} from "lucide-react";

import { createSupabaseClient } from "@/lib/supabaseClient";

import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";

import { FormField } from "@/app/components/FormField";

import PropertyStatusSelect from "@/app/company/properties/PropertyStatusSelect";
import {
  PROPERTY_STATUS_LABEL,
  PROPERTY_STATUS_OPTIONS,
  isPropertyStatus,
} from "@/app/company/properties/propertyStatus";
import { getPropertySectionStatus } from "@/features/property/mappers/propertyProgress";

/* ==================================================
   타입 정의
================================================== */
type PropertyRow = {
  id: number;
  name: string;
  property_type: string | null;
  phone_number: string | null;
  status: string | null;
  description: string | null;
  image_url: string | null;
  confirmed_note: string | null;
  estimated_note: string | null;
  undecided_note: string | null;
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

/* ==================================================
   하위 컴포넌트
================================================== */

// 섹션별 진행 상태 카드
function SectionCard({
  title,
  description,
  href,
  status,
  summary,
  icon: Icon,
}: {
  title: string;
  description: string;
  href: string;
  status: SectionStatus;
  summary?: string | null;
  icon: ComponentType<{ className?: string }>;
}) {
  const statusLabel = status === "full" ? "완료" : status === "partial" ? "입력중" : "미입력";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4 transition hover:-translate-y-px hover:shadow-(--oboon-shadow-card)">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className="rounded-lg bg-(--oboon-bg-subtle) p-2 text-(--oboon-text-muted)">
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-(--oboon-text-title)">{title}</span>
            <span className="text-xs text-(--oboon-text-muted)">{description}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="status" className="text-[11px]">{statusLabel}</Badge>
          <Link href={href}>
            <Button variant="secondary" size="sm" shape="pill" className="px-2">편집</Button>
          </Link>
        </div>
      </div>
      <div className="rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-subtle)/50 px-3 py-2 text-sm text-(--oboon-text-muted)">
        {status !== "none" && summary ? summary : "아직 입력된 정보가 없어요"}
      </div>
    </div>
  );
}

// 읽기 모드 전용 정보 로우
function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-(--oboon-bg-subtle)/50 px-3 py-3">
      <span className="text-xs font-medium text-(--oboon-text-muted)">{label}</span>
      <span className="text-sm font-medium text-(--oboon-text-title)">{value || "-"}</span>
    </div>
  );
}

/* ==================================================
   메인 페이지
================================================== */
export default function PropertyDetailPage() {
  const supabase = createSupabaseClient();
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  // 상태 관리
  const [data, setData] = useState<PropertyDetail | null>(null);
  const [form, setForm] = useState<PropertyRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 데이터 로드
  const load = useCallback(async () => {
    setLoading(true);
    const { data: res, error } = await supabase
      .from("properties")
      .select(`
        *,
        property_locations(id),
        property_facilities(id),
        property_specs!properties_id(*),
        property_timeline(*),
        property_unit_types(id)
      `)
      .eq("id", id)
      .single();

    if (!error && res) {
      setData(res as PropertyDetail);
      setForm({
        id: res.id,
        name: res.name,
        property_type: res.property_type,
        phone_number: res.phone_number,
        status: res.status,
        description: res.description,
        image_url: res.image_url,
        confirmed_note: res.confirmed_note,
        estimated_note: res.estimated_note,
        undecided_note: res.undecided_note,
      });
    }
    setLoading(false);
  }, [id, supabase]);

  useEffect(() => { load(); }, [load]);

  // 진행도 계산
  const { completion, progressPercent, incompleteSectionNames } = useMemo(() => {
    if (!data) return { completion: null, progressPercent: 0, incompleteSectionNames: [] };

    const status = getPropertySectionStatus(data);
    const sections = [
      { name: "현장 위치", status: status.siteLocationStatus },
      { name: "건물 스펙", status: status.specsStatus },
      { name: "일정", status: status.timelineStatus },
      { name: "평면 타입", status: status.unitStatus },
      { name: "홍보시설", status: status.facilityStatus },
    ];

    const completedCount = sections.filter(s => s.status === "full").length;
    const partialCount = sections.filter(s => s.status === "partial").length;

    // 완료(full)가 아닌 것들만 이름을 모읍니다.
    const incompleteNames = sections
      .filter(s => s.status !== "full")
      .map(s => s.name);

    const percent = Math.round(((completedCount + partialCount * 0.5) / sections.length) * 100);

    return {
      completion: status,
      progressPercent: percent,
      incompleteSectionNames: incompleteNames
    };
  }, [data]);

  // 기본 정보 저장
  async function saveBasicInfo() {
    if (!form) return;
    setSaving(true);
    const { error } = await supabase.from("properties").update({ ...form }).eq("id", id);
    setSaving(false);

    if (error) return alert("저장 실패: " + error.message);

    setLocalPreview(null);
    setEditMode(false);
    load();
  }

  // 삭제 처리
  async function handleDelete() {
    if (!confirm("정말 현장을 삭제할까요?\n복구할 수 없어요.")) return;
    try {
      const tables = ["property_locations", "property_facilities", "property_specs", "property_timeline", "property_unit_types"];
      for (const table of tables) {
        await supabase.from(table).delete().eq("properties_id", id);
      }
      await supabase.from("properties").delete().eq("id", id);
      router.push("/company/properties");
    } catch (err) {
      alert("삭제 실패: " + (err instanceof Error ? err.message : "알 수 없는 오류"));
    }
  }

  // 이미지 업로드
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !form) return;

    if (file.size > 5 * 1024 * 1024) return alert("이미지는 5MB 이하만 가능합니다.");

    setLocalPreview(URL.createObjectURL(file));

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("propertyId", String(id));

      const res = await fetch("/api/r2/upload", { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");

      setForm({ ...form, image_url: result.url });
    } catch (err) {
      alert("업로드 실패: " + (err instanceof Error ? err.message : "오류"));
    }
  }

  if (loading) return <div className="flex h-40 items-center justify-center text-sm text-(--oboon-text-muted)"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 불러오는 중...</div>;
  if (!data || !form) return <div className="p-6 text-sm text-(--oboon-text-muted)">데이터를 찾을 수 없습니다.</div>;

  const statusLabel = isPropertyStatus(data.status) ? PROPERTY_STATUS_LABEL[data.status] : "상태 미정";

  return (
    <main className="bg-(--oboon-bg-page) min-h-screen">
      <PageContainer className="py-10">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">

          {/* 헤더 섹션 */}
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-(--oboon-text-title)">현장 상세</h1>
              <p className="text-sm text-(--oboon-text-muted)">이 현장의 핵심 정보와 입력 상태를 확인해요</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="status" className="text-[11px]">{statusLabel}</Badge>
              {!editMode ? (
                <>
                  <Button variant="secondary" size="sm" shape="pill" onClick={() => router.push("/company/properties")}>목록</Button>
                  <Button variant="danger" size="sm" shape="pill" onClick={handleDelete}>삭제</Button>
                </>
              ) : (
                <Button variant="secondary" size="sm" shape="pill" onClick={() => { setEditMode(false); setLocalPreview(null); }}>취소</Button>
              )}
            </div>
          </header>

          {/* 프로그레스 바 */}
          <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-5 py-4 shadow-sm">
            <div className="flex flex-col gap-3">
              <div className="flex items-end justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-(--oboon-text-muted) uppercase tracking-wider">입력 진행률</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-(--oboon-text-title)">{progressPercent}%</span>
                    {incompleteSectionNames.length > 0 ? (
                      <span className="text-sm font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                        <span className="font-bold">입력 필요:</span> {incompleteSectionNames.join(", ")}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-md">
                        ✨ 모든 섹션 입력 완료
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-(--oboon-primary) transition-all duration-700 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* 기본 정보 카드 */}
          <Card className="px-6 py-5">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-(--oboon-text-title)">기본 정보</h2>
              {!editMode ? (
                <Button variant="secondary" size="sm" shape="pill" onClick={() => setEditMode(true)}>편집</Button>
              ) : (
                <Button variant="primary" size="sm" shape="pill" onClick={saveBasicInfo} loading={saving}>저장</Button>
              )}
            </div>

            {!editMode ? (
              /* 읽기 모드 UI */
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="md:col-span-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                  <InfoRow label="현장명" value={data.name} />
                  <InfoRow label="연락처" value={data.phone_number} />
                  <InfoRow label="분양 유형" value={data.property_type} />
                  <InfoRow label="분양 상태" value={statusLabel} />
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-(--oboon-border-default) bg-slate-50/50 p-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-white">
                    {data.image_url ? <img src={data.image_url} alt="Thumbnail" className="h-full w-full object-cover" /> : <ImageIcon className="text-slate-300" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-(--oboon-text-muted)">대표 이미지</p>
                    <p className="truncate text-xs font-medium">{data.image_url ? "등록됨" : "미등록"}</p>
                  </div>
                </div>
                <div className="md:col-span-3 rounded-lg bg-slate-50/50 p-3">
                  <p className="text-xs font-medium text-(--oboon-text-muted)">설명</p>
                  <p className={`mt-2 text-sm leading-relaxed ${showFullDesc ? "" : "line-clamp-2"}`}>
                    {data.description || "등록된 설명이 없습니다."}
                  </p>
                  {data.description && data.description.length > 80 && (
                    <button onClick={() => setShowFullDesc(!showFullDesc)} className="mt-2 text-xs font-semibold text-(--oboon-primary)">
                      {showFullDesc ? "접기" : "더보기"}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* 편집 모드 UI */
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="현장명"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></FormField>
                <FormField label="연락처"><Input value={form.phone_number ?? ""} onChange={e => setForm({ ...form, phone_number: e.target.value })} /></FormField>
                <FormField label="분양 유형"><Input value={form.property_type ?? ""} onChange={e => setForm({ ...form, property_type: e.target.value })} /></FormField>
                <FormField label="분양 상태">
                  <PropertyStatusSelect
                    value={isPropertyStatus(form.status) ? form.status : PROPERTY_STATUS_OPTIONS[0].value}
                    onChange={v => setForm({ ...form, status: v })}
                  />
                </FormField>
                <FormField label="설명" className="md:col-span-2">
                  <textarea
                    className="w-full min-h-[100px] rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-3 text-sm focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)/20"
                    value={form.description ?? ""}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                  />
                </FormField>
                <FormField label="대표 이미지" className="md:col-span-2">
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>이미지 선택</Button>
                      {form.image_url && <Button variant="danger" size="sm" onClick={() => setForm({ ...form, image_url: null })}>삭제</Button>}
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </div>
                    <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-lg border border-(--oboon-border-default) bg-slate-50">
                      {(localPreview || form.image_url) ? (
                        <img src={localPreview || form.image_url || ""} className="h-full w-full object-cover" alt="Preview" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-slate-400">이미지가 없습니다</div>
                      )}
                    </div>
                  </div>
                </FormField>
                <div className="md:col-span-2 mt-4 space-y-4 border-t border-(--oboon-border-default) pt-6">
                  <h3 className="text-sm font-bold">감정평가사 메모</h3>
                  <FormField label="확정 내용"><textarea className="w-full min-h-[80px] rounded-lg border border-(--oboon-border-default) p-3 text-sm" value={form.confirmed_note ?? ""} onChange={e => setForm({ ...form, confirmed_note: e.target.value })} /></FormField>
                  <FormField label="추정 내용"><textarea className="w-full min-h-[80px] rounded-lg border border-(--oboon-border-default) p-3 text-sm" value={form.estimated_note ?? ""} onChange={e => setForm({ ...form, estimated_note: e.target.value })} /></FormField>
                  <FormField label="미정 내용"><textarea className="w-full min-h-[80px] rounded-lg border border-(--oboon-border-default) p-3 text-sm" value={form.undecided_note ?? ""} onChange={e => setForm({ ...form, undecided_note: e.target.value })} /></FormField>
                </div>
              </div>
            )}
          </Card>

          {/* 상세 섹션 카드 목록 */}
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SectionCard title="현장 위치" description="주소 및 위치 정보" status={completion?.siteLocationStatus ?? "none"} summary={completion?.siteLocationStatus !== "none" ? "주소가 등록되었습니다" : null} href={`/company/properties/${id}/location`} icon={MapPin} />
            <SectionCard title="건물 스펙" description="규모, 구조, 주차 등" status={completion?.specsStatus ?? "none"} summary={completion?.specsStatus !== "none" ? "스펙 정보가 등록되었습니다" : null} href={`/company/properties/${id}/specs`} icon={Building2} />
            <SectionCard title="일정" description="분양, 입주 등 주요 일정" status={completion?.timelineStatus ?? "none"} summary={completion?.timelineStatus !== "none" ? "일정 정보가 등록되었습니다" : null} href={`/company/properties/${id}/timeline`} icon={CalendarDays} />
            <SectionCard title="평면 타입" description="타입별 면적 및 구조" status={completion?.unitStatus ?? "none"} summary={completion?.unitStatus !== "none" ? "유닛 정보가 등록되었습니다" : null} href={`/company/properties/${id}/units`} icon={LayoutTemplate} />
            <SectionCard title="홍보시설" description="모델하우스 및 홍보관" status={completion?.facilityStatus ?? "none"} summary={completion?.facilityStatus !== "none" ? "시설 정보가 등록되었습니다" : null} href={`/company/properties/${id}/facilities`} icon={Landmark} />
          </section>
        </div>
      </PageContainer>
    </main>
  );
}