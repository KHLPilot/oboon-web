"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { UnitTypeResultItem } from "@/features/condition-validation/domain/types";
import { UXCopy } from "@/shared/uxCopy";
import { formatPriceRange } from "@/shared/price";
import UnitTypeDetailSheet, { type UnitTypeRow } from "./UnitTypeDetailSheet";
import {
  buildOfferingUnitConditionState,
  buildOfferingUnitSpecSummary,
  validationMeta,
} from "./offeringPriceTableLayout";

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

function formatTypeTitle(typeName: string | null) {
  const raw = (typeName ?? "").trim();
  if (!raw) return "타입";
  return raw;
}

export default function OfferingUnitTypesAccordion({
  unitTypes,
  emptyText,
  imagePlaceholderText,
  validationResults = null,
}: {
  unitTypes: UnitTypeRow[];
  emptyText: string;
  imagePlaceholderText: string;
  validationResults?: UnitTypeResultItem[] | null;
}) {
  const rows = useMemo(() => {
    return (unitTypes ?? []).filter((u) => u.is_public !== false);
  }, [unitTypes]);

  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);

  const validationMap = useMemo(
    () => new Map((validationResults ?? []).map((item) => [item.unit_type_id, item])),
    [validationResults],
  );

  const selectedUnit = rows.find((r) => r.id === selectedUnitId) ?? null;
  const selectedValidation =
    selectedUnitId != null ? (validationMap.get(selectedUnitId) ?? null) : null;

  function scrollToConditionValidation() {
    const target = document.getElementById("condition-validation");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!rows.length) {
    return <div className="ob-typo-h4 text-(--oboon-text-muted)">{emptyText}</div>;
  }

  return (
    <>
      <div className="space-y-3">
        {rows.map((unit) => {
          const title = formatTypeTitle(unit.type_name);
          const validation = validationMap.get(unit.id) ?? null;
          const conditionState = buildOfferingUnitConditionState(validation);
          const meta =
            validation && conditionState.mode === "result"
              ? validationMeta(validation.final_grade)
              : null;

          return (
            <button
              key={unit.id}
              type="button"
              className="w-full overflow-hidden rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) text-left"
              onClick={() => setSelectedUnitId(unit.id)}
              aria-haspopup="dialog"
            >
              <div className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="ob-typo-h4 text-(--oboon-text-title)">{title}</div>
                    <div className="mt-2 ob-typo-h2 text-(--oboon-text-title)">
                      {formatPriceRange(unit.price_min, unit.price_max, {
                        unknownLabel:
                          unit.is_price_public === false
                            ? UXCopy.pricePrivate
                            : UXCopy.priceRange,
                      })}
                    </div>
                    <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                      {buildOfferingUnitSpecSummary(unit)}
                    </div>
                  </div>
                  <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-(--oboon-text-muted)" />
                </div>
              </div>

              <div className="border-t border-(--oboon-border-default) px-4 py-3">
                {conditionState.mode === "cta" ? (
                  <span className="ob-typo-caption text-(--oboon-text-primary)">
                    {conditionState.label}
                  </span>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    {meta ? (
                      <span
                        className="rounded-full px-2 py-0.5 ob-typo-caption font-semibold"
                        style={{ color: meta.color, backgroundColor: meta.bgColor }}
                      >
                        {conditionState.badgeLabel}
                      </span>
                    ) : null}
                    <span className="ob-typo-caption text-(--oboon-text-muted)">
                      {conditionState.metricLine}
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <UnitTypeDetailSheet
        open={selectedUnitId !== null}
        unit={selectedUnit}
        validation={selectedValidation}
        imagePlaceholderText={imagePlaceholderText}
        onClose={() => setSelectedUnitId(null)}
        onScrollToConditionValidation={() => {
          setSelectedUnitId(null);
          scrollToConditionValidation();
        }}
      />
    </>
  );
}
