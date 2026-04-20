"use client";

import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { X } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Loader from "@/components/ui/Loader";

import type { UnitDraft, UnitRow } from "@/features/company/domain/unit.types";
import { useUnitTypes } from "./useUnitTypes";
import { toNumberOrNull, toIntOrNull } from "@/features/company/domain/unit.utils";
import { validateUnitDraft } from "@/features/company/domain/unit.validation";
import { showAlert } from "@/shared/alert";
import { useRequirePropertyEditAccess } from "@/features/company/hooks/useRequirePropertyEditAccess";
import { uploadFloorPlan } from "@/features/company/services/unitTypes.upload";

type UnitTypesPageProps = {
  propertyId?: number;
  embedded?: boolean;
  onAfterSave?: () => void | Promise<void>;
};

type NewUnitRow = {
  key: string;
  draft: UnitDraft;
};

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
    sort_order: row.sort_order ?? null,
  };
}

function buildEmptyDraft(propertyId: number): UnitDraft {
  return {
    properties_id: propertyId,
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
    sort_order: null,
  };
}

function Cell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={["px-1 py-2 align-middle", className].join(" ")}>{children}</td>;
}

function HeaderCell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={[
        "sticky top-0 z-10 bg-(--oboon-bg-subtle)",
        "px-1 py-2 text-center ob-typo-body text-(--oboon-text-muted) font-medium",
        className,
      ].join(" ")}
    >
      {children}
    </th>
  );
}

const NUMBER_INPUT_NO_SPIN_CLASS = [
  "[appearance:textfield]",
  "[&::-webkit-outer-spin-button]:appearance-none",
  "[&::-webkit-inner-spin-button]:appearance-none",
].join(" ");

function NumberInput({
  className,
  ...rest
}: Omit<ComponentProps<typeof Input>, "type">) {
  return (
    <Input
      type="number"
      className={[NUMBER_INPUT_NO_SPIN_CLASS, className ?? ""].join(" ").trim()}
      {...rest}
    />
  );
}

const INPUT_3_DIGIT_CLASS = "mx-auto w-[6ch] text-center px-2";
const INPUT_1_DIGIT_CLASS = "mx-auto w-[4.5ch] text-center px-2";
const INPUT_3_CHAR_CLASS = "mx-auto w-[6ch] text-center px-2";
const INPUT_3_COUNT_CLASS = "mx-auto w-[6ch] text-center px-2";
const INPUT_6_CHAR_CLASS = "mx-auto w-[10ch] text-center px-2";
const INPUT_8_CHAR_CLASS = "mx-auto w-[12ch] text-center px-2";

function hasAnyInput(draft: UnitDraft) {
  return Boolean(
    (draft.type_name ?? "").trim() ||
      draft.exclusive_area != null ||
      draft.supply_area != null ||
      draft.rooms != null ||
      draft.bathrooms != null ||
      (draft.building_layout ?? "").trim() ||
      (draft.orientation ?? "").trim() ||
      draft.price_min != null ||
      draft.price_max != null ||
      draft.unit_count != null ||
      draft.supply_count != null,
  );
}

function wonToManwonInput(value: number | null | undefined): string {
  if (value == null) return "";
  return String(value / 10000);
}

function manwonToWonInput(value: string): number | null {
  const parsed = toNumberOrNull(value);
  if (parsed == null) return null;
  return Math.round(parsed * 10000);
}

function formatPriceRangeManwon(
  priceMin: number | null | undefined,
  priceMax: number | null | undefined,
) {
  const min = wonToManwonInput(priceMin);
  const max = wonToManwonInput(priceMax);
  if (!min && !max) return "-";
  return `${min || "?"} ~ ${max || "?"}`;
}

function parseFloorPlanUrls(
  floorPlanUrl: string | null | undefined,
  imageUrl: string | null | undefined,
) {
  const urls: string[] = [];
  const primary = (floorPlanUrl ?? "").trim();
  if (primary) urls.push(primary);

  const rawImage = (imageUrl ?? "").trim();
  if (rawImage) {
    if (rawImage.startsWith("[")) {
      try {
        const parsed = JSON.parse(rawImage);
        if (Array.isArray(parsed)) {
          parsed.forEach((item) => {
            if (typeof item !== "string") return;
            const u = item.trim();
            if (u) urls.push(u);
          });
        }
      } catch {
        urls.push(rawImage);
      }
    } else {
      urls.push(rawImage);
    }
  }

  return Array.from(new Set(urls));
}

