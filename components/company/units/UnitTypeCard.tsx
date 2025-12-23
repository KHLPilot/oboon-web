"use client";

import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FormField } from "@/app/components/FormField";
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

function StatusBadge({ status }: { status: UnitStatus | "수정 중" }) {
  if (status === "수정 중") {
    return (
      <Badge
        variant="default"
        className="shrink-0 border border-(--oboon-accent)/35 bg-(--oboon-bg-surface) text-(--oboon-text-title)"
      >
        수정 중
      </Badge>
    );
  }

  if (status === "미입력") {
    return (
      <Badge
        variant="default"
        className="shrink-0 border border-(--oboon-border-default) bg-(--oboon-bg-surface) text-(--oboon-text-muted)"
      >
        미입력
      </Badge>
    );
  }

  if (status === "입력 중") {
    return (
      <Badge
        variant="default"
        className="shrink-0 border border-(--oboon-border-default) bg-(--oboon-bg-surface) text-(--oboon-text-title)"
      >
        입력 중
      </Badge>
    );
  }

  return (
    <Badge
      variant="default"
      className="shrink-0 border border-(--oboon-border-default) bg-(--oboon-bg-surface) text-(--oboon-text-title)"
    >
      완료
    </Badge>
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
  const inputClass =
    "w-full rounded-md border border-(--oboon-border-default) bg-(--oboon-bg-subtle)/40 px-3 py-2 text-sm text-(--oboon-text-title) placeholder:text-(--oboon-text-muted) focus:outline-none focus:ring-2 focus:ring-(--oboon-accent)/40";

  const cardTone =
    "bg-(--oboon-bg-surface) shadow-[0_10px_30px_rgba(0,0,0,0.06)]";

  const title = isEditing
    ? draft?.type_name || unit.type_name || "-"
    : unit.type_name || "-";

  const summaryPrice = formatPriceRange(
    isEditing ? draft?.price_min : unit.price_min,
    isEditing ? draft?.price_max : unit.price_max,
    2
  );

  const stripeClass =
    status === "미입력"
      ? "bg-(--oboon-text-muted)/20"
      : status === "입력 중"
      ? "bg-(--oboon-accent)/35"
      : "bg-(--oboon-accent)/70";

  const inlinePreview = draft
    ? formatPriceRange(draft.price_min, draft.price_max, 2)
    : null;

  return (
    <div
      className={cn(
        "relative flex flex-col gap-4 rounded-2xl px-5 py-4",
        cardTone,
        isEditing && "md:col-span-2 md:col-start-1 bg-(--oboon-bg-surface)"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold text-(--oboon-text-title)">
            {title}
          </p>
          <p className="mt-1 text-xs text-(--oboon-text-muted)">
            전용{" "}
            {formatM2(isEditing ? draft?.exclusive_area : unit.exclusive_area)}
            ㎡ · 공급{" "}
            {formatM2(isEditing ? draft?.supply_area : unit.supply_area)}㎡
          </p>
          <p className="mt-1 text-xs text-(--oboon-text-muted)">
            {summarizeRoomsBaths(unit.rooms, unit.bathrooms)}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 shrink-0">
          <StatusBadge status={status} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                shape="pill"
                className="inline-flex h-8 w-8 min-w-8 items-center justify-center px-0 text-(--oboon-text-muted) hover:bg-(--oboon-bg-subtle) focus-visible:ring-2 focus-visible:ring-(--oboon-accent)/40 shrink-0"
              >
                …
              </Button>
            </DropdownMenuTrigger>

            {/* ✅ align/end + sideOffset으로 위치 안정화 */}
            <DropdownMenuContent
              align="end"
              className="min-w-160px rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-1 shadow-lg
             data-[side=bottom]:mt-2 data-[side=top]:mb-2 data-[side=left]:mr-2 data-[side=right]:ml-2"
            >
              <DropdownMenuItem
                className="rounded-lg px-3 py-2 text-sm"
                onClick={onStartEdit}
              >
                수정
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-lg px-3 py-2 text-sm"
                onClick={onDelete}
              >
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary */}
      <div className="text-sm text-(--oboon-text-title)">
        {summaryPrice ? (
          <p>{summaryPrice}</p>
        ) : (
          <p className="text-(--oboon-text-muted)">가격 정보 없음</p>
        )}
      </div>

      {/* EditPanel */}
      {isEditing && draft ? (
        <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-default) p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <FormField label="평면 타입 이름">
              <input
                className={inputClass}
                value={draft.type_name ?? ""}
                onChange={(e) => onChange("type_name", e.target.value)}
              />
            </FormField>

            <FormField label="전용 면적 (㎡)">
              <input
                className={inputClass}
                value={draft.exclusive_area ?? ""}
                onChange={(e) =>
                  onChange("exclusive_area", toNumberOrNull(e.target.value))
                }
                inputMode="decimal"
              />
            </FormField>

            <FormField label="공급 면적 (㎡)">
              <input
                className={inputClass}
                value={draft.supply_area ?? ""}
                onChange={(e) =>
                  onChange("supply_area", toNumberOrNull(e.target.value))
                }
                inputMode="decimal"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="방">
                <input
                  className={inputClass}
                  value={draft.rooms ?? ""}
                  onChange={(e) =>
                    onChange("rooms", toNumberOrNull(e.target.value))
                  }
                  inputMode="numeric"
                />
              </FormField>
              <FormField label="욕실">
                <input
                  className={inputClass}
                  value={draft.bathrooms ?? ""}
                  onChange={(e) =>
                    onChange("bathrooms", toNumberOrNull(e.target.value))
                  }
                  inputMode="numeric"
                />
              </FormField>
            </div>

            <FormField label="구조">
              <input
                className={inputClass}
                value={draft.building_layout ?? ""}
                onChange={(e) => onChange("building_layout", e.target.value)}
              />
            </FormField>

            <FormField label="향">
              <input
                className={inputClass}
                value={draft.orientation ?? ""}
                onChange={(e) => onChange("orientation", e.target.value)}
              />
            </FormField>

            {/* 가격 + 미리보기(바로 아래) */}
            <div className="space-y-2 md:col-span-2">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <FormField label="가격 하한 (원)">
                  <input
                    className={inputClass}
                    value={
                      draft.price_min != null
                        ? numberWithCommas(draft.price_min)
                        : ""
                    }
                    onChange={(e) =>
                      onChange("price_min", toNumberOrNull(e.target.value))
                    }
                    inputMode="numeric"
                  />
                </FormField>
                <FormField label="가격 상한 (원)">
                  <input
                    className={inputClass}
                    value={
                      draft.price_max != null
                        ? numberWithCommas(draft.price_max)
                        : ""
                    }
                    onChange={(e) =>
                      onChange("price_max", toNumberOrNull(e.target.value))
                    }
                    inputMode="numeric"
                  />
                </FormField>
              </div>

              {inlinePreview ? (
                <div className="text-xs text-(--oboon-text-muted)">
                  가격 미리보기 · {inlinePreview}
                </div>
              ) : null}
            </div>

            <FormField label="세대수">
              <input
                className={inputClass}
                value={draft.unit_count ?? ""}
                onChange={(e) =>
                  onChange("unit_count", toNumberOrNull(e.target.value))
                }
                inputMode="numeric"
              />
            </FormField>

            <FormField label="평면도 URL" className="md:col-span-2">
              <input
                className={inputClass}
                value={draft.floor_plan_url ?? ""}
                onChange={(e) => onChange("floor_plan_url", e.target.value)}
                placeholder="https://..."
              />
            </FormField>

            <FormField label="이미지 URL" className="md:col-span-2">
              <input
                className={inputClass}
                value={draft.image_url ?? ""}
                onChange={(e) => onChange("image_url", e.target.value)}
                placeholder="https://..."
              />
            </FormField>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              shape="pill"
              onClick={onCancel}
              disabled={saving}
            >
              취소
            </Button>

            <Button
              variant="primary"
              size="sm"
              shape="pill"
              onClick={onSave}
              disabled={saving}
              loading={saving}
            >
              저장
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
