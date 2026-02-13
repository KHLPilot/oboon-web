"use client";

import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/DropdownMenu";

import type {
  UnitDraft,
  UnitRow,
  UnitStatus,
} from "@/features/company/domain/unit.types";
import {
  cn,
  formatM2,
  summarizeRoomsBaths,
  numberWithCommas,
  toNumberOrNull,
  formatPriceRange,
} from "@/features/company/domain/unit.utils";

import { uploadFloorPlan } from "@/features/company/services/unitTypes.upload";

import { showAlert } from "@/shared/alert";
function StatusBadge({ status }: { status: UnitStatus | "수정 중" }) {
  if (status === "수정 중") {
    return (
      <Badge variant="status" className="ob-typo-caption">
        수정 중
      </Badge>
    );
  }
  if (status === "미입력") {
    return (
      <Badge
        variant="default"
        className="ob-typo-caption text-(--oboon-text-muted)"
      >
        미입력
      </Badge>
    );
  }
  if (status === "입력 중") {
    return (
      <Badge variant="status" className="ob-typo-caption">
        입력 중
      </Badge>
    );
  }
  return (
    <Badge variant="default" className="ob-typo-caption">
      완료
    </Badge>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="ob-typo-body text-(--oboon-text-title)">{label}</Label>
      {children}
    </div>
  );
}

function formatUnitTypeTitle(typeName: string | null | undefined) {
  const raw = (typeName ?? "").trim();
  if (!raw) return "-";
  return raw;
}

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
    image_url:
      normalized.length > 0 ? JSON.stringify(normalized) : null,
  };
}

