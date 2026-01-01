// app/company/properties/[id]/units/page.tsx

"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Button from "@/components/ui/Button";
import UnitTypeCard from "@/components/company/units/UnitTypeCard";

import type { UnitDraft, UnitRow } from "./types";
import { useUnitTypes } from "./useUnitTypes";
import {
  cn,
  formatPriceRange,
  getUnitStatus,
  toNumberOrNull,
  toPyeong,
  formatKoreanMoney
} from "./utils";
import { validateUnitDraft } from "./validation";
import { mapSupabaseErrorToKorean } from "./errors";

import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";

function buildDraftFromRow(row: UnitRow): UnitDraft {
  return {
    properties_id: row.properties_id,
    type_name: row.type_name ?? "",
    exclusive_area: row.exclusive_area ?? null,
    supply_area: row.supply_area ?? null,
    rooms: row.rooms ?? null,
    bathrooms: row.bathrooms ?? null,
    building_layout: row.building_layout ?? null,
    orientation: row.orientation ?? null,
    price_min: row.price_min ?? null,
    price_max: row.price_max ?? null,
    unit_count: row.unit_count ?? null,
    supply_count: row.supply_count ?? null, // ✅ 추가
    floor_plan_url: row.floor_plan_url ?? null,
    image_url: row.image_url ?? null,
  };
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  inputMode,
  className,
  hint,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  className?: string;
  hint?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm text-(--oboon-text-muted)">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="h-11"
      />
      {hint && (
        <p className="text-xs text-(--oboon-text-muted)">{hint}</p>
      )}
    </div>
  );
}

