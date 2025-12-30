"use client";

import { useEffect, useMemo, useState, useRef } from "react";
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
  confirmed_comment: string | null;
  estimated_comment: string | null;
  pending_comment: string | null;
};

type RelationRow = { id: number };

type PropertyDetail = PropertyRow & {
  property_locations?: RelationRow | RelationRow[] | null;
  property_facilities?: RelationRow | RelationRow[] | null;
  property_specs?: RelationRow | RelationRow[] | null;
  property_timeline?: RelationRow | RelationRow[] | null;
  property_unit_types?: RelationRow | RelationRow[] | null;
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
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
        confirmed_comment,
        estimated_comment,
        pending_comment,
        property_locations(id),
        property_facilities(id),
        property_specs!properties_id(id),
        property_timeline!properties_id(id),
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
        confirmed_comment: data.confirmed_comment,
        estimated_comment: data.estimated_comment,
        pending_comment: data.pending_comment,
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

    const hasData = (v: any) => {
      if (!v) return false;
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === "object") return v.id !== undefined;
      return false;
    };

    return {
      siteLocationDone: hasData(data.property_locations),
      facilityDone: hasData(data.property_facilities),
      specsDone: hasData(data.property_specs),
      timelineDone: hasData(data.property_timeline),
      unitDone: hasData(data.property_unit_types),
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
        confirmed_comment: form.confirmed_comment || null,
        estimated_comment: form.estimated_comment || null,
        pending_comment: form.pending_comment || null,
      })
      .eq("id", id);

    if (error) {
      alert("저장 실패: " + error.message);
      setSaving(false);
      return;
    }

    setLocalPreview(null);
    await load();

    setEditMode(false);
    setSaving(false);
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
                    confirmed_comment: data.confirmed_comment,
                    estimated_comment: data.estimated_comment,
                    pending_comment: data.pending_comment,
                  });
                  setLocalPreview(null);
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
                    {s.label}
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

          <FormField label="대표 이미지" className="col-span-2">
            {editMode ? (
              <div className="space-y-3">
                {/* 숨겨진 파일 input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    const previewUrl = URL.createObjectURL(file);
                    setLocalPreview(previewUrl);


                    if (file.size > 5 * 1024 * 1024) {
                      alert("이미지는 5MB 이하만 가능합니다.");
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                      return;
                    }

                    try {
                      const formData = new FormData();
                      formData.append("file", file);
                      formData.append("propertyId", String(id));

                      const res = await fetch("/api/r2/upload", {
                        method: "POST",
                        body: formData,
                      });

                      if (!res.ok) {
                        const err = await res.json();
                        throw new Error(err?.error || "upload failed");
                      }

                      const data = await res.json();
                      setForm((prev) => ({ ...prev!, image_url: data.url }));
                    } catch (err: any) {
                      alert("이미지 업로드 실패: " + err.message);
                    } finally {
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }
                  }}



                />

                {/* 버튼 영역 */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded bg-slate-700 text-white hover:bg-slate-600"
                  >
                    📷 이미지 업로드
                  </button>

                  {form.image_url && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!confirm("대표 이미지를 삭제하시겠습니까?")) return;
                        setForm((prev) => ({ ...prev!, image_url: null }));
                      }}
                      className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-500"
                    >
                      🗑 이미지 삭제
                    </button>
                  )}
                  <span className="text-xs text-gray-400">
                    이미지는 5MB 이하만 가능합니다.
                  </span>
                </div>

                {/* 미리보기 */}
                {localPreview ? (
                  <img
                    src={localPreview}
                    alt="대표 이미지 미리보기"
                    className="w-full max-h-[320px] object-cover rounded border"
                  />
                ) : form.image_url ? (
                  <img
                    src={form.image_url}
                    alt="대표 이미지"
                    className="w-full max-h-[320px] object-cover rounded border"
                  />
                ) : (
                  <div className="w-full h-[320px] border rounded bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                    이미지 없음
                  </div>
                )}

              </div>
            ) : form.image_url ? (
              <img
                src={form.image_url}
                alt="대표 이미지"
                className="w-full max-h-[320px] object-cover rounded border"
              />
            ) : (
              <div className="input-readonly">-</div>
            )
            }
          </FormField>
        </div>
        {/* ===== 감정평가사 메모 ===== */}
        <div className="col-span-2 border-t border-gray-600 pt-4 space-y-4">
          <h2 className="font-semibold text-lg">감정평가사 메모</h2>

          <FormField label="확정 내용">
            {editMode ? (
              <textarea
                className="input-basic min-h-[80px]"
                value={form.confirmed_comment ?? ""}
                onChange={(e) =>
                  setForm({ ...form, confirmed_comment: e.target.value })
                }
              />
            ) : (
              <div className="input-readonly whitespace-pre-wrap">
                {data.confirmed_comment || "-"}
              </div>
            )}
          </FormField>

          <FormField label="추정 내용">
            {editMode ? (
              <textarea
                className="input-basic min-h-[80px]"
                value={form.estimated_comment ?? ""}
                onChange={(e) =>
                  setForm({ ...form, estimated_comment: e.target.value })
                }
              />
            ) : (
              <div className="input-readonly whitespace-pre-wrap">
                {data.estimated_comment || "-"}
              </div>
            )}
          </FormField>

          <FormField label="미정 내용">
            {editMode ? (
              <textarea
                className="input-basic min-h-[80px]"
                value={form.pending_comment ?? ""}
                onChange={(e) =>
                  setForm({ ...form, pending_comment: e.target.value })
                }
              />
            ) : (
              <div className="input-readonly whitespace-pre-wrap">
                {data.pending_comment || "-"}
              </div>
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
