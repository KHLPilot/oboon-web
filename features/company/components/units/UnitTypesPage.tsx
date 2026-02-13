// app/company/properties/[id]/units/page.tsx
"use client";

import { useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { X } from "lucide-react";

import Button from "@/components/ui/Button";
import UnitTypeCard from "./UnitTypeCard";

import type { UnitDraft, UnitRow } from "@/features/company/domain/unit.types";
import { useUnitTypes } from "./useUnitTypes";
import { uploadFloorPlan } from "@/features/company/services/unitTypes.upload";
import {
  formatPriceRange,
  getUnitStatus,
  toNumberOrNull,
  toIntOrNull,
  toPyeong,
  formatKoreanMoney,
} from "@/features/company/domain/unit.utils";
import { validateUnitDraft } from "@/features/company/domain/unit.validation";
import { mapSupabaseErrorToKorean } from "@/features/company/domain/unit.errors";
import { showAlert } from "@/shared/alert";
import { useRequirePropertyEditAccess } from "@/features/company/hooks/useRequirePropertyEditAccess";

import PageContainer from "@/components/shared/PageContainer";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { FormField } from "@/components/shared/FormField";

function hasAreaUnitSuffix(value: string | null | undefined) {
  return /(㎡|m²|m2)\s*$/i.test((value ?? "").trim());
}

function ensureAreaUnitSuffix(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  if (hasAreaUnitSuffix(raw)) return raw;
  return `${raw}㎡`;
}

function stripAreaUnitSuffix(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  return raw.replace(/\s*(㎡|m²|m2)\s*$/i, "").trim();
}

function toFloorPlanPayload(urls: string[]) {
  const normalized = Array.from(
    new Set(urls.map((v) => v.trim()).filter((v) => v.length > 0)),
  );
  return {
    floor_plan_url: normalized[0] ?? null,
    image_url:
      normalized.length > 0 ? JSON.stringify(normalized) : null,
  };
}

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
    is_price_public: row.is_price_public ?? true,
    is_public: row.is_public ?? true,
    unit_count: row.unit_count ?? null,
    supply_count: row.supply_count ?? null,
    floor_plan_url: row.floor_plan_url ?? null,
    image_url: row.image_url ?? null,
  };
}