function toFloorPlanPayload(urls: string[]) {
  const normalized = Array.from(
    new Set(urls.map((v) => v.trim()).filter((v) => v.length > 0)),
  );
  return {
    floor_plan_url: normalized[0] ?? null,
    image_url: normalized.length > 0 ? JSON.stringify(normalized) : null,
  };
}

export default function UnitTypesPage({
  propertyId: propertyIdProp,
  embedded: embeddedProp,
  onAfterSave,
}: UnitTypesPageProps = {}) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const embeddedFromQuery = searchParams.get("embedded") === "1";
  const embedded = embeddedProp ?? embeddedFromQuery;

  const propertyId = propertyIdProp ?? Number(params?.id);
  const safePropertyId = Number.isFinite(propertyId) ? propertyId : null;
  const { loading: accessLoading, allowed: canAccessProperty } =
    useRequirePropertyEditAccess(propertyId);
  const cancelHref = `/company/properties/${propertyId}`;

  const { units, loading, errorMsg, createUnit, updateUnit, deleteUnit, clearError } =
    useUnitTypes(safePropertyId);

  const [rowDrafts, setRowDrafts] = useState<Record<number, UnitDraft>>({});
  const [newRows, setNewRows] = useState<NewUnitRow[]>([]);
  const [rowSequence, setRowSequence] = useState<string[]>([]);
  const [draggedRowKey, setDraggedRowKey] = useState<string | null>(null);
  const [dragOverRowKey, setDragOverRowKey] = useState<string | null>(null);
  const [newRowKeySeq, setNewRowKeySeq] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [deletingRowKey, setDeletingRowKey] = useState<string | null>(null);
  const [floorPlanModalUnitId, setFloorPlanModalUnitId] = useState<number | null>(null);
  const [floorPlanModalUrls, setFloorPlanModalUrls] = useState<string[]>([]);
  const [draggedFloorPlanIndex, setDraggedFloorPlanIndex] = useState<number | null>(null);
  const [dragOverFloorPlanIndex, setDragOverFloorPlanIndex] = useState<number | null>(null);
  const [floorPlanPreviewUrl, setFloorPlanPreviewUrl] = useState<string | null>(null);
  const [floorPlanUploading, setFloorPlanUploading] = useState(false);
  const [floorPlanSaving, setFloorPlanSaving] = useState(false);
  const floorPlanInputRef = useRef<HTMLInputElement | null>(null);

  const draftsById = useMemo(() => {
    const map: Record<number, UnitDraft> = {};
    for (const unit of units) {
      map[unit.id] = rowDrafts[unit.id] ?? buildDraftFromRow(unit);
    }
    return map;
  }, [rowDrafts, units]);

  const existingByKey = useMemo(
    () => new Map<string, UnitRow>(units.map((u) => [`e:${u.id}`, u])),
    [units],
  );
  const newByKey = useMemo(
    () => new Map(newRows.map((r) => [r.key, r] as const)),
    [newRows],
  );

  useEffect(() => {
    setRowSequence((prev) => {
      const existingKeys = units.map((u) => `e:${u.id}`);
      const newKeys = newRows.map((r) => r.key);
      const allKeys = [...existingKeys, ...newKeys];

      const preserved = prev.filter((key) => allKeys.includes(key));
      const appended = allKeys.filter((key) => !preserved.includes(key));
      return [...preserved, ...appended];
    });
  }, [units, newRows]);

  const setRowField = <K extends keyof UnitDraft>(id: number, key: K, value: UnitDraft[K]) => {
    setRowDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? draftsById[id]),
        [key]: value,
      },
    }));
  };

  const setNewRowFieldByKey = <K extends keyof UnitDraft>(rowKey: string, key: K, value: UnitDraft[K]) => {
    setNewRows((prev) =>
      prev.map((row) =>
        row.key === rowKey
          ? { ...row, draft: { ...row.draft, [key]: value } }
          : row,
      ),
    );
  };

  const floorPlanTargetUnit =
    floorPlanModalUnitId == null
      ? null
      : units.find((unit) => unit.id === floorPlanModalUnitId) ?? null;

  function moveRowKey(fromKey: string, toKey: string) {
    setRowSequence((prev) => {
      const fromIndex = prev.indexOf(fromKey);
      const toIndex = prev.indexOf(toKey);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) return prev;
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function closeFloorPlanModal() {
    if (floorPlanUploading || floorPlanSaving) return;
    setFloorPlanModalUnitId(null);
    setFloorPlanModalUrls([]);
    setDraggedFloorPlanIndex(null);
    setDragOverFloorPlanIndex(null);
  }

  async function handlePickFloorPlans(files: File[]) {
    if (!floorPlanTargetUnit || !safePropertyId) return;
    if (files.length === 0) return;
    if (floorPlanModalUrls.length + files.length > 5) {
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
          unitTypeName: (floorPlanTargetUnit.type_name ?? "").trim() || undefined,
        });
        uploaded.push(url);
      }
      setFloorPlanModalUrls((prev) => Array.from(new Set([...prev, ...uploaded])));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "평면도 업로드에 실패했습니다.";
      showAlert(msg);
    } finally {
      setFloorPlanUploading(false);
    }
  }

  async function handleSaveFloorPlans() {
    if (!floorPlanTargetUnit) return;
    const payload = toFloorPlanPayload(floorPlanModalUrls);
    const base = buildDraftFromRow(floorPlanTargetUnit);
    const nextDraft: UnitDraft = {
      ...base,
      floor_plan_url: payload.floor_plan_url,
      image_url: payload.image_url,
    };

    setFloorPlanSaving(true);
    const res = await updateUnit(floorPlanTargetUnit.id, nextDraft);
    setFloorPlanSaving(false);

    if (!res.ok) {
      showAlert(res.error || "평면도 저장에 실패했습니다.");
      return;
    }

    showAlert("평면도가 저장되었습니다.");
    await onAfterSave?.();
    closeFloorPlanModal();
  }

  function moveFloorPlan(from: number, to: number) {
    if (to < 0 || to >= floorPlanModalUrls.length) return;
    setFloorPlanModalUrls((prev) => {
      const next = [...prev];
      const [picked] = next.splice(from, 1);
      if (!picked) return prev;
      next.splice(to, 0, picked);
      return next;
    });
  }

  async function handleSaveAll() {
    if (!safePropertyId) return;

    const existingRows: Array<{ id: number; draft: UnitDraft }> = [];
    const meaningfulNewRows: UnitDraft[] = [];
    let nextSort = 1;

    for (const key of rowSequence) {
      if (key.startsWith("e:")) {
        const unit = existingByKey.get(key);
        if (!unit) continue;
        existingRows.push({
          id: unit.id,
          draft: {
            ...draftsById[unit.id],
            sort_order: nextSort,
          },
        });
        nextSort += 1;
        continue;
      }

      const newRow = newByKey.get(key);
      if (!newRow || !hasAnyInput(newRow.draft)) continue;
      meaningfulNewRows.push({
        ...newRow.draft,
        sort_order: nextSort,
      });
      nextSort += 1;
    }

    for (let i = 0; i < existingRows.length; i += 1) {
      const { draft } = existingRows[i];
      const v = validateUnitDraft(draft);
      if (!v.ok) {
        const first = Object.values(v.fieldErrors)[0];
        showAlert(`기존 ${i + 1}행: ${first ?? "입력값을 확인해 주세요."}`);
        return;
      }
    }

    for (let i = 0; i < meaningfulNewRows.length; i += 1) {
      const v = validateUnitDraft(meaningfulNewRows[i]);
      if (!v.ok) {
        const first = Object.values(v.fieldErrors)[0];
        showAlert(`신규 ${i + 1}행: ${first ?? "입력값을 확인해 주세요."}`);
        return;
      }
    }

    setSavingAll(true);
    clearError();

    for (const row of existingRows) {
      const res = await updateUnit(row.id, row.draft);
      if (!res.ok) {
        setSavingAll(false);
        showAlert(res.error || "저장에 실패했습니다.");
        return;
      }
    }

    for (let i = 0; i < meaningfulNewRows.length; i += 1) {
      const draft = meaningfulNewRows[i];
      const res = await createUnit({
        ...draft,
        properties_id: safePropertyId,
        type_name: (draft.type_name ?? "").trim(),
        sort_order: draft.sort_order ?? i + 1,
      });
      if (!res.ok) {
        setSavingAll(false);
        showAlert(res.error || "저장에 실패했습니다.");
        return;
      }
    }

    setSavingAll(false);
    setNewRows([]);
    setRowSequence((prev) => prev.filter((key) => key.startsWith("e:")));
    setRowDrafts({});
    setEditMode(false);
    showAlert("저장되었습니다.");
    await onAfterSave?.();
  }

  async function handleDeleteRow(rowKey: string, unitId?: number) {
    if (deletingRowKey || savingAll) return;

    if (!window.confirm("이 평면 타입 행을 삭제하시겠습니까?")) return;

    if (!unitId) {
      setNewRows((prev) => prev.filter((row) => row.key !== rowKey));
      setRowSequence((prev) => prev.filter((key) => key !== rowKey));
      return;
    }

    setDeletingRowKey(rowKey);
    const res = await deleteUnit(unitId);
    setDeletingRowKey(null);
    if (!res.ok) {
      showAlert(res.error || "삭제에 실패했습니다.");
      return;
    }

    setRowDrafts((prev) => {
      const next = { ...prev };
      delete next[unitId];
      return next;
    });
    setRowSequence((prev) => prev.filter((key) => key !== rowKey));
    showAlert("삭제되었습니다.");
  }

  if (accessLoading) {
    return <div className="px-4 py-8 ob-typo-body text-(--oboon-text-muted)">권한 확인 중...</div>;
  }

  if (!canAccessProperty) return null;

  return (
    <main className={embedded ? "bg-(--oboon-bg-surface)" : "bg-(--oboon-bg-default)"}>
          <div className="flex w-full flex-col gap-4">
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex shrink-0 items-center gap-2">
              {!embedded ? (
                <Button
                  variant="secondary"
                  size="sm"
                  shape="pill"
                  onClick={() => router.push(cancelHref)}
                >
                  목록으로
                </Button>
              ) : null}
            </div>
          </header>

          {errorMsg ? (
            <div className="rounded-2xl border border-(--oboon-danger-border) bg-(--oboon-danger-bg) px-4 py-3">
              <p className="ob-typo-body text-(--oboon-danger)">{errorMsg}</p>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-(--oboon-border-default)">
            <table className="min-w-[1320px] w-full border-collapse bg-(--oboon-bg-surface) text-center ob-typo-body text-(--oboon-text-body)">
              <thead>
                <tr>
                  <HeaderCell className="min-w-[42px] !px-0">순서</HeaderCell>
                  <HeaderCell className="min-w-[120px]">타입</HeaderCell>
                  <HeaderCell className="min-w-[92px]">평면도</HeaderCell>
                  <HeaderCell className="min-w-[72px]">전용(㎡)</HeaderCell>
                  <HeaderCell className="min-w-[72px]">공급(㎡)</HeaderCell>
                  <HeaderCell className="min-w-[60px]">방</HeaderCell>
                  <HeaderCell className="min-w-[60px]">욕실</HeaderCell>
                  <HeaderCell className="min-w-[120px]">구조</HeaderCell>
                  <HeaderCell className="min-w-[72px]">향</HeaderCell>
                  <HeaderCell className="min-w-[74px]">공급 수</HeaderCell>
                  <HeaderCell className="min-w-[74px]">세대수</HeaderCell>
                  <HeaderCell className="min-w-[186px]">분양가(만원)</HeaderCell>
                  <HeaderCell className="min-w-[68px]">가격 공개</HeaderCell>
                  <HeaderCell className="min-w-[60px]">타입 공개</HeaderCell>
                  <HeaderCell className="min-w-[56px]">삭제</HeaderCell>
                </tr>
              </thead>
              <tbody
                onClick={() => {
                  if (!editMode) setEditMode(true);
                }}
              >
                {rowSequence.map((rowKey) => {
                  const unit = existingByKey.get(rowKey);
                  const newRow = unit ? null : newByKey.get(rowKey) ?? null;
                  if (!unit && !newRow) return null;

                  const isNew = Boolean(newRow);
                  const draft = unit ? draftsById[unit.id] : (newRow?.draft as UnitDraft);
                  const floorPlanUrls = unit
                    ? parseFloorPlanUrls(unit.floor_plan_url, unit.image_url)
                    : [];
                  const floorPlanPreviewUrl = floorPlanUrls[0] ?? null;

                  return (
                    <tr
                      key={rowKey}
                      draggable
                      onDragStart={(event) => {
                        setDraggedRowKey(rowKey);
                        setDragOverRowKey(rowKey);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(event) => {
                        if (!draggedRowKey || draggedRowKey === rowKey) return;
                        event.preventDefault();
                        if (dragOverRowKey !== rowKey) setDragOverRowKey(rowKey);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (!draggedRowKey || draggedRowKey === rowKey) return;
                        moveRowKey(draggedRowKey, rowKey);
                        setDraggedRowKey(null);
                        setDragOverRowKey(null);
                      }}
                      onDragEnd={() => {
                        setDraggedRowKey(null);
                        setDragOverRowKey(null);
                      }}
                      className={[
                        "border-t border-(--oboon-border-default)",
                        isNew ? "bg-(--oboon-bg-subtle)/40" : "",
                        dragOverRowKey === rowKey && draggedRowKey !== rowKey
                          ? "outline outline-(--oboon-primary)"
                          : "",
                        draggedRowKey === rowKey ? "opacity-60" : "",
                      ].join(" ")}
                    >
                    <Cell className="!p-0 text-center align-middle">
                      <div className="flex h-11 items-center justify-center">
                        <button
                          type="button"
                          className="h-7 w-7 rounded border border-(--oboon-border-default) text-(--oboon-text-muted) cursor-grab active:cursor-grabbing"
                          title="드래그해서 행 순서 변경"
                        >
                          ≡
                        </button>
                      </div>
                    </Cell>
                    <Cell>{editMode ? <Input className={INPUT_8_CHAR_CLASS} value={draft.type_name ?? ""} onChange={(e) => isNew ? setNewRowFieldByKey(rowKey, "type_name", e.target.value) : setRowField(unit!.id, "type_name", e.target.value)} /> : <div className="text-center">{draft.type_name ?? "-"}</div>}</Cell>
                    <Cell className="p-0 align-middle">
                      <div className="flex h-11 items-center justify-center gap-2 ob-typo-caption text-(--oboon-text-muted)">
                        {isNew ? (
                          <span>저장 후 관리</span>
                        ) : (
                          <>
                            {floorPlanPreviewUrl ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFloorPlanPreviewUrl(floorPlanPreviewUrl);
                                }}
                                className="relative h-8 w-8 overflow-visible"
                                title="평면도 보기"
                              >
                                <span className="absolute inset-0 overflow-hidden rounded border border-(--oboon-border-default)">
                                  <Image
                                    src={floorPlanPreviewUrl}
                                    alt={`${draft.type_name ?? "타입"} 평면도`}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                </span>
                                {floorPlanUrls.length > 1 ? (
                                  <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-(--oboon-primary) px-1 text-xs font-semibold leading-none text-white ring-2 ring-(--oboon-bg-surface)">
                                    {floorPlanUrls.length}
                                  </span>
                                ) : null}
                              </button>
                            ) : (
                              <span>없음</span>
                            )}
                            <Button
                              variant="secondary"
                              size="sm"
                              shape="pill"
                              className="h-8 px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFloorPlanModalUnitId(unit!.id);
                                setFloorPlanModalUrls(floorPlanUrls);
                              }}
                              disabled={savingAll || deletingRowKey !== null}
                            >
                              관리
                            </Button>
                          </>
                        )}
                      </div>
                    </Cell>
                    <Cell>
                      {editMode ? (
                        <NumberInput
                          className={INPUT_3_DIGIT_CLASS}
                          max={999}
                          value={draft.exclusive_area ?? ""}
                          onChange={(e) => isNew ? setNewRowFieldByKey(rowKey, "exclusive_area", toNumberOrNull(e.target.value)) : setRowField(unit!.id, "exclusive_area", toNumberOrNull(e.target.value))}
                        />
                      ) : (
                        <div className="text-center">{draft.exclusive_area ?? "-"}</div>
                      )}
                    </Cell>
                    <Cell>
                      {editMode ? (
                        <NumberInput
                          className={INPUT_3_DIGIT_CLASS}
                          max={999}
                          value={draft.supply_area ?? ""}
                          onChange={(e) => isNew ? setNewRowFieldByKey(rowKey, "supply_area", toNumberOrNull(e.target.value)) : setRowField(unit!.id, "supply_area", toNumberOrNull(e.target.value))}
                        />
                      ) : (
                        <div className="text-center">{draft.supply_area ?? "-"}</div>
                      )}
                    </Cell>
                    <Cell>
                      {editMode ? (
                        <NumberInput
                          className={INPUT_1_DIGIT_CLASS}
                          max={9}
                          value={draft.rooms ?? ""}
                          onChange={(e) => isNew ? setNewRowFieldByKey(rowKey, "rooms", toIntOrNull(e.target.value)) : setRowField(unit!.id, "rooms", toIntOrNull(e.target.value))}
                        />
                      ) : (
                        <div className="text-center">{draft.rooms ?? "-"}</div>
                      )}
                    </Cell>
                    <Cell>
                      {editMode ? (
                        <NumberInput
                          className={INPUT_1_DIGIT_CLASS}
                          max={9}
                          value={draft.bathrooms ?? ""}
                          onChange={(e) => isNew ? setNewRowFieldByKey(rowKey, "bathrooms", toIntOrNull(e.target.value)) : setRowField(unit!.id, "bathrooms", toIntOrNull(e.target.value))}
                        />
                      ) : (
                        <div className="text-center">{draft.bathrooms ?? "-"}</div>
                      )}
                    </Cell>
                    <Cell>{editMode ? <Input className={INPUT_6_CHAR_CLASS} value={draft.building_layout ?? ""} onChange={(e) => isNew ? setNewRowFieldByKey(rowKey, "building_layout", e.target.value) : setRowField(unit!.id, "building_layout", e.target.value)} /> : <div className="text-center">{draft.building_layout ?? "-"}</div>}</Cell>
                    <Cell>
                      {editMode ? (
                        <Input
                          className={INPUT_3_CHAR_CLASS}
                          maxLength={3}
                          value={draft.orientation ?? ""}
                          onChange={(e) => isNew ? setNewRowFieldByKey(rowKey, "orientation", e.target.value.slice(0, 3)) : setRowField(unit!.id, "orientation", e.target.value.slice(0, 3))}
                        />
                      ) : (
                        <div className="text-center">{draft.orientation ?? "-"}</div>
                      )}
                    </Cell>
                    <Cell>
                      {editMode ? (
                        <NumberInput
                          className={INPUT_3_COUNT_CLASS}
                          max={999}
                          value={draft.supply_count ?? ""}
                          onChange={(e) => isNew ? setNewRowFieldByKey(rowKey, "supply_count", toIntOrNull(e.target.value)) : setRowField(unit!.id, "supply_count", toIntOrNull(e.target.value))}
                        />
                      ) : (
                        <div className="text-center">{draft.supply_count ?? "-"}</div>
                      )}
                    </Cell>
                    <Cell>
                      {editMode ? (
                        <NumberInput
                          className={INPUT_3_COUNT_CLASS}
                          max={999}
                          value={draft.unit_count ?? ""}
                          onChange={(e) => isNew ? setNewRowFieldByKey(rowKey, "unit_count", toIntOrNull(e.target.value)) : setRowField(unit!.id, "unit_count", toIntOrNull(e.target.value))}
                        />
                      ) : (
                        <div className="text-center">{draft.unit_count ?? "-"}</div>
                      )}
                    </Cell>
                    <Cell>
                      {editMode ? (
                        <div className="mx-auto flex w-[186px] items-center justify-center gap-1">
                          <NumberInput
                            className="w-[8.5ch] px-1 text-center"
                            value={wonToManwonInput(draft.price_min)}
                            onChange={(e) =>
                              isNew
                                ? setNewRowFieldByKey(
                                    rowKey,
                                    "price_min",
                                    manwonToWonInput(e.target.value),
                                  )
                                : setRowField(
                                    unit!.id,
                                    "price_min",
                                    manwonToWonInput(e.target.value),
                                  )
                            }
                          />
                          <span className="ob-typo-caption text-(--oboon-text-muted)">~</span>
                          <NumberInput
                            className="w-[8.5ch] px-1 text-center"
                            value={wonToManwonInput(draft.price_max)}
                            onChange={(e) =>
                              isNew
                                ? setNewRowFieldByKey(
                                    rowKey,
                                    "price_max",
                                    manwonToWonInput(e.target.value),
                                  )
                                : setRowField(
                                    unit!.id,
                                    "price_max",
                                    manwonToWonInput(e.target.value),
                                  )
                            }
                          />
                        </div>
                      ) : (
                        <div className="text-center">
                          {formatPriceRangeManwon(draft.price_min, draft.price_max)}
                        </div>
                      )}
                    </Cell>
                    <Cell className="px-1 py-2 align-middle border-t border-(--oboon-border-default)">
                      <div className="flex min-h-8 items-center justify-center">
                        {editMode ? (
                          <label className="inline-flex items-center gap-1 text-xs whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={Boolean(draft.is_price_public)}
                              onChange={(e) =>
                                isNew
                                  ? setNewRowFieldByKey(rowKey, "is_price_public", e.target.checked)
                                  : setRowField(unit!.id, "is_price_public", e.target.checked)
                              }
                              className="h-3.5 w-3.5 accent-(--oboon-primary)"
                            />
                            <span>{draft.is_price_public ? "공개" : "비공개"}</span>
                          </label>
                        ) : (
                          <span className="ob-typo-caption text-(--oboon-text-muted)">
                            {draft.is_price_public ? "공개" : "비공개"}
                          </span>
                        )}
                      </div>
                    </Cell>
                    <Cell className="px-1 py-2 align-middle border-t border-(--oboon-border-default)">
                      <div className="flex min-h-8 items-center justify-center">
                        {editMode ? (
                          <label className="inline-flex items-center gap-1 text-xs whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={Boolean(draft.is_public)}
                              onChange={(e) =>
                                isNew
                                  ? setNewRowFieldByKey(rowKey, "is_public", e.target.checked)
                                  : setRowField(unit!.id, "is_public", e.target.checked)
                              }
                              className="h-3.5 w-3.5 accent-(--oboon-primary)"
                            />
                            <span>{draft.is_public ? "공개" : "비공개"}</span>
                          </label>
                        ) : (
                          <span className="ob-typo-caption text-(--oboon-text-muted)">
                            {draft.is_public ? "공개" : "비공개"}
                          </span>
                        )}
                      </div>
                    </Cell>
                    <Cell className="!p-1 text-center align-middle">
                      <div className="flex min-h-8 items-center justify-center">
                        <Button
                          variant="danger"
                          size="sm"
                          shape="pill"
                          className="!h-7 !w-7 aspect-square min-w-0 !p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteRow(rowKey, isNew ? undefined : unit!.id);
                          }}
                          loading={deletingRowKey === rowKey}
                          disabled={savingAll || deletingRowKey !== null}
                          aria-label="행 삭제"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </Cell>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                shape="pill"
                onClick={() => {
                  if (!safePropertyId) return;
                  setEditMode(true);
                  const key = `n:${newRowKeySeq + 1}`;
                  setNewRowKeySeq((prev) => prev + 1);
                  setNewRows((prev) => [...prev, { key, draft: buildEmptyDraft(safePropertyId) }]);
                  setRowSequence((prev) => [...prev, key]);
                }}
                disabled={savingAll}
              >
                행 추가
              </Button>
              <Button
                variant="primary"
                size="sm"
              shape="pill"
              onClick={handleSaveAll}
              loading={savingAll}
              disabled={!editMode}
            >
              전체 저장
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader size="medium" type="primary" />
            </div>
          ) : null}

          <Modal
            open={Boolean(floorPlanTargetUnit)}
            onClose={closeFloorPlanModal}
            size="lg"
          >
            <div className="mb-5 space-y-1">
              <p className="ob-typo-h3 text-(--oboon-text-title)">
                평면도 이미지 관리
              </p>
              <p className="ob-typo-body text-(--oboon-text-muted)">
                {floorPlanTargetUnit?.type_name ?? "-"} 타입 이미지
              </p>
            </div>

            <div className="space-y-3">
              <input
                ref={floorPlanInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={!floorPlanTargetUnit || floorPlanUploading || floorPlanSaving}
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.currentTarget.value = "";
                  void handlePickFloorPlans(files);
                }}
              />
              <Button
                variant="secondary"
                size="sm"
                shape="pill"
                className="w-full"
                onClick={() => floorPlanInputRef.current?.click()}
                disabled={!floorPlanTargetUnit || floorPlanUploading || floorPlanSaving}
              >
                이미지 업로드 ({floorPlanModalUrls.length}/5)
              </Button>

              {floorPlanModalUrls.length === 0 ? (
                <div className="rounded-xl border border-dashed border-(--oboon-border-default) p-4 text-center ob-typo-caption text-(--oboon-text-muted)">
                  등록된 평면도 이미지가 없습니다.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                  {floorPlanModalUrls.map((url, index) => (
                    <div
                      key={`${url}-${index}`}
                      draggable={!floorPlanUploading && !floorPlanSaving}
                      onDragStart={(event) => {
                        setDraggedFloorPlanIndex(index);
                        setDragOverFloorPlanIndex(index);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", String(index));
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        if (draggedFloorPlanIndex == null || draggedFloorPlanIndex === index) return;
                        if (dragOverFloorPlanIndex !== index) setDragOverFloorPlanIndex(index);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (draggedFloorPlanIndex == null || draggedFloorPlanIndex === index) return;
                        moveFloorPlan(draggedFloorPlanIndex, index);
                        setDraggedFloorPlanIndex(null);
                        setDragOverFloorPlanIndex(null);
                      }}
                      onDragEnd={() => {
                        setDraggedFloorPlanIndex(null);
                        setDragOverFloorPlanIndex(null);
                      }}
                      className={[
                        "rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-2",
                        "cursor-grab active:cursor-grabbing",
                        dragOverFloorPlanIndex === index && draggedFloorPlanIndex !== index
                          ? "outline outline-(--oboon-primary)"
                          : "",
                        draggedFloorPlanIndex === index ? "opacity-60" : "",
                      ].join(" ")}
                    >
                      <div className="relative aspect-square overflow-hidden rounded-lg bg-(--oboon-bg-subtle)">
                        <Image
                          src={url}
                          alt={`floor plan ${index + 1}`}
                          fill
                          sizes="160px"
                          className="object-cover"
                        />
                        <div className="pointer-events-none absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-(--oboon-overlay) ob-typo-caption font-medium text-(--oboon-on-primary)">
                          {index + 1}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1 h-6 w-6 min-w-0 rounded-full p-0 !bg-transparent text-(--oboon-on-primary) hover:!bg-transparent"
                          onClick={() =>
                            setFloorPlanModalUrls((prev) => prev.filter((_, i) => i !== index))
                          }
                          disabled={floorPlanUploading || floorPlanSaving}
                        >
                          <X className="h-4 w-4 text-(--oboon-danger)" />
                        </Button>
                      </div>
                      <p className="mt-2 text-center ob-typo-caption text-(--oboon-text-muted)">
                        드래그로 순서 변경
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  shape="pill"
                  onClick={closeFloorPlanModal}
                  disabled={floorPlanUploading || floorPlanSaving}
                >
                  닫기
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  shape="pill"
                  onClick={handleSaveFloorPlans}
                  loading={floorPlanSaving}
                  disabled={floorPlanUploading}
                >
                  평면도 저장
                </Button>
              </div>
            </div>
          </Modal>

          <Modal
            open={Boolean(floorPlanPreviewUrl)}
            onClose={() => setFloorPlanPreviewUrl(null)}
            size="lg"
          >
            {floorPlanPreviewUrl ? (
              <div className="relative w-full overflow-hidden rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle)">
                <Image
                  src={floorPlanPreviewUrl}
                  alt="평면도 미리보기"
                  width={1600}
                  height={1200}
                  className="h-auto w-full object-contain"
                  unoptimized
                />
              </div>
            ) : null}
          </Modal>
      </div>
    </main>
  );
}
