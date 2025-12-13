"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { FormField } from "@/app/components/FormField";

/* ---------- utils ---------- */
function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "";
  return value.toLocaleString("ko-KR");
}

function parseNumber(raw: string): number | null {
  const onlyNumber = raw.replace(/,/g, "");
  if (onlyNumber === "") return null;

  const n = Number(onlyNumber);
  if (!Number.isFinite(n)) return null;
  return n < 0 ? 0 : n;
}
function formatKoreanMoney(value: number | null | undefined) {
  if (!value || value <= 0) return "";

  const units = [
    { value: 1_0000_0000, label: "억" },
    { value: 1_0000, label: "만" },
  ];

  let remain = value;
  let result = "";

  for (const u of units) {
    if (remain >= u.value) {
      const count = Math.floor(remain / u.value);
      remain %= u.value;
      result += `${count}${u.label} `;
    }
  }

  return result.trim() + "원";
}

/* ---------- types ---------- */
type UnitType = {
  id: number;
  properties_id: number;
  type_name: string;
  exclusive_area: number | null;
  supply_area: number | null;
  rooms: number | null;
  bathrooms: number | null;
  building_layout: string | null;
  orientation: string | null;
  price_min: number | null;
  price_max: number | null;
  unit_count: number | null;
  floor_plan_url: string | null;
  image_url: string | null;
};

export default function PropertyUnitTypesPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const params = useParams<{ id: string }>();
  const propertyId = Number(params.id);

  const [list, setList] = useState<UnitType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState<Partial<UnitType>>({
    properties_id: propertyId,
    type_name: "",
  });

  /* ---------- load ---------- */
  async function load() {
    setLoading(true);

    const { data } = await supabase
      .from("property_unit_types")
      .select("*")
      .eq("properties_id", propertyId)
      .order("id");

    setList((data ?? []) as UnitType[]);
    setLoading(false);
  }

  useEffect(() => {
    if (propertyId) load();
  }, [propertyId]);

  /* ---------- save ---------- */
  async function save() {
    if (!form.type_name?.trim()) {
      alert("평면 타입명은 필수입니다");
      return;
    }

    const payload = {
      ...form,
      properties_id: propertyId,
    };

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
  }

  /* ---------- delete ---------- */
  async function remove(id: number) {
    if (!confirm("이 평면 타입을 삭제할까요?")) return;
    await supabase.from("property_unit_types").delete().eq("id", id);
    load();
  }

  /* ---------- edit ---------- */
  function edit(row: UnitType) {
    setEditingId(row.id);
    setForm(row);
  }

  if (loading) return <div className="p-6">불러오는 중...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push(`/company/properties/${propertyId}`)}
          className="text-sm text-gray-400 hover:text-white"
        >
          ← 뒤로가기
        </button>

        <h1 className="text-xl font-bold">🏠 평면 타입</h1>
      </div>

      {/* ---------- 목록 ---------- */}
      <div className="space-y-2">
        {list.map((u) => (
          <div
            key={u.id}
            className="border border-gray-700 rounded p-4 flex justify-between"
          >
            <div>
              <div className="font-semibold">{u.type_name}</div>
              <div className="text-sm text-gray-400">
                전용 {u.exclusive_area ?? "-"}㎡ · 공급 {u.supply_area ?? "-"}㎡
                · {u.rooms ?? "-"}R {u.bathrooms ?? "-"}B
              </div>
            </div>

            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => edit(u)}>
                수정
              </button>
              <button className="btn-danger" onClick={() => remove(u.id)}>
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ---------- 입력 ---------- */}
      <section className="border border-gray-700 rounded p-4 space-y-4">
        <h2 className="font-semibold">
          {editingId ? "평면 수정" : "평면 추가"}
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="평면 타입명">
            <input
              className="input-basic"
              placeholder="예: 84A"
              value={form.type_name ?? ""}
              onChange={(e) => setForm({ ...form, type_name: e.target.value })}
            />
          </FormField>

          <FormField label="전용면적 (㎡)">
            <input
              className="input-basic"
              type="text"
              inputMode="decimal"
              value={formatNumber(form.exclusive_area)}
              onChange={(e) =>
                setForm({
                  ...form,
                  exclusive_area: parseNumber(e.target.value),
                })
              }
            />
          </FormField>

          <FormField label="공급면적 (㎡)">
            <input
              className="input-basic"
              type="text"
              inputMode="decimal"
              value={formatNumber(form.supply_area)}
              onChange={(e) =>
                setForm({
                  ...form,
                  supply_area: parseNumber(e.target.value),
                })
              }
            />
          </FormField>

          <FormField label="방 개수">
            <input
              className="input-basic"
              type="text"
              inputMode="numeric"
              value={formatNumber(form.rooms)}
              onChange={(e) =>
                setForm({
                  ...form,
                  rooms: parseNumber(e.target.value),
                })
              }
            />
          </FormField>

          <FormField label="욕실 개수">
            <input
              className="input-basic"
              type="text"
              inputMode="numeric"
              value={formatNumber(form.bathrooms)}
              onChange={(e) =>
                setForm({
                  ...form,
                  bathrooms: parseNumber(e.target.value),
                })
              }
            />
          </FormField>

          <FormField label="최소 분양가">
            <div className="relative">
              <input
                className="input-basic pr-28"
                type="text"
                inputMode="decimal"
                value={formatNumber(form.price_min)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    price_min: parseNumber(e.target.value),
                  })
                }
                placeholder="숫자만 입력"
              />

              {form.price_min ? (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 whitespace-nowrap">
                  {formatKoreanMoney(form.price_min)}
                </span>
              ) : null}
            </div>
          </FormField>

          <FormField label="최대 분양가">
            <div className="relative">
              <input
                className="input-basic pr-28"
                type="text"
                inputMode="decimal"
                value={formatNumber(form.price_max)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    price_max: parseNumber(e.target.value),
                  })
                }
                placeholder="숫자만 입력"
              />

              {form.price_max ? (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 whitespace-nowrap">
                  {formatKoreanMoney(form.price_max)}
                </span>
              ) : null}
            </div>
          </FormField>

          <FormField label="세대 수">
            <input
              className="input-basic"
              type="text"
              inputMode="numeric"
              value={formatNumber(form.unit_count)}
              onChange={(e) =>
                setForm({
                  ...form,
                  unit_count: parseNumber(e.target.value),
                })
              }
            />
          </FormField>

          <FormField label="평면도 URL" className="col-span-2">
            <input
              className="input-basic"
              value={form.floor_plan_url ?? ""}
              onChange={(e) =>
                setForm({ ...form, floor_plan_url: e.target.value })
              }
            />
          </FormField>

          <FormField label="이미지 URL" className="col-span-2">
            <input
              className="input-basic"
              value={form.image_url ?? ""}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            />
          </FormField>
        </div>

        <div className="flex gap-2">
          <button className="btn-primary" onClick={save}>
            저장
          </button>
          {editingId && (
            <button
              className="btn-secondary"
              onClick={() => {
                setEditingId(null);
                setForm({ properties_id: propertyId, type_name: "" });
              }}
            >
              취소
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