export default function UnitTypesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const propertyId = Number(params?.id);
  const safePropertyId = Number.isFinite(propertyId) ? propertyId : null;
  const cancelHref = `/company/properties/${propertyId}`;

  const {
    units,
    loading,
    errorMsg,
    createUnit,
    updateUnit,
    deleteUnit,
    clearError,
  } = useUnitTypes(safePropertyId);

  // 생성 폼
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState<UnitDraft>({
    properties_id: safePropertyId ?? 0,
    type_name: "",
    exclusive_area: null,
    supply_area: null,
    rooms: null,
    bathrooms: null,
    building_layout: null,
    orientation: null,
    price_min: null,
    price_max: null,
    unit_count: null,
    supply_count: null, // ✅ 추가
    floor_plan_url: null,
    image_url: null,
  });
  const [createFieldErrors, setCreateFieldErrors] = useState<
    Record<string, string>
  >({});

  // 인라인 수정(단일 카드만)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [inlineDraft, setInlineDraft] = useState<UnitDraft | null>(null);
  const [savingInline, setSavingInline] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const unitCountText = useMemo(() => {
    if (loading) return "불러오는 중...";
    if (units.length === 0) return "아직 등록된 평면 타입이 없어요.";
    return `${units.length}개 평면 타입이 등록되어 있어요.`;
  }, [loading, units.length]);

  const createPricePreview = useMemo(
    () => formatPriceRange(createDraft.price_min, createDraft.price_max),
    [createDraft.price_min, createDraft.price_max]
  );

  // ✅ 추가: 한화 표시
  const createPriceMinKorean = useMemo(
    () => formatKoreanMoney(createDraft.price_min),
    [createDraft.price_min]
  );

  const createPriceMaxKorean = useMemo(
    () => formatKoreanMoney(createDraft.price_max),
    [createDraft.price_max]
  );

  // ✅ 추가: 평형 표시
  const exclusivePyeong = useMemo(
    () => toPyeong(createDraft.exclusive_area),
    [createDraft.exclusive_area]
  );

  const supplyPyeong = useMemo(
    () => toPyeong(createDraft.supply_area),
    [createDraft.supply_area]
  );

  function startInlineEdit(row: UnitRow) {
    clearError();
    setCreateFieldErrors({});
    setEditingId(row.id);
    setInlineDraft(buildDraftFromRow(row));
  }

  function cancelInlineEdit() {
    setEditingId(null);
    setInlineDraft(null);
    setSavingInline(false);
  }

  async function saveInlineEdit() {
    if (!editingId || !inlineDraft) return;

    const v = validateUnitDraft(inlineDraft);
    if (!v.ok) {
      const first = Object.values(v.fieldErrors)[0];
      alert(first ?? "입력값을 확인해 주세요.");
      return;
    }

    setSavingInline(true);
    const res = await updateUnit(editingId, inlineDraft);
    setSavingInline(false);

    if (!res.ok) {
      const appErr = mapSupabaseErrorToKorean({ message: res.error });
      alert(appErr.description ?? appErr.title);
      return;
    }

    cancelInlineEdit();
  }

  async function handleCreate() {
    if (!safePropertyId) return;

    clearError();
    setCreateFieldErrors({});

    const v = validateUnitDraft(createDraft);
    if (!v.ok) {
      setCreateFieldErrors(v.fieldErrors);
      return;
    }

    setCreating(true);
    const res = await createUnit(createDraft);
    setCreating(false);

    if (!res.ok) {
      const appErr = mapSupabaseErrorToKorean({ message: res.error });
      alert(appErr.description ?? appErr.title);
      return;
    }

    // reset
    setCreateDraft((d) => ({
      ...d,
      type_name: "",
      exclusive_area: null,
      supply_area: null,
      rooms: null,
      bathrooms: null,
      building_layout: null,
      orientation: null,
      price_min: null,
      price_max: null,
      unit_count: null,
      supply_count: null, // ✅ 추가
      floor_plan_url: null,
      image_url: null,
    }));
  }

  async function handleDelete(id: number) {
    if (deletingId) return;
    const ok = confirm("이 평면 타입을 삭제할까요?");
    if (!ok) return;

    setDeletingId(id);
    await deleteUnit(id);
    setDeletingId(null);

    if (editingId === id) cancelInlineEdit();
  }

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pt-8 pb-24">
        {/* Top */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-(--oboon-text-title)">
              평면 타입 관리
            </h1>
            <p className="text-sm text-(--oboon-text-muted)">{unitCountText}</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              shape="pill"
              onClick={() => router.push(cancelHref)}
            >
              취소
            </Button>
          </div>
        </div>

        {/* Error (hook) */}
        {errorMsg && (
          <div className="mt-6 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {errorMsg}
          </div>
        )}

        {/* Create Form */}
        <Card className="mt-6">
          <div className="mb-5 space-y-1">
            <p className="text-lg font-semibold text-(--oboon-text-title)">
              새 평면 타입 등록
            </p>
            <p className="text-sm text-(--oboon-text-muted)">
              타입명·전용/공급 면적·가격을 먼저 입력해 주세요.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Field
                label="평면 타입 이름"
                placeholder="예: 76C"
                value={createDraft.type_name ?? ""}
                onChange={(v) =>
                  setCreateDraft((d) => ({ ...d, type_name: v }))
                }
              />
              {createFieldErrors.type_name && (
                <div className="text-xs text-red-500">
                  {createFieldErrors.type_name}
                </div>
              )}
            </div>

            {/* ✅ 전용면적 + 평형 표시 */}
            <Field
              label="전용 면적 (㎡)"
              placeholder="예: 75"
              value={
                createDraft.exclusive_area == null
                  ? ""
                  : String(createDraft.exclusive_area)
              }
              inputMode="decimal"
              onChange={(v) =>
                setCreateDraft((d) => ({
                  ...d,
                  exclusive_area: toNumberOrNull(v),
                }))
              }
              hint={exclusivePyeong ? `${exclusivePyeong}평` : undefined}
            />

            {/* ✅ 공급면적 + 평형 표시 */}
            <Field
              label="공급 면적 (㎡)"
              placeholder="예: 92"
              value={
                createDraft.supply_area == null
                  ? ""
                  : String(createDraft.supply_area)
              }
              inputMode="decimal"
              onChange={(v) =>
                setCreateDraft((d) => ({
                  ...d,
                  supply_area: toNumberOrNull(v),
                }))
              }
              hint={supplyPyeong ? `${supplyPyeong}평` : undefined}
            />

            <div className="grid grid-cols-2 gap-4">
              <Field
                label="방 개수"
                value={
                  createDraft.rooms == null ? "" : String(createDraft.rooms)
                }
                inputMode="numeric"
                onChange={(v) =>
                  setCreateDraft((d) => ({ ...d, rooms: toNumberOrNull(v) }))
                }
              />
              <Field
                label="욕실 개수"
                value={
                  createDraft.bathrooms == null
                    ? ""
                    : String(createDraft.bathrooms)
                }
                inputMode="numeric"
                onChange={(v) =>
                  setCreateDraft((d) => ({
                    ...d,
                    bathrooms: toNumberOrNull(v),
                  }))
                }
              />
            </div>

            <Field
              label="구조"
              placeholder="예: 판상형"
              value={createDraft.building_layout ?? ""}
              onChange={(v) =>
                setCreateDraft((d) => ({ ...d, building_layout: v }))
              }
            />

            <Field
              label="향"
              placeholder="예: 남향"
              value={createDraft.orientation ?? ""}
              onChange={(v) =>
                setCreateDraft((d) => ({ ...d, orientation: v }))
              }
            />

            {/* ✅ 가격 + 한화 표시 */}
            <div className="md:col-span-2">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field
                  label="가격 하한 (원)"
                  placeholder="예: 850000000"
                  value={
                    createDraft.price_min == null
                      ? ""
                      : String(createDraft.price_min)
                  }
                  inputMode="numeric"
                  onChange={(v) =>
                    setCreateDraft((d) => ({
                      ...d,
                      price_min: toNumberOrNull(v),
                    }))
                  }
                  hint={createPriceMinKorean}
                />
                <Field
                  label="가격 상한 (원)"
                  placeholder="예: 990000000"
                  value={
                    createDraft.price_max == null
                      ? ""
                      : String(createDraft.price_max)
                  }
                  inputMode="numeric"
                  onChange={(v) =>
                    setCreateDraft((d) => ({
                      ...d,
                      price_max: toNumberOrNull(v),
                    }))
                  }
                  hint={createPriceMaxKorean}
                />
              </div>

              {createPricePreview ? (
                <div className="mt-2 text-xs text-(--oboon-text-muted)">
                  가격 미리보기 · {createPricePreview}
                </div>
              ) : null}
            </div>

            <Field
              label="세대수"
              value={
                createDraft.unit_count == null
                  ? ""
                  : String(createDraft.unit_count)
              }
              inputMode="numeric"
              onChange={(v) =>
                setCreateDraft((d) => ({ ...d, unit_count: toNumberOrNull(v) }))
              }
            />

            {/* ✅ 추가: 공급규모 (일반 청약 공급 세대수) */}
            <Field
              label="공급규모"
              placeholder="예: 100"
              value={
                createDraft.supply_count == null
                  ? ""
                  : String(createDraft.supply_count)
              }
              inputMode="numeric"
              onChange={(v) =>
                setCreateDraft((d) => ({
                  ...d,
                  supply_count: toNumberOrNull(v),
                }))
              }
              hint="일반 청약 공급 세대 수"
            />

            <Field
              label="평면도 URL"
              placeholder="https://..."
              value={createDraft.floor_plan_url ?? ""}
              onChange={(v) =>
                setCreateDraft((d) => ({ ...d, floor_plan_url: v }))
              }
              className="md:col-span-2"
            />

            <Field
              label="이미지 URL"
              placeholder="https://..."
              value={createDraft.image_url ?? ""}
              onChange={(v) => setCreateDraft((d) => ({ ...d, image_url: v }))}
              className="md:col-span-2"
            />
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              variant="primary"
              size="md"
              shape="pill"
              onClick={handleCreate}
              disabled={creating || !safePropertyId}
              loading={creating}
            >
              저장
            </Button>
          </div>
        </Card>

        {/* List */}
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-base font-semibold text-(--oboon-text-title)">
              등록된 평면 타입
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:grid-flow-row-dense">
            {units.map((u) => {
              const isEditing = editingId === u.id;
              return (
                <UnitTypeCard
                  key={u.id}
                  unit={u}
                  status={getUnitStatus(u)}
                  isEditing={isEditing}
                  draft={isEditing ? inlineDraft : null}
                  saving={savingInline}
                  onStartEdit={() => startInlineEdit(u)}
                  onDelete={() => handleDelete(u.id)}
                  onCancel={cancelInlineEdit}
                  onSave={saveInlineEdit}
                  onChange={(key, value) =>
                    setInlineDraft((d) => (d ? { ...d, [key]: value } : d))
                  }
                />
              );
            })}
          </div>
        </section>
      </PageContainer>
    </main>
  );
}