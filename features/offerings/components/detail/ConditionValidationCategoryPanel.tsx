"use client";

import { Badge } from "@/components/ui/Badge";
import { grade5DetailLabel } from "@/features/condition-validation/lib/grade5Labels";
import { getGrade5ToneMeta } from "@/features/condition-validation/lib/grade5Theme";
import type { ConditionValidationCategoryDisplayItem } from "./conditionValidationDisplay";

type ConditionValidationCategoryPanelProps = {
  items: ConditionValidationCategoryDisplayItem[];
};

export default function ConditionValidationCategoryPanel(
  props: ConditionValidationCategoryPanelProps,
) {
  const { items } = props;

  if (items.length === 0) return null;

  return (
    <section className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {items.map((item) => {
        const tone = getGrade5ToneMeta(item.grade);
        return (
          <div
            key={item.key}
            className="relative overflow-hidden rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)"
          >
            <div
              className="absolute inset-y-0 left-0 w-[3px]"
              style={{ backgroundColor: tone.borderColor }}
            />
            <div className="space-y-2 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="ob-typo-body2 font-semibold text-(--oboon-text-title)">
                    {item.label}
                  </h4>
                </div>
                <Badge
                  className="bg-transparent"
                  style={{
                    borderColor: tone.borderColor,
                    color: tone.color,
                  }}
                >
                  {grade5DetailLabel(item.grade)}
                </Badge>
              </div>
              <p className="ob-typo-caption leading-5 text-(--oboon-text-muted)">
                {item.reason}
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
