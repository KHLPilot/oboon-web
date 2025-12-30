"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";

const supabase = createSupabaseClient();

/* ---------- utils ---------- */
const formatNumber = (v: number | null | undefined) =>
  v === null || v === undefined ? "" : v.toLocaleString("ko-KR");

const parseNumber = (raw: string): number | null => {
  if (raw === "" || raw === ".") return null;
  const n = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  return n < 0 ? 0 : n;
};

const formatKoreanMoney = (value: number | null | undefined) => {
  if (!value || value <= 0) return "";
  const units = [
    { value: 1_0000_0000, label: "억" },
    { value: 1_0000, label: "만" },
  ];
  let remain = value;
  let result = "";
  for (const u of units) {
    if (remain >= u.value) {
      result += `${Math.floor(remain / u.value)}${u.label} `;
      remain %= u.value;
    }
  }
  return result.trim() + "원";
};

const toPyeong = (m2: number | null | undefined) => {
  if (!m2 || m2 <= 0) return "";
  return (m2 / 3.305785).toFixed(2);
};

/* ---------- types ---------- */
type UnitType = {
  id: number;
  properties_id: number;
  type_name: string;
  exclusive_area: number | null;
  supply_area: number | null;
  rooms: number | null;
  bathrooms: number | null;
  price_min: number | null;
  price_max: number | null;
  unit_count: number | null;
  supply_count: number | null;
  floor_plan_url: string | null;
  image_url: string | null;
};

