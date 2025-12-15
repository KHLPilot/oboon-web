"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, useParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";

const supabase = createSupabaseClient();

const LAND_USES = [
  // 주거지역
  "제1종전용주거지역",
  "제2종전용주거지역",
  "제1종일반주거지역",
  "제2종일반주거지역",
  "제3종일반주거지역",
  "준주거지역",

  // 상업지역
  "중심상업지역",
  "일반상업지역",
  "근린상업지역",
  "유통상업지역",

  // 공업지역
  "전용공업지역",
  "일반공업지역",
  "준공업지역",

  // 녹지지역
  "보전녹지지역",
  "생산녹지지역",
  "자연녹지지역",

  // 관리지역
  "보전관리지역",
  "생산관리지역",
  "계획관리지역",

  // 농림지역 / 자연환경보전지역
  "농림지역",
  "자연환경보전지역",
] as const;

type PropertySpecsForm = {
  id?: number; // table PK(있다면)
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

const formatNumberInput = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "";
  return value.toLocaleString("ko-KR");
};

const parseNumberInput = (raw: string): number | null => {
  const onlyNumber = raw.replace(/,/g, "");
  if (onlyNumber === "") return null;

  const n = Number(onlyNumber);
  if (!Number.isFinite(n)) return null;
  return n < 0 ? 0 : n;
};

