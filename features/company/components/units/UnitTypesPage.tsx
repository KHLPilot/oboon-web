"use client";

import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, X } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";

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

function BooleanToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
        checked ? "bg-(--oboon-primary)" : "bg-(--oboon-bg-subtle)",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        ].join(" ")}
      />
    </button>
  );
}

const INPUT_3_DIGIT_CLASS = "mx-auto w-[6ch] text-center px-2";
const INPUT_1_DIGIT_CLASS = "mx-auto w-[4.5ch] text-center px-2";
const INPUT_3_CHAR_CLASS = "mx-auto w-[6ch] text-center px-2";
const INPUT_4_DIGIT_CLASS = "mx-auto w-[7ch] text-center px-2";
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
  const [newRowKeySeq, setNewRowKeySeq] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [deletingRowKey, setDeletingRowKey] = useState<string | null>(null);
  const [floorPlanModalUnitId, setFloorPlanModalUnitId] = useState<number | null>(null);
  const [floorPlanModalUrls, setFloorPlanModalUrls] = useState<string[]>([]);
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

  function moveRowByKey(key: string, dir: -1 | 1) {
    setRowSequence((prev) => {
      const index = prev.indexOf(key);
      if (index === -1) return prev;
      const nextIndex = index + dir;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function closeFloorPlanModal() {
    if (floorPlanUploading || floorPlanSaving) return;
    setFloorPlanModalUnitId(null);
    setFloorPlanModalUrls([]);
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
            <table className="min-w-[1200px] w-full border-collapse bg-(--oboon-bg-surface)">
              <thead>
                <tr>
                  <HeaderCell className="min-w-[42px] !px-0">순서</HeaderCell>
                  <HeaderCell className="min-w-[120px]">타입명</HeaderCell>
                  <HeaderCell className="min-w-[72px]">전용(㎡)</HeaderCell>
                  <HeaderCell className="min-w-[72px]">공급(㎡)</HeaderCell>
                  <HeaderCell className="min-w-[60px]">방</HeaderCell>
                  <HeaderCell className="min-w-[60px]">욕실</HeaderCell>
                  <HeaderCell className="min-w-[120px]">구조</HeaderCell>
                  <HeaderCell className="min-w-[72px]">향</HeaderCell>
                    <HeaderCell className="min-w-[130px]">가격 하한(만원)</HeaderCell>
                    <HeaderCell className="min-w-[130px]">가격 상한(만원)</HeaderCell>
                  <HeaderCell className="min-w-[84px]">세대수</HeaderCell>
                  <HeaderCell className="min-w-[84px]">공급규모</HeaderCell>
                  <HeaderCell className="min-w-[92px]">평면도</HeaderCell>
                  <HeaderCell className="min-w-[60px]">게시</HeaderCell>
                  <HeaderCell className="min-w-[68px]">가격 공개</HeaderCell>
                  <HeaderCell className="min-w-[56px]">삭제</HeaderCell>
                </tr>
              </thead>
              <tbody
                onClick={() => {
                  if (!editMode) setEditMode(true);
                }}
              >
                {rowSequence.map((rowKey, seqIndex) => {
                  const unit = existingByKey.get(rowKey);
                  const newRow = unit ? null : newByKey.get(rowKey) ?? null;
                  if (!unit && !newRow) return null;

                  const isNew = Boolean(newRow);
                  const draft = unit ? draftsById[unit.id] : (newRow?.draft as UnitDraft);

                  return (
                    <tr
                      key={rowKey}
                      className={[
                        "border-t border-(--oboon-border-default)",
                        isNew ? "bg-(--oboon-bg-subtle)/40" : "",
                      ].join(" ")}
                    >
                    <Cell className="!p-0 text-center align-middle">
                      <div className="flex h-11 flex-col items-center justify-center gap-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-5 w-5 min-w-0 px-0"
                          onClick={() => moveRowByKey(rowKey, -1)}
                          disabled={seqIndex === 0 || savingAll}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-5 w-5 min-w-0 px-0"
                          onClick={() => moveRowByKey(rowKey, 1)}
                          disabled={seqIndex === rowSequence.length - 1 || savingAll}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </Cell>
                    <Cell>{editMode ? <Input className={INPUT_8_CHAR_CLASS} value={draft.type_name ?? ""} onChange={(e) => isNew ? setNewRowFieldByKey(rowKey, "type_name", e.target.value) : setRowField(unit!.id, "type_name", e.target.value)} /> : <div className="text-center">{draft.type_name ?? "-"}</div>}</Cell>
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
                          className={INPUT_6_CHAR_CLASS}
                          value={wonToManwonInput(draft.price_min)}
                          onChange={(e) => isNew ? setNewRowFieldByKey(rowKey, "price_min", manwonToWonInput(e.target.value)) : setRowField(unit!.id, "price_min", manwonToWonInput(e.target.value))}
                        />
                      ) : (
                        <div className="text-center">{wonToManwonInput(draft.price_min) || "-"}</div>
                      )}
                    </Cell>
                    <Cell>
                      {editMode ? (
                        <NumberInput
                          className={INPUT_6_CHAR_CLASS}
                          value={wonToManwonInput(draft.price_max)}
                          onChange={(e) => isNew ? setNewRowFieldByKey(rowKey, "price_max", manwonToWonInput(e.target.value)) : setRowField(unit!.id, "price_max", manwonToWonInput(e.target.value))}
                        />
                      ) : (
                        <div className="text-center">{wonToManwonInput(draft.price_max) || "-"}</div>
                      )}
                    </Cell>
                    <Cell>
                      {editMode ? (
                        <NumberInput
                          className={INPUT_4_DIGIT_CLASS}
                          max={9999}
                          value={draft.unit_count ?? ""}
                          onChange={(e) => isNew ? setNewRowFieldByKey(rowKey, "unit_count", toIntOrNull(e.target.value)) : setRowField(unit!.id, "unit_count", toIntOrNull(e.target.value))}
                        />
                      ) : (
                        <div className="text-center">{draft.unit_count ?? "-"}</div>
                      )}
                    </Cell>
                    <Cell>
                      {editMode ? (
                        <NumberInput
                          className={INPUT_4_DIGIT_CLASS}
                          max={9999}
                          value={draft.supply_count ?? ""}
                          onChange={(e) => isNew ? setNewRowFieldByKey(rowKey, "supply_count", toIntOrNull(e.target.value)) : setRowField(unit!.id, "supply_count", toIntOrNull(e.target.value))}
                        />
                      ) : (
                        <div className="text-center">{draft.supply_count ?? "-"}</div>
                      )}
                    </Cell>
                    <Cell className="p-0 align-middle">
                        <div className="flex h-11 items-center justify-center ob-typo-caption text-(--oboon-text-muted)">
                          {isNew ? "저장 후 관리" : parseFloorPlanUrls(unit!.floor_plan_url, unit!.image_url).length}
                        </div>
                    </Cell>
                    <Cell className="!p-1 text-center align-middle">
                      <div className="flex min-h-8 items-center justify-center">
                        {editMode ? (
                          <BooleanToggle
                            checked={Boolean(draft.is_public)}
                            onChange={(next) => isNew ? setNewRowFieldByKey(rowKey, "is_public", next) : setRowField(unit!.id, "is_public", next)}
                            label="게시"
                          />
                        ) : (
                          <span className="ob-typo-caption text-(--oboon-text-muted)">{draft.is_public ? "ON" : "OFF"}</span>
                        )}
                      </div>
                    </Cell>
                    <Cell className="!p-1 text-center align-middle">
                      <div className="flex min-h-8 items-center justify-center">
                        {editMode ? (
                          <BooleanToggle
                            checked={Boolean(draft.is_price_public)}
                            onChange={(next) => isNew ? setNewRowFieldByKey(rowKey, "is_price_public", next) : setRowField(unit!.id, "is_price_public", next)}
                            label="가격 공개"
                          />
                        ) : (
                          <span className="ob-typo-caption text-(--oboon-text-muted)">{draft.is_price_public ? "ON" : "OFF"}</span>
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
            <div className="ob-typo-body text-(--oboon-text-muted)">불러오는 중...</div>
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
                      className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-2"
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
                      <div className="mt-2 flex items-center justify-between gap-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          shape="pill"
                          className="px-2"
                          onClick={() => moveFloorPlan(index, index - 1)}
                          disabled={index === 0 || floorPlanUploading || floorPlanSaving}
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          shape="pill"
                          className="px-2"
                          onClick={() => moveFloorPlan(index, index + 1)}
                          disabled={
                            index === floorPlanModalUrls.length - 1 ||
                            floorPlanUploading ||
                            floorPlanSaving
                          }
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
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
      </div>
    </main>
  );
}