export default function UnitTypesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const propertyId = Number(params?.id);
  const safePropertyId = Number.isFinite(propertyId) ? propertyId : null;
  const { loading: accessLoading, allowed: canAccessProperty } =
    useRequirePropertyEditAccess(propertyId);
  const cancelHref = `/company/properties/${propertyId}`;

  const {
    units,
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
    is_price_public: true,
    is_public: true,
    unit_count: null,
    supply_count: null,
    floor_plan_url: null,
    image_url: null,
  });
  const [createFieldErrors, setCreateFieldErrors] = useState<
    Record<string, string>
  >({});

  const [floorPlanUploading, setFloorPlanUploading] = useState(false);
  const [appendAreaUnit, setAppendAreaUnit] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createFloorPlanUrls, setCreateFloorPlanUrls] = useState<string[]>([]);
  const createFloorPlanInputRef = useRef<HTMLInputElement | null>(null);

  // 인라인 수정(단일 카드만)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [inlineDraft, setInlineDraft] = useState<UnitDraft | null>(null);
  const [savingInline, setSavingInline] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  async function handlePickFloorPlans(files: File[]) {
    if (!safePropertyId) return;
    if (files.length === 0) return;

    if (createFloorPlanUrls.length + files.length > 5) {
      showAlert("평면도 이미지는 최대 5장까지 업로드할 수 있습니다.");
      return;
    }

    try {
      setFloorPlanUploading(true);
      const uploaded: string[] = [];
      for (const file of files) {
        const url = await uploadFloorPlan({
          file,
          propertyId: safePropertyId,
          unitTypeName: (createDraft.type_name ?? "").trim() || undefined,
        });
        uploaded.push(url);
      }

      setCreateFloorPlanUrls((prev) =>
        Array.from(new Set([...prev, ...uploaded])),
      );
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? (e instanceof Error ? e.message : "알 수 없는 오류") : "평면도 업로드에 실패했어요.";
      showAlert(msg);
    } finally {
      setFloorPlanUploading(false);
    }
  }

  async function handleCreate() {
    if (!safePropertyId) return;

    clearError();
    setCreateFieldErrors({});

    const floorPlanPayload = toFloorPlanPayload(createFloorPlanUrls);
    const draftForCreate: UnitDraft = {
      ...createDraft,
      type_name: appendAreaUnit
        ? ensureAreaUnitSuffix(createDraft.type_name)
        : (createDraft.type_name ?? "").trim(),
      floor_plan_url: floorPlanPayload.floor_plan_url,
      image_url: floorPlanPayload.image_url,
    };

    const v = validateUnitDraft(draftForCreate);
    if (!v.ok) {
      setCreateFieldErrors(v.fieldErrors);
      return;
    }

    setCreating(true);
    const res = await createUnit(draftForCreate);
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
      is_price_public: true,
      is_public: true,
      unit_count: null,
      supply_count: null,
      floor_plan_url: null,
      image_url: null,
    }));
    setCreateFloorPlanUrls([]);
    setExclusiveAreaText("");
    setSupplyAreaText("");
    setCreateModalOpen(false);
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

  async function handleToggleUnitPublic(unit: UnitRow, nextIsPublic: boolean) {
    const nextDraft: UnitDraft = {
      ...buildDraftFromRow(unit),
      is_public: nextIsPublic,
    };
    await updateUnit(unit.id, nextDraft);
  }

  if (accessLoading) {
    return (
      <div className="px-4 py-8 ob-typo-body text-(--oboon-text-muted)">
        권한 확인 중...
      </div>
    );
  }

  if (!canAccessProperty) return null;

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
                  variant="primary"
                  size="sm"
                  shape="pill"
                  onClick={() => setCreateModalOpen(true)}
                >
                  새 평면 타입 등록
                </Button>
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
              <div className="rounded-2xl border border-(--oboon-danger-border) bg-(--oboon-danger-bg) px-4 py-3">
                <p className="ob-typo-body text-(--oboon-danger)">{errorMsg}</p>
              </div>
            ) : null}

            <Modal
              open={createModalOpen}
              onClose={() => setCreateModalOpen(false)}
              size="lg"
            >
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
                    placeholder="예: 76C"
                    value={createDraft.type_name ?? ""}
                    onChange={(e) =>
                      setCreateDraft((d) => ({
                        ...d,
                        type_name: appendAreaUnit
                          ? ensureAreaUnitSuffix(e.target.value)
                          : e.target.value,
                      }))
                    }
                  />
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={appendAreaUnit}
                      onChange={(e) => {
                        const nextChecked = e.target.checked;
                        setAppendAreaUnit(nextChecked);
                        setCreateDraft((d) => ({
                          ...d,
                          type_name: nextChecked
                            ? ensureAreaUnitSuffix(d.type_name)
                            : stripAreaUnitSuffix(d.type_name),
                        }));
                      }}
                    />
                    <span className="ob-typo-caption text-(--oboon-text-muted)">
                      타입명 뒤에 ㎡ 붙이기
                    </span>
                  </label>
                  {createFieldErrors.type_name ? (
                    <p className="ob-typo-caption text-(--oboon-danger)">
                      {createFieldErrors.type_name}
                    </p>
                  ) : null}
                </FormField>

                {/* 전용면적 + 평 */}
                <FormField label="전용 면적 (㎡)" className="gap-2">
                  <Input
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

                  <div className="mt-3 flex items-center justify-between rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle)/50 px-3 py-2">
                    <div>
                      <p className="ob-typo-body text-(--oboon-text-title)">
                        가격 공개
                      </p>
                      <p className="ob-typo-caption text-(--oboon-text-muted)">
                        끄면 게시된 화면에서 이 평면 타입 가격이 비공개 처리됩니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={createDraft.is_price_public}
                      aria-label="가격 공개"
                      onClick={() =>
                        setCreateDraft((d) => ({
                          ...d,
                          is_price_public: !d.is_price_public,
                        }))
                      }
                      className={[
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        createDraft.is_price_public
                          ? "bg-(--oboon-primary)"
                          : "bg-(--oboon-bg-subtle)",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                          createDraft.is_price_public
                            ? "translate-x-5"
                            : "translate-x-1",
                        ].join(" ")}
                      />
                    </button>
                  </div>
                </div>

                {/* 세대수 */}
                <FormField label="세대수" className="gap-2">
                  <Input
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
                    <div className="space-y-2">
                      <input
                        ref={createFloorPlanInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        disabled={!safePropertyId || floorPlanUploading}
                        onChange={(e) => {
                          const files = Array.from(e.target.files ?? []);
                          e.currentTarget.value = "";
                          void handlePickFloorPlans(files);
                        }}
                      />

                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        disabled={!safePropertyId || floorPlanUploading}
                        onClick={() => createFloorPlanInputRef.current?.click()}
                      >
                        이미지 업로드
                      </Button>

                      <p className="ob-typo-caption text-(--oboon-text-muted)">
                        {floorPlanUploading
                          ? "업로드 중..."
                          : `이미지 선택 시 자동 업로드됩니다. (${createFloorPlanUrls.length}/5)`}
                      </p>

                      {createFloorPlanUrls.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-(--oboon-border-default) p-4 text-center ob-typo-caption text-(--oboon-text-muted)">
                          등록된 평면도 이미지가 없습니다.
                        </div>
                      ) : (
                        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-5 md:overflow-visible">
                          {createFloorPlanUrls.map((url, index) => (
                            <div
                              key={`${url}-${index}`}
                              className="relative w-28 shrink-0 snap-start overflow-hidden rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) md:w-auto"
                            >
                              <div className="relative aspect-square w-full overflow-hidden bg-(--oboon-bg-subtle)">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt={`floor plan ${index + 1}`}
                                  className="h-full w-full object-cover"
                                />
                                <div className="pointer-events-none absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-(--oboon-overlay) ob-typo-caption font-medium text-(--oboon-on-primary)">
                                  {index + 1}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-2 top-1 h-6 w-6 min-w-0 rounded-full p-0 !bg-transparent text-(--oboon-on-primary) hover:!bg-transparent hover:text-(--oboon-on-primary)"
                                  disabled={floorPlanUploading}
                                  onClick={() =>
                                    setCreateFloorPlanUrls((prev) =>
                                      prev.filter((_, i) => i !== index),
                                    )
                                  }
                                >
                                  <X className="h-4 w-4 text-(--oboon-danger)" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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
            </Modal>

            {/* List */}
            <section className="mt-2">
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
                      onTogglePublic={(nextIsPublic) =>
                        handleToggleUnitPublic(u, nextIsPublic)
                      }
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
