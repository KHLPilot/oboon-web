"use client";

import React, { useEffect, useRef, useState } from "react";

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
} from "@/app/company/properties/[id]/units/types";
import {
  cn,
  formatM2,
  summarizeRoomsBaths,
  numberWithCommas,
  toNumberOrNull,
  formatPriceRange,
} from "@/app/company/properties/[id]/units/utils";

import { uploadFloorPlan } from "@/app/company/properties/[id]/units/useUnitTypes";

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

export default function UnitTypeCard({
  unit,
  status,
  isEditing,
  draft,
  saving,
  onStartEdit,
  onDelete,
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
  onCancel: () => void;
  onSave: () => void;
  onChange: <K extends keyof UnitDraft>(key: K, value: UnitDraft[K]) => void;
}) {
  const title = isEditing
    ? draft?.type_name || unit.type_name || "-"
    : unit.type_name || "-";

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
  const [floorPlanFileName, setFloorPlanFileName] = useState<string | null>(
    null,
  );
  const floorPlanInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isEditing && draft) {
      setExclusiveText(
        draft.exclusive_area != null ? String(draft.exclusive_area) : "",
      );
      setSupplyText(draft.supply_area != null ? String(draft.supply_area) : "");
    } else {
      setExclusiveText("");
      setSupplyText("");
      setFloorPlanFileName(null);
    }
  }, [isEditing, draft?.exclusive_area, draft?.supply_area]);

  async function handlePickFloorPlan(file: File) {
    if (!draft) return;

    try {
      setFloorUploading(true);

      const url = await uploadFloorPlan({
        file,
        propertyId: unit.properties_id,
        unitTypeName: (draft.type_name ?? "").trim() || undefined,
      });

      onChange("floor_plan_url", url);
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "평면도 업로드에 실패했습니다.";
      showAlert(msg);
    } finally {
      setFloorUploading(false);
    }
  }

  const disabled = Boolean(saving || floorUploading);

  return (
    <Card
      className={cn("p-5", isEditing ? "md:col-span-2 md:col-start-1" : "")}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="ob-typo-h3 text-(--oboon-text-title) truncate">
            {title}
          </p>
          <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
            전용{" "}
            {formatM2(isEditing ? draft?.exclusive_area : unit.exclusive_area)}
            ㎡ · 공급{" "}
            {formatM2(isEditing ? draft?.supply_area : unit.supply_area)}㎡
          </p>
          <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
            {summarizeRoomsBaths(unit.rooms, unit.bathrooms)}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={isEditing ? "수정 중" : status} />

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
              <DropdownMenuItem destructive onClick={onDelete}>
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4">
        {summaryPrice ? (
          <p className="ob-typo-body text-(--oboon-text-title)">
            {summaryPrice}
          </p>
        ) : (
          <p className="ob-typo-body text-(--oboon-text-muted)">
            가격 정보 없음
          </p>
        )}
      </div>

      {/* Edit Panel */}
      {isEditing && draft ? (
        <div className="mt-4 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-default) p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="평면 타입 이름">
              <Input
                value={draft.type_name ?? ""}
                onChange={(e) => onChange("type_name", e.target.value)}
              />
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
                    className="sr-only"
                    disabled={saving || floorUploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      e.currentTarget.value = "";
                      if (!f) {
                        setFloorPlanFileName(null);
                        return;
                      }
                      setFloorPlanFileName(f.name);
                      void handlePickFloorPlan(f);
                    }}
                  />

                  {/* 트리거 + 파일명 */}
                  <div className="flex items-center gap-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      shape="pill"
                      disabled={saving || floorUploading}
                      onClick={() => {
                        onChange("floor_plan_url", null);
                        setFloorPlanFileName(null);
                      }}
                    >
                      파일 선택
                    </Button>

                    <p className="ob-typo-caption text-(--oboon-text-muted) truncate">
                      {floorPlanFileName ? (
                        <>
                          선택된 파일:{" "}
                          <span className="text-(--oboon-text-title)">
                            {floorPlanFileName}
                          </span>
                        </>
                      ) : (
                        "선택된 파일 없음"
                      )}
                    </p>
                  </div>

                  <p className="ob-typo-caption text-(--oboon-text-muted)">
                    {floorUploading
                      ? "업로드 중..."
                      : "이미지 선택 시 자동 업로드됩니다."}
                  </p>

                  {draft.floor_plan_url ? (
                    <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="ob-typo-caption text-(--oboon-text-muted) break-all">
                            {draft.floor_plan_url}
                          </p>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          shape="pill"
                          disabled={disabled}
                          onClick={() => onChange("floor_plan_url", null)}
                        >
                          삭제
                        </Button>
                      </div>

                      <div className="mt-3 overflow-hidden rounded-xl border border-(--oboon-border-default)">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={draft.floor_plan_url}
                          alt="floor plan preview"
                          className="h-auto w-full object-cover"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </Field>
            </div>

            {/* image_url (유지) */}
            <Field label="이미지 URL" className="md:col-span-2">
              <Input
                value={(draft as any).image_url ?? ""}
                placeholder="https://..."
                onChange={(e) =>
                  onChange("image_url" as any, e.target.value as any)
                }
              />
            </Field>
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
