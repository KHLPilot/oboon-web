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
  toIntOrNull,
  formatPriceRange,
} from "@/app/company/properties/[id]/units/utils";

function StatusBadge({ status }: { status: UnitStatus | "\uC218\uC815 \uC911" }) {
  if (status === "\uC218\uC815 \uC911") {
    return (
      <Badge
        variant="default"
        className="shrink-0 border border-(--oboon-accent)/35 bg-(--oboon-bg-surface) text-(--oboon-text-title)"
      >
        {"\uC218\uC815 \uC911"}
      </Badge>
    );
  }

  if (status === "\uBBF8\uC785\uB825") {
    return (
      <Badge
        variant="default"
        className="shrink-0 border border-(--oboon-border-default) bg-(--oboon-bg-surface) text-(--oboon-text-muted)"
      >
        {"\uBBF8\uC785\uB825"}
      </Badge>
    );
  }

  if (status === "\uC785\uB825 \uC911") {
    return (
      <Badge
        variant="default"
        className="shrink-0 border border-(--oboon-border-default) bg-(--oboon-bg-surface) text-(--oboon-text-title)"
      >
        {"\uC785\uB825 \uC911"}
      </Badge>
    );
  }

  return (
    <Badge
      variant="default"
      className="shrink-0 border border-(--oboon-border-default) bg-(--oboon-bg-surface) text-(--oboon-text-title)"
    >
      {"\uC644\uB8CC"}
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
    isEditing ? draft?.price_max : unit.price_max
  );
  const inlinePreview = draft
    ? formatPriceRange(draft.price_min, draft.price_max)
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
            ?꾩슜{" "}
            {formatM2(isEditing ? draft?.exclusive_area : unit.exclusive_area)}
            ??쨌 怨듦툒{" "}
            {formatM2(isEditing ? draft?.supply_area : unit.supply_area)}??
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
                ??
              </Button>
            </DropdownMenuTrigger>

            {/* ??align/end + sideOffset?쇰줈 ?꾩튂 ?덉젙??*/}
            <DropdownMenuContent
  align="end"
  className="min-w-[160px] rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-1 shadow-lg data-[side=bottom]:mt-2 data-[side=top]:mb-2 data-[side=left]:mr-2 data-[side=right]:ml-2"
>
              <DropdownMenuItem
                className="rounded-lg px-3 py-2 text-sm"
                onClick={onStartEdit}
              >
                ?섏젙
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-lg px-3 py-2 text-sm"
                onClick={onDelete}
              >
                ??젣
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
          <p className="text-(--oboon-text-muted)">媛寃??뺣낫 ?놁쓬</p>
        )}
      </div>

      {/* EditPanel */}
      {isEditing && draft ? (
        <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-default) p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <FormField label="?됰㈃ ????대쫫">
              <input
                className={inputClass}
                value={draft.type_name ?? ""}
                onChange={(e) => onChange("type_name", e.target.value)}
              />
            </FormField>

            <FormField label="?꾩슜 硫댁쟻 (??">
              <input
                className={inputClass}
                value={draft.exclusive_area ?? ""}
                onChange={(e) =>
                  onChange("exclusive_area", toIntOrNull(e.target.value))
                }
                inputMode="numeric"
              />
            </FormField>

            <FormField label="怨듦툒 硫댁쟻 (??">
              <input
                className={inputClass}
                value={draft.supply_area ?? ""}
                onChange={(e) =>
                  onChange("supply_area", toIntOrNull(e.target.value))
                }
                inputMode="numeric"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="\uBC29 \uAC1C\uC218">
                <input
                  className={inputClass}
                  value={draft.rooms ?? ""}
                  onChange={(e) =>
                    onChange("rooms", toNumberOrNull(e.target.value))
                  }
                  inputMode="numeric"
                />
              </FormField>
              <FormField label="?뺤떎">
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

            <FormField label="援ъ“">
              <input
                className={inputClass}
                value={draft.building_layout ?? ""}
                onChange={(e) => onChange("building_layout", e.target.value)}
              />
            </FormField>

            <FormField label="\uD5A5">
              <input
                className={inputClass}
                value={draft.orientation ?? ""}
                onChange={(e) => onChange("orientation", e.target.value)}
              />
            </FormField>

            {/* 媛寃?+ 誘몃━蹂닿린(諛붾줈 ?꾨옒) */}
            <div className="space-y-2 md:col-span-2">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <FormField label="媛寃??섑븳 (??">
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
                <FormField label="媛寃??곹븳 (??">
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
                  媛寃?誘몃━蹂닿린 쨌 {inlinePreview}
                </div>
              ) : null}
            </div>

            <FormField label="\uC138\uB300\uC218">
              <input
                className={inputClass}
                value={draft.unit_count ?? ""}
                onChange={(e) =>
                  onChange("unit_count", toNumberOrNull(e.target.value))
                }
                inputMode="numeric"
              />
            </FormField>

            <FormField label="?됰㈃??URL" className="md:col-span-2">
              <input
                className={inputClass}
                value={draft.floor_plan_url ?? ""}
                onChange={(e) => onChange("floor_plan_url", e.target.value)}
                placeholder="https://..."
              />
            </FormField>

            <FormField label="?대?吏 URL" className="md:col-span-2">
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
              痍⑥냼
            </Button>

            <Button
              variant="primary"
              size="sm"
              shape="pill"
              onClick={onSave}
              disabled={saving}
              loading={saving}
            >
              ???
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