export default function PropertyUnitTypesPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const propertyId = Number(params.id);

  const [list, setList] = useState<UnitType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState<Partial<UnitType>>({
    properties_id: propertyId,
    type_name: "",
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("property_unit_types")
      .select("*")
      .eq("properties_id", propertyId)
      .order("id");
    setList((data ?? []) as UnitType[]);
    setLoading(false);
  };

  useEffect(() => {
    if (Number.isFinite(propertyId)) load();
  }, [propertyId]);

  const save = async () => {
    if (!form.type_name?.trim()) {
      alert("평면 타입명은 필수입니다");
      return;
    }

    const payload = { ...form, properties_id: propertyId };

    const { error } =
      editingId === null
        ? await supabase.from("property_unit_types").insert(payload)
        : await supabase
          .from("property_unit_types")
          .update(payload)
          .eq("id", editingId);

    if (error) {
      alert("저장 실패: " + error.message);
      return;
    }

    setForm({ properties_id: propertyId, type_name: "" });
    setEditingId(null);
    load();
  };

  const edit = (row: UnitType) => {
    setEditingId(row.id);
    setForm(row);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  const remove = async (id: number) => {
    if (!confirm("이 평면 타입을 삭제할까요?")) return;
    await supabase.from("property_unit_types").delete().eq("id", id);
    load();
  };

  if (loading)
    return (
      <div className="p-10 text-center text-slate-400">불러오는 중…</div>
    );

  return (
    <div className="max-w-5xl mx-auto px-6 pt-8 pb-40 bg-slate-50 text-slate-900">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => router.push(`/company/properties/${propertyId}`)}
          className="text-sm text-slate-500 hover:underline"
        >
          ← 뒤로가기
        </button>
        <h1 className="text-xl font-bold">🏠 평면 타입</h1>
      </div>

      {/* 리스트 */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4">등록된 평면</h2>

        {list.length === 0 ? (
          <p className="text-slate-400">등록된 평면이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {list.map((u) => (
              <div
                key={u.id}
                className="flex justify-between items-center bg-white border rounded-xl px-4 py-3"
              >
                <div>
                  <p className="font-semibold">{u.type_name}</p>
                  <p className="text-sm text-slate-500">
                    전용 {u.exclusive_area ?? "-"}㎡ · 공급{" "}
                    {u.supply_area ?? "-"}㎡
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => edit(u)}
                    className="px-3 py-1 rounded bg-slate-100 text-sm"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => remove(u.id)}
                    className="px-3 py-1 rounded bg-red-50 text-red-600 text-sm"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 입력 폼 */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          {editingId ? "평면 수정" : "새 평면 추가"}
        </h2>

        <Grid>
          <Field label="평면 타입명">
            <input
              className={inputClass}
              value={form.type_name ?? ""}
              onChange={(e) =>
                setForm({ ...form, type_name: e.target.value })
              }
            />
          </Field>

          <NumberField
            label="세대 수"
            value={form.unit_count}
            set={(v) => setForm({ ...form, unit_count: v })}
          />

          <Field
            label={
              <span className="flex items-center gap-2">
                공급규모
                <span className="text-xs text-slate-500">
                  (※ 일반 청약 공급 세대 수)
                </span>
              </span>
            }
          >
            <NumberField
              label=""
              value={form.supply_count}
              set={(v) => setForm({ ...form, supply_count: v })}
            />
          </Field>



          <div className="relative">
            <DecimalField
              label="전용면적 (㎡)"
              value={form.exclusive_area}
              set={(v) => setForm({ ...form, exclusive_area: v })}
            />
            {form.exclusive_area && (
              <span className="absolute right-4 top-[45px] text-base font-semibold text-slate-600 ">
                {toPyeong(form.exclusive_area)}평
              </span>
            )}
          </div>

          <div className="relative">
            <DecimalField
              label="공급면적 (㎡)"
              value={form.supply_area}
              set={(v) => setForm({ ...form, supply_area: v })}
            />
            {form.supply_area && (
              <span className="absolute right-4 top-[45px] text-base font-semibold text-slate-600 ">
                {toPyeong(form.supply_area)}평
              </span>
            )}
          </div>

          <NumberField
            label="방 개수"
            value={form.rooms}
            set={(v) => setForm({ ...form, rooms: v })}
          />

          <NumberField
            label="욕실 개수"
            value={form.bathrooms}
            set={(v) => setForm({ ...form, bathrooms: v })}
          />

          <Field label="최소 분양가">
            <input
              className={inputClass}
              value={formatNumber(form.price_min)}
              onChange={(e) =>
                setForm({ ...form, price_min: parseNumber(e.target.value) })
              }
            />
            <p className="text-xs text-slate-400">
              {formatKoreanMoney(form.price_min)}
            </p>
          </Field>

          <Field label="최대 분양가">
            <input
              className={inputClass}
              value={formatNumber(form.price_max)}
              onChange={(e) =>
                setForm({ ...form, price_max: parseNumber(e.target.value) })
              }
            />
            <p className="text-xs text-slate-400">
              {formatKoreanMoney(form.price_max)}
            </p>
          </Field>
        </Grid>

        <div className="flex gap-3 mt-6">
          <button
            onClick={save}
            className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold"
          >
            {editingId ? "수정 완료" : "저장"}
          </button>

          {editingId && (
            <button
              onClick={() => {
                setEditingId(null);
                setForm({ properties_id: propertyId, type_name: "" });
              }}
              className="px-6 py-3 rounded-xl bg-slate-100"
            >
              취소
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

/* ---------- UI helpers ---------- */

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-white border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none";

const Field = ({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) => (
  <div className="space-y-2">
    <p className="font-medium">{label}</p>
    {children}
  </div>
);

const Grid = ({ children }: { children: ReactNode }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
);

/* 숫자 (정수) */
const NumberField = ({
  label,
  value,
  set,
}: {
  label: string;
  value: number | null | undefined;
  set: (v: number | null) => void;
}) => (
  <Field label={label}>
    <input
      className={inputClass}
      inputMode="numeric"
      value={formatNumber(value)}
      onChange={(e) => set(parseNumber(e.target.value))}
    />
  </Field>
);

/* ✅ 소수점 허용 */
const DecimalField = ({
  label,
  value,
  set,
}: {
  label: string;
  value: number | null | undefined;
  set: (v: number | null) => void;
}) => {
  const [raw, setRaw] = useState("");

  useEffect(() => {
    setRaw(value === null || value === undefined ? "" : value.toString());
  }, [value]);

  return (
    <Field label={label}>
      <input
        className={inputClass}
        inputMode="decimal"
        value={raw}
        onChange={(e) => {
          const v = e.target.value;
          if (!/^[0-9]*\.?[0-9]*$/.test(v)) return;
          setRaw(v);
          set(v === "" || v === "." ? null : Number(v));
        }}
      />
    </Field>
  );
};
