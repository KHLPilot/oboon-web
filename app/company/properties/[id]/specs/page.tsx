// /app/company/properties/[id]/specs/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { FormField } from "@/app/components/FormField";
import { createSupabaseClient } from "@/lib/supabaseClient";

const LAND_USES = [
  "제1종일반주거지역",
  "제2종일반주거지역",
  "제3종일반주거지역",
  "일반상업지역",
  "중심상업지역",
  "근린상업지역",
  "일반공업지역",
  "준공업지역",
  "녹지지역",
  "개발제한구역",
  "기타",
] as const;

type SpecsForm = {
  id?: number;
  properties_id: number;
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

export default function PropertySpecsPage() {
  const supabase = createSupabaseClient();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const propertyId = Number(params?.id);

  const [form, setForm] = useState<SpecsForm>({ properties_id: propertyId });
  const [baseForm, setBaseForm] = useState<SpecsForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sectionEdit, setSectionEdit] = useState({
    biz: false,
    land: false,
    area: false,
    scale: false,
    parking: false,
  });

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!Number.isFinite(propertyId)) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from("property_specs")
        .select("*")
        .eq("properties_id", propertyId)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!alive) return;

      if (error) {
        console.error(error);
        const empty = { properties_id: propertyId };
        setForm(empty);
        setBaseForm(empty);
      } else if (data) {
        const next = { ...data, properties_id: propertyId };
        setForm(next);
        setBaseForm(next);
      } else {
        const empty = { properties_id: propertyId };
        setForm(empty);
        setBaseForm(empty);
      }

      setSectionEdit({
        biz: false,
        land: false,
        area: false,
        scale: false,
        parking: false,
      });
      setLoading(false);
    }

    load();

    return () => {
      alive = false;
    };
  }, [propertyId, supabase]);

  const update = <K extends keyof SpecsForm>(key: K, value: SpecsForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateNumber = (key: keyof SpecsForm, value: number | null) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  async function handleSave() {
    if (saving) return;
    setSaving(true);

    const payload: SpecsForm = {
      properties_id: propertyId,
      sale_type: form.sale_type ?? null,
      trust_company: form.trust_company ?? null,
      developer: form.developer ?? null,
      builder: form.builder ?? null,
      land_use_zone: form.land_use_zone ?? null,
      site_area: form.site_area ?? null,
      building_area: form.building_area ?? null,
      building_coverage_ratio: form.building_coverage_ratio ?? null,
      floor_area_ratio: form.floor_area_ratio ?? null,
      floor_ground: form.floor_ground ?? null,
      floor_underground: form.floor_underground ?? null,
      building_count: form.building_count ?? null,
      household_total: form.household_total ?? null,
      parking_total: form.parking_total ?? null,
      parking_per_household: form.parking_per_household ?? null,
      heating_type: form.heating_type ?? null,
      amenities: form.amenities ?? null,
    };

    const { error } = await supabase.from("property_specs").upsert(payload, {
      onConflict: "properties_id",
    });

    setSaving(false);

    if (error) {
      alert("저장 실패: " + error.message);
      return;
    }
    setBaseForm({ ...form, properties_id: propertyId });
    setSectionEdit({
      biz: false,
      land: false,
      area: false,
      scale: false,
      parking: false,
    });
  }

  const inputBase =
    "input-basic rounded-md border border-(--oboon-border-default) bg-(--oboon-bg-subtle)/70 px-3 py-2 transition focus:border-(--oboon-accent) focus:outline-none focus:ring-2 focus:ring-(--oboon-accent)/50";
  const labelStrong = "text-sm font-medium text-(--oboon-text-title)";

  const SECTION_FIELDS: Record<keyof typeof sectionEdit, (keyof SpecsForm)[]> =
    {
      biz: ["sale_type", "trust_company", "developer", "builder"],
      land: ["land_use_zone"],
      area: [
        "site_area",
        "building_area",
        "building_coverage_ratio",
        "floor_area_ratio",
      ],
      scale: [
        "floor_ground",
        "floor_underground",
        "building_count",
        "household_total",
      ],
      parking: [
        "parking_total",
        "parking_per_household",
        "heating_type",
        "amenities",
      ],
    };

  function startEdit(section: keyof typeof sectionEdit) {
    setSectionEdit((prev) => ({ ...prev, [section]: true }));
  }

  function cancelSection(section: keyof typeof sectionEdit) {
    const snapshot = baseForm;
    if (snapshot) {
      setForm((prev) => {
        const next = { ...prev } as Record<
          string,
          SpecsForm[keyof SpecsForm]
        >;
        (SECTION_FIELDS[section] as Array<keyof SpecsForm>).forEach((field) => {
          next[field] = snapshot[field] ?? null;
        });
        return next as SpecsForm;
      });
    }
    setSectionEdit((prev) => ({ ...prev, [section]: false }));
  }

  async function saveSection(section: keyof typeof sectionEdit) {
    await handleSave();
    setSectionEdit((prev) => ({ ...prev, [section]: false }));
  }

  if (loading) {
    return (
      <div className="p-6 text-sm text-(--oboon-text-muted)">불러오는 중..</div>
    );
  }

  const numberInputProps = (key: keyof SpecsForm) => ({
    value: form[key] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      updateNumber(
        key,
        Number.isNaN(e.target.valueAsNumber) ? null : e.target.valueAsNumber
      ),
  });

  return (
    <div className="bg-(--oboon-bg-page) px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <div className="space-y-1 pt-1">
              <p className="text-2xl font-bold text-(--oboon-text-title)">
                건물 스펙
              </p>
              <p className="text-sm text-(--oboon-text-muted)">
                규모·구조·주차 등 주요 스펙을 입력하세요.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              shape="pill"
              className="text-red-500"
              onClick={() => router.push(`/company/properties/${propertyId}`)}
            >
              취소
            </Button>
          </div>
        </header>

        {/* 분양·사업 정보 */}
        <section className="space-y-3 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-6 py-5 ">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-(--oboon-text-title)">
              분양·사업 정보
            </h2>
            {sectionEdit.biz ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  shape="pill"
                  className="text-red-500"
                  onClick={() => cancelSection("biz")}
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  shape="pill"
                  onClick={() => saveSection("biz")}
                  loading={saving}
                >
                  저장
                </Button>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                shape="pill"
                onClick={() => startEdit("biz")}
              >
                편집
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="분양 유형" labelClassName={labelStrong}>
              <input
                className={inputBase}
                value={form.sale_type ?? ""}
                onChange={(e) => update("sale_type", e.target.value)}
                disabled={!sectionEdit.biz}
                placeholder="예) 민간분양, 임대 등"
              />
            </FormField>
            <FormField label="신탁사" labelClassName={labelStrong}>
              <input
                className={inputBase}
                value={form.trust_company ?? ""}
                onChange={(e) => update("trust_company", e.target.value)}
                disabled={!sectionEdit.biz}
                placeholder="예) OO신탁"
              />
            </FormField>
            <FormField label="시행사" labelClassName={labelStrong}>
              <input
                className={inputBase}
                value={form.developer ?? ""}
                onChange={(e) => update("developer", e.target.value)}
                disabled={!sectionEdit.biz}
                placeholder="예) OO디벨로퍼"
              />
            </FormField>
            <FormField label="시공사" labelClassName={labelStrong}>
              <input
                className={inputBase}
                value={form.builder ?? ""}
                onChange={(e) => update("builder", e.target.value)}
                disabled={!sectionEdit.biz}
                placeholder="예) OO건설"
              />
            </FormField>
          </div>
        </section>

        {/* 대지·규제 */}
        <section className="space-y-3 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-6 py-5 ">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-(--oboon-text-title)">
              대지·규제
            </h2>
            {sectionEdit.land ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  shape="pill"
                  className="text-red-500"
                  onClick={() => cancelSection("land")}
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  shape="pill"
                  onClick={() => saveSection("land")}
                  loading={saving}
                >
                  저장
                </Button>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                shape="pill"
                onClick={() => startEdit("land")}
              >
                편집
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="대지 용도(용도지역)" labelClassName={labelStrong}>
              <select
                className={inputBase}
                value={form.land_use_zone ?? ""}
                onChange={(e) => update("land_use_zone", e.target.value)}
                disabled={!sectionEdit.land}
              >
                <option value="">선택</option>
                {LAND_USES.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
        </section>

        {/* 면적·비율 */}
        <section className="space-y-3 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-6 py-5 ">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-(--oboon-text-title)">
              면적·비율
            </h2>
            {sectionEdit.area ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  shape="pill"
                  className="text-red-500"
                  onClick={() => cancelSection("area")}
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  shape="pill"
                  onClick={() => saveSection("area")}
                  loading={saving}
                >
                  저장
                </Button>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                shape="pill"
                onClick={() => startEdit("area")}
              >
                편집
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="대지면적(㎡)" labelClassName={labelStrong}>
              <input
                type="number"
                className={inputBase}
                disabled={!sectionEdit.area}
                placeholder="예) 1234"
                {...numberInputProps("site_area")}
              />
            </FormField>
            <FormField label="건축면적(㎡)" labelClassName={labelStrong}>
              <input
                type="number"
                className={inputBase}
                disabled={!sectionEdit.area}
                placeholder="예) 500"
                {...numberInputProps("building_area")}
              />
            </FormField>
            <FormField label="건폐율(%)" labelClassName={labelStrong}>
              <input
                type="number"
                className={inputBase}
                disabled={!sectionEdit.area}
                placeholder="예) 25"
                {...numberInputProps("building_coverage_ratio")}
              />
            </FormField>
            <FormField label="용적률(%)" labelClassName={labelStrong}>
              <input
                type="number"
                className={inputBase}
                disabled={!sectionEdit.area}
                placeholder="예) 240"
                {...numberInputProps("floor_area_ratio")}
              />
            </FormField>
          </div>
        </section>

        {/* 규모 */}
        <section className="space-y-3 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-6 py-5 ">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-(--oboon-text-title)">
              규모
            </h2>
            {sectionEdit.scale ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  shape="pill"
                  className="text-red-500"
                  onClick={() => cancelSection("scale")}
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  shape="pill"
                  onClick={() => saveSection("scale")}
                  loading={saving}
                >
                  저장
                </Button>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                shape="pill"
                onClick={() => startEdit("scale")}
              >
                편집
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="지상층수" labelClassName={labelStrong}>
              <input
                type="number"
                className={inputBase}
                disabled={!sectionEdit.scale}
                placeholder="예) 29"
                {...numberInputProps("floor_ground")}
              />
            </FormField>
            <FormField label="지하층수" labelClassName={labelStrong}>
              <input
                type="number"
                className={inputBase}
                disabled={!sectionEdit.scale}
                placeholder="예) 2"
                {...numberInputProps("floor_underground")}
              />
            </FormField>
            <FormField label="건물 동수" labelClassName={labelStrong}>
              <input
                type="number"
                className={inputBase}
                disabled={!sectionEdit.scale}
                placeholder="예) 4"
                {...numberInputProps("building_count")}
              />
            </FormField>
            <FormField label="총 세대수" labelClassName={labelStrong}>
              <input
                type="number"
                className={inputBase}
                disabled={!sectionEdit.scale}
                placeholder="예) 320"
                {...numberInputProps("household_total")}
              />
            </FormField>
          </div>
        </section>

        {/* 주차·난방·기타 */}
        <section className="space-y-3 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-6 py-5 ">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-(--oboon-text-title)">
              주차·난방·기타
            </h2>
            {sectionEdit.parking ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  shape="pill"
                  className="text-red-500"
                  onClick={() => cancelSection("parking")}
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  shape="pill"
                  onClick={() => saveSection("parking")}
                  loading={saving}
                >
                  저장
                </Button>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                shape="pill"
                onClick={() => startEdit("parking")}
              >
                편집
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="총 주차대수" labelClassName={labelStrong}>
              <input
                type="number"
                className={inputBase}
                disabled={!sectionEdit.parking}
                placeholder="예) 400"
                {...numberInputProps("parking_total")}
              />
            </FormField>
            <FormField label="세대당 주차대수" labelClassName={labelStrong}>
              <input
                type="number"
                className={inputBase}
                disabled={!sectionEdit.parking}
                placeholder="예) 1.2"
                step="0.1"
                {...numberInputProps("parking_per_household")}
              />
            </FormField>
            <FormField label="난방방식" labelClassName={labelStrong}>
              <input
                className={inputBase}
                disabled={!sectionEdit.parking}
                placeholder="예) 지역난방, 개별난방"
                value={form.heating_type ?? ""}
                onChange={(e) => update("heating_type", e.target.value)}
              />
            </FormField>
            <FormField label="어메니티" labelClassName={labelStrong}>
              <input
                className={inputBase}
                disabled={!sectionEdit.parking}
                placeholder="예) 커뮤니티센터, 피트니스 등"
                value={form.amenities ?? ""}
                onChange={(e) => update("amenities", e.target.value)}
              />
            </FormField>
          </div>
        </section>
      </div>
    </div>
  );
}
