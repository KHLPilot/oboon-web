// app/company/properties/[id]/specs/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import PageContainer from "@/components/shared/PageContainer";
import { FormField } from "@/components/shared/FormField";
import { fetchPropertySpecs, fetchPropertyUnitTypes, upsertPropertySpecs } from "@/features/company/services/property.specs";
import { showAlert } from "@/shared/alert";

type SpecsForm = {
  id?: number;
  properties_id: number;
  sale_type?: string | null;
  trust_company?: string | null;
  developer?: string | null;
  builder?: string | null;
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
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const propertyId = Number(params?.id);

  const [form, setForm] = useState<SpecsForm>({ properties_id: propertyId });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ✅ 평면 타입 세대수 목록
  const [unitTypes, setUnitTypes] = useState<{ unit_count: number | null }[]>(
    [],
  );

  useEffect(() => {
    if (!Number.isFinite(propertyId)) return;

    const fetchUnitTypes = async () => {
      const { data, error } = await fetchPropertyUnitTypes(propertyId);

      if (error) {
        console.error("unit types error", error);
        return;
      }

      setUnitTypes(data ?? []);
    };

    fetchUnitTypes();
  }, [propertyId]);

  const calculatedHouseholdTotal = useMemo(() => {
    return unitTypes.reduce((sum, u) => sum + (u.unit_count ?? 0), 0);
  }, [unitTypes]);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!Number.isFinite(propertyId)) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await fetchPropertySpecs(propertyId);

      if (!alive) return;

      if (error) {
        console.error(error);
        setForm({ properties_id: propertyId });
      } else if (data) {
        setForm({ ...data, properties_id: propertyId });
      } else {
        setForm({ properties_id: propertyId });
      }

      setLoading(false);
    }

    load();

    return () => {
      alive = false;
    };
  }, [propertyId]);

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
      site_area: form.site_area ?? null,
      building_area: form.building_area ?? null,
      building_coverage_ratio: form.building_coverage_ratio ?? null,
      floor_area_ratio: form.floor_area_ratio ?? null,
      floor_ground: form.floor_ground ?? null,
      floor_underground: form.floor_underground ?? null,
      building_count: form.building_count ?? null,
      household_total: calculatedHouseholdTotal, // 자동 합계 저장
      parking_total: form.parking_total ?? null,
      parking_per_household: form.parking_per_household ?? null,
      heating_type: form.heating_type ?? null,
      amenities: form.amenities ?? null,
    };

    const { error } = await upsertPropertySpecs(payload);
    setSaving(false);

    if (error) {
      showAlert("저장 실패: " + error.message);
      return;
    }

    router.push(`/company/properties/${propertyId}`);
  }

  if (loading) {
    return (
      <main className="bg-(--oboon-bg-default)">
        <PageContainer>
          <div className="py-8">
            <div className="ob-typo-body text-(--oboon-text-muted)">
              불러오는 중..
            </div>
          </div>
        </PageContainer>
      </main>
    );
  }

  const numberInputProps = (key: keyof SpecsForm) => ({
    value: form[key] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      updateNumber(
        key,
        Number.isNaN(e.target.valueAsNumber) ? null : e.target.valueAsNumber,
      ),
  });

  const labelStrong = "ob-typo-body text-(--oboon-text-title)";

  return (
    <main className="bg-(--oboon-bg-default)">
      <PageContainer>
        <div className="mb-8">
          <div className="flex w-full flex-col gap-6">
            {/* Header */}
            <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="ob-typo-h1 text-(--oboon-text-title)">
                  건물 스펙
                </p>
                <p className="ob-typo-body text-(--oboon-text-muted)">
                  규모·구조·주차 등 주요 스펙을 입력하세요.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  shape="pill"
                  onClick={() =>
                    router.push(`/company/properties/${propertyId}`)
                  }
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  shape="pill"
                  onClick={handleSave}
                  loading={saving}
                >
                  저장
                </Button>
              </div>
            </header>

            {/* 분양·사업 정보 */}
            <Card className="p-6">
              <div className="ob-typo-h3 text-(--oboon-text-title)">
                분양·사업 정보
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="분양 유형" labelClassName={labelStrong}>
                  <Input
                    value={form.sale_type ?? ""}
                    onChange={(e) => update("sale_type", e.target.value)}
                    placeholder="예) 민간분양, 임대 등"
                  />
                </FormField>

                <FormField label="신탁사" labelClassName={labelStrong}>
                  <Input
                    value={form.trust_company ?? ""}
                    onChange={(e) => update("trust_company", e.target.value)}
                    placeholder="예) OO신탁"
                  />
                </FormField>

                <FormField label="시행사" labelClassName={labelStrong}>
                  <Input
                    value={form.developer ?? ""}
                    onChange={(e) => update("developer", e.target.value)}
                    placeholder="예) OO디벨로퍼"
                  />
                </FormField>

                <FormField label="시공사" labelClassName={labelStrong}>
                  <Input
                    value={form.builder ?? ""}
                    onChange={(e) => update("builder", e.target.value)}
                    placeholder="예) OO건설"
                  />
                </FormField>
              </div>
            </Card>

            {/* 면적·비율 */}
            <Card className="p-6">
              <div className="ob-typo-h3 text-(--oboon-text-title)">
                면적·비율
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="대지면적(㎡)" labelClassName={labelStrong}>
                  <Input
                    type="number"
                    placeholder="예) 1234"
                    {...numberInputProps("site_area")}
                  />
                </FormField>

                <FormField label="건축면적(㎡)" labelClassName={labelStrong}>
                  <Input
                    type="number"
                    placeholder="예) 500"
                    {...numberInputProps("building_area")}
                  />
                </FormField>

                <FormField label="건폐율(%)" labelClassName={labelStrong}>
                  <Input
                    type="number"
                    placeholder="예) 25"
                    {...numberInputProps("building_coverage_ratio")}
                  />
                </FormField>

                <FormField label="용적률(%)" labelClassName={labelStrong}>
                  <Input
                    type="number"
                    placeholder="예) 240"
                    {...numberInputProps("floor_area_ratio")}
                  />
                </FormField>
              </div>
            </Card>

            {/* 규모 */}
            <Card className="p-6">
              <div className="ob-typo-h3 text-(--oboon-text-title)">규모</div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="지상층수" labelClassName={labelStrong}>
                  <Input
                    type="number"
                    placeholder="예) 29"
                    {...numberInputProps("floor_ground")}
                  />
                </FormField>

                <FormField label="지하층수" labelClassName={labelStrong}>
                  <Input
                    type="number"
                    placeholder="예) 2"
                    {...numberInputProps("floor_underground")}
                  />
                </FormField>

                <FormField label="건물 동수" labelClassName={labelStrong}>
                  <Input
                    type="number"
                    placeholder="예) 4"
                    {...numberInputProps("building_count")}
                  />
                </FormField>

                <FormField
                  label={
                    <span className="flex items-center gap-2">
                      총 세대수
                      <span className="ob-typo-caption text-(--oboon-text-muted)">
                        (※ 평면타입 입력 시 자동 합계)
                      </span>
                    </span>
                  }
                  labelClassName={labelStrong}
                >
                  <Input
                    type="text"
                    value={`${calculatedHouseholdTotal.toLocaleString()} 세대`}
                    disabled
                  />
                </FormField>
              </div>
            </Card>

            {/* 주차·난방·기타 */}
            <Card className="p-6">
              <div className="ob-typo-h3 text-(--oboon-text-title)">
                주차·난방·기타
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="총 주차대수" labelClassName={labelStrong}>
                  <Input
                    type="number"
                    placeholder="예) 400"
                    {...numberInputProps("parking_total")}
                  />
                </FormField>

                <FormField label="세대당 주차대수" labelClassName={labelStrong}>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="예) 1.2"
                    {...numberInputProps("parking_per_household")}
                  />
                </FormField>

                <FormField label="난방방식" labelClassName={labelStrong}>
                  <Input
                    placeholder="예) 지역난방, 개별난방"
                    value={form.heating_type ?? ""}
                    onChange={(e) => update("heating_type", e.target.value)}
                  />
                </FormField>

                <FormField label="어메니티" labelClassName={labelStrong}>
                  <Input
                    placeholder="예) 커뮤니티센터, 피트니스 등"
                    value={form.amenities ?? ""}
                    onChange={(e) => update("amenities", e.target.value)}
                  />
                </FormField>
              </div>
            </Card>
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