const parseNonNegativeNumber = (raw: string): number | null => {
  if (raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return 0; // 음수 입력 방지: 0으로 clamp
  return n;
};

export default function PropertySpecsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const propertyId = Number(params?.id);

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<PropertySpecsForm>({
    properties_id: propertyId,
  });

  useEffect(() => {
    let alive = true;

    const run = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("property_specs")
        .select("*")
        .eq("properties_id", propertyId)
        .maybeSingle();

      if (!alive) return;

      if (error) {
        console.error(error);
        setForm({ properties_id: propertyId });
        setLoading(false);
        return;
      }

      setForm((prev) => ({
        ...prev,
        ...(data ?? {}),
        properties_id: propertyId,
      }));
      setLoading(false);
    };

    if (Number.isFinite(propertyId)) run();
    else setLoading(false);

    return () => {
      alive = false;
    };
  }, [propertyId]);

  const update = <K extends keyof PropertySpecsForm>(
    key: K,
    value: PropertySpecsForm[K]
  ) => {
    // 숫자 음수 방어(이중 안전장치)
    if (typeof value === "number" && value < 0) value = 0 as any;

    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);

    const payload: PropertySpecsForm = {
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
      console.error("Supabase Save Error:", error); // ✅ error 객체를 명시적으로 로깅
      // alert("저장에 실패했습니다. 콘솔을 확인해주세요.");

      // alert 메시지를 좀 더 구체적으로 변경하여 사용자에게 오류 메시지를 전달
      const errorMessage = error.message || "알 수 없는 오류가 발생했습니다.";
      alert(`저장 실패: ${errorMessage}\n(자세한 내용은 콘솔을 확인해주세요)`);
      return;
    }

    setEditing(false);
    alert("저장되었습니다");
    router.push(`/company/properties/${propertyId}`);
  };

  const goToList = () => {
    router.push("/company/properties"); // ✅ 현장 목록으로
  };

  const goBack = () => {
    router.back(); // 상단 뒤로가기
  };

  return (
    <div
      className="
  max-w-5xl mx-auto px-6 pt-8 pb-40
  bg-slate-50 text-slate-900
  dark:bg-black dark:text-slate-100
"
    >
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/company/properties/${propertyId}`)}
            className="
  text-sm text-slate-500
  dark:text-slate-400
  hover:underline
"
          >
            ← 뒤로가기
          </button>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            🏗 건물 스펙
          </h1>
          {loading ? (
            <span className="text-slate-500 dark:text-slate-400 text-sm">
              불러오는 중…
            </span>
          ) : null}
        </div>
      </div>

      {/* 분양 / 사업 */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
          분양 · 사업 정보
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="분양 유형" example="민간분양 / 공공분양 / 임대 등">
            <input
              className={inputClass}
              value={form.sale_type ?? ""}
              onChange={(e) => update("sale_type", e.target.value)}
              disabled={!editing}
              placeholder="예: 민간분양"
            />
          </Field>

          <Field label="신탁사">
            <input
              className={inputClass}
              value={form.trust_company ?? ""}
              onChange={(e) => update("trust_company", e.target.value)}
              disabled={!editing}
              placeholder="예: oo자산신탁"
            />
          </Field>

          <Field label="시행사">
            <input
              className={inputClass}
              value={form.developer ?? ""}
              onChange={(e) => update("developer", e.target.value)}
              disabled={!editing}
              placeholder="예: oo디벨로퍼"
            />
          </Field>

          <Field label="시공사">
            <input
              className={inputClass}
              value={form.builder ?? ""}
              onChange={(e) => update("builder", e.target.value)}
              disabled={!editing}
              placeholder="예: oo건설"
            />
          </Field>
        </div>
      </section>

      {/* 대지 */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
          대지 · 규제
        </h2>

        <Field label="대지 용도(용도지역)" example="제2종일반주거지역">
          <select
            className={selectClass}
            value={form.land_use_zone ?? ""}
            onChange={(e) => update("land_use_zone", e.target.value)}
            disabled={!editing}
          >
            <option value="">대지 용도 선택</option>
            {LAND_USES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </Field>
      </section>

      {/* 면적 */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
          면적 · 비율
        </h2>

        <Grid>
          <NumberField
            label="대지면적"
            unit="㎡"
            example="12345"
            value={form.site_area}
            set={(v) => update("site_area", v)}
            editing={editing}
          />
          <NumberField
            label="건축면적"
            unit="㎡"
            example="6789"
            value={form.building_area}
            set={(v) => update("building_area", v)}
            editing={editing}
          />
          <NumberField
            label="건폐율"
            unit="%"
            example="59.8"
            step="0.1"
            value={form.building_coverage_ratio}
            set={(v) => update("building_coverage_ratio", v)}
            editing={editing}
          />
          <NumberField
            label="용적률"
            unit="%"
            example="298.5"
            step="0.1"
            value={form.floor_area_ratio}
            set={(v) => update("floor_area_ratio", v)}
            editing={editing}
          />
        </Grid>
      </section>

      {/* 규모 */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4text-slate-900 dark:text-white">
          규모
        </h2>

        <Grid>
          <NumberField
            label="지상층수"
            unit="층"
            example="25"
            value={form.floor_ground}
            set={(v) => update("floor_ground", v)}
            editing={editing}
          />
          <NumberField
            label="지하층수"
            unit="층"
            example="3"
            value={form.floor_underground}
            set={(v) => update("floor_underground", v)}
            editing={editing}
          />
          <NumberField
            label="동 수"
            unit="동"
            example="4"
            value={form.building_count}
            set={(v) => update("building_count", v)}
            editing={editing}
          />
          <NumberField
            label="총 세대수"
            unit="세대"
            example="420"
            value={form.household_total}
            set={(v) => update("household_total", v)}
            editing={editing}
          />
        </Grid>
      </section>

      {/* 주차/난방 */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4text-slate-900 dark:text-white">
          주차 · 난방 · 기타
        </h2>

        <Grid>
          <NumberField
            label="총 주차대수"
            unit="대"
            example="520"
            value={form.parking_total}
            set={(v) => update("parking_total", v)}
            editing={editing}
          />
          <NumberField
            label="세대당 주차대수"
            unit="대"
            example="1.25"
            step="0.01"
            value={form.parking_per_household}
            set={(v) => update("parking_per_household", v)}
            editing={editing}
          />

          <Field label="난방 방식" example="지역난방 / 개별난방">
            <input
              className={inputClass}
              value={form.heating_type ?? ""}
              onChange={(e) => update("heating_type", e.target.value)}
              disabled={!editing}
              placeholder="예: 지역난방"
            />
          </Field>

          <Field label="어메니티" example="피트니스, 커뮤니티">
            <input
              className={inputClass}
              value={form.amenities ?? ""}
              onChange={(e) => update("amenities", e.target.value)}
              disabled={!editing}
              placeholder="예: 피트니스, 커뮤니티"
            />
          </Field>
        </Grid>
      </section>

      <div className="flex items-center gap-2">
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500"
            disabled={loading}
          >
            수정
          </button>
        ) : (
          <button
            onClick={save}
            className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
            disabled={loading || saving}
          >
            {saving ? "저장 중…" : "저장"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- UI Helpers ---------- */

const inputClass =
  "w-full px-4 py-3 rounded-xl  bg-white text-slate-900  dark:bg-slate-800 dark:text-slate-100  placeholder:text-slate-500 dark:placeholder:text-slate-500  border border-slate-300 dark:border-slate-700  focus:outline-none focus:ring-2 focus:ring-emerald-500  disabled:opacity-60";

const selectClass =
  "w-full px-4 py-3 rounded-xl  bg-white text-slate-900  dark:bg-slate-800 dark:text-slate-100  border border-slate-300 dark:border-slate-700  focus:outline-none focus:ring-2 focus:ring-emerald-500  disabled:opacity-60";

const labelClass = "text-slate-800 dark:text-slate-200 font-medium";
const hintClass = "text-slate-600 dark:text-slate-400 text-sm";

const Field = ({
  label,
  example,
  children,
}: {
  label: string;
  example?: string;
  children: ReactNode;
}) => (
  <div className="space-y-2">
    <p className={labelClass}>
      {label}
      {example && <span className={`ml-1 ${hintClass}`}>(예: {example})</span>}
    </p>
    {children}
  </div>
);

const Grid = ({ children }: { children: ReactNode }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
);

const NumberField = ({
  label,
  unit,
  example,
  value,
  set,
  editing,
  step,
}: {
  label: string;
  unit: string;
  example?: string;
  value: number | null | undefined;
  set: (v: number | null) => void;
  editing: boolean;
  step?: string;
}) => {
  return (
    <div className="space-y-2">
      <p className={labelClass}>
        {label}{" "}
        {example ? <span className={hintClass}>(예: {example})</span> : null}
      </p>

      <div className="relative">
        <input
          className={inputClass + " pr-14"}
          type="text"
          inputMode="decimal"
          value={formatNumberInput(value)}
          onChange={(e) => set(parseNumberInput(e.target.value))}
          disabled={!editing}
          placeholder={example ? example : ""}
        />

        {/* 단위 가독성 강화 */}
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 border-slate-600">
          {unit}
        </span>
      </div>
    </div>
  );
};
