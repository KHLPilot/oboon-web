"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { FormField } from "@/app/components/FormField";

/* ==================================================
   상수
================================================== */

const STATUS_OPTIONS = [
  { value: "ONGOING", label: "분양중" },
  { value: "READY", label: "분양 예정" },
  { value: "CLOSED", label: "분양 마감" },
];

/* ==================================================
   타입
================================================== */

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

type PropertyDetail = PropertyRow & {
  property_locations?: RelationRow[] | null;
  property_facilities?: RelationRow[] | null;
  property_specs?: RelationRow[] | null;
  property_timeline?: RelationRow[] | null;
  property_unit_types?: RelationRow[] | null;
};

/* ==================================================
   섹션 카드
================================================== */

function SectionCard({
  title,
  completed,
  href,
}: {
  title: string;
  completed: boolean;
  href: string;
}) {
  return (
    <div
      className={`border rounded p-4 flex justify-between items-center
        ${completed ? "border-green-500" : "border-red-500"}
      `}
    >
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p
          className={`text-sm ${completed ? "text-green-400" : "text-red-400"}`}
        >
          {completed ? "입력 완료" : "추가 입력 필요"}
        </p>
      </div>

      <Link
        href={href}
        className={`px-3 py-1 rounded text-sm font-semibold
          ${completed ? "bg-green-500 text-black" : "bg-yellow-400 text-black"}
        `}
      >
        {completed ? "수정" : "입력"}
      </Link>
    </div>
  );
}

/* ==================================================
   페이지
================================================== */

export default function PropertyDetailPage() {
  const supabase = createSupabaseClient();
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [data, setData] = useState<PropertyDetail | null>(null);
  const [form, setForm] = useState<PropertyRow | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  /* ---------- 데이터 로드 ---------- */
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
        property_specs!properties_id(id),
        property_timeline(id),
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

  /* ---------- 입력 완료 여부 ---------- */
  const completion = useMemo(() => {
    if (!data) return null;

    // 1:N 관계 체크 (일반적인 배열 관계는 이 함수를 사용)
    const hasMany = (v?: RelationRow[] | null) =>
      Array.isArray(v) && v.length > 0;

    // 1:1 관계 체크를 위한 특별 함수:
    // TypeScript 컴파일러를 위해 배열 타입을 유지하면서도,
    // 실제 런타임 값이 null이 아닌 객체라면 true를 반환하도록 처리합니다.
    const hasSpecs = (v?: RelationRow[] | null) => {
      // 1. 배열이라면 (1:N처럼 온 경우) 길이가 0보다 커야 합니다.
      if (Array.isArray(v)) {
        return v.length > 0;
      }
      // 2. 배열이 아니라면 (1:1 객체나 null이 온 경우), 값이 존재하는지 (null이 아닌지) 확인합니다.
      // 이 로직은 TypeScript 오류를 피하면서 런타임 값을 정확하게 검사합니다.
      return !!v;
    };

    return {
      siteLocationDone: hasMany(data.property_locations),
      facilityDone: hasMany(data.property_facilities),

      // 건물 스펙에 1:1 체크 로직 적용
      specsDone: hasSpecs(data.property_specs),

      timelineDone: hasMany(data.property_timeline),
      unitDone: hasMany(data.property_unit_types),
    };
  }, [data]);

  /* ---------- 기본정보 저장 ---------- */
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

  /* ---------- 삭제 ---------- */
  async function handleDelete() {
    if (!confirm("정말 이 현장을 삭제하시겠습니까?\n복구할 수 없습니다."))
      return;

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

  if (loading) return <div className="p-6">불러오는 중...</div>;
  if (!data || !form) return <div className="p-6">데이터 없음</div>;

  const c = completion!;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* ================= 기본 정보 ================= */}
      <section className="border border-gray-700 rounded p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">기본 정보</h1>

          {!editMode ? (
            <div className="flex gap-2">
              <button className="btn-primary" onClick={() => setEditMode(true)}>
                수정
              </button>
              <button className="btn-danger" onClick={handleDelete}>
                삭제
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                className="btn-secondary"
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
              </button>
              <button
                className="btn-primary"
                onClick={saveBasicInfo}
                disabled={saving}
              >
                {saving ? "저장중..." : "저장"}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="현장명">
            {editMode ? (
              <input
                className="input-basic"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            ) : (
              <div className="input-readonly">{data.name}</div>
            )}
          </FormField>

          <FormField label="분양 유형">
            {editMode ? (
              <input
                className="input-basic"
                value={form.property_type ?? ""}
                onChange={(e) =>
                  setForm({ ...form, property_type: e.target.value })
                }
              />
            ) : (
              <div className="input-readonly">{data.property_type ?? "-"}</div>
            )}
          </FormField>

          <FormField label="연락처">
            {editMode ? (
              <input
                className="input-basic"
                value={form.phone_number ?? ""}
                onChange={(e) =>
                  setForm({ ...form, phone_number: e.target.value })
                }
              />
            ) : (
              <div className="input-readonly">{data.phone_number ?? "-"}</div>
            )}
          </FormField>

          <FormField label="분양 상태">
            {editMode ? (
              <select
                className="input-basic"
                value={form.status ?? ""}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="">선택</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    ㅌ{s.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="input-readonly">
                {STATUS_OPTIONS.find((s) => s.value === data.status)?.label ??
                  "-"}
              </div>
            )}
          </FormField>

          <FormField label="설명" className="col-span-2">
            {editMode ? (
              <textarea
                className="input-basic min-h-[100px]"
                value={form.description ?? ""}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            ) : (
              <div className="input-readonly whitespace-pre-wrap">
                {data.description ?? "-"}
              </div>
            )}
          </FormField>

          <FormField label="대표 이미지 URL" className="col-span-2">
            {editMode ? (
              <input
                className="input-basic"
                value={form.image_url ?? ""}
                onChange={(e) =>
                  setForm({ ...form, image_url: e.target.value })
                }
              />
            ) : (
              <div className="input-readonly">{data.image_url ?? "-"}</div>
            )}
          </FormField>
        </div>
      </section>

      {/* ================= 하위 입력 상태 ================= */}
      <section className="space-y-3">
        <SectionCard
          title="현장 위치"
          completed={c.siteLocationDone}
          href={`/company/properties/${id}/location`}
        />
        <SectionCard
          title="홍보시설"
          completed={c.facilityDone}
          href={`/company/properties/${id}/facilities`}
        />
        <SectionCard
          title="건물 스펙"
          completed={c.specsDone}
          href={`/company/properties/${id}/specs`}
        />
        <SectionCard
          title="일정"
          completed={c.timelineDone}
          href={`/company/properties/${id}/timeline`}
        />
        <SectionCard
          title="평면 타입"
          completed={c.unitDone}
          href={`/company/properties/${id}/units`}
        />
      </section>

      <Link
        href="/company/properties"
        className="text-sm text-gray-400 underline"
      >
        ← 목록으로 돌아가기
      </Link>
    </div>
  );
}
