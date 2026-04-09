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
          const priceRange = formatPriceRange(unit.price_min, unit.price_max, {
            unknownLabel:
              unit.is_price_public === false ? UXCopy.pricePrivate : UXCopy.priceRange,
          });
          const validation = validationMap.get(unit.id) ?? null;
          const conditionState = buildOfferingUnitConditionState(validation);
          const meta =
            validation && conditionState.mode === "result"
              ? validationMeta(validation.final_grade)
              : null;
          const metricLine =
            conditionState.mode === "result"
              ? [
                  conditionState.metricLine,
                  validation?.metrics?.monthly_payment_est != null
                    ? `예상 월 상환액 ${validation.metrics.monthly_payment_est.toLocaleString("ko-KR")}만원`
                    : null,
                ]
                  .filter((part): part is string => Boolean(part))
                  .join(" · ")
              : conditionState.label;

          return (
            <button
              key={unit.id}
              type="button"
              className="w-full overflow-hidden rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) text-left transition-colors hover:border-(--oboon-border-strong) hover:bg-(--oboon-bg-default)"
              onClick={() => setSelectedUnitId(unit.id)}
              aria-haspopup="dialog"
            >
              <div className="px-3 py-2.5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-3">
                  <div className="min-w-0 truncate ob-typo-h3 font-semibold text-(--oboon-text-title)">
                    {title}
                  </div>
                  {conditionState.mode === "result" ? (
                    <span
                      className="rounded-full px-2 py-0.5 text-right ob-typo-caption font-semibold"
                      style={meta ? { color: meta.color, backgroundColor: meta.bgColor } : undefined}
                    >
                      {conditionState.badgeLabel}
                    </span>
                  ) : (
                    <span
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-default) px-2 py-0.5 ob-typo-caption font-semibold text-(--oboon-text-primary)"
                      onClick={(event) => {
                        event.stopPropagation();
                        scrollToConditionValidation();
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        event.stopPropagation();
                        scrollToConditionValidation();
                      }}
                    >
                      {conditionState.label}
                    </span>
                  )}
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-(--oboon-text-muted)" />
                </div>
                <div className="mt-2 ob-typo-caption leading-4 text-(--oboon-text-muted)">
                  {buildOfferingUnitSpecSummary(unit)}
                </div>
              </div>

              <div className="border-t border-(--oboon-border-default) px-3 py-2">
                <div className="flex w-full flex-col gap-1.5">
                  {conditionState.mode === "result" ? (
                    <>
                      <span className="ob-typo-caption text-(--oboon-text-muted)">
                        {priceRange}
                      </span>
                      <span className="min-w-0 ob-typo-caption text-(--oboon-text-muted)">
                        {metricLine}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="ob-typo-caption text-(--oboon-text-muted)">
                        {priceRange}
                      </span>
                    </>
                  )}
                </div>
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
