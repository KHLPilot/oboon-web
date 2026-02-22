"use client";

import { useEffect, useMemo, useState } from "react";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { FormField } from "@/components/shared/FormField";
import {
  fetchPropertySpecs,
  fetchPropertyUnitTypes,
  upsertPropertySpecs,
} from "@/features/company/services/property.specs";
import { showAlert } from "@/shared/alert";
import { toKoreanErrorMessage } from "@/shared/errorMessage";

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

export default function SpecsEditorCard({
  propertyId,
  onAfterSave,
}: {
  propertyId: number;
  onAfterSave?: () => void;
}) {
  const [form, setForm] = useState<SpecsForm>({ properties_id: propertyId });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unitTypes, setUnitTypes] = useState<{ unit_count: number | null }[]>([]);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      const [{ data: specsData, error: specsError }, { data: unitData, error: unitError }] =
        await Promise.all([
          fetchPropertySpecs(propertyId),
          fetchPropertyUnitTypes(propertyId),
        ]);

      if (!alive) return;

      if (specsError) {
        console.error(specsError);
        setForm({ properties_id: propertyId });
      } else if (specsData) {
        setForm({ ...specsData, properties_id: propertyId });
      } else {
        setForm({ properties_id: propertyId });
      }

      if (unitError) {
        console.error("unit types error", unitError);
        setUnitTypes([]);
      } else {
        setUnitTypes(unitData ?? []);
      }

      setLoading(false);
    }

    void load();
    return () => {
      alive = false;
    };
  }, [propertyId]);

  const calculatedHouseholdTotal = useMemo(
    () => unitTypes.reduce((sum, u) => sum + (u.unit_count ?? 0), 0),
    [unitTypes],
  );

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
      household_total: calculatedHouseholdTotal,
      parking_total: form.parking_total ?? null,
      parking_per_household: form.parking_per_household ?? null,
      heating_type: form.heating_type ?? null,
      amenities: form.amenities ?? null,
    };

    const { data, error } = await upsertPropertySpecs(payload);
    setSaving(false);

    if (error) {
      showAlert(toKoreanErrorMessage(error, "저장에 실패했습니다."));
      return;
    }
    if (!data) {
      showAlert("저장 권한이 없거나 수정할 건물 스펙을 찾을 수 없습니다.");
      return;
    }
    showAlert("저장되었습니다.");
    onAfterSave?.();
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="ob-typo-body text-(--oboon-text-muted)">불러오는 중..</div>
      </Card>
    );
  }

  const numberInputProps = (key: keyof SpecsForm) => ({
    value: form[key] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      updateNumber(key, Number.isNaN(e.target.valueAsNumber) ? null : e.target.valueAsNumber),
  });
  const labelStrong = "ob-typo-body text-(--oboon-text-title)";

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="primary" size="sm" shape="pill" onClick={handleSave} loading={saving}>
          저장
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-6">
          <div className="ob-typo-h3 text-(--oboon-text-title)">분양·사업 정보</div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="분양 유형" labelClassName={labelStrong}>
              <Input value={form.sale_type ?? ""} onChange={(e) => update("sale_type", e.target.value)} />
            </FormField>
            <FormField label="신탁사" labelClassName={labelStrong}>
              <Input value={form.trust_company ?? ""} onChange={(e) => update("trust_company", e.target.value)} />
            </FormField>
            <FormField label="시행사" labelClassName={labelStrong}>
              <Input value={form.developer ?? ""} onChange={(e) => update("developer", e.target.value)} />
            </FormField>
            <FormField label="시공사" labelClassName={labelStrong}>
              <Input value={form.builder ?? ""} onChange={(e) => update("builder", e.target.value)} />
            </FormField>
          </div>
        </Card>

        <Card className="p-6">
          <div className="ob-typo-h3 text-(--oboon-text-title)">면적·비율</div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="대지면적(㎡)" labelClassName={labelStrong}><Input type="number" {...numberInputProps("site_area")} /></FormField>
            <FormField label="건축면적(㎡)" labelClassName={labelStrong}><Input type="number" {...numberInputProps("building_area")} /></FormField>
            <FormField label="건폐율(%)" labelClassName={labelStrong}><Input type="number" {...numberInputProps("building_coverage_ratio")} /></FormField>
            <FormField label="용적률(%)" labelClassName={labelStrong}><Input type="number" {...numberInputProps("floor_area_ratio")} /></FormField>
          </div>
        </Card>

        <Card className="p-6">
          <div className="ob-typo-h3 text-(--oboon-text-title)">규모</div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="지상층수" labelClassName={labelStrong}><Input type="number" {...numberInputProps("floor_ground")} /></FormField>
            <FormField label="지하층수" labelClassName={labelStrong}><Input type="number" {...numberInputProps("floor_underground")} /></FormField>
            <FormField label="건물 동수" labelClassName={labelStrong}><Input type="number" {...numberInputProps("building_count")} /></FormField>
            <FormField label="총 세대수(자동)" labelClassName={labelStrong}>
              <Input type="text" value={`${calculatedHouseholdTotal.toLocaleString()} 세대`} disabled />
            </FormField>
          </div>
        </Card>

        <Card className="p-6">
          <div className="ob-typo-h3 text-(--oboon-text-title)">주차·난방·기타</div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="총 주차대수" labelClassName={labelStrong}><Input type="number" {...numberInputProps("parking_total")} /></FormField>
            <FormField label="세대당 주차대수" labelClassName={labelStrong}><Input type="number" step="0.1" {...numberInputProps("parking_per_household")} /></FormField>
            <FormField label="난방방식" labelClassName={labelStrong}><Input value={form.heating_type ?? ""} onChange={(e) => update("heating_type", e.target.value)} /></FormField>
            <FormField label="어메니티" labelClassName={labelStrong}><Input value={form.amenities ?? ""} onChange={(e) => update("amenities", e.target.value)} /></FormField>
          </div>
        </Card>
      </div>
    </div>
  );
}