export default function UnitTypeCard({
  unit,
  status,
  isEditing,
  draft,
  saving,
  onStartEdit,
  onDelete,
  onTogglePublic,
  onCancel,
  onSave,
  onChange,
}: {
  unit: UnitRow;
  status: UnitStatus;
  isEditing: boolean;
  draft: UnitDraft | null;
  saving: boolean;
  onStartEdit: () => void;
  onDelete: () => void;
  onTogglePublic: (nextIsPublic: boolean) => Promise<void> | void;
  onCancel: () => void;
  onSave: () => void;
  onChange: <K extends keyof UnitDraft>(key: K, value: UnitDraft[K]) => void;
}) {
  const title = isEditing
    ? formatUnitTypeTitle(draft?.type_name || unit.type_name)
    : formatUnitTypeTitle(unit.type_name);

  const summaryPrice = formatPriceRange(
    isEditing ? draft?.price_min : unit.price_min,
    isEditing ? draft?.price_max : unit.price_max,
  );

  const inlinePreview = draft
    ? formatPriceRange(draft.price_min, draft.price_max)
    : null;

  const [exclusiveText, setExclusiveText] = useState("");
  const [supplyText, setSupplyText] = useState("");
  const [floorUploading, setFloorUploading] = useState(false);
  const [appendAreaUnit, setAppendAreaUnit] = useState(false);
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [floorPlanUrls, setFloorPlanUrls] = useState<string[]>([]);
  const floorPlanInputRef = useRef<HTMLInputElement | null>(null);
  const wasEditingRef = useRef(false);

  useEffect(() => {
    const enteringEdit = isEditing && !wasEditingRef.current;
    const leavingEdit = !isEditing && wasEditingRef.current;

    if (enteringEdit && draft) {
      setExclusiveText(
        draft.exclusive_area != null ? String(draft.exclusive_area) : "",
      );
      setSupplyText(draft.supply_area != null ? String(draft.supply_area) : "");
      setAppendAreaUnit(hasAreaUnitSuffix(draft.type_name));
      setFloorPlanUrls(
        parseFloorPlanUrls(draft.floor_plan_url, draft.image_url),
      );
    }

    if (leavingEdit) {
      setExclusiveText("");
      setSupplyText("");
      setFloorPlanUrls([]);
    }

    wasEditingRef.current = isEditing;
  }, [isEditing, draft]);

  function applyFloorPlanUrls(nextUrls: string[]) {
    const payload = toFloorPlanPayload(nextUrls);
    onChange("floor_plan_url", payload.floor_plan_url);
    onChange("image_url", payload.image_url);
    setFloorPlanUrls(nextUrls);
  }

  async function handlePickFloorPlans(files: File[]) {
    if (!draft) return;
    if (files.length === 0) return;

    if (floorPlanUrls.length + files.length > 5) {
      showAlert("평면도 이미지는 최대 5장까지 업로드할 수 있습니다.");
      return;
    }

    try {
      setFloorUploading(true);
      const uploaded: string[] = [];
      for (const file of files) {
        const url = await uploadFloorPlan({
          file,
          propertyId: unit.properties_id,
          unitTypeName: (draft.type_name ?? "").trim() || undefined,
        });
        uploaded.push(url);
      }

      applyFloorPlanUrls(Array.from(new Set([...floorPlanUrls, ...uploaded])));
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? (e instanceof Error ? e.message : "알 수 없는 오류") : "평면도 업로드에 실패했습니다.";
      showAlert(msg);
    } finally {
      setFloorUploading(false);
    }
  }

  const disabled = Boolean(saving || floorUploading);
  const isUnitPublic = isEditing ? Boolean(draft?.is_public) : Boolean(unit.is_public);

  return (
    <Card
      className={cn("p-5", isEditing ? "md:col-span-2 md:col-start-1" : "")}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="ob-typo-h3 text-(--oboon-text-title) truncate">
            {title}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={isEditing ? "수정 중" : status} />
          <Badge
            variant={isUnitPublic ? "default" : "warning"}
            className="ob-typo-caption"
          >
            {isUnitPublic ? "게시" : "미게시"}
          </Badge>
          <Badge
            variant={
              (isEditing ? draft?.is_price_public : unit.is_price_public)
                ? "default"
                : "warning"
            }
            className="ob-typo-caption"
          >
            {(isEditing ? draft?.is_price_public : unit.is_price_public)
              ? "가격 공개"
              : "가격 비공개"}
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                shape="pill"
                className="h-8 w-8 px-0 text-(--oboon-text-muted)"
              >
                ⋮
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onStartEdit}>수정</DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  if (togglingPublic) return;
                  const nextIsPublic = !isUnitPublic;
                  if (isEditing && draft) {
                    onChange("is_public", nextIsPublic);
                    return;
                  }
                  try {
                    setTogglingPublic(true);
                    await onTogglePublic(nextIsPublic);
                  } finally {
                    setTogglingPublic(false);
                  }
                }}
              >
                {isUnitPublic ? "미게시로 전환" : "게시로 전환"}
              </DropdownMenuItem>
              <DropdownMenuItem destructive onClick={onDelete}>
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="mt-2 min-w-0">
        <p className="ob-typo-body text-(--oboon-text-muted)">
          전용 {formatM2(isEditing ? draft?.exclusive_area : unit.exclusive_area)}㎡ · 공급{" "}
          {formatM2(isEditing ? draft?.supply_area : unit.supply_area)}㎡
        </p>
        <p className="mt-1 ob-typo-body text-(--oboon-text-muted)">
          {summarizeRoomsBaths(unit.rooms, unit.bathrooms)}
        </p>
      </div>

      {/* Summary */}
      <div className="mt-4">
        {summaryPrice ? (
          <p className="ob-typo-h4 text-(--oboon-text-title)">
            {summaryPrice}
          </p>
        ) : (
          <p className="ob-typo-h4 text-(--oboon-text-muted)">
            가격 정보 없음
          </p>
        )}
      </div>

      {/* Edit Panel */}
      {isEditing && draft ? (
        <div className="mt-4 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-default) p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="평면 타입 이름">
              <div className="space-y-2">
                <Input
                  value={draft.type_name ?? ""}
                  onChange={(e) => {
                    const next = e.target.value;
                    onChange(
                      "type_name",
                      appendAreaUnit ? ensureAreaUnitSuffix(next) : next,
                    );
                  }}
                />
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={appendAreaUnit}
                    onChange={(e) => {
                      const nextChecked = e.target.checked;
                      setAppendAreaUnit(nextChecked);
                      onChange(
                        "type_name",
                        nextChecked
                          ? ensureAreaUnitSuffix(draft.type_name)
                          : stripAreaUnitSuffix(draft.type_name),
                      );
                    }}
                  />
                  <span className="ob-typo-caption text-(--oboon-text-muted)">
                    타입명 뒤에 ㎡ 붙이기
                  </span>
                </label>
              </div>
            </Field>

            <Field label="전용 면적 (㎡)">
              <Input
                value={exclusiveText}
                inputMode="decimal"
                onChange={(e) => {
                  const raw = e.target.value;
                  setExclusiveText(raw);
                  onChange("exclusive_area", toNumberOrNull(raw));
                }}
              />
            </Field>

            <Field label="공급 면적 (㎡)">
              <Input
                value={supplyText}
                inputMode="decimal"
                onChange={(e) => {
                  const raw = e.target.value;
                  setSupplyText(raw);
                  onChange("supply_area", toNumberOrNull(raw));
                }}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="방 개수">
                <Input
                  value={draft.rooms ?? ""}
                  inputMode="numeric"
                  onChange={(e) =>
                    onChange("rooms", toNumberOrNull(e.target.value))
                  }
                />
              </Field>
              <Field label="욕실">
                <Input
                  value={draft.bathrooms ?? ""}
                  inputMode="numeric"
                  onChange={(e) =>
                    onChange("bathrooms", toNumberOrNull(e.target.value))
                  }
                />
              </Field>
            </div>

            <Field label="구조">
              <Input
                value={draft.building_layout ?? ""}
                onChange={(e) => onChange("building_layout", e.target.value)}
              />
            </Field>

            <Field label="향">
              <Input
                value={draft.orientation ?? ""}
                onChange={(e) => onChange("orientation", e.target.value)}
              />
            </Field>

            {/* 가격 */}
            <div className="md:col-span-2 space-y-2">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="가격 하한 (원)">
                  <Input
                    value={
                      draft.price_min != null
                        ? numberWithCommas(draft.price_min)
                        : ""
                    }
                    inputMode="numeric"
                    onChange={(e) =>
                      onChange("price_min", toNumberOrNull(e.target.value))
                    }
                  />
                </Field>
                <Field label="가격 상한 (원)">
                  <Input
                    value={
                      draft.price_max != null
                        ? numberWithCommas(draft.price_max)
                        : ""
                    }
                    inputMode="numeric"
                    onChange={(e) =>
                      onChange("price_max", toNumberOrNull(e.target.value))
                    }
                  />
                </Field>
              </div>

              {inlinePreview ? (
                <p className="ob-typo-caption text-(--oboon-text-muted)">
                  가격 미리보기 · {inlinePreview}
                </p>
              ) : null}

              <div className="flex items-center justify-between rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle)/50 px-3 py-2">
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
                  aria-checked={draft.is_price_public}
                  aria-label="가격 공개"
                  onClick={() =>
                    onChange("is_price_public", !draft.is_price_public)
                  }
                  className={[
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    draft.is_price_public
                      ? "bg-(--oboon-primary)"
                      : "bg-(--oboon-bg-subtle)",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                      draft.is_price_public ? "translate-x-5" : "translate-x-1",
                    ].join(" ")}
                  />
                </button>
              </div>
            </div>

            <Field label="세대수">
              <Input
                value={draft.unit_count ?? ""}
                inputMode="numeric"
                onChange={(e) =>
                  onChange("unit_count", toNumberOrNull(e.target.value))
                }
              />
            </Field>

            {/* 평면도 업로드 */}
            <div className="md:col-span-2">
              <Field label="평면도 이미지">
                <div className="space-y-2">
                  <input
                    ref={floorPlanInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    disabled={saving || floorUploading}
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      e.currentTarget.value = "";
                      if (files.length === 0) return;
                      void handlePickFloorPlans(files);
                    }}
                  />

                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    disabled={saving || floorUploading}
                    onClick={() => {
                      floorPlanInputRef.current?.click();
                    }}
                  >
                    이미지 업로드
                  </Button>

                  <p className="ob-typo-caption text-(--oboon-text-muted)">
                    {floorUploading
                      ? "업로드 중..."
                      : `이미지 선택 시 자동 업로드됩니다. (${floorPlanUrls.length}/5)`}
                  </p>

                  {floorPlanUrls.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-(--oboon-border-default) p-4 text-center ob-typo-caption text-(--oboon-text-muted)">
                      등록된 평면도 이미지가 없습니다.
                    </div>
                  ) : (
                    <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-5 md:overflow-visible">
                      {floorPlanUrls.map((url, index) => (
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
                              disabled={disabled}
                              onClick={() =>
                                applyFloorPlanUrls(
                                  floorPlanUrls.filter((_, i) => i !== index),
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
              </Field>
            </div>

          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              shape="pill"
              disabled={disabled}
              onClick={onCancel}
            >
              취소
            </Button>
            <Button
              variant="primary"
              size="sm"
              shape="pill"
              disabled={disabled}
              loading={saving}
              onClick={onSave}
            >
              저장
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
