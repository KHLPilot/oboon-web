// app/company/properties/[id]/units/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Button from "@/components/ui/Button";
import UnitTypeCard from "@/components/company/units/UnitTypeCard";

import type { UnitDraft, UnitRow } from "./types";
import { useUnitTypes, uploadFloorPlan } from "./useUnitTypes";
import {
  cn,
  formatPriceRange,
  getUnitStatus,
  toNumberOrNull,
  toIntOrNull,
  toPyeong,
  formatKoreanMoney,
} from "./utils";
import { validateUnitDraft } from "./validation";
import { mapSupabaseErrorToKorean } from "./errors";
import { showAlert } from "@/shared/alert";

import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import { FormField } from "@/app/components/FormField";

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
    supply_count: row.supply_count ?? null,
    floor_plan_url: row.floor_plan_url ?? null,
  };
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

  // ✅ 전용/공급 면적 입력용 “문자열 상태”
  const [exclusiveAreaText, setExclusiveAreaText] = useState("");
  const [supplyAreaText, setSupplyAreaText] = useState("");

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
    supply_count: null,
    floor_plan_url: null,
  });
  const [createFieldErrors, setCreateFieldErrors] = useState<
    Record<string, string>
  >({});

  const [floorPlanUploading, setFloorPlanUploading] = useState(false);

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
    [createDraft.price_min, createDraft.price_max],
  );

  const createPriceMinKorean = useMemo(
    () => formatKoreanMoney(createDraft.price_min),
    [createDraft.price_min],
  );

  const createPriceMaxKorean = useMemo(
    () => formatKoreanMoney(createDraft.price_max),
    [createDraft.price_max],
  );

  const exclusivePyeong = useMemo(
    () => toPyeong(createDraft.exclusive_area),
    [createDraft.exclusive_area],
  );

  const supplyPyeong = useMemo(
    () => toPyeong(createDraft.supply_area),
    [createDraft.supply_area],
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
      showAlert(first ?? "입력값을 확인해 주세요.");
      return;
    }

    setSavingInline(true);
    const res = await updateUnit(editingId, inlineDraft);
    setSavingInline(false);

    if (!res.ok) {
      const appErr = mapSupabaseErrorToKorean({ message: res.error });
      showAlert(appErr.description ?? appErr.title);
      return;
    }

    cancelInlineEdit();
  }

  // ✅ 평면도 파일 선택 → 업로드 → floor_plan_url 세팅
  async function handlePickFloorPlan(file: File) {
    if (!safePropertyId) return;

    try {
      setFloorPlanUploading(true);

      const url = await uploadFloorPlan({
        file,
        propertyId: safePropertyId,
        unitTypeName: (createDraft.type_name ?? "").trim() || undefined,
      });

      setCreateDraft((d) => ({ ...d, floor_plan_url: url }));
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "평면도 업로드에 실패했어요.";
      showAlert(msg);
    } finally {
      setFloorPlanUploading(false);
    }
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
      showAlert(appErr.description ?? appErr.title);
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
      supply_count: null,
      floor_plan_url: null,
    }));
    setExclusiveAreaText("");
    setSupplyAreaText("");
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
    <main className="bg-(--oboon-bg-default)">
      <PageContainer>
        <div className="py-8 md:py-0">
          <div className="flex w-full flex-col gap-6">
            {/* Top */}
            <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 space-y-1">
                <h1 className="ob-typo-h1 text-(--oboon-text-title)">
                  평면 타입 관리
                </h1>
                <p className="ob-typo-body text-(--oboon-text-muted)">
                  전용/공급 면적·가격·세대수·평면도 등을 등록하세요.
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  shape="pill"
                  onClick={() => router.push(cancelHref)}
                >
                  목록으로
                </Button>
              </div>
            </header>

            {/* Error (hook) */}
            {errorMsg ? (
              <div className="rounded-2xl border border-(--oboon-danger-border) bg-(--oboon-danger) px-4 py-3">
                <p className="ob-typo-body text-(--oboon-danger)">{errorMsg}</p>
              </div>
            ) : null}

            {/* Create Form */}
            <Card className="p-5">
              <div className="mb-5 space-y-1">
                <p className="ob-typo-h3 text-(--oboon-text-title)">
                  새 평면 타입 등록
                </p>
                <p className="ob-typo-body text-(--oboon-text-muted)">
                  타입명·전용/공급 면적·가격을 먼저 입력해 주세요.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* 타입명 + 에러 */}
                <FormField label="평면 타입 이름" className="gap-2">
                  <Input
                    className="h-11"
                    placeholder="예: 76C"
                    value={createDraft.type_name ?? ""}
                    onChange={(e) =>
                      setCreateDraft((d) => ({
                        ...d,
                        type_name: e.target.value,
                      }))
                    }
                  />
                  {createFieldErrors.type_name ? (
                    <p className="ob-typo-caption text-red-500">
                      {createFieldErrors.type_name}
                    </p>
                  ) : null}
                </FormField>

                {/* 전용면적 + 평 */}
                <FormField label="전용 면적 (㎡)" className="gap-2">
                  <Input
                    className="h-11"
                    placeholder="예: 75.5"
                    inputMode="decimal"
                    value={exclusiveAreaText}
                    onChange={(e) => {
                      const v = e.target.value;
                      setExclusiveAreaText(v);
                      setCreateDraft((d) => ({
                        ...d,
                        exclusive_area: toNumberOrNull(v),
                      }));
                    }}
                  />
                  {exclusivePyeong ? (
                    <p className="ob-typo-caption text-(--oboon-text-muted)">
                      {exclusivePyeong}평
                    </p>
                  ) : null}
                </FormField>

                {/* 공급면적 + 평 */}
                <FormField label="공급 면적 (㎡)" className="gap-2">
                  <Input
                    className="h-11"
                    placeholder="예: 92.3"
                    inputMode="decimal"
                    value={supplyAreaText}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSupplyAreaText(v);
                      setCreateDraft((d) => ({
                        ...d,
                        supply_area: toNumberOrNull(v),
                      }));
                    }}
                  />
                  {supplyPyeong ? (
                    <p className="ob-typo-caption text-(--oboon-text-muted)">
                      {supplyPyeong}평
                    </p>
                  ) : null}
                </FormField>

                {/* 방/욕실 */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="방 개수" className="gap-2">
                    <Input
                      className="h-11"
                      inputMode="numeric"
                      value={
                        createDraft.rooms == null
                          ? ""
                          : String(createDraft.rooms)
                      }
                      onChange={(e) =>
                        setCreateDraft((d) => ({
                          ...d,
                          rooms: toIntOrNull(e.target.value),
                        }))
                      }
                    />
                  </FormField>

                  <FormField label="욕실 개수" className="gap-2">
                    <Input
                      className="h-11"
                      inputMode="numeric"
                      value={
                        createDraft.bathrooms == null
                          ? ""
                          : String(createDraft.bathrooms)
                      }
                      onChange={(e) =>
                        setCreateDraft((d) => ({
                          ...d,
                          bathrooms: toIntOrNull(e.target.value),
                        }))
                      }
                    />
                  </FormField>
                </div>

                {/* 구조 */}
                <FormField label="구조" className="gap-2">
                  <Input
                    className="h-11"
                    placeholder="예: 판상형"
                    value={createDraft.building_layout ?? ""}
                    onChange={(e) =>
                      setCreateDraft((d) => ({
                        ...d,
                        building_layout: e.target.value,
                      }))
                    }
                  />
                </FormField>

                {/* 향 */}
                <FormField label="향" className="gap-2">
                  <Input
                    className="h-11"
                    placeholder="예: 남향"
                    value={createDraft.orientation ?? ""}
                    onChange={(e) =>
                      setCreateDraft((d) => ({
                        ...d,
                        orientation: e.target.value,
                      }))
                    }
                  />
                </FormField>

                {/* 가격 */}
                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField label="가격 하한 (원)" className="gap-2">
                      <Input
                        className="h-11"
                        placeholder="예: 850000000"
                        inputMode="numeric"
                        value={
                          createDraft.price_min == null
                            ? ""
                            : String(createDraft.price_min)
                        }
                        onChange={(e) =>
                          setCreateDraft((d) => ({
                            ...d,
                            price_min: toNumberOrNull(e.target.value),
                          }))
                        }
                      />
                      {createPriceMinKorean ? (
                        <p className="ob-typo-caption text-(--oboon-text-muted)">
                          {createPriceMinKorean}
                        </p>
                      ) : null}
                    </FormField>

                    <FormField label="가격 상한 (원)" className="gap-2">
                      <Input
                        className="h-11"
                        placeholder="예: 990000000"
                        inputMode="numeric"
                        value={
                          createDraft.price_max == null
                            ? ""
                            : String(createDraft.price_max)
                        }
                        onChange={(e) =>
                          setCreateDraft((d) => ({
                            ...d,
                            price_max: toNumberOrNull(e.target.value),
                          }))
                        }
                      />
                      {createPriceMaxKorean ? (
                        <p className="ob-typo-caption text-(--oboon-text-muted)">
                          {createPriceMaxKorean}
                        </p>
                      ) : null}
                    </FormField>
                  </div>

                  {createPricePreview ? (
                    <p className="mt-2 ob-typo-caption text-(--oboon-text-muted)">
                      가격 미리보기 · {createPricePreview}
                    </p>
                  ) : null}
                </div>

                {/* 세대수 */}
                <FormField label="세대수" className="gap-2">
                  <Input
                    className="h-11"
                    inputMode="numeric"
                    value={
                      createDraft.unit_count == null
                        ? ""
                        : String(createDraft.unit_count)
                    }
                    onChange={(e) =>
                      setCreateDraft((d) => ({
                        ...d,
                        unit_count: toIntOrNull(e.target.value),
                      }))
                    }
                  />
                </FormField>

                {/* 공급규모 */}
                <FormField label="공급규모" className="gap-2">
                  <Input
                    className="h-11"
                    placeholder="예: 100"
                    inputMode="numeric"
                    value={
                      createDraft.supply_count == null
                        ? ""
                        : String(createDraft.supply_count)
                    }
                    onChange={(e) =>
                      setCreateDraft((d) => ({
                        ...d,
                        supply_count: toIntOrNull(e.target.value),
                      }))
                    }
                  />
                  <p className="ob-typo-caption text-(--oboon-text-muted)">
                    일반 청약 공급 세대 수
                  </p>
                </FormField>

                {/* 평면도 이미지 */}
                <div className="md:col-span-2">
                  <FormField label="평면도 이미지" className="gap-2">
                    <div className="flex flex-col gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        disabled={!safePropertyId || floorPlanUploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          if (!f) return;
                          e.currentTarget.value = "";
                          void handlePickFloorPlan(f);
                        }}
                        className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-(--oboon-bg-subtle) file:px-4 file:py-2 file:text-sm file:font-medium file:text-(--oboon-text-title) hover:file:bg-(--oboon-bg-subtle)/80"
                      />

                      <p className="ob-typo-caption text-(--oboon-text-muted)">
                        이미지 선택 시 자동 업로드됩니다.
                      </p>

                      {createDraft.floor_plan_url ? (
                        <div className="mt-2 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="ob-typo-caption text-(--oboon-text-title)">
                                업로드 완료
                              </p>
                              <p className="mt-1 ob-typo-caption text-(--oboon-text-muted) break-all">
                                {createDraft.floor_plan_url}
                              </p>
                            </div>

                            <Button
                              variant="secondary"
                              size="sm"
                              shape="pill"
                              onClick={() =>
                                setCreateDraft((d) => ({
                                  ...d,
                                  floor_plan_url: null,
                                }))
                              }
                            >
                              삭제
                            </Button>
                          </div>

                          <div className="mt-3 overflow-hidden rounded-xl border border-(--oboon-border-default)">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={createDraft.floor_plan_url}
                              alt="floor plan preview"
                              className="h-auto w-full object-cover"
                            />
                          </div>
                        </div>
                      ) : null}

                      {floorPlanUploading ? (
                        <p className="ob-typo-caption text-(--oboon-text-muted)">
                          업로드 중...
                        </p>
                      ) : null}
                    </div>
                  </FormField>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  variant="primary"
                  size="md"
                  shape="pill"
                  onClick={handleCreate}
                  disabled={creating || !safePropertyId || floorPlanUploading}
                  loading={creating}
                >
                  저장
                </Button>
              </div>
            </Card>

            {/* List */}
            <section className="mt-2">
              <div className="flex items-center justify-between">
                <p className="ob-typo-h2 text-(--oboon-text-title)">
                  등록된 평면 타입
                </p>
              </div>
              <p className="mb-4 ob-typob-bod text-(--oboon-text-muted)">
                {unitCountText}
              </p>

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
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
